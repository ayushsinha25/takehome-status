# 🔒 Security Setup Guide

## ⚠️ IMPORTANT: Before uploading to GitHub!

This guide helps you secure your project before making it public.

## 🛡️ Pre-Upload Security Checklist

### ✅ **Step 1: Environment Configuration**

**Backend Setup:**
```bash
cd backend

# Create your local environment file
cp env.template .env

# Edit .env with your actual credentials
# NEVER commit this file to GitHub!
```

**Required variables in backend/.env:**
```env
DATABASE_URL=postgresql://postgres:YOUR_ACTUAL_PASSWORD@localhost:5432/status_page_db
SECRET_KEY=your-actual-super-long-secret-key-generate-a-new-one
DB_PASSWORD=YOUR_ACTUAL_POSTGRES_PASSWORD
```

**Frontend Setup:**
```bash
cd frontend

# Create your local environment file
cp env.template .env.local

# Edit .env.local with your API URL
```

### ✅ **Step 2: Generate Secure Keys**

**Create a strong SECRET_KEY:**
```python
# Run this in Python to generate a secure key
import secrets
print(secrets.token_urlsafe(64))
```

**Update your backend/.env:**
```env
SECRET_KEY=your-generated-key-here
```

### ✅ **Step 3: Verify .gitignore Protection**

**Check what will be uploaded:**
```bash
git status
git add .
git status
```

**Make sure these are NOT in the staging area:**
- `.env` files
- `*.db` files
- `__pycache__/` folders
- `node_modules/` folder
- Any files with actual passwords

### ✅ **Step 4: Safe GitHub Upload**

```bash
# Initialize git (if not already done)
git init

# Add all files (protected by .gitignore)
git add .

# Check what's being committed
git status

# Commit with a clean message
git commit -m "feat: complete status page application

- Multi-tenant status page system
- Admin dashboard with RBAC
- Real-time WebSocket updates
- PostgreSQL database with proper relationships
- Next.js frontend with TypeScript
- FastAPI backend with JWT authentication"

# Add your GitHub repository
git remote add origin https://github.com/YOUR_USERNAME/status-page-app.git

# Push to GitHub
git push -u origin main
```

## 🔍 What's Protected

### ✅ **Files that WILL be uploaded (safe):**
- Source code files (`.py`, `.ts`, `.tsx`, `.js`)
- Configuration templates (`env.template`)
- Documentation (`README.md`, `SECURITY.md`)
- Package files (`package.json`, `requirements.txt`)
- Static assets and components

### ❌ **Files that WON'T be uploaded (protected):**
- `.env` - Your actual environment variables
- `.env.local` - Local frontend config
- `*.db` - Database files
- `__pycache__/` - Python cache files
- `node_modules/` - Node.js dependencies
- `start-*.bat` - Your local batch scripts

## 🚀 Setting Up on New Machines

When someone clones your repository:

1. **They copy templates to create their own env files:**
```bash
cp backend/env.template backend/.env
cp frontend/env.template frontend/.env.local
```

2. **They update with their own credentials:**
- Database password
- Secret keys
- API URLs

3. **They run setup:**
```bash
cd backend
python auto_setup.py  # Uses their .env file
python start.py

cd ../frontend
npm install
npm run dev
```

## 🎯 Production Deployment

For production, use environment variables through your hosting platform:

**Heroku:**
```bash
heroku config:set SECRET_KEY="your-production-key"
heroku config:set DATABASE_URL="your-production-db-url"
```

**Vercel:**
```bash
vercel env add SECRET_KEY production
vercel env add NEXT_PUBLIC_API_URL production
```

## 🆘 If You Already Exposed Secrets

If you accidentally committed sensitive information:

1. **Change all passwords and keys immediately**
2. **Remove sensitive data from git history:**
```bash
# Remove sensitive file from all commits
git filter-branch --force --index-filter \
'git rm --cached --ignore-unmatch path/to/sensitive/file' \
--prune-empty --tag-name-filter cat -- --all

# Force push (DANGER: only if repository is private or just created)
git push origin --force --all
```

3. **Consider creating a new repository for a clean start**

## ✅ Verification Commands

**Before pushing to GitHub:**
```bash
# Check what git will upload
git ls-files

# Verify no secrets in staged files
git diff --cached | grep -i password
git diff --cached | grep -i secret
git diff --cached | grep -i key

# If any secrets found, remove them before committing!
```

---

**Remember: Once something is pushed to GitHub, assume it's public forever!** 