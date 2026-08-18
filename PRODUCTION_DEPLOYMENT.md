# Production Deployment Guide

Complete end-to-end guide for deploying the AI Workflow Copilot to production with CI/CD automation.

## Architecture Overview

```
GitHub Repository
    ↓
GitHub Actions (CI/CD)
    ├→ Frontend: Build → Vercel Deploy
    └→ Backend: Build Docker → GitHub Container Registry → Render Deploy

Production URLs
    ├→ Frontend: https://your-frontend-domain.vercel.app
    └→ Backend: https://your-backend-domain.onrender.com
```

---

## Prerequisites

- GitHub account with this project as a public or private repository
- [Vercel account](https://vercel.com) (free tier sufficient)
- [Render account](https://render.com) (free tier sufficient)
- OIDC provider configured (see [OIDC_SETUP.md](./OIDC_SETUP.md))

---

## Step 1: Push to GitHub

### Create GitHub Repository

```bash
# If you haven't already initialized git
git init
git add .
git commit -m "Initial commit: AI Workflow Copilot"

# Create repo on GitHub UI: https://github.com/new
# Name: ai-workflow-copilot
# Make it public or private based on preference

# Add remote and push
git remote add origin https://github.com/YOUR_USERNAME/ai-workflow-copilot.git
git branch -M main
git push -u origin main
```

---

## Step 2: Set Up Frontend Deployment (Vercel)

### 2.1 Create Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. **Import Git Repository** → Select your GitHub repo
4. **Framework Preset**: Select **Vite**
5. **Build & Output Settings**:
   - **Build Command**: `npm run build`
   - **Output Directory**: `frontend/dist`
   - **Root Directory**: Leave blank (monorepo at project root)

### 2.2 Configure Environment Variables

In Vercel project settings → **Environment Variables**, add:

```
VITE_API_BASE_URL=https://your-backend-url.onrender.com/api
VITE_OIDC_AUTHORITY=https://your-oidc-provider.com
VITE_OIDC_CLIENT_ID=your-client-id
VITE_OIDC_REDIRECT_URI=https://your-frontend-domain.vercel.app/auth/callback
VITE_OIDC_SCOPE=openid profile email
```

### 2.3 Deploy

Click **Deploy**. Vercel will automatically trigger on git push to main.

### 2.4 Update OIDC Provider

Update your OIDC provider (Azure AD/Auth0) with new redirect URI:
- **Allowed Redirect URI**: `https://your-frontend-domain.vercel.app/auth/callback`
- **Allowed Logout URL**: `https://your-frontend-domain.vercel.app/`

---

## Step 3: Set Up Backend Deployment (Render)

### 3.1 Create Render Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **+ New** → **Web Service**
3. **Connect a Repository** → Select your GitHub repo
4. **Service Settings**:
   - **Name**: `ai-workflow-copilot-backend`
   - **Environment**: `Docker`
   - **Region**: Choose closest to your users
   - **Branch**: `main`

### 3.2 Build & Deploy Configuration

Render will auto-detect the `Dockerfile` in project root. Configure:

- **Docker Command**: Leave blank (uses default ENTRYPOINT)
- **Plan**: `Free` (includes 750 compute hours/month)

### 3.3 Configure Environment Variables

In Render settings → **Environment**, add:

```bash
# OIDC/Auth
AUTH_ISSUER=https://your-oidc-provider.com
AUTH_JWKS_URI=https://your-oidc-provider.com/.well-known/jwks.json
AUTH_AUDIENCE=your-oidc-audience

# Database (Render provides SQLite by default)
DATABASE_URL=file:./prisma/dev.db

# Optional: Observability
LOG_LEVEL=info
NODE_ENV=production
```

### 3.4 Deploy

Click **Create Web Service**. Render will build and deploy automatically.

**Initial deployment may take 10-15 minutes.** Monitor in **Logs** tab.

---

## Step 4: Automate with GitHub Actions (Optional but Recommended)

### 4.1 Create GitHub Secrets

1. Go to GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Add secrets:

```
VERCEL_TOKEN          → Get from https://vercel.com/account/tokens
VERCEL_ORG_ID         → From Vercel dashboard URL or settings
VERCEL_PROJECT_ID     → From Vercel project settings

RENDER_API_KEY        → Get from https://dashboard.render.com/account/api-tokens
RENDER_SERVICE_ID     → From Render service URL (last part)
```

### 4.2 GitHub Actions Already Configured

Workflows are already in `.github/workflows/`:

- **frontend-deploy.yml**: Auto-deploys frontend on push to main
- **backend-build-image.yml**: Auto-builds Docker image and pushes to GitHub Container Registry

These are triggered automatically on every push to `main` branch.

---

## Step 5: Verify Production Deployment

### 5.1 Test Frontend

```bash
# Visit your Vercel URL
https://your-frontend-domain.vercel.app

# Test sign-in flow
# 1. Click "Sign In"
# 2. Login with OIDC provider
# 3. Should redirect back and show user info
```

### 5.2 Test Backend API

```bash
# Get access token from browser localStorage after signing in
# Or use curl with Authorization header

curl -H "Authorization: Bearer <your-token>" \
  https://your-backend-url.onrender.com/api/workflows

# Should return: { "success": true, "workflows": [...] }
```

### 5.3 Test Workflow Editor

1. Visit frontend URL
2. Sign in via OIDC
3. Navigate to **Editor** tab
4. Drag workflow nodes
5. Click **Save Workflow**
6. Check backend API `/api/workflows` for saved workflow

---

## Step 6: Configure Custom Domain (Optional)

### Frontend (Vercel)

1. Vercel dashboard → Your project → **Settings** → **Domains**
2. Add your domain (e.g., `app.example.com`)
3. Follow DNS setup instructions

### Backend (Render)

1. Render dashboard → Your service → **Settings** → **Custom Domain**
2. Add your domain (e.g., `api.example.com`)
3. Follow DNS setup instructions

### Update OIDC Provider

After setting custom domains, update OIDC provider redirect URIs:

- **Frontend Redirect**: `https://app.example.com/auth/callback`
- **API Audience**: `https://api.example.com`

---

## Step 7: Production Best Practices

### Database Backup (Render)

1. Render SQLite is ephemeral. For production, upgrade to Render Postgres:
   - Create new Postgres database in Render
   - Update `DATABASE_URL` env var
   - Run migration: `npx prisma migrate deploy`

### Monitor Health

Set up monitoring:

```bash
# Backend health check
curl https://your-backend-url.onrender.com/

# Should return:
# { "status": "ok", "timestamp": "2024-01-15T..." }
```

### Enable Logging

Update environment variables:

```bash
LOG_LEVEL=debug         # For troubleshooting
NODE_ENV=production     # Disable dev features
```

### Update Secrets Regularly

- Rotate OIDC client secrets every 6-12 months
- Regenerate GitHub tokens periodically
- Review Render service logs for errors

---

## Step 8: CI/CD Pipeline Overview

### On Every Git Push to `main`:

1. **GitHub Actions Triggered**
   - Runs linting and type checks
   - Builds frontend (Vite bundle)
   - Builds backend Docker image

2. **Frontend Pipeline**
   - Vite build → frontend/dist/
   - Deploy to Vercel via API
   - Automatic domain provisioning

3. **Backend Pipeline**
   - Docker build
   - Push to ghcr.io (GitHub Container Registry)
   - Render auto-pulls latest image (if webhook configured)

### Monitor Deployments

```bash
# GitHub Actions
https://github.com/YOUR_USERNAME/ai-workflow-copilot/actions

# Vercel Deployments
https://vercel.com/YOUR_USERNAME/ai-workflow-copilot

# Render Deployments
https://dashboard.render.com → Select service → Logs
```

---

## Troubleshooting

### Frontend Blank After Deploy

**Symptom**: Vercel deployment shows 200 but frontend is blank
**Fix**:
- Check `VITE_API_BASE_URL` env var in Vercel
- Verify backend health: `curl https://backend-url.onrender.com/`

### Backend Crashes on Render

**Symptom**: 502 Bad Gateway, logs show crash
**Fix**:
- Check logs: Render dashboard → Service → Logs
- Verify `DATABASE_URL` env var is set
- Ensure `NODE_ENV=production`
- Check free tier resource limits

### OIDC Sign-In Loops

**Symptom**: Redirect loop between frontend and OIDC provider
**Fix**:
- Verify `VITE_OIDC_REDIRECT_URI` matches OIDC provider config
- Check console for error: usually "redirect_uri_mismatch"

### 401 Unauthorized on API

**Symptom**: API returns 401 even with valid token
**Fix**:
- Verify `AUTH_ISSUER` matches token issuer
- Verify `AUTH_AUDIENCE` matches token audience
- Decode token at [jwt.io](https://jwt.io) to check claims

---

## Rollback to Previous Version

### Vercel

1. Vercel dashboard → Your project → **Deployments**
2. Find previous deployment
3. Click **...** → **Promote to Production**

### Render

1. Render dashboard → Service → **Events**
2. Find previous deployment
3. Click **Redeploy** to restore

---

## Next Steps

1. ✅ Push code to GitHub
2. ✅ Deploy frontend to Vercel
3. ✅ Deploy backend to Render
4. ✅ Configure OIDC redirect URIs for production domains
5. ✅ Test sign-in flow end-to-end
6. ✅ Configure custom domains (optional)
7. ✅ Set up monitoring and alerts
8. ✅ Plan database strategy (upgrade from SQLite for production)

For local development, see [README.md](./README.md) and [QUICK_START.md](./QUICK_START.md).

For OIDC provider setup, see [OIDC_SETUP.md](./OIDC_SETUP.md).
