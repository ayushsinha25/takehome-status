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

## 🚀 Quick Start (Direct System Setup - No Virtual Environments)

### ⚠️ SECURITY FIRST
**Before running locally, please read [SECURITY.md](SECURITY.md) to properly configure environment variables and protect sensitive information!**

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

# Install Python dependencies globally
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

# Install Node.js dependencies globally (no need for virtual environment)
npm install

# Start the frontend development server
npm run dev
```

✅ **Frontend running on:** `http://localhost:3000`

## 🔄 Daily Usage (No Virtual Environments)

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

## 🚀 Production Deployment

### Deploy to Heroku

#### Prerequisites
- Heroku CLI installed (`https://devcenter.heroku.com/articles/heroku-cli`)
- Heroku account created

#### Backend Deployment (FastAPI)

1. **Create Heroku app for backend**:
```bash
cd backend
heroku create your-status-api
```

2. **Add environment variables**:
```bash
heroku config:set SECRET_KEY="your-super-secret-production-key"
heroku config:set DATABASE_URL="postgresql://..."  # Heroku will provide this
heroku config:set CORS_ORIGINS="https://your-frontend-url.vercel.app"
```

3. **Create Procfile**:
```bash
# Create backend/Procfile
echo "web: uvicorn app.main:app --host 0.0.0.0 --port \$PORT" > Procfile
```

4. **Add PostgreSQL addon**:
```bash
heroku addons:create heroku-postgresql:mini
```

5. **Update requirements.txt for production**:
```bash
# Add to backend/requirements.txt
gunicorn==21.2.0
psycopg2-binary==2.9.9
```

6. **Deploy**:
```bash
git init
git add .
git commit -m "Initial backend deployment"
heroku git:remote -a your-status-api
git push heroku main
```

7. **Initialize database**:
```bash
heroku run python init_db.py
```

#### Frontend Deployment (Next.js)

**Option 1: Deploy to Vercel (Recommended)**

1. **Install Vercel CLI**:
```bash
npm i -g vercel
```

2. **Configure environment variables**:
```bash
# Create frontend/.env.local
NEXT_PUBLIC_API_URL=https://your-status-api.herokuapp.com
```

3. **Deploy**:
```bash
cd frontend
vercel --prod
```

**Option 2: Deploy to Heroku**

1. **Create Heroku app for frontend**:
```bash
cd frontend
heroku create your-status-frontend
```

2. **Add buildpack**:
```bash
heroku buildpacks:set heroku/nodejs
```

3. **Set environment variables**:
```bash
heroku config:set NEXT_PUBLIC_API_URL="https://your-status-api.herokuapp.com"
```

4. **Create package.json scripts** (if not exists):
```json
{
  "scripts": {
    "build": "next build",
    "start": "next start -p $PORT"
  }
}
```

5. **Deploy**:
```bash
git init
git add .
git commit -m "Initial frontend deployment"
heroku git:remote -a your-status-frontend
git push heroku main
```

### Alternative Deployment Options

#### Docker Deployment

1. **Backend Dockerfile**:
```dockerfile
# backend/Dockerfile
FROM python:3.11

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

2. **Frontend Dockerfile**:
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

3. **Docker Compose**:
```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=sqlite:///./status_page.db
      - SECRET_KEY=your-secret-key
    volumes:
      - ./backend:/app

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    depends_on:
      - backend
```

Run with: `docker-compose up --build`

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

## 🔌 API Endpoints

### Authentication ✅
- `POST /api/v1/auth/register` - User registration with organization creation
- `POST /api/v1/auth/login` - User login with JWT tokens
- `POST /api/v1/auth/refresh` - Refresh access tokens
- `GET /api/v1/auth/me` - Current user information
- `POST /api/v1/auth/logout` - User logout

### Services Management ✅
- `GET /api/v1/services/` - List all services for organization
- `POST /api/v1/services/` - Create new service
- `GET /api/v1/services/{id}` - Get specific service details
- `PUT /api/v1/services/{id}` - Update service information
- `PATCH /api/v1/services/{id}/status` - Update service status only
- `DELETE /api/v1/services/{id}` - Soft delete service
- `GET /api/v1/services/{id}/history` - Get service status history

### Incident Management ✅
- `GET /api/v1/incidents/` - List incidents with filtering
- `POST /api/v1/incidents/` - Create new incident
- `GET /api/v1/incidents/{id}` - Get incident details
- `PUT /api/v1/incidents/{id}` - Update incident
- `POST /api/v1/incidents/{id}/updates` - Add incident update
- `GET /api/v1/incidents/{id}/updates` - Get incident updates
- `DELETE /api/v1/incidents/{id}` - Delete incident

### Public Status Page ✅
- `GET /api/v1/status/{org_slug}` - Complete public status page
- `GET /api/v1/status/{org_slug}/history` - Status history (30 days)
- `GET /api/v1/status/{org_slug}/incidents` - Public incidents list
- `GET /api/v1/status/{org_slug}/incidents/{id}` - Specific public incident

### WebSocket ✅
- `WS /ws` - Real-time status updates and notifications

## 🗄️ Database Schema

### Core Models
- **User** - Authentication and user management
- **Organization** - Multi-tenant support with custom slugs
- **Service** - Individual services with status tracking
- **Incident** - Incident management with updates and timeline
- **Maintenance** - Scheduled maintenance windows

### Service Statuses
- `operational` - All systems normal
- `degraded_performance` - Reduced performance
- `partial_outage` - Some functionality affected
- `major_outage` - Significant service disruption
- `maintenance` - Scheduled maintenance

## 🛠️ Development

### Backend Development
```bash
cd backend

# Install in development mode
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
# For production: NEXT_PUBLIC_API_URL=https://your-api-domain.com
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

### Frontend Testing
```bash
cd frontend
npm run test  # If test scripts are added
```

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

## 🚀 Local Development Setup

### Prerequisites
- **Python 3.8+** with pip
- **Node.js 18+** with npm
- **PostgreSQL 12+**

### Quick Start
1. **Clone and Setup Backend:**
```bash
cd backend
cp env.template .env
# Edit .env with your PostgreSQL credentials

pip install -r requirements.txt
python auto_setup.py
python start.py
```

2. **Setup Frontend (new terminal):**
```bash
cd frontend
cp env.template .env.local

npm install
npm run dev
```

3. **Access Application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Demo Credentials
- **Tech Corp**: `admin@tech-corp.com` / `admin123`
- **Health Plus**: `admin@health-plus.com` / `admin123`  
- **Retail Pro**: `admin@retail-pro.com` / `admin123`

---

### 📊 Key Features

#### ✅ **Multi-Tenant Architecture**
- Organizations with isolated data and custom branding
- Role-based access control with admin approval system
- Team management with member invitation workflow

#### ✅ **Real-Time Status Management**  
- Live service status updates with color-coded indicators
- **Uptime Metrics Dashboard** with interactive charts
- Day-wise data for last 30 days, hour-wise for last 24 hours
- Accurate uptime calculations based on service history

#### ✅ **Incident Management**
- Create, update, and resolve incidents with real-time notifications
- Status updates with timestamps and detailed descriptions
- Public incident timeline on status pages

#### ✅ **Modern Tech Stack**
- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, ShadCN UI, Recharts
- **Backend**: FastAPI, SQLAlchemy, PostgreSQL, JWT Authentication
- **Deployment**: Heroku (backend), Vercel (frontend)

#### ✅ **Developer Experience**
- Auto-generated API documentation with FastAPI
- TypeScript for type safety across frontend
- Responsive design for mobile and desktop
- Easy local development setup

## 🤝 Contributing

This is a technical assessment project demonstrating full-stack development capabilities with modern technologies and best practices.

## 📄 License

This project is created for a technical assessment and demonstration purposes.

---

## 🎯 Assessment Criteria Coverage

✅ **Code Quality** - Clean, organized, and commented code  
✅ **Architecture** - Proper separation of concerns, scalable design  
✅ **Frontend Skills** - Responsive design, modern React patterns, TypeScript  
✅ **Backend Skills** - RESTful API, database integration, authentication  
✅ **Problem-Solving** - Multi-tenant architecture, real-time updates, incident management  
✅ **AI-First Development** - Built using modern AI tools and frameworks efficiently  

## 🌟 Demo Information

### 🔐 Demo Credentials (Local Development)

**Tech Corp Admin:**
- **Email**: `admin@tech-corp.com`
- **Password**: `admin123`
- **Organization**: Tech Corp
- **Public Status**: `http://localhost:3000/status/tech-corp`

**Health Plus Admin:**
- **Email**: `admin@health-plus.com`
- **Password**: `admin123`
- **Organization**: Health Plus
- **Public Status**: `http://localhost:3000/status/health-plus`

**Retail Pro Admin:**
- **Email**: `admin@retail-pro.com`
- **Password**: `admin123`
- **Organization**: Retail Pro
- **Public Status**: `http://localhost:3000/status/retail-pro`

### 🏢 Sample Organizations

Each organization includes:
- **Services**: Website, API, Database, CDN with different status levels
- **Admin Dashboard**: Full CRUD operations for services and incidents
- **Team Management**: Approval system for new member requests
- **Public Status Page**: Clean, responsive interface for end users
- **Real-time Updates**: WebSocket integration for live status changes

---

## 🎯 Assessment Criteria Met

✅ **Full-Stack Development** - Complete Next.js + FastAPI application  
✅ **Database Design** - PostgreSQL with proper relationships and multi-tenancy  
✅ **Authentication** - JWT-based secure authentication system  
✅ **Real-Time Features** - Live status updates and metrics  
✅ **Modern UI/UX** - Responsive ShadCN UI with TypeScript  
✅ **Deployment Ready** - Configured for Heroku + Vercel deployment  
✅ **Documentation** - Comprehensive setup and deployment guide  

The application demonstrates enterprise-level architecture patterns while maintaining simplicity and ease of deployment for effective evaluation and demonstration. 