# 🚀 Production Deployment - QUICK START

## Your GitHub Repository
**URL**: https://github.com/durgaprasadkummara-hub/AI-WORKFLOW-COPILOT  
**Status**: ✅ Code pushed and ready for deployment

---

## 📋 Deployment in 3 Steps

### **STEP 1: Deploy Frontend to Vercel** (2-3 minutes)

**Open**: https://vercel.com/new

1. Click **"Import Git Repository"**
2. Search for: `AI-WORKFLOW-COPILOT`
3. Click **"Import"**
4. Configure:
   - **Framework**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `frontend/dist`
5. Click **"Deploy"** → Vercel auto-deploys

**You'll get a URL like**: `https://ai-workflow-copilot.vercel.app`

---

### **STEP 2: Deploy Backend to Render** (10-15 minutes)

**Open**: https://dashboard.render.com

1. Click **"+ New"** → **"Web Service"**
2. Click **"Connect a Repository"** → Select `AI-WORKFLOW-COPILOT`
3. Configure:
   - **Name**: `ai-workflow-copilot-backend`
   - **Environment**: `Docker` ✅ (Dockerfile is ready)
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Auto-deploy**: Toggle **ON**
4. Click **"Create Web Service"** → Render builds & deploys

**You'll get a URL like**: `https://ai-workflow-copilot-backend.onrender.com`

---

### **STEP 3: Link Frontend to Backend** (1 minute)

**Go back to Vercel** after Render finishes:

1. Vercel Dashboard → Your Project → **Settings**
2. Go to **Environment Variables**
3. Update `VITE_API_BASE_URL`:
   ```
   https://ai-workflow-copilot-backend.onrender.com/api
   ```
4. Click **Save** → Vercel auto-redeploys

---

## ✅ Test Your Deployment

```bash
# Test Frontend
curl https://your-vercel-url.vercel.app/

# Test Backend
curl https://your-render-url.onrender.com/

# Test API
curl https://your-render-url.onrender.com/api/workflows
```

---

## 🔐 Optional: Set Up GitHub Secrets (for Auto-Deployment on Push)

If you want GitHub Actions to auto-deploy on every `git push`:

**Go to**: GitHub → Settings → Secrets and variables → Actions

Add these secrets:
- `VERCEL_TOKEN` - Get from https://vercel.com/account/tokens
- `VERCEL_ORG_ID` - Get from https://vercel.com/account/overview
- `VERCEL_PROJECT_ID` - Get from Vercel Project Settings

Then on every push to `main`, Vercel auto-deploys! 🎉

---

## 📚 Detailed Guides

For step-by-step instructions with environment variables, see:

- **PRODUCTION_DEPLOYMENT.md** - Full deployment walkthrough
- **OIDC_SETUP.md** - Configure authentication (Azure AD / Auth0)
- **DEPLOYMENT_CHECKLIST.md** - Post-deployment checklist

Or run the interactive guide:
```bash
node scripts/deploy-guide.js
```

---

## 🎯 Your Production URLs

Once deployed, share these:
- **Frontend**: https://your-project.vercel.app
- **Backend API**: https://your-backend.onrender.com

---

## 🔗 Quick Links

- Vercel Dashboard: https://vercel.com/dashboard
- Render Dashboard: https://dashboard.render.com
- GitHub Repo: https://github.com/durgaprasadkummara-hub/AI-WORKFLOW-COPILOT
- GitHub Secrets: https://github.com/durgaprasadkummara-hub/AI-WORKFLOW-COPILOT/settings/secrets/actions

---

## ⚡ That's It!

Your app is now production-ready with:
- ✅ Global CDN (Vercel frontend)
- ✅ Auto-scaling backend (Render)
- ✅ HTTPS everywhere
- ✅ Auto-deploying on git push
- ✅ Monitoring & logs built-in

**Next Step**: Authenticate users with OIDC (see OIDC_SETUP.md)

🚀 **You're live!**
