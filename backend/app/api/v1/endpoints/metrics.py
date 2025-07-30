from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from datetime import datetime, timedelta, timezone
from typing import List, Dict
from pydantic import BaseModel

from backend.app.core.database import get_db
from backend.app.core.auth import get_current_user
from backend.app.models.user import User, OrganizationMember
from backend.app.models.service import Service, ServiceStatus, ServiceStatusHistory
from backend.app.models.organization import Organization

router = APIRouter()

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

class UptimeDataPoint(BaseModel):
    timestamp: str
    uptime_percentage: float
    label: str

class ServiceUptimeData(BaseModel):
    service_id: int
    service_name: str
    data_points: List[UptimeDataPoint]
    overall_uptime: float

class UptimeMetricsResponse(BaseModel):
    services: List[ServiceUptimeData]
    overall_uptime: float
    period_type: str
    period_label: str

def calculate_service_uptime_for_period(
    service: Service, 
    db: Session, 
    start_time: datetime, 
    end_time: datetime
) -> float:
    """Calculate uptime percentage for a service in a specific time period"""
    if not service.is_active:
        return 100.0
    
    # Get status history for the period
    history = db.query(ServiceStatusHistory).filter(
        and_(
            ServiceStatusHistory.service_id == service.id,
            ServiceStatusHistory.created_at >= start_time,
            ServiceStatusHistory.created_at <= end_time
        )
    ).order_by(ServiceStatusHistory.created_at).all()
    
    total_duration = (end_time - start_time).total_seconds()
    if total_duration <= 0:
        return 100.0
    
    operational_duration = 0
    
    # If no history in this period, check service's current status and last change
    if not history:
        # If the service's last status change was before our time period,
        # then the service has been in its current status for the entire period
        if service.last_status_change <= start_time:
            # Service has been in current status for entire period
            if service.status == ServiceStatus.OPERATIONAL:
                operational_duration = total_duration
            else:
                operational_duration = 0
        else:
            # Service changed status during our period, calculate accordingly
            if service.last_status_change <= end_time:
                # Change happened within our period
                time_before_change = (service.last_status_change - start_time).total_seconds()
                time_after_change = (end_time - service.last_status_change).total_seconds()
                
                # Assume it was operational before the change (since we have no history)
                operational_duration = max(0, time_before_change)
                
                # Add time after change if service is now operational
                if service.status == ServiceStatus.OPERATIONAL:
                    operational_duration += max(0, time_after_change)
            else:
                # Change happened after our period, assume operational for entire period
                operational_duration = total_duration
        
        return min((operational_duration / total_duration) * 100, 100.0)
    
    # If we have history, use the original logic with better initial status detection
    current_status = ServiceStatus.OPERATIONAL  # Default assumption
    
    # Try to determine the initial status more accurately
    if service.last_status_change <= start_time:
        # Service was already in current status at start of period
        current_status = service.status
    
    last_change = start_time
    
    # Process status changes
    for entry in history:
        # Add time in previous status
        if current_status == ServiceStatus.OPERATIONAL:
            operational_duration += (entry.created_at - last_change).total_seconds()
        
        current_status = entry.status
        last_change = entry.created_at
    
    # Add remaining time in current status
    if current_status == ServiceStatus.OPERATIONAL:
        operational_duration += (end_time - last_change).total_seconds()
    
    return min((operational_duration / total_duration) * 100, 100.0)

@router.get("/uptime/{period_type}", response_model=UptimeMetricsResponse)
async def get_uptime_metrics(
    period_type: str,  # "daily" or "hourly"
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get uptime metrics for the specified period type"""
    organization = get_user_organization(db, current_user)
    
    # Get all active services for the organization
    services = db.query(Service).filter(
        and_(
            Service.organization_id == organization.id,
            Service.is_active == True
        )
    ).all()
    
    if not services:
        return UptimeMetricsResponse(
            services=[],
            overall_uptime=100.0,
            period_type=period_type,
            period_label="No services"
        )
    
    now = datetime.now(timezone.utc)
    service_uptime_data = []
    
    if period_type == "daily":
        # Last 30 days, daily data points
        periods = 30
        period_label = "Last 30 days"
        
        for service in services:
            data_points = []
            service_total_uptime = 0
            
            for i in range(periods):
                day_start = (now - timedelta(days=i+1)).replace(hour=0, minute=0, second=0, microsecond=0)
                day_end = day_start + timedelta(days=1)
                
                uptime = calculate_service_uptime_for_period(service, db, day_start, day_end)
                service_total_uptime += uptime
                
                data_points.append(UptimeDataPoint(
                    timestamp=day_start.isoformat(),
                    uptime_percentage=round(uptime, 2),
                    label=day_start.strftime("%b %d")
                ))
            
            # Reverse to show chronologically
            data_points.reverse()
            
            service_uptime_data.append(ServiceUptimeData(
                service_id=service.id,
                service_name=service.name,
                data_points=data_points,
                overall_uptime=round(service_total_uptime / periods, 2)
            ))
    
    elif period_type == "hourly":
        # Last 24 hours, hourly data points
        periods = 24
        period_label = "Last 24 hours"
        
        for service in services:
            data_points = []
            service_total_uptime = 0
            
            for i in range(periods):
                hour_start = (now - timedelta(hours=i+1)).replace(minute=0, second=0, microsecond=0)
                hour_end = hour_start + timedelta(hours=1)
                
                uptime = calculate_service_uptime_for_period(service, db, hour_start, hour_end)
                service_total_uptime += uptime
                
                data_points.append(UptimeDataPoint(
                    timestamp=hour_start.isoformat(),
                    uptime_percentage=round(uptime, 2),
                    label=hour_start.strftime("%H:%M")
                ))
            
            # Reverse to show chronologically
            data_points.reverse()
            
            service_uptime_data.append(ServiceUptimeData(
                service_id=service.id,
                service_name=service.name,
                data_points=data_points,
                overall_uptime=round(service_total_uptime / periods, 2)
            ))
    
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid period_type. Use 'daily' or 'hourly'"
        )
    
    # Calculate overall uptime across all services
    if service_uptime_data:
        overall_uptime = sum(s.overall_uptime for s in service_uptime_data) / len(service_uptime_data)
    else:
        overall_uptime = 100.0
    
    return UptimeMetricsResponse(
        services=service_uptime_data,
        overall_uptime=round(overall_uptime, 2),
        period_type=period_type,
        period_label=period_label
    ) 