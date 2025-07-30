from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from backend.app.core.database import get_db
from backend.app.core.auth import get_current_user
from backend.app.models.user import User, OrganizationMember
from backend.app.models.service import Service, ServiceStatus, ServiceStatusHistory
from backend.app.models.organization import Organization

router = APIRouter()

# Pydantic models for request/response
class ServiceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    monitoring_url: Optional[str] = None
    monitoring_enabled: bool = False
    monitoring_interval: int = 300

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ServiceStatus] = None
    monitoring_url: Optional[str] = None
    monitoring_enabled: Optional[bool] = None
    monitoring_interval: Optional[int] = None
    is_active: Optional[bool] = None

class ServiceStatusUpdate(BaseModel):
    status: ServiceStatus
    reason: Optional[str] = None

class ServiceResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    status: ServiceStatus
    is_active: bool
    monitoring_enabled: bool
    monitoring_url: Optional[str]
    organization_id: int
    created_at: str
    updated_at: Optional[str]
    last_status_change: str

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

@router.get("/", response_model=List[ServiceResponse])
async def get_services(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all services for the user's organization"""
    organization = get_user_organization(db, current_user)
    
    services = db.query(Service).filter(
        and_(
            Service.organization_id == organization.id,
            Service.is_active == True
        )
    ).order_by(Service.sort_order, Service.name).all()
    
    return [
        ServiceResponse(
            id=service.id,
            name=service.name,
            description=service.description,
            status=service.status,
            is_active=service.is_active,
            monitoring_enabled=service.monitoring_enabled,
            monitoring_url=service.monitoring_url,
            organization_id=service.organization_id,
            created_at=service.created_at.isoformat() if service.created_at else "",
            updated_at=service.updated_at.isoformat() if service.updated_at else None,
            last_status_change=service.last_status_change.isoformat() if service.last_status_change else ""
        ) for service in services
    ]

@router.post("/", response_model=ServiceResponse)
async def create_service(
    service_data: ServiceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new service"""
    organization = get_user_organization(db, current_user)
    
    # Check if service name already exists in organization
    existing_service = db.query(Service).filter(
        and_(
            Service.organization_id == organization.id,
            Service.name == service_data.name,
            Service.is_active == True
        )
    ).first()
    
    if existing_service:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Service with name '{service_data.name}' already exists"
        )
    
    # Create new service
    new_service = Service(
        name=service_data.name,
        description=service_data.description,
        status=ServiceStatus.OPERATIONAL,
        monitoring_url=service_data.monitoring_url,
        monitoring_enabled=service_data.monitoring_enabled,
        monitoring_interval=service_data.monitoring_interval,
        organization_id=organization.id,
        created_by_id=current_user.id
    )
    
    db.add(new_service)
    db.commit()
    db.refresh(new_service)
    
    # Create initial status history entry
    status_history = ServiceStatusHistory(
        service_id=new_service.id,
        status=ServiceStatus.OPERATIONAL,
        reason="Service created",
        automated=False
    )
    db.add(status_history)
    db.commit()
    
    return ServiceResponse(
        id=new_service.id,
        name=new_service.name,
        description=new_service.description,
        status=new_service.status,
        is_active=new_service.is_active,
        monitoring_enabled=new_service.monitoring_enabled,
        monitoring_url=new_service.monitoring_url,
        organization_id=new_service.organization_id,
        created_at=new_service.created_at.isoformat(),
        updated_at=new_service.updated_at.isoformat() if new_service.updated_at else None,
        last_status_change=new_service.last_status_change.isoformat()
    )

@router.get("/{service_id}", response_model=ServiceResponse)
async def get_service(
    service_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific service"""
    organization = get_user_organization(db, current_user)
    
    service = db.query(Service).filter(
        and_(
            Service.id == service_id,
            Service.organization_id == organization.id,
            Service.is_active == True
        )
    ).first()
    
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    return ServiceResponse(
        id=service.id,
        name=service.name,
        description=service.description,
        status=service.status,
        is_active=service.is_active,
        monitoring_enabled=service.monitoring_enabled,
        monitoring_url=service.monitoring_url,
        organization_id=service.organization_id,
        created_at=service.created_at.isoformat(),
        updated_at=service.updated_at.isoformat() if service.updated_at else None,
        last_status_change=service.last_status_change.isoformat()
    )

@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: int,
    service_data: ServiceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a service"""
    organization = get_user_organization(db, current_user)
    
    service = db.query(Service).filter(
        and_(
            Service.id == service_id,
            Service.organization_id == organization.id,
            Service.is_active == True
        )
    ).first()
    
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    # Store previous status for history
    previous_status = service.status
    
    # Update service fields
    update_data = service_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(service, field, value)
    
    # If status changed, update last_status_change and create history entry
    if service_data.status and service_data.status != previous_status:
        service.last_status_change = db.execute("SELECT CURRENT_TIMESTAMP").scalar()
        
        status_history = ServiceStatusHistory(
            service_id=service.id,
            status=service_data.status,
            previous_status=previous_status,
            reason=f"Status manually updated to {service_data.status.value}",
            automated=False
        )
        db.add(status_history)
    
    db.commit()
    db.refresh(service)
    
    return ServiceResponse(
        id=service.id,
        name=service.name,
        description=service.description,
        status=service.status,
        is_active=service.is_active,
        monitoring_enabled=service.monitoring_enabled,
        monitoring_url=service.monitoring_url,
        organization_id=service.organization_id,
        created_at=service.created_at.isoformat(),
        updated_at=service.updated_at.isoformat() if service.updated_at else None,
        last_status_change=service.last_status_change.isoformat()
    )

@router.patch("/{service_id}/status", response_model=ServiceResponse)
async def update_service_status(
    service_id: int,
    status_data: ServiceStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update only the status of a service"""
    organization = get_user_organization(db, current_user)
    
    service = db.query(Service).filter(
        and_(
            Service.id == service_id,
            Service.organization_id == organization.id,
            Service.is_active == True
        )
    ).first()
    
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    # Store previous status
    previous_status = service.status
    
    # Update status
    service.status = status_data.status
    service.last_status_change = datetime.utcnow()
    
    # Create status history entry
    status_history = ServiceStatusHistory(
        service_id=service.id,
        status=status_data.status,
        previous_status=previous_status,
        reason=status_data.reason or f"Status updated to {status_data.status.value}",
        automated=False
    )
    db.add(status_history)
    
    db.commit()
    db.refresh(service)
    
    # TODO: Send WebSocket notification for real-time updates
    # await websocket_manager.notify_status_change(service.id, service.status.value, organization.id)
    
    return ServiceResponse(
        id=service.id,
        name=service.name,
        description=service.description,
        status=service.status,
        is_active=service.is_active,
        monitoring_enabled=service.monitoring_enabled,
        monitoring_url=service.monitoring_url,
        organization_id=service.organization_id,
        created_at=service.created_at.isoformat(),
        updated_at=service.updated_at.isoformat() if service.updated_at else None,
        last_status_change=service.last_status_change.isoformat()
    )

@router.delete("/{service_id}")
async def delete_service(
    service_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Soft delete a service (mark as inactive)"""
    organization = get_user_organization(db, current_user)
    
    service = db.query(Service).filter(
        and_(
            Service.id == service_id,
            Service.organization_id == organization.id,
            Service.is_active == True
        )
    ).first()
    
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    # Soft delete (mark as inactive)
    service.is_active = False
    db.commit()
    
    return {"message": f"Service '{service.name}' has been deleted"}

@router.get("/{service_id}/history")
async def get_service_status_history(
    service_id: int,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get status history for a service"""
    organization = get_user_organization(db, current_user)
    
    service = db.query(Service).filter(
        and_(
            Service.id == service_id,
            Service.organization_id == organization.id,
            Service.is_active == True
        )
    ).first()
    
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    history = db.query(ServiceStatusHistory).filter(
        ServiceStatusHistory.service_id == service_id
    ).order_by(ServiceStatusHistory.created_at.desc()).limit(limit).all()
    
    return [
        {
            "id": entry.id,
            "status": entry.status.value,
            "previous_status": entry.previous_status.value if entry.previous_status else None,
            "reason": entry.reason,
            "automated": entry.automated,
            "created_at": entry.created_at.isoformat()
        } for entry in history
    ] 