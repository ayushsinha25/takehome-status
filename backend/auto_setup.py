#!/usr/bin/env python3
"""
Automatic PostgreSQL Setup Script for Status Page Application
"""

import sys
import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from psycopg2 import sql
from sqlalchemy.orm import Session

# Load environment variables from .env file (local) or environment (Heroku)
from decouple import config

# Check if we're running on Heroku (has DATABASE_URL) or locally (needs .env)
if not os.environ.get('DATABASE_URL') and not os.path.exists('.env'):
    print("[ERROR] .env file not found and no DATABASE_URL environment variable!")
    print("[INFO] Please create .env file from env.template:")
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
        # Check if we have DATABASE_URL (Heroku) or individual config vars (local)
        database_url = os.environ.get('DATABASE_URL')
        
        if database_url:
            # On Heroku, use DATABASE_URL
            print(f"[CONNECT] Using Heroku DATABASE_URL...")
            # Heroku PostgreSQL databases are already created, just verify connection
            import urllib.parse
            result = urllib.parse.urlparse(database_url)
            
            # Test connection to the actual database
            conn = psycopg2.connect(
                host=result.hostname,
                port=result.port,
                database=result.path[1:],  # Remove leading slash
                user=result.username,
                password=result.password
            )
            print(f"[OK] Connected to Heroku PostgreSQL database")
            conn.close()
            return True
        else:
            # Local development - get connection details from environment variables
            db_name = config("DB_NAME", default="status_page_db")
            username = config("DB_USER", default="postgres")
            password = config("DB_PASSWORD", default="")
            host = config("DB_HOST", default="localhost")
            port = config("DB_PORT", default="5432")
            
            if not password:
                print("[ERROR] Database password not found in environment!")
                print("[INFO] Please set DB_PASSWORD in your .env file")
                return False
            
            print(f"[CONNECT] Connecting to PostgreSQL server...")
            
            # Connect to PostgreSQL server (to postgres database)
            conn = None
            cursor = None
            try:
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
                    # Use identifier escaping for database name to prevent SQL injection
                    cursor.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(db_name)))
                    print(f"[OK] Created database: {db_name}")
                else:
                    print(f"[OK] Database already exists: {db_name}")
                
                return True
                
            finally:
                if cursor:
                    cursor.close()
                if conn:
                    conn.close()
        
    except Exception as e:
        print(f"[ERROR] Failed to create database: {e}")
        print(f"[INFO] Make sure PostgreSQL is running and password is correct")
        return False

def setup_organizations_and_admins():
    """Set up organizations with admin accounts"""
    try:
        print(f"[SETUP] Creating database tables...")
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("[OK] Database tables created")
        
        # Get database session
        db = next(get_db())
        
        try:
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
            # Use environment variable for admin password or default
            admin_password = config("ADMIN_PASSWORD", default="admin123")
            
            print("\n[ORG] Setting up Organizations with Admin Accounts")
            print("=" * 60)
            
            for org_data in organizations_data:
                try:
                    # Check if organization already exists
                    existing_org = db.query(Organization).filter(Organization.slug == org_data["slug"]).first()
                    if existing_org:
                        print(f"[WARN] Organization '{org_data['name']}' already exists, skipping...")
                        continue
                        
                    # Check if admin user already exists
                    existing_user = db.query(User).filter(User.email == org_data["admin_email"]).first()
                    if existing_user:
                        print(f"[WARN] Admin user '{org_data['admin_email']}' already exists, skipping...")
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
                    
                    print(f"[OK] Created: {org_data['name']} with admin {org_data['admin_email']}")
                    
                except Exception as e:
                    print(f"[ERROR] Error creating {org_data['name']}: {str(e)}")
                    db.rollback()
            
            # Print credentials summary
            print("\n" + "=" * 60)
            print("[CREDS] ADMIN CREDENTIALS CREATED")
            print("=" * 60)
            
            for account in created_accounts:
                print(f"\n[ORG] {account['organization']} ({account['slug']})")
                print(f"   [EMAIL] Email: {account['admin_email']}")
                print(f"   [PASS] Password: {account['admin_password']}")
                print(f"   [URL] Status Page: {account['status_url']}")
                print(f"   [CONNECT] Login: http://localhost:3000/login")
            
            print(f"\n[SETUP] Total Organizations Created: {len(created_accounts)}")
            print("[INFO] These admins can now approve/deny membership requests!")
            
            return True
            
        finally:
            if db:
                db.close()
        
    except Exception as e:
        print(f"[ERROR] Failed to setup organizations: {e}")
        return False

def main():
    """Main setup function"""
    print("[DB] Automatic PostgreSQL Status Page Setup")
    print("=" * 50)
    
    # Create database
    print(f"\n[SETUP] Creating database: status_page_db")
    if not create_database():
        sys.exit(1)
    
    # Setup organizations and admins
    print(f"\n[ORG] Setting up organizations and admin accounts...")
    if not setup_organizations_and_admins():
        sys.exit(1)
    
    print(f"\n[OK] PostgreSQL setup complete!")
    print(f"\n[RUN] You can now start the backend server with: python start.py")
    
if __name__ == "__main__":
    main() 