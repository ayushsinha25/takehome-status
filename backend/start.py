#!/usr/bin/env python3
"""
Startup script for the Status Page API
"""
import uvicorn
import os
import sys

if __name__ == "__main__":
    # Load environment variables from .env file
    from decouple import config
    
    # Check if .env file exists
    if not os.path.exists('.env'):
        print("❌ .env file not found!")
        print("💡 Please create a .env file from env.template and set your actual values")
        print("   cp env.template .env")
        print("   # Then edit .env with your actual database credentials and secret key")
        sys.exit(1)
    
    # Try to load required environment variables using decouple
    try:
        database_url = config('DATABASE_URL')
        secret_key = config('SECRET_KEY')
        print("✅ Environment variables loaded successfully")
        print(f"✅ Database URL configured")
        print(f"✅ Secret key configured")
    except Exception as e:
        print(f"❌ Error loading environment variables: {e}")
        print("💡 Please check your .env file format")
        sys.exit(1)
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 