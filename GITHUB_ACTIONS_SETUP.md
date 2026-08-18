# GitHub Actions Auto-Deployment Setup

## 🚀 Quick Setup (5 minutes)

Your GitHub Actions workflows are ready to auto-deploy on every `git push` to `main`. You just need to add 5 GitHub Secrets.

---

## Step 1: Get Your Tokens

### **Vercel Tokens**

1. Go to: https://vercel.com/account/tokens
2. Click **"Create Token"**
3. Name: `VERCEL_GITHUB_TOKEN` (or any name)
4. Copy the token (you'll need it in Step 2)

Then get your Org/Project IDs:
- Go to: https://vercel.com/account/overview
- Copy your **Team/Org ID**
- Go to your project in Vercel Dashboard → Settings → General
- Copy your **Project ID**

### **Render API Key**

1. Go to: https://dashboard.render.com/account/api-tokens
2. Click **"Create API Key"**
3. Copy the key (save it safely)

### **Render Service ID**

1. Go to: https://dashboard.render.com/services
2. Click your backend service: `ai-workflow-copilot-backend`
3. In the URL, you'll see: `https://dashboard.render.com/services/srv-xxxxx`
4. Copy the part starting with `srv-` (e.g., `srv-xxxxx`)

---

## Step 2: Add GitHub Secrets

1. Go to your GitHub repo: https://github.com/durgaprasadkummara-hub/AI-WORKFLOW-COPILOT
2. Click **Settings** (top right)
3. In left menu, click **Secrets and variables** → **Actions**
4. Click **"New repository secret"** and add these 5 secrets:

| Secret Name | Value | Where to Get |
|---|---|---|
| `VERCEL_TOKEN` | Your Vercel token | https://vercel.com/account/tokens |
| `VERCEL_ORG_ID` | Your Vercel Org/Team ID | https://vercel.com/account/overview |
| `VERCEL_PROJECT_ID` | Your Vercel Project ID | Vercel Dashboard → Project Settings → Project ID |
| `RENDER_API_KEY` | Your Render API key | https://dashboard.render.com/account/api-tokens |
| `RENDER_SERVICE_ID` | Your Render service ID | `srv-xxxxx` from your service dashboard URL |

---

## Step 3: Test Auto-Deploy

Make a test commit and push:

```bash
git commit --allow-empty -m "test: trigger auto-deploy"
git push origin main
```

Then watch the magic:

1. **GitHub Actions** runs automatically: https://github.com/durgaprasadkummara-hub/AI-WORKFLOW-COPILOT/actions
2. **Vercel** auto-deploys frontend (2-3 minutes): https://vercel.com/dashboard
3. **Render** auto-deploys backend (5-10 minutes): https://dashboard.render.com

---

## What Each Workflow Does

### **1. Frontend CI / Deploy to Vercel** (`frontend-deploy.yml`)
- **Triggers**: On push to `main`
- **Steps**:
  1. Install npm dependencies
  2. Build frontend (`npm run build`)
  3. Deploy to Vercel with `--prod` flag
- **Secrets needed**: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

### **2. Backend Build & Publish Image** (`backend-build-image.yml`)
- **Triggers**: On push to `main`
- **Steps**:
  1. Build multi-stage Docker image
  2. Publish to GitHub Container Registry (ghcr.io)
- **Secrets needed**: None (uses built-in `GITHUB_TOKEN`)

### **3. Backend Deploy to Render** (`render-deploy.yml`)
- **Triggers**: On push to `main` (only for backend files)
- **Steps**:
  1. Calls Render API to trigger deployment
  2. Render pulls latest code and rebuilds
- **Secrets needed**: `RENDER_API_KEY`, `RENDER_SERVICE_ID`

---

## ✅ Verification

After adding secrets, check these links:

**GitHub Secrets Added?**
- https://github.com/durgaprasadkummara-hub/AI-WORKFLOW-COPILOT/settings/secrets/actions
  - Should show all 5 secrets (values hidden)

**Workflows Running?**
- https://github.com/durgaprasadkummara-hub/AI-WORKFLOW-COPILOT/actions
  - Should show 3 workflows in history
  - On next push, all 3 will run in parallel

**Deployments Happening?**
- Vercel: https://vercel.com/dashboard → Click project → "Deployments"
- Render: https://dashboard.render.com → Click service → "Logs"

---

## 🔄 Auto-Deploy Flow

After you set up secrets, here's what happens on every `git push origin main`:

```
1. You: git push origin main
   ↓
2. GitHub receives commit
   ↓
3. GitHub Actions triggers 3 workflows in parallel:
   ├─ Frontend CI / Deploy to Vercel
   ├─ Backend Build & Publish Image
   └─ Backend Deploy to Render
   ↓
4. Frontend deployed: https://your-project.vercel.app (2-3 min)
5. Backend deployed: https://your-backend.onrender.com (5-10 min)
   ↓
6. Your changes are live in production! 🎉
```

---

## 📋 Detailed Secret Instructions

### **Get VERCEL_TOKEN**

1. Visit: https://vercel.com/account/tokens
2. Click "Create Token"
3. Fill in:
   - **Token Name**: `VERCEL_GITHUB_DEPLOY`
   - **Expiration**: No expiration (or set to 1 year)
   - **Scope**: Full Account
4. Click "Create"
5. Copy the token (you won't see it again!)
6. Go to GitHub Secrets and add it

### **Get VERCEL_ORG_ID**

1. Visit: https://vercel.com/account/overview
2. Look for **Team/Org ID** (shows as `acme` or similar)
3. Copy it

### **Get VERCEL_PROJECT_ID**

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Click on your project: `ai-workflow-copilot`
3. Go to **Settings** → **General**
4. Look for **Project ID** (starts with `prj_`)
5. Copy it

### **Get RENDER_API_KEY**

1. Visit: https://dashboard.render.com/account/api-tokens
2. Click "Create API Key"
3. Copy immediately (won't be shown again)

### **Get RENDER_SERVICE_ID**

1. Visit: https://dashboard.render.com
2. Click your service: `ai-workflow-copilot-backend`
3. Look at the URL: `https://dashboard.render.com/services/srv-xxxxx`
4. Copy the `srv-xxxxx` part
   - Example: `srv-cdo6p7dcmphs73d11v40`

---

## 🛠️ Troubleshooting

### **"Workflow failed" error**

Check GitHub Actions logs: https://github.com/durgaprasadkummara-hub/AI-WORKFLOW-COPILOT/actions

**Common issues:**
- Missing secrets → Add all 5 to GitHub Settings
- Wrong secret values → Double-check IDs match exactly
- Vercel/Render account issues → Verify tokens are valid

### **"Secret not found" in workflow**

Make sure the secret name matches exactly:
- `VERCEL_TOKEN` (not `vercel_token`)
- `VERCEL_ORG_ID` (not `VercelOrgId`)
- etc.

### **Deploy is slow**

Expected times:
- Vercel: 2-3 minutes
- Render: 5-10 minutes (builds from scratch)
- Total: 10-15 minutes for both

### **Manual deploy if workflow fails**

```bash
# Redeploy in Vercel
# → Go to Vercel Dashboard → Deployments → Click latest → "Redeploy"

# Redeploy in Render
# → Go to Render Dashboard → Service → "Manual Deploy"
```

---

## 📚 More Info

- **Vercel GitHub Integration**: https://vercel.com/docs/concepts/git
- **Render GitHub Integration**: https://render.com/docs/github
- **GitHub Actions**: https://docs.github.com/en/actions
- **GitHub Secrets**: https://docs.github.com/en/actions/security-guides/encrypted-secrets

---

## ✨ That's It!

Once secrets are added, you're set for auto-deployment. Every `git push origin main` will automatically:
- ✅ Deploy frontend to Vercel
- ✅ Deploy backend to Render
- ✅ Run tests (optional, add to workflow)
- ✅ Notify you of success/failure

No manual deployment steps needed anymore! 🚀
