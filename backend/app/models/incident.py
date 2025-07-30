from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum, Text, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.app.core.database import Base
import enum

class IncidentStatus(enum.Enum):
    INVESTIGATING = "investigating"
    IDENTIFIED = "identified"
    MONITORING = "monitoring"
    RESOLVED = "resolved"

class IncidentSeverity(enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

# Association table for incident-service many-to-many relationship
incident_services = Table(
    'incident_services',
    Base.metadata,
    Column('incident_id', Integer, ForeignKey('incidents.id')),
    Column('service_id', Integer, ForeignKey('services.id'))
)

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=False)
    status = Column(Enum(IncidentStatus), default=IncidentStatus.INVESTIGATING)
    severity = Column(Enum(IncidentSeverity), default=IncidentSeverity.MEDIUM)
    
    # Timestamps
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Foreign keys
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    organization = relationship("Organization", back_populates="incidents")
    created_by = relationship("User", back_populates="created_incidents", foreign_keys="Incident.created_by_id")
    affected_services = relationship("Service", secondary=incident_services, back_populates="incidents")
    updates = relationship("IncidentUpdate", back_populates="incident", order_by="IncidentUpdate.created_at.desc()")

class IncidentUpdate(Base):
    __tablename__ = "incident_updates"
    
    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    status = Column(Enum(IncidentStatus), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    incident = relationship("Incident", back_populates="updates")

class Maintenance(Base):
    __tablename__ = "maintenances"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=False)
    
    # Scheduling
    scheduled_start = Column(DateTime(timezone=True), nullable=False)
    scheduled_end = Column(DateTime(timezone=True), nullable=False)
    actual_start = Column(DateTime(timezone=True))
    actual_end = Column(DateTime(timezone=True))
    
    # Status
    is_completed = Column(Boolean, default=False)
    is_cancelled = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Foreign keys
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    
    # Relationships
    organization = relationship("Organization", back_populates="maintenances") 