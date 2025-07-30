from fastapi import APIRouter

from backend.app.api.v1.endpoints import auth, users, organizations, services, incidents, status, metrics

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(organizations.router, prefix="/organizations", tags=["organizations"])
api_router.include_router(services.router, prefix="/services", tags=["services"])
api_router.include_router(incidents.router, prefix="/incidents", tags=["incidents"])
api_router.include_router(status.router, prefix="/status", tags=["public-status"])
api_router.include_router(metrics.router, prefix="/metrics", tags=["metrics"]) 