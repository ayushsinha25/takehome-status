from fastapi import APIRouter, Depends
from app.core.auth import get_current_user
from app.models.user import User

router = APIRouter()
 
@router.get("/")
async def get_organizations(current_user: User = Depends(get_current_user)):
    """Get user's organizations"""
    return {"message": "Organizations endpoint - to be implemented"} 