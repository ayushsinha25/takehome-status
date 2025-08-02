from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class ServiceStatus(enum.Enum):
    OPERATIONAL = "operational"
    DEGRADED_PERFORMANCE = "degraded_performance"
    PARTIAL_OUTAGE = "partial_outage"
    MAJOR_OUTAGE = "major_outage"
    MAINTENANCE = "maintenance"

class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(Text)
    status = Column(Enum(ServiceStatus), default=ServiceStatus.OPERATIONAL)
    
    # Service configuration
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)  # For custom ordering
    
    # Monitoring settings
    monitoring_url = Column(String)  # URL to ping for health checks
    monitoring_enabled = Column(Boolean, default=False)
    monitoring_interval = Column(Integer, default=300)  # 5 minutes in seconds
    
    # Foreign keys
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_status_change = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    organization = relationship("Organization", back_populates="services")
    created_by = relationship("User", back_populates="created_services", foreign_keys="Service.created_by_id")
    incidents = relationship("Incident", secondary="incident_services", back_populates="affected_services")
    status_history = relationship("ServiceStatusHistory", back_populates="service", order_by="ServiceStatusHistory.created_at.desc()")

class ServiceStatusHistory(Base):
    __tablename__ = "service_status_history"
    
    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    status = Column(Enum(ServiceStatus), nullable=False)
    previous_status = Column(Enum(ServiceStatus))
    reason = Column(Text)  # Reason for status change
    automated = Column(Boolean, default=False)  # Was this change automated or manual?
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    service = relationship("Service", back_populates="status_history") 