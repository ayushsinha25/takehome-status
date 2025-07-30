from fastapi import APIRouter

from backend.app.api.v1.endpoints import auth, services, incidents, status, metrics

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(services.router, prefix="/services", tags=["services"])
api_router.include_router(incidents.router, prefix="/incidents", tags=["incidents"])
api_router.include_router(status.router, prefix="/status", tags=["status"])
api_router.include_router(metrics.router, prefix="/metrics", tags=["metrics"]) 