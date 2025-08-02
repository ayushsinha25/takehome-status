from fastapi import WebSocket
from typing import List, Dict
import json
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Store active connections
        self.active_connections: List[WebSocket] = []
        # Store connections by organization for multi-tenant support
        self.organization_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, organization_id: str = None):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        self.active_connections.append(websocket)
        
        # Add to organization-specific connections if provided
        if organization_id:
            if organization_id not in self.organization_connections:
                self.organization_connections[organization_id] = []
            self.organization_connections[organization_id].append(websocket)
        
        logger.info(f"New WebSocket connection. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        
        # Remove from organization connections
        for org_id, connections in self.organization_connections.items():
            if websocket in connections:
                connections.remove(websocket)
                break
        
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Send a message to a specific WebSocket connection"""
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
            self.disconnect(websocket)

    async def send_json_to_connection(self, data: dict, websocket: WebSocket):
        """Send JSON data to a specific WebSocket connection"""
        try:
            await websocket.send_json(data)
        except Exception as e:
            logger.error(f"Error sending JSON message: {e}")
            self.disconnect(websocket)

    async def broadcast_message(self, message: str):
        """Broadcast a message to all connected clients"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting message: {e}")
                disconnected.append(connection)
        
        # Remove disconnected connections
        for connection in disconnected:
            self.disconnect(connection)

    async def broadcast_json(self, data: dict):
        """Broadcast JSON data to all connected clients"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except Exception as e:
                logger.error(f"Error broadcasting JSON: {e}")
                disconnected.append(connection)
        
        # Remove disconnected connections
        for connection in disconnected:
            self.disconnect(connection)

    async def broadcast_to_organization(self, message: str, organization_id: str):
        """Broadcast a message to all clients in a specific organization"""
        if organization_id not in self.organization_connections:
            return
        
        disconnected = []
        for connection in self.organization_connections[organization_id]:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting to organization: {e}")
                disconnected.append(connection)
        
        # Remove disconnected connections
        for connection in disconnected:
            self.disconnect(connection)

    async def broadcast_json_to_organization(self, data: dict, organization_id: str):
        """Broadcast JSON data to all clients in a specific organization"""
        if organization_id not in self.organization_connections:
            return
        
        disconnected = []
        for connection in self.organization_connections[organization_id]:
            try:
                await connection.send_json(data)
            except Exception as e:
                logger.error(f"Error broadcasting JSON to organization: {e}")
                disconnected.append(connection)
        
        # Remove disconnected connections
        for connection in disconnected:
            self.disconnect(connection)

    async def notify_status_change(self, service_id: str, status: str, organization_id: str = None):
        """Send status change notification"""
        notification = {
            "type": "status_change",
            "service_id": service_id,
            "status": status,
            "timestamp": str(int(__import__('time').time()))
        }
        
        if organization_id:
            await self.broadcast_json_to_organization(notification, organization_id)
        else:
            await self.broadcast_json(notification)

    async def notify_incident_update(self, incident_id: str, status: str, organization_id: str = None):
        """Send incident update notification"""
        notification = {
            "type": "incident_update",
            "incident_id": incident_id,
            "status": status,
            "timestamp": str(int(__import__('time').time()))
        }
        
        if organization_id:
            await self.broadcast_json_to_organization(notification, organization_id)
        else:
            await self.broadcast_json(notification) 