from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User, OrganizationMember
from app.models.incident import Incident, IncidentStatus, IncidentSeverity, IncidentUpdate
from app.models.service import Service
from app.models.organization import Organization

router = APIRouter()

# Pydantic models for request/response
class IncidentCreate(BaseModel):
    title: str
    description: str
    severity: IncidentSeverity = IncidentSeverity.MEDIUM
    affected_service_ids: List[int] = []

class IncidentUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[IncidentStatus] = None
    severity: Optional[IncidentSeverity] = None
    affected_service_ids: Optional[List[int]] = None

class IncidentStatusUpdateRequest(BaseModel):
    status: IncidentStatus
    title: str
    message: str

class IncidentResponse(BaseModel):
    id: int
    title: str
    description: str
    status: IncidentStatus
    severity: IncidentSeverity
    started_at: str
    resolved_at: Optional[str]
    created_at: str
    updated_at: Optional[str]
    organization_id: int
    affected_services: List[dict]
    updates: List[dict]

    class Config:
        from_attributes = True

def get_user_organization(db: Session, user: User) -> Organization:
    """Get the user's primary organization"""
    membership = db.query(OrganizationMember).filter(
        OrganizationMember.user_id == user.id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not a member of any organization"
        )
    
    organization = db.query(Organization).filter(
        Organization.id == membership.organization_id
    ).first()
    
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    return organization

@router.get("/", response_model=List[IncidentResponse])
async def get_incidents(
    status_filter: Optional[IncidentStatus] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all incidents for the user's organization"""
    organization = get_user_organization(db, current_user)
    
    query = db.query(Incident).filter(Incident.organization_id == organization.id)
    
    if status_filter:
        query = query.filter(Incident.status == status_filter)
    
    incidents = query.order_by(Incident.created_at.desc()).limit(limit).all()
    
    result = []
    for incident in incidents:
        # Get affected services
        affected_services = [
            {
                "id": service.id,
                "name": service.name,
                "status": service.status.value
            } for service in incident.affected_services
        ]
        
        # Get incident updates
        updates = [
            {
                "id": update.id,
                "title": update.title,
                "message": update.message,
                "status": update.status.value,
                "created_at": update.created_at.isoformat()
            } for update in incident.updates[:5]  # Latest 5 updates
        ]
        
        result.append(IncidentResponse(
            id=incident.id,
            title=incident.title,
            description=incident.description,
            status=incident.status,
            severity=incident.severity,
            started_at=incident.started_at.isoformat(),
            resolved_at=incident.resolved_at.isoformat() if incident.resolved_at else None,
            created_at=incident.created_at.isoformat(),
            updated_at=incident.updated_at.isoformat() if incident.updated_at else None,
            organization_id=incident.organization_id,
            affected_services=affected_services,
            updates=updates
        ))
    
    return result

@router.post("/", response_model=IncidentResponse)
async def create_incident(
    incident_data: IncidentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new incident"""
    organization = get_user_organization(db, current_user)
    
    # Validate affected services belong to the organization
    if incident_data.affected_service_ids:
        valid_services = db.query(Service).filter(
            and_(
                Service.id.in_(incident_data.affected_service_ids),
                Service.organization_id == organization.id,
                Service.is_active == True
            )
        ).all()
        
        if len(valid_services) != len(incident_data.affected_service_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more services are invalid or don't belong to your organization"
            )
    
    # Create new incident
    new_incident = Incident(
        title=incident_data.title,
        description=incident_data.description,
        status=IncidentStatus.INVESTIGATING,
        severity=incident_data.severity,
        organization_id=organization.id,
        created_by_id=current_user.id
    )
    
    db.add(new_incident)
    db.commit()
    db.refresh(new_incident)
    
    # Add affected services
    if incident_data.affected_service_ids:
        services = db.query(Service).filter(Service.id.in_(incident_data.affected_service_ids)).all()
        new_incident.affected_services.extend(services)
        db.commit()
    
    # Create initial incident update
    initial_update = IncidentUpdate(
        incident_id=new_incident.id,
        title="Incident Created",
        message=f"We are investigating reports of {incident_data.title.lower()}. We will provide updates as we learn more.",
        status=IncidentStatus.INVESTIGATING
    )
    db.add(initial_update)
    db.commit()
    
    # Get the created incident with relationships
    incident = db.query(Incident).filter(Incident.id == new_incident.id).first()
    
    affected_services = [
        {
            "id": service.id,
            "name": service.name,
            "status": service.status.value
        } for service in incident.affected_services
    ]
    
    updates = [
        {
            "id": initial_update.id,
            "title": initial_update.title,
            "message": initial_update.message,
            "status": initial_update.status.value,
            "created_at": initial_update.created_at.isoformat()
        }
    ]
    
    return IncidentResponse(
        id=incident.id,
        title=incident.title,
        description=incident.description,
        status=incident.status,
        severity=incident.severity,
        started_at=incident.started_at.isoformat(),
        resolved_at=None,
        created_at=incident.created_at.isoformat(),
        updated_at=incident.updated_at.isoformat() if incident.updated_at else None,
        organization_id=incident.organization_id,
        affected_services=affected_services,
        updates=updates
    )

@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(
    incident_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific incident"""
    organization = get_user_organization(db, current_user)
    
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
    
    affected_services = [
        {
            "id": service.id,
            "name": service.name,
            "status": service.status.value
        } for service in incident.affected_services
    ]
    
    updates = [
        {
            "id": update.id,
            "title": update.title,
            "message": update.message,
            "status": update.status.value,
            "created_at": update.created_at.isoformat()
        } for update in incident.updates
    ]
    
    return IncidentResponse(
        id=incident.id,
        title=incident.title,
        description=incident.description,
        status=incident.status,
        severity=incident.severity,
        started_at=incident.started_at.isoformat(),
        resolved_at=incident.resolved_at.isoformat() if incident.resolved_at else None,
        created_at=incident.created_at.isoformat(),
        updated_at=incident.updated_at.isoformat() if incident.updated_at else None,
        organization_id=incident.organization_id,
        affected_services=affected_services,
        updates=updates
    )

@router.put("/{incident_id}", response_model=IncidentResponse)
async def update_incident(
    incident_id: int,
    incident_data: IncidentUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an incident"""
    organization = get_user_organization(db, current_user)
    
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
    
    # Update incident fields
    update_data = incident_data.dict(exclude_unset=True)
    affected_service_ids = update_data.pop('affected_service_ids', None)
    
    for field, value in update_data.items():
        setattr(incident, field, value)
    
    # Handle resolved status
    if incident_data.status == IncidentStatus.RESOLVED and not incident.resolved_at:
        incident.resolved_at = datetime.utcnow()
    elif incident_data.status != IncidentStatus.RESOLVED and incident.resolved_at:
        incident.resolved_at = None
    
    # Update affected services if provided
    if affected_service_ids is not None:
        # Clear existing associations
        incident.affected_services.clear()
        
        # Add new services
        if affected_service_ids:
            services = db.query(Service).filter(
                and_(
                    Service.id.in_(affected_service_ids),
                    Service.organization_id == organization.id,
                    Service.is_active == True
                )
            ).all()
            incident.affected_services.extend(services)
    
    db.commit()
    db.refresh(incident)
    
    affected_services = [
        {
            "id": service.id,
            "name": service.name,
            "status": service.status.value
        } for service in incident.affected_services
    ]
    
    updates = [
        {
            "id": update.id,
            "title": update.title,
            "message": update.message,
            "status": update.status.value,
            "created_at": update.created_at.isoformat()
        } for update in incident.updates[:5]
    ]
    
    return IncidentResponse(
        id=incident.id,
        title=incident.title,
        description=incident.description,
        status=incident.status,
        severity=incident.severity,
        started_at=incident.started_at.isoformat(),
        resolved_at=incident.resolved_at.isoformat() if incident.resolved_at else None,
        created_at=incident.created_at.isoformat(),
        updated_at=incident.updated_at.isoformat() if incident.updated_at else None,
        organization_id=incident.organization_id,
        affected_services=affected_services,
        updates=updates
    )

@router.post("/{incident_id}/updates")
async def add_incident_update(
    incident_id: int,
    update_data: IncidentStatusUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add an update to an incident"""
    organization = get_user_organization(db, current_user)
    
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
    
    # Update incident status
    incident.status = update_data.status
    
    # Handle resolved status
    if update_data.status == IncidentStatus.RESOLVED and not incident.resolved_at:
        incident.resolved_at = datetime.utcnow()
    elif update_data.status != IncidentStatus.RESOLVED and incident.resolved_at:
        incident.resolved_at = None
    
    # Create incident update
    incident_update = IncidentUpdate(
        incident_id=incident_id,
        title=update_data.title,
        message=update_data.message,
        status=update_data.status
    )
    
    db.add(incident_update)
    db.commit()
    db.refresh(incident_update)
    
    return {
        "id": incident_update.id,
        "title": incident_update.title,
        "message": incident_update.message,
        "status": incident_update.status.value,
        "created_at": incident_update.created_at.isoformat(),
        "incident_status": incident.status.value
    }

@router.get("/{incident_id}/updates")
async def get_incident_updates(
    incident_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all updates for an incident"""
    organization = get_user_organization(db, current_user)
    
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
    
    updates = db.query(IncidentUpdate).filter(
        IncidentUpdate.incident_id == incident_id
    ).order_by(IncidentUpdate.created_at.desc()).all()
    
    return [
        {
            "id": update.id,
            "title": update.title,
            "message": update.message,
            "status": update.status.value,
            "created_at": update.created_at.isoformat()
        } for update in updates
    ]

@router.delete("/{incident_id}")
async def delete_incident(
    incident_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an incident (only if not resolved)"""
    organization = get_user_organization(db, current_user)
    
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
    
    if incident.status == IncidentStatus.RESOLVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete resolved incidents"
        )
    
    # Delete incident updates first
    db.query(IncidentUpdate).filter(IncidentUpdate.incident_id == incident_id).delete()
    
    # Clear affected services
    incident.affected_services.clear()
    
    # Delete incident
    db.delete(incident)
    db.commit()
    
    return {"message": f"Incident '{incident.title}' has been deleted"} 