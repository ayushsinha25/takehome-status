#!/usr/bin/env python3
"""
Database initialization script for Status Page application.
This script creates the database tables and optionally adds sample data.
"""

import os
import sys
from datetime import datetime, timedelta

# Add the app directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine, Base, SessionLocal
from app.models.user import User, OrganizationMember, UserRole
from app.models.organization import Organization
from app.models.service import Service, ServiceStatus, ServiceStatusHistory
from app.models.incident import Incident, IncidentStatus, IncidentSeverity, IncidentUpdate
from app.core.auth import get_password_hash

def init_database():
    """Initialize database tables"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully!")

def create_sample_data():
    """Create sample data for testing"""
    db = SessionLocal()
    
    try:
        print("\n🎯 Creating sample data...")
        
        # Check if data already exists
        existing_user = db.query(User).first()
        if existing_user:
            print("⚠️  Sample data already exists. Skipping...")
            return
        
        # Create sample user
        print("👤 Creating sample user...")
        sample_user = User(
            email="admin@example.com",
            username="admin",
            full_name="Admin User",
            hashed_password=get_password_hash("password123"),
            is_active=True,
            is_verified=True
        )
        db.add(sample_user)
        db.commit()
        db.refresh(sample_user)
        print(f"   ✅ User created: {sample_user.email}")
        
        # Create sample organization
        print("🏢 Creating sample organization...")
        sample_org = Organization(
            name="Acme Corp",
            slug="acme-corp",
            description="A sample company status page",
            website_url="https://acme-corp.com",
            is_public=True,
            branding_enabled=True
        )
        db.add(sample_org)
        db.commit()
        db.refresh(sample_org)
        print(f"   ✅ Organization created: {sample_org.name}")
        
        # Add user to organization as admin
        print("👥 Adding user to organization...")
        membership = OrganizationMember(
            user_id=sample_user.id,
            organization_id=sample_org.id,
            role=UserRole.ADMIN
        )
        db.add(membership)
        db.commit()
        print(f"   ✅ User added as admin to organization")
        
        # Create sample services
        print("🔧 Creating sample services...")
        services_data = [
            {
                "name": "Website",
                "description": "Main company website",
                "status": ServiceStatus.OPERATIONAL,
                "monitoring_url": "https://acme-corp.com",
                "monitoring_enabled": True,
                "sort_order": 1
            },
            {
                "name": "API",
                "description": "REST API service",
                "status": ServiceStatus.OPERATIONAL,
                "monitoring_url": "https://api.acme-corp.com/health",
                "monitoring_enabled": True,
                "sort_order": 2
            },
            {
                "name": "Database",
                "description": "Primary database cluster",
                "status": ServiceStatus.DEGRADED_PERFORMANCE,
                "monitoring_enabled": False,
                "sort_order": 3
            },
            {
                "name": "CDN",
                "description": "Content delivery network",
                "status": ServiceStatus.OPERATIONAL,
                "monitoring_enabled": False,
                "sort_order": 4
            }
        ]
        
        services = []
        for service_data in services_data:
            service = Service(
                name=service_data["name"],
                description=service_data["description"],
                status=service_data["status"],
                monitoring_url=service_data.get("monitoring_url"),
                monitoring_enabled=service_data["monitoring_enabled"],
                sort_order=service_data["sort_order"],
                organization_id=sample_org.id,
                created_by_id=sample_user.id
            )
            db.add(service)
            services.append(service)
        
        db.commit()
        
        # Refresh services to get IDs
        for service in services:
            db.refresh(service)
            print(f"   ✅ Service created: {service.name} ({service.status.value})")
            
            # Create initial status history
            status_history = ServiceStatusHistory(
                service_id=service.id,
                status=service.status,
                reason="Initial service setup",
                automated=False
            )
            db.add(status_history)
        
        db.commit()
        
        # Create sample incident
        print("🚨 Creating sample incident...")
        sample_incident = Incident(
            title="Database Performance Issues",
            description="We are experiencing slower response times due to database performance issues. Our team is investigating and working on a resolution.",
            status=IncidentStatus.MONITORING,
            severity=IncidentSeverity.MEDIUM,
            organization_id=sample_org.id,
            created_by_id=sample_user.id
        )
        db.add(sample_incident)
        db.commit()
        db.refresh(sample_incident)
        
        # Link incident to database service
        database_service = next((s for s in services if s.name == "Database"), None)
        if database_service:
            sample_incident.affected_services.append(database_service)
            db.commit()
        
        print(f"   ✅ Incident created: {sample_incident.title}")
        
        # Create incident updates
        print("📝 Creating incident updates...")
        updates_data = [
            {
                "title": "Investigating",
                "message": "We are investigating reports of database performance issues affecting response times.",
                "status": IncidentStatus.INVESTIGATING,
                "created_at": datetime.utcnow() - timedelta(hours=2)
            },
            {
                "title": "Issue Identified",
                "message": "We have identified the root cause as a database query optimization issue. Our team is implementing a fix.",
                "status": IncidentStatus.IDENTIFIED,
                "created_at": datetime.utcnow() - timedelta(hours=1)
            },
            {
                "title": "Monitoring Fix",
                "message": "The fix has been deployed and we are monitoring the system for improvements.",
                "status": IncidentStatus.MONITORING,
                "created_at": datetime.utcnow() - timedelta(minutes=30)
            }
        ]
        
        for i, update_data in enumerate(updates_data):
            incident_update = IncidentUpdate(
                incident_id=sample_incident.id,
                title=update_data["title"],
                message=update_data["message"],
                status=update_data["status"]
            )
            # Manually set created_at to simulate timeline
            db.add(incident_update)
            db.commit()
            db.refresh(incident_update)
            
            # Update the incident status to match latest update
            if i == len(updates_data) - 1:  # Last update
                sample_incident.status = update_data["status"]
        
        db.commit()
        print(f"   ✅ Created {len(updates_data)} incident updates")
        
        print("\n🎉 Sample data created successfully!")
        print("\n📋 Sample Data Summary:")
        print(f"   👤 User: {sample_user.email} (password: password123)")
        print(f"   🏢 Organization: {sample_org.name} (slug: {sample_org.slug})")
        print(f"   🔧 Services: {len(services)} services created")
        print(f"   🚨 Incidents: 1 sample incident with updates")
        print(f"\n🌐 Access URLs:")
        print(f"   📊 API Documentation: http://localhost:8000/docs")
        print(f"   🔐 Login endpoint: http://localhost:8000/api/v1/auth/login")
        print(f"   📈 Public status: http://localhost:8000/api/v1/status/{sample_org.slug}")
        
    except Exception as e:
        print(f"❌ Error creating sample data: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def main():
    """Main function"""
    print("🚀 Status Page Database Initialization")
    print("=" * 50)
    
    try:
        # Initialize database
        init_database()
        
        # Ask user if they want sample data
        while True:
            create_samples = input("\n💡 Create sample data for testing? (y/n): ").lower().strip()
            if create_samples in ['y', 'yes']:
                create_sample_data()
                break
            elif create_samples in ['n', 'no']:
                print("✅ Database initialized without sample data.")
                break
            else:
                print("Please enter 'y' or 'n'")
        
        print("\n🎯 Next Steps:")
        print("1. Start the API server: python start.py")
        print("2. Open API docs: http://localhost:8000/docs")
        print("3. Test authentication with sample user (if created)")
        print("4. Connect your frontend to the API")
        
    except Exception as e:
        print(f"\n❌ Initialization failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 