from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
import os
from contextlib import asynccontextmanager
from typing import List

from backend.app.core.database import engine, Base
from backend.app.api.v1.router import api_router
from backend.app.core.websocket_manager import ConnectionManager

# Create database tables
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown
    pass

# Initialize FastAPI app
app = FastAPI(
    title="Status Page API",
    description="A comprehensive status page application API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket manager
manager = ConnectionManager()

# Include API routes
app.include_router(api_router, prefix="/api/v1")

# Mount static files for frontend
static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="frontend")

@app.get("/api")
async def root():
    return {"message": "Status Page API is running", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Service is operational"}

# WebSocket endpoint for real-time updates
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            # Echo back for now - will implement proper message handling
            await manager.send_personal_message(f"Echo: {data}", websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"message": "Internal server error occurred"}
    )

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True
    ) 