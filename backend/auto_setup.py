#!/usr/bin/env python3
"""
Automatic PostgreSQL Setup Script for Status Page Application
"""

import sys
import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from sqlalchemy.orm import Session

# Load environment variables from .env file
from decouple import config

# Check if .env file exists and has required variables
if not os.path.exists('.env'):
    print("❌ .env file not found!")
    print("💡 Please create .env file from env.template:")
    print("   cp env.template .env")
    print("   # Then edit .env with your actual PostgreSQL credentials")
    sys.exit(1)

from app.core.database import engine, Base, get_db
from app.core.auth import get_password_hash
from app.models.user import User, OrganizationMember, UserRole, MembershipStatus
from app.models.organization import Organization

def create_database():
    """Create PostgreSQL database if it doesn't exist"""
    try:
        # Get connection details from environment variables
        db_name = config("DB_NAME", default="status_page_db")
        username = config("DB_USER", default="postgres")
        password = config("DB_PASSWORD", default="")
        host = config("DB_HOST", default="localhost")
        port = config("DB_PORT", default="5432")
        
        if not password:
            print("❌ Database password not found in environment!")
            print("💡 Please set DB_PASSWORD in your .env file")
            return False
        
        print(f"🔗 Connecting to PostgreSQL server...")
        
        # Connect to PostgreSQL server (to postgres database)
        conn = psycopg2.connect(
            host=host,
            port=port,
            database='postgres',  # Connect to default postgres database
            user=username,
            password=password
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db_name,))
        exists = cursor.fetchone()
        
        if not exists:
            cursor.execute(f"CREATE DATABASE {db_name}")
            print(f"✅ Created database: {db_name}")
        else:
            print(f"✅ Database already exists: {db_name}")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Failed to create database: {e}")
        print(f"💡 Make sure PostgreSQL is running and password is correct")
        return False

def setup_organizations_and_admins():
    """Set up organizations with admin accounts"""
    try:
        print(f"📊 Creating database tables...")
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created")
        
        # Get database session
        db = next(get_db())
        
        organizations_data = [
            {
                "name": "Tech Corp",
                "slug": "tech-corp", 
                "description": "Leading technology solutions company",
                "website_url": "https://tech-corp.com",
                "admin_email": "admin@tech-corp.com",
                "admin_name": "Tech Corp Admin",
                "admin_username": "techcorp_admin"
            },
            {
                "name": "Health Plus",
                "slug": "health-plus",
                "description": "Healthcare and wellness services",
                "website_url": "https://health-plus.com", 
                "admin_email": "admin@health-plus.com",
                "admin_name": "Health Plus Admin",
                "admin_username": "healthplus_admin"
            },
            {
                "name": "Retail Pro",
                "slug": "retail-pro",
                "description": "E-commerce and retail solutions",
                "website_url": "https://retail-pro.com",
                "admin_email": "admin@retail-pro.com", 
                "admin_name": "Retail Pro Admin",
                "admin_username": "retailpro_admin"
            }
        ]
        
        created_accounts = []
        admin_password = "admin123"
        
        print("\n🏢 Setting up Organizations with Admin Accounts")
        print("=" * 60)
        
        for org_data in organizations_data:
            try:
                # Check if organization already exists
                existing_org = db.query(Organization).filter(Organization.slug == org_data["slug"]).first()
                if existing_org:
                    print(f"⚠️  Organization '{org_data['name']}' already exists, skipping...")
                    continue
                    
                # Check if admin user already exists
                existing_user = db.query(User).filter(User.email == org_data["admin_email"]).first()
                if existing_user:
                    print(f"⚠️  Admin user '{org_data['admin_email']}' already exists, skipping...")
                    continue
                
                # Create organization
                organization = Organization(
                    name=org_data["name"],
                    slug=org_data["slug"],
                    description=org_data["description"],
                    website_url=org_data["website_url"],
                    is_public=True,
                    branding_enabled=True
                )
                db.add(organization)
                db.flush()  # Get the ID
                
                # Create admin user
                admin_user = User(
                    email=org_data["admin_email"],
                    username=org_data["admin_username"], 
                    full_name=org_data["admin_name"],
                    hashed_password=get_password_hash(admin_password),
                    is_active=True,
                    is_verified=True
                )
                db.add(admin_user)
                db.flush()  # Get the ID
                
                # Create admin membership (auto-approved)
                from sqlalchemy.sql import func
                admin_membership = OrganizationMember(
                    user_id=admin_user.id,
                    organization_id=organization.id,
                    requested_role=UserRole.ADMIN,
                    role=UserRole.ADMIN,
                    status=MembershipStatus.APPROVED,
                    approved_by=admin_user.id,  # Self-approved
                    approved_at=func.now()
                )
                db.add(admin_membership)
                
                db.commit()
                
                # Store credentials
                created_accounts.append({
                    "organization": org_data["name"],
                    "slug": org_data["slug"],
                    "admin_email": org_data["admin_email"],
                    "admin_password": admin_password,
                    "status_url": f"http://localhost:3000/status/{org_data['slug']}"
                })
                
                print(f"✅ Created: {org_data['name']} with admin {org_data['admin_email']}")
                
            except Exception as e:
                print(f"❌ Error creating {org_data['name']}: {str(e)}")
                db.rollback()
        
        # Print credentials summary
        print("\n" + "=" * 60)
        print("🔐 ADMIN CREDENTIALS CREATED")
        print("=" * 60)
        
        for account in created_accounts:
            print(f"\n🏢 {account['organization']} ({account['slug']})")
            print(f"   📧 Email: {account['admin_email']}")
            print(f"   🔑 Password: {account['admin_password']}")
            print(f"   🌍 Status Page: {account['status_url']}")
            print(f"   🔗 Login: http://localhost:3000/login")
        
        print(f"\n📊 Total Organizations Created: {len(created_accounts)}")
        print("💡 These admins can now approve/deny membership requests!")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"❌ Failed to setup organizations: {e}")
        return False

def main():
    """Main setup function"""
    print("🐘 Automatic PostgreSQL Status Page Setup")
    print("=" * 50)
    
    # Create database
    print(f"\n📊 Creating database: status_page_db")
    if not create_database():
        sys.exit(1)
    
    # Setup organizations and admins
    print(f"\n🏢 Setting up organizations and admin accounts...")
    if not setup_organizations_and_admins():
        sys.exit(1)
    
    print(f"\n✅ PostgreSQL setup complete!")
    print(f"\n🚀 You can now start the backend server with: python start.py")

if __name__ == "__main__":
    main() 