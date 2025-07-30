from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.app.core.database import Base

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    slug = Column(String, unique=True, index=True, nullable=False)  # For public URLs
    description = Column(Text)
    website_url = Column(String)
    logo_url = Column(String)
    
    # Status page settings
    custom_domain = Column(String)  # Optional custom domain
    is_public = Column(Boolean, default=True)
    branding_enabled = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    members = relationship("OrganizationMember", back_populates="organization")
    services = relationship("Service", back_populates="organization")
    incidents = relationship("Incident", back_populates="organization")
    maintenances = relationship("Maintenance", back_populates="organization") 