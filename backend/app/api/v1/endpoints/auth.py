from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional

from backend.app.core.database import get_db
from backend.app.core.auth import (
    authenticate_user, 
    create_access_token, 
    create_refresh_token,
    get_password_hash,
    verify_token,
    get_current_user
)
from backend.app.models.user import User
from backend.app.models.organization import Organization
from backend.app.models.user import OrganizationMember, UserRole, MembershipStatus

router = APIRouter()

# Pydantic models
class UserRegister(BaseModel):
    email: EmailStr
    username: str
    full_name: str
    password: str
    organization_id: Optional[int] = None  # Select existing organization
    requested_role: str = "member"  # Role user wants (admin, member, viewer)
    organization_name: Optional[str] = None  # Only if creating new organization

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class MembershipApprovalRequest(BaseModel):
    membership_id: int
    action: str  # "approve" or "deny"
    role: Optional[str] = None  # Role to assign if approving

@router.post("/register")
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user with organization membership request"""
    
    # Check if user already exists
    existing_user = db.query(User).filter(
        (User.email == user_data.email) | (User.username == user_data.username)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email or username already exists"
        )
    
    # Validate requested role
    try:
        requested_role = UserRole(user_data.requested_role.lower())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be admin, member, or viewer"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        username=user_data.username,
        full_name=user_data.full_name,
        hashed_password=hashed_password,
        is_active=True,
        is_verified=True
    )
    
    db.add(db_user)
    db.flush()  # Get the user ID
    
    organization = None
    membership_status = MembershipStatus.PENDING
    user_role = None
    
    try:
        # Handle organization membership
        if user_data.organization_id:
            # Join existing organization (requires approval)
            organization = db.query(Organization).filter(
                Organization.id == user_data.organization_id
            ).first()
            
            if not organization:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Organization not found"
                )
            
            # Create pending membership
            membership = OrganizationMember(
                user_id=db_user.id,
                organization_id=organization.id,
                requested_role=requested_role,
                role=None,  # Will be set when approved
                status=MembershipStatus.PENDING
            )
            db.add(membership)
            
        elif user_data.organization_name:
            # Create new organization (immediate admin access)
            import re
            slug = re.sub(r'[^a-zA-Z0-9\s]', '', user_data.organization_name.lower())
            slug = re.sub(r'\s+', '-', slug.strip())
            
            # Ensure unique slug
            counter = 1
            original_slug = slug
            while db.query(Organization).filter(Organization.slug == slug).first():
                slug = f"{original_slug}-{counter}"
                counter += 1
            
            organization = Organization(
                name=user_data.organization_name,
                slug=slug,
                description=f"Organization for {user_data.organization_name}",
                is_public=True,
                branding_enabled=True
            )
            
            db.add(organization)
            db.flush()  # Get the organization ID
            
            # Add user as admin (auto-approved)
            from sqlalchemy.sql import func
            membership = OrganizationMember(
                user_id=db_user.id,
                organization_id=organization.id,
                requested_role=UserRole.ADMIN,
                role=UserRole.ADMIN,
                status=MembershipStatus.APPROVED,
                approved_by=db_user.id,
                approved_at=func.now()
            )
            db.add(membership)
            membership_status = MembershipStatus.APPROVED
            user_role = UserRole.ADMIN
        
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Must select an organization or create a new one"
            )
        
        db.commit()
        
        # Return registration status
        if membership_status == MembershipStatus.PENDING:
            return {
                "message": "Registration successful! Your membership request is pending admin approval.",
                "user": {
                    "id": db_user.id,
                    "email": db_user.email,
                    "username": db_user.username,
                    "full_name": db_user.full_name,
                },
                "organization": {
                    "id": organization.id,
                    "name": organization.name,
                    "slug": organization.slug
                },
                "membership_status": membership_status.value,
                "requested_role": requested_role.value,
                "can_login": False
            }
        else:
            # Auto-approved (new organization admin)
            access_token = create_access_token(data={"sub": str(db_user.id)})
            refresh_token = create_refresh_token(data={"sub": str(db_user.id)})
            
            return {
                "message": "Registration successful! You are now the admin of your organization.",
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
                "user": {
                    "id": db_user.id,
                    "email": db_user.email,
                    "username": db_user.username,
                    "full_name": db_user.full_name,
                    "organization_id": organization.id,
                    "organization_name": organization.name
                },
                "membership_status": membership_status.value,
                "role": user_role.value if user_role else None,
                "can_login": True
            }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )

@router.post("/login")
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """Login user with email and password"""
    
    user = authenticate_user(db, user_data.email, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user's approved memberships
    approved_membership = db.query(OrganizationMember).filter(
        OrganizationMember.user_id == user.id,
        OrganizationMember.status == MembershipStatus.APPROVED
    ).first()
    
    # Check for pending memberships if no approved ones
    if not approved_membership:
        pending_membership = db.query(OrganizationMember).filter(
            OrganizationMember.user_id == user.id,
            OrganizationMember.status == MembershipStatus.PENDING
        ).first()
        
        if pending_membership:
            org = db.query(Organization).filter(
                Organization.id == pending_membership.organization_id
            ).first()
            
            return {
                "can_login": False,
                "membership_status": "pending",
                "message": f"Your membership request to {org.name} is still pending admin approval. Please wait for approval to access the dashboard.",
                "organization": {
                    "id": org.id,
                    "name": org.name,
                    "slug": org.slug
                },
                "requested_role": pending_membership.requested_role.value
            }
        
        # Check for denied memberships
        denied_membership = db.query(OrganizationMember).filter(
            OrganizationMember.user_id == user.id,
            OrganizationMember.status == MembershipStatus.DENIED
        ).first()
        
        if denied_membership:
            org = db.query(Organization).filter(
                Organization.id == denied_membership.organization_id
            ).first()
            
            return {
                "can_login": False,
                "membership_status": "denied",
                "message": f"Your membership request to {org.name} was denied. Please contact an admin or try joining a different organization.",
                "organization": {
                    "id": org.id,
                    "name": org.name,
                    "slug": org.slug
                }
            }
        
        # No organization membership at all
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No organization membership found. Please register with an organization first."
        )
    
    # Get organization details
    organization = db.query(Organization).filter(
        Organization.id == approved_membership.organization_id
    ).first()
    
    # Create tokens for approved users
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return {
        "can_login": True,
        "membership_status": "approved",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name,
            "organization_id": organization.id if organization else None,
            "organization_name": organization.name if organization else None,
            "role": approved_membership.role.value if approved_membership.role else None
        }
    }

@router.post("/refresh", response_model=dict)
async def refresh_token(token_data: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Refresh access token using refresh token"""
    
    try:
        payload = verify_token(token_data.refresh_token, "refresh")
        user_id = payload.get("sub")
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Verify user still exists and is active
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Create new access token
        access_token = create_access_token(data={"sub": user_id})
        
        return {
            "access_token": access_token,
            "token_type": "bearer"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

@router.get("/me")
async def get_current_user_info(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user information"""
    
    # Get user's organizations
    memberships = db.query(OrganizationMember).filter(
        OrganizationMember.user_id == current_user.id
    ).all()
    
    organizations = []
    for membership in memberships:
        org = db.query(Organization).filter(Organization.id == membership.organization_id).first()
        if org:
            organizations.append({
                "id": org.id,
                "name": org.name,
                "slug": org.slug,
                "role": membership.role.value
            })
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "is_active": current_user.is_active,
        "is_verified": current_user.is_verified,
        "organizations": organizations
    }

@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout user (client should discard tokens)"""
    return {"message": "Successfully logged out"}

@router.get("/organizations")
async def get_available_organizations(db: Session = Depends(get_db)):
    """Get list of organizations available for joining"""
    organizations = db.query(Organization).filter(Organization.is_public == True).all()
    
    return [
        {
            "id": org.id,
            "name": org.name,
            "slug": org.slug,
            "description": org.description,
            "website_url": org.website_url
        }
        for org in organizations
    ]

@router.get("/pending-memberships")
async def get_pending_memberships(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get pending membership requests for organizations where current user is admin"""
    
    # Get organizations where current user is admin
    admin_memberships = db.query(OrganizationMember).filter(
        OrganizationMember.user_id == current_user.id,
        OrganizationMember.role == UserRole.ADMIN,
        OrganizationMember.status == MembershipStatus.APPROVED
    ).all()
    
    org_ids = [m.organization_id for m in admin_memberships]
    
    if not org_ids:
        return []
    
    # Get pending membership requests for these organizations
    pending_requests = db.query(OrganizationMember).filter(
        OrganizationMember.organization_id.in_(org_ids),
        OrganizationMember.status == MembershipStatus.PENDING
    ).all()
    
    results = []
    for request in pending_requests:
        user = db.query(User).filter(User.id == request.user_id).first()
        org = db.query(Organization).filter(Organization.id == request.organization_id).first()
        
        if user and org:
            results.append({
                "id": request.id,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "username": user.username,
                    "full_name": user.full_name
                },
                "organization": {
                    "id": org.id,
                    "name": org.name,
                    "slug": org.slug
                },
                "requested_role": request.requested_role.value,
                "joined_at": request.joined_at.isoformat()
            })
    
    return results

@router.post("/approve-membership")
async def approve_membership(
    request: MembershipApprovalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve or deny a membership request"""
    
    # Get the membership request
    membership = db.query(OrganizationMember).filter(
        OrganizationMember.id == request.membership_id,
        OrganizationMember.status == MembershipStatus.PENDING
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membership request not found"
        )
    
    # Check if current user is admin of the organization
    admin_membership = db.query(OrganizationMember).filter(
        OrganizationMember.user_id == current_user.id,
        OrganizationMember.organization_id == membership.organization_id,
        OrganizationMember.role == UserRole.ADMIN,
        OrganizationMember.status == MembershipStatus.APPROVED
    ).first()
    
    if not admin_membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to manage this organization"
        )
    
    if request.action.lower() == "approve":
        # Validate role if provided
        role_to_assign = membership.requested_role  # Default to requested role
        if request.role:
            try:
                role_to_assign = UserRole(request.role.lower())
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid role"
                )
        
        # Approve membership
        from sqlalchemy.sql import func
        membership.status = MembershipStatus.APPROVED
        membership.role = role_to_assign
        membership.approved_by = current_user.id
        membership.approved_at = func.now()
        
        db.commit()
        
        # Get user info for response
        user = db.query(User).filter(User.id == membership.user_id).first()
        org = db.query(Organization).filter(Organization.id == membership.organization_id).first()
        
        return {
            "message": f"Membership approved for {user.full_name}",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name
            },
            "organization": {
                "id": org.id,
                "name": org.name
            },
            "assigned_role": role_to_assign.value,
            "status": "approved"
        }
        
    elif request.action.lower() == "deny":
        # Deny membership
        membership.status = MembershipStatus.DENIED
        membership.approved_by = current_user.id
        membership.approved_at = func.now()
        
        db.commit()
        
        # Get user info for response
        user = db.query(User).filter(User.id == membership.user_id).first()
        org = db.query(Organization).filter(Organization.id == membership.organization_id).first()
        
        return {
            "message": f"Membership denied for {user.full_name}",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name
            },
            "organization": {
                "id": org.id,
                "name": org.name
            },
            "status": "denied"
        }
    
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Action must be 'approve' or 'deny'"
        ) 