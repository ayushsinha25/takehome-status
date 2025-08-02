from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.organization import Organization
from app.models.service import Service, ServiceStatus, ServiceStatusHistory
from app.models.incident import Incident, IncidentStatus, IncidentSeverity, IncidentUpdate
from app.models.user import User

router = APIRouter()

# Response models
class ServiceStatusResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    status: ServiceStatus
    last_status_change: str

class IncidentResponse(BaseModel):
    id: int
    title: str
    description: str
    status: IncidentStatus
    severity: IncidentSeverity
    started_at: str
    resolved_at: Optional[str]
    affected_services: List[dict]
    latest_update: Optional[dict]

class StatusPageResponse(BaseModel):
    organization: dict
    overall_status: str
    services: List[ServiceStatusResponse]
    active_incidents: List[IncidentResponse]
    recent_incidents: List[IncidentResponse]
    uptime_percentage: Optional[float]

class StatusHistoryResponse(BaseModel):
    date: str
    services: List[dict]

def calculate_overall_status(services: List[Service]) -> str:
    """Calculate overall system status based on service statuses"""
    if not services:
        return "operational"
    
    statuses = [service.status for service in services if service.is_active]
    
    if not statuses:
        return "operational"
    
    # Check for major outages
    if ServiceStatus.MAJOR_OUTAGE in statuses:
        return "major_outage"
    
    # Check for partial outages
    if ServiceStatus.PARTIAL_OUTAGE in statuses:
        return "partial_outage"
    
    # Check for degraded performance
    if ServiceStatus.DEGRADED_PERFORMANCE in statuses:
        return "degraded_performance"
    
    # Check for maintenance
    if ServiceStatus.MAINTENANCE in statuses:
        return "maintenance"
    
    # All operational
    return "operational"

def calculate_uptime_percentage(services: List[Service], db: Session, days: int = 30) -> float:
    """Calculate uptime percentage over the last N days"""
    if not services:
        return 100.0
    
    total_uptime = 0.0
    service_count = len([s for s in services if s.is_active])
    
    if service_count == 0:
        return 100.0
    
    for service in services:
        if not service.is_active:
            continue
            
        # Get status history for the last N days
        cutoff_date = datetime.utcnow().replace(tzinfo=None) - timedelta(days=days)
        
        history = db.query(ServiceStatusHistory).filter(
            and_(
                ServiceStatusHistory.service_id == service.id,
                ServiceStatusHistory.created_at >= cutoff_date
            )
        ).order_by(ServiceStatusHistory.created_at).all()
        
        if not history:
            # No history means operational
            total_uptime += 100.0
            continue
        
        # Calculate uptime based on status changes
        operational_time = 0
        total_time = days * 24 * 60 * 60  # seconds
        
        current_status = ServiceStatus.OPERATIONAL
        last_change = cutoff_date
        
        for entry in history:
            # Add time in previous status
            if current_status == ServiceStatus.OPERATIONAL:
                entry_time = entry.created_at.replace(tzinfo=None) if entry.created_at.tzinfo else entry.created_at
                change_time = last_change.replace(tzinfo=None) if hasattr(last_change, 'tzinfo') and last_change.tzinfo else last_change
                operational_time += (entry_time - change_time).total_seconds()
            
            current_status = entry.status
            last_change = entry.created_at.replace(tzinfo=None) if entry.created_at.tzinfo else entry.created_at
        
        # Add remaining time in current status
        if current_status == ServiceStatus.OPERATIONAL:
            operational_time += (datetime.utcnow().replace(tzinfo=None) - last_change).total_seconds()
        
        service_uptime = (operational_time / total_time) * 100
        total_uptime += min(service_uptime, 100.0)
    
    return round(total_uptime / service_count, 2)

@router.get("/{org_slug}")
async def get_public_status(org_slug: str, db: Session = Depends(get_db)):
    """Get public status page for an organization"""
    
    # Find organization by slug
    organization = db.query(Organization).filter(
        and_(
            Organization.slug == org_slug,
            Organization.is_public == True
        )
    ).first()
    
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Status page not found"
        )
    
    # Get active services
    services = db.query(Service).filter(
        and_(
            Service.organization_id == organization.id,
            Service.is_active == True
        )
    ).order_by(Service.sort_order, Service.name).all()
    
    # Get active incidents (not resolved)
    active_incidents = db.query(Incident).filter(
        and_(
            Incident.organization_id == organization.id,
            Incident.status != IncidentStatus.RESOLVED
        )
    ).order_by(desc(Incident.created_at)).all()
    
    # Get recent resolved incidents (last 30 days)
    thirty_days_ago = datetime.utcnow().replace(tzinfo=None) - timedelta(days=30)
    recent_incidents = db.query(Incident).filter(
        and_(
            Incident.organization_id == organization.id,
            Incident.status == IncidentStatus.RESOLVED,
            Incident.resolved_at >= thirty_days_ago
        )
    ).order_by(desc(Incident.resolved_at)).limit(10).all()
    
    # Format services
    service_responses = []
    for service in services:
        service_responses.append(ServiceStatusResponse(
            id=service.id,
            name=service.name,
            description=service.description,
            status=service.status,
            last_status_change=service.last_status_change.isoformat() if service.last_status_change else ""
        ))
    
    # Format active incidents
    active_incident_responses = []
    for incident in active_incidents:
        # Get latest update
        latest_update = db.query(IncidentUpdate).filter(
            IncidentUpdate.incident_id == incident.id
        ).order_by(desc(IncidentUpdate.created_at)).first()
        
        affected_services = [
            {
                "id": service.id,
                "name": service.name
            } for service in incident.affected_services
        ]
        
        active_incident_responses.append(IncidentResponse(
            id=incident.id,
            title=incident.title,
            description=incident.description,
            status=incident.status,
            severity=incident.severity,
            started_at=incident.started_at.isoformat(),
            resolved_at=None,
            affected_services=affected_services,
            latest_update={
                "title": latest_update.title,
                "message": latest_update.message,
                "created_at": latest_update.created_at.isoformat()
            } if latest_update else None
        ))
    
    # Format recent incidents
    recent_incident_responses = []
    for incident in recent_incidents:
        affected_services = [
            {
                "id": service.id,
                "name": service.name
            } for service in incident.affected_services
        ]
        
        recent_incident_responses.append(IncidentResponse(
            id=incident.id,
            title=incident.title,
            description=incident.description,
            status=incident.status,
            severity=incident.severity,
            started_at=incident.started_at.isoformat(),
            resolved_at=incident.resolved_at.isoformat() if incident.resolved_at else None,
            affected_services=affected_services,
            latest_update=None
        ))
    
    # Calculate overall status and uptime
    overall_status = calculate_overall_status(services)
    uptime_percentage = calculate_uptime_percentage(services, db)
    
    return StatusPageResponse(
        organization={
            "name": organization.name,
            "description": organization.description,
            "website_url": organization.website_url,
            "logo_url": organization.logo_url
        },
        overall_status=overall_status,
        services=service_responses,
        active_incidents=active_incident_responses,
        recent_incidents=recent_incident_responses,
        uptime_percentage=uptime_percentage
    )

@router.get("/{org_slug}/history")
async def get_status_history(
    org_slug: str, 
    days: int = 30,
    db: Session = Depends(get_db)
):
    """Get status history for the last N days"""
    
    # Find organization
    organization = db.query(Organization).filter(
        and_(
            Organization.slug == org_slug,
            Organization.is_public == True
        )
    ).first()
    
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Status page not found"
        )
    
    # Get services
    services = db.query(Service).filter(
        and_(
            Service.organization_id == organization.id,
            Service.is_active == True
        )
    ).all()
    
    # Generate daily status for the last N days
    history = []
    for i in range(days):
        date = datetime.utcnow().replace(tzinfo=None) - timedelta(days=i)
        date_str = date.strftime("%Y-%m-%d")
        
        daily_services = []
        for service in services:
            # Get the status at the end of this day
            day_end = date.replace(hour=23, minute=59, second=59)
            
            # Find the most recent status change before or on this day
            status_entry = db.query(ServiceStatusHistory).filter(
                and_(
                    ServiceStatusHistory.service_id == service.id,
                    ServiceStatusHistory.created_at <= day_end
                )
            ).order_by(desc(ServiceStatusHistory.created_at)).first()
            
            status = status_entry.status if status_entry else ServiceStatus.OPERATIONAL
            
            daily_services.append({
                "id": service.id,
                "name": service.name,
                "status": status.value
            })
        
        history.append(StatusHistoryResponse(
            date=date_str,
            services=daily_services
        ))
    
    return history[::-1]  # Return chronological order

@router.get("/{org_slug}/incidents")
async def get_public_incidents(
    org_slug: str,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Get public incidents for an organization"""
    
    # Find organization
    organization = db.query(Organization).filter(
        and_(
            Organization.slug == org_slug,
            Organization.is_public == True
        )
    ).first()
    
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Status page not found"
        )
    
    # Get incidents
    incidents = db.query(Incident).filter(
        Incident.organization_id == organization.id
    ).order_by(desc(Incident.created_at)).limit(limit).all()
    
    incident_responses = []
    for incident in incidents:
        # Get all updates
        updates = db.query(IncidentUpdate).filter(
            IncidentUpdate.incident_id == incident.id
        ).order_by(desc(IncidentUpdate.created_at)).all()
        
        affected_services = [
            {
                "id": service.id,
                "name": service.name
            } for service in incident.affected_services
        ]
        
        incident_responses.append({
            "id": incident.id,
            "title": incident.title,
            "description": incident.description,
            "status": incident.status.value,
            "severity": incident.severity.value,
            "started_at": incident.started_at.isoformat(),
            "resolved_at": incident.resolved_at.isoformat() if incident.resolved_at else None,
            "affected_services": affected_services,
            "updates": [
                {
                    "title": update.title,
                    "message": update.message,
                    "status": update.status.value,
                    "created_at": update.created_at.isoformat()
                } for update in updates
            ]
        })
    
    return incident_responses

@router.get("/{org_slug}/incidents/{incident_id}")
async def get_public_incident(
    org_slug: str, 
    incident_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific public incident"""
    
    # Find organization
    organization = db.query(Organization).filter(
        and_(
            Organization.slug == org_slug,
            Organization.is_public == True
        )
    ).first()
    
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Status page not found"
        )
    
    # Get incident
    incident = db.query(Incident).filter(
        and_(
            Incident.id == incident_id,
            Incident.organization_id == organization.id
        )
    ).first()
    
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found"
        )
    
    # Get all updates
    updates = db.query(IncidentUpdate).filter(
        IncidentUpdate.incident_id == incident.id
    ).order_by(desc(IncidentUpdate.created_at)).all()
    
    affected_services = [
        {
            "id": service.id,
            "name": service.name,
            "status": service.status.value
        } for service in incident.affected_services
    ]
    
    return {
        "id": incident.id,
        "title": incident.title,
        "description": incident.description,
        "status": incident.status.value,
        "severity": incident.severity.value,
        "started_at": incident.started_at.isoformat(),
        "resolved_at": incident.resolved_at.isoformat() if incident.resolved_at else None,
        "affected_services": affected_services,
        "updates": [
            {
                "title": update.title,
                "message": update.message,
                "status": update.status.value,
                "created_at": update.created_at.isoformat()
            } for update in updates
        ]
    } 