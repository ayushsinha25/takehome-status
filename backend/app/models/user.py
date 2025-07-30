from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class UserRole(enum.Enum):
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"

class MembershipStatus(enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    DENIED = "denied"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships  
    organizations = relationship("OrganizationMember", back_populates="user", foreign_keys="OrganizationMember.user_id")
    created_services = relationship("Service", back_populates="created_by")
    created_incidents = relationship("Incident", back_populates="created_by")

class OrganizationMember(Base):
    __tablename__ = "organization_members"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    requested_role = Column(Enum(UserRole), default=UserRole.MEMBER)  # Role requested during signup
    role = Column(Enum(UserRole), nullable=True)  # Actual role assigned by admin
    status = Column(Enum(MembershipStatus), default=MembershipStatus.PENDING)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())  # Request time
    approved_at = Column(DateTime(timezone=True), nullable=True)  # Approval time
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Admin who approved
    
    # Relationships
    user = relationship("User", back_populates="organizations", foreign_keys="OrganizationMember.user_id") 
    organization = relationship("Organization", back_populates="members")
    approver = relationship("User", foreign_keys="OrganizationMember.approved_by") 