# Status Page Application

A comprehensive status page application built with Next.js + ShadCN UI frontend and FastAPI backend, similar to services like StatusPage, Cachet, or Betterstack.

## 🏗️ Architecture

### Frontend (Next.js + ShadCN UI)
- **Location**: `./frontend/`
- **Tech Stack**: Next.js 15, TypeScript, Tailwind CSS, ShadCN UI
- **Features**: Responsive design, real-time updates, modern UI components, uptime metrics with charts

### Backend (FastAPI)
- **Location**: `./backend/`  
- **Tech Stack**: FastAPI, SQLAlchemy, PostgreSQL/SQLite, JWT Authentication
- **Features**: RESTful API, multi-tenant architecture, uptime calculation, metrics API

## 🚀 Local System Deployment

### Prerequisites
- **Python 3.8+** with pip (for backend)
- **Node.js 18+** with npm (for frontend)
- **PostgreSQL 12+** (database)
- **Git** (for cloning the repository)

### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd takehome-status
```

### Step 2: Install PostgreSQL
1. Download and install PostgreSQL from: https://www.postgresql.org/download/
2. Remember your `postgres` user password during installation
3. Ensure PostgreSQL service is running

### Step 3: Configure Environment Variables
```bash
# Backend environment setup
cd backend
cp env.template .env
# Edit .env with your actual PostgreSQL password and generate a secure SECRET_KEY

# Frontend environment setup  
cd ../frontend
cp env.template .env.local
# Edit .env.local if needed (default values usually work for local development)
```

### Step 4: Backend Setup

```bash
# Navigate to backend directory  
cd backend

# Install Python dependencies
pip install fastapi uvicorn[standard] sqlalchemy psycopg2-binary python-jose[cryptography] passlib[bcrypt] python-decouple python-multipart

# Set up PostgreSQL database and create organizations with admin accounts
python auto_setup.py
# This will use your .env file for database connection
# Creates 3 organizations with admin accounts

# Start the backend server
python start.py
```

✅ **Backend running on:** `http://localhost:8000`
- **API Documentation**: `http://localhost:8000/docs`
- **Alternative docs**: `http://localhost:8000/redoc`

### Step 5: Frontend Setup

```bash
# Navigate to frontend directory (in a new terminal)
cd frontend

# Install Node.js dependencies
npm install

# Start the frontend development server
npm run dev
```

✅ **Frontend running on:** `http://localhost:3000`

## 🔄 Daily Usage

### Option 1: Using Batch Scripts (Windows)
Simply double-click these files:
- **Backend**: `start-backend.bat`
- **Frontend**: `start-frontend.bat`

### Option 2: Manual Command Line
**Terminal 1 - Backend:**
```bash
cd E:\takehome-status\backend
python start.py
```

**Terminal 2 - Frontend:**
```bash
cd E:\takehome-status\frontend  
npm run dev
```

**To stop the servers:** Press `Ctrl+C` in each terminal

## 🌐 Application URLs

### Development URLs
- **🏠 Landing Page**: `http://localhost:3000`
- **🔐 Login Page**: `http://localhost:3000/login`
- **📝 Register Page**: `http://localhost:3000/register`
- **📊 Admin Dashboard**: `http://localhost:3000/dashboard` (requires login)

### Public Status Pages (no auth required)
- **Tech Corp**: `http://localhost:3000/status/tech-corp`
- **Health Plus**: `http://localhost:3000/status/health-plus`
- **Retail Pro**: `http://localhost:3000/status/retail-pro`

### API URLs
- **📚 API Documentation**: `http://localhost:8000/docs`
- **🔗 API Base**: `http://localhost:8000/api/v1`
- **📈 Organizations API**: `http://localhost:8000/api/v1/auth/organizations`

## 🎯 Demo Credentials

**Admin Login Credentials** (created by auto_setup.py):

### Tech Corp
- **Email**: `admin@tech-corp.com`
- **Password**: `admin123`
- **Public Status URL**: `/status/tech-corp`

### Health Plus  
- **Email**: `admin@health-plus.com`
- **Password**: `admin123`
- **Public Status URL**: `/status/health-plus`

### Retail Pro
- **Email**: `admin@retail-pro.com`  
- **Password**: `admin123`
- **Public Status URL**: `/status/retail-pro`

## 🛠️ Development

### Backend Development
```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run with hot reload
python start.py

# Initialize database
python init_db.py
```

### Frontend Development
```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### Environment Configuration

**Backend Environment** (`backend/.env`):
```env
# Database
DATABASE_URL=sqlite:///./status_page.db
# For production: DATABASE_URL=postgresql://username:password@host/database

# JWT Configuration  
SECRET_KEY=your-super-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Application
ENVIRONMENT=development
DEBUG=True

# CORS
CORS_ORIGINS=http://localhost:3000
```

**Frontend Environment** (`frontend/.env.local`):
```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 🧪 Testing

### Manual Testing Flow

1. **Start both servers** (backend on :8000, frontend on :3000)
2. **Visit landing page**: `http://localhost:3000`
3. **Register account** with organization name
4. **Login to dashboard** and explore admin features
5. **View public status**: `http://localhost:3000/status/your-org-slug`
6. **Test API endpoints**: `http://localhost:8000/docs`

### API Testing
```bash
# Test authentication
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'

# Test public status
curl http://localhost:8000/api/v1/status/acme-corp
```

## 🚨 Troubleshooting

### Common Issues

**Backend won't start:**
```bash
# Install missing dependencies
pip install pydantic[email] email-validator

# Check Python version
python --version  # Should be 3.8+
```

**Frontend build errors:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Database errors:**
```bash
# Reinitialize database
cd backend
rm status_page.db  # Remove existing database
python init_db.py  # Create fresh database
```

**CORS errors:**
- Ensure backend CORS_ORIGINS includes frontend URL
- Check that both servers are running on correct ports

## 📱 Key Features

### ✅ Implemented Features
- **🔐 User Authentication** - JWT-based auth with login/register
- **🏢 Multi-tenant Organizations** - Each org has its own status page
- **🔧 Service Management** - Complete CRUD operations for services
- **🚨 Incident Management** - Create, update, resolve incidents
- **📊 Dashboard Interface** - Admin interface for managing services
- **🌍 Public Status Pages** - Customer-facing status pages
- **📈 Status History** - Track service uptime and incidents
- **⚡ Real-time Updates** - WebSocket infrastructure ready
- **📱 Responsive Design** - Works on desktop, tablet, and mobile

### 🎯 Status Page Features
- **Overall System Status** - Calculated from all service statuses
- **Service Status Indicators** - 5 status levels (Operational → Major Outage)
- **Active Incidents** - Real-time incident updates and timeline
- **Recent Incidents** - 30-day incident history
- **Uptime Statistics** - Service availability percentages
- **Organization Branding** - Custom organization information

## 📚 Tech Stack Details

### Frontend Stack
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety and better DX
- **Tailwind CSS** - Utility-first styling
- **ShadCN UI** - Modern, accessible components
- **Axios** - HTTP client with interceptors
- **React Context** - Authentication state management
- **Lucide React** - Beautiful icons
- **Sonner** - Toast notifications
- **Date-fns** - Date utilities

### Backend Stack
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - Python ORM with relationships
- **SQLite/PostgreSQL** - Database options
- **Pydantic** - Data validation and serialization
- **JWT** - Secure authentication tokens
- **WebSocket** - Real-time communication
- **Python-JOSE** - JWT implementation
- **Passlib** - Password hashing
- **Uvicorn** - ASGI server

## 🤝 Contributing

This is a technical assessment project demonstrating full-stack development capabilities with modern technologies and best practices.

## 📄 License

This project is created for a technical assessment and demonstration purposes.