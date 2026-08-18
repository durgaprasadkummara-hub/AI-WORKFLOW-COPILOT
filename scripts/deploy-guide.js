#!/usr/bin/env node

/**
 * AI Workflow Copilot - Production Deployment Guide
 * This script provides step-by-step instructions for deploying to Vercel and Render
 */

const fs = require('fs');
const path = require('path');

const BLUE = '\x1b[34m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function log(color, text) {
  console.log(`${color}${text}${RESET}`);
}

function header(text) {
  console.log('\n' + '='.repeat(60));
  log(BLUE, text);
  console.log('='.repeat(60) + '\n');
}

async function checkPrerequisites() {
  log(BLUE, 'Checking prerequisites...\n');

  const { execSync } = require('child_process');

  try {
    execSync('git --version', { stdio: 'pipe' });
    log(GREEN, '✓ Git installed');
  } catch {
    log('❌ Git not found. Please install Git.');
    process.exit(1);
  }

  try {
    execSync('node --version', { stdio: 'pipe' });
    log(GREEN, '✓ Node.js installed');
  } catch {
    log('❌ Node.js not found. Please install Node.js.');
    process.exit(1);
  }

  try {
    execSync('npm --version', { stdio: 'pipe' });
    log(GREEN, '✓ npm installed\n');
  } catch {
    log('❌ npm not found. Please install npm.');
    process.exit(1);
  }
}

async function displayVercelInstructions() {
  header('VERCEL FRONTEND DEPLOYMENT');

  console.log(`${YELLOW}Step 1: Create Vercel Project${RESET}
1. Open: https://vercel.com/new
2. Click "Import Git Repository"
3. Select your repository: "AI-WORKFLOW-COPILOT"
4. Click "Import"

${YELLOW}Step 2: Configure Build Settings${RESET}
- Framework Preset: Vite
- Build Command: npm run build
- Output Directory: frontend/dist
- Environment Variables:

  VITE_API_BASE_URL
  (Set this to your Render backend URL after deployment, e.g., https://your-backend.onrender.com/api)

  VITE_OIDC_AUTHORITY
  (Your OIDC provider authority, e.g., https://login.microsoftonline.com/{tenant-id}/v2.0)

  VITE_OIDC_CLIENT_ID
  (Your OIDC client ID)

  VITE_OIDC_REDIRECT_URI
  (Will be your Vercel domain, e.g., https://your-project.vercel.app/auth/callback)

  VITE_OIDC_SCOPE
  openid profile email

${YELLOW}Step 3: Deploy${RESET}
- Click "Deploy"
- Wait for deployment to complete (2-3 minutes)
- Note your Vercel URL: https://your-project.vercel.app

`);
}

async function displayRenderInstructions() {
  header('RENDER BACKEND DEPLOYMENT');

  console.log(`${YELLOW}Step 1: Create Render Web Service${RESET}
1. Open: https://dashboard.render.com
2. Click "+ New" → "Web Service"
3. Click "Connect a Repository"
4. Select: "AI-WORKFLOW-COPILOT"
5. Click "Connect"

${YELLOW}Step 2: Configure Service${RESET}
- Name: ai-workflow-copilot-backend
- Environment: Docker
- Region: Select closest to your location
- Branch: main
- Auto-deploy: Toggle ON

${YELLOW}Step 3: Add Environment Variables${RESET}
Click "Advanced" → "Environment Variables" and add:

  AUTH_ISSUER
  https://login.microsoftonline.com/{tenant-id}/v2.0

  AUTH_JWKS_URI
  https://login.microsoftonline.com/{tenant-id}/discovery/v2.0/keys

  AUTH_AUDIENCE
  (Your OIDC client ID)

  DATABASE_URL
  file:./prisma/dev.db

  NODE_ENV
  production

  LOG_LEVEL
  info

  PORT
  4001

${YELLOW}Step 4: Deploy${RESET}
- Click "Create Web Service"
- Wait for deployment (10-15 minutes)
- Note your Render URL: https://your-backend.onrender.com

`);
}

async function displayGitHubSecretsInstructions() {
  header('GITHUB SECRETS (OPTIONAL - FOR CI/CD)');

  console.log(`If you want GitHub Actions to automatically deploy on every push to main:

${YELLOW}For Vercel:${RESET}
1. Go to: https://github.com/your-username/AI-WORKFLOW-COPILOT/settings/secrets/actions
2. Click "New repository secret"
3. Add these secrets:

  VERCEL_TOKEN
  Get from: https://vercel.com/account/tokens
  (Create a new token)

  VERCEL_ORG_ID
  Get from: https://vercel.com/account/overview
  (Look for your Team/Org ID)

  VERCEL_PROJECT_ID
  Get from: Vercel Project Settings → Project ID

${YELLOW}For Render:${RESET}
4. Add these secrets:

  RENDER_API_KEY
  Get from: https://dashboard.render.com/account/api-tokens
  (Create a new token)

  RENDER_SERVICE_ID
  Get from: Render Service Settings (in the service URL or dashboard)

${YELLOW}Note:${RESET}
These secrets are optional. Without them, you can still manually redeploy by:
- Vercel: Push to main, Vercel auto-deploys
- Render: Push to main, Render auto-deploys (if webhook is configured)

`);
}

async function displayPostDeploymentSteps() {
  header('POST-DEPLOYMENT CHECKLIST');

  console.log(`${YELLOW}After both Vercel and Render are deployed:${RESET}

1. Update Vercel Environment Variable
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Update VITE_API_BASE_URL to your Render URL (e.g., https://your-backend.onrender.com/api)
   - Redeploy by clicking latest deployment → "Redeploy"

2. Test Frontend
   - Visit: https://your-frontend.vercel.app
   - Page should load without errors

3. Test Backend Health
   bash
   curl https://your-backend.onrender.com/
   
   Should return: {"status":"ok","timestamp":"..."}

4. Test API Endpoint
   bash
   curl https://your-backend.onrender.com/api/workflows
   
   Should return: [...workflows...]

5. Configure OIDC Provider
   - Update your OIDC provider (Azure AD / Auth0) with production redirect URLs:
     Redirect URI: https://your-frontend.vercel.app/auth/callback
     Logout URI: https://your-frontend.vercel.app/

6. Test Sign-In Flow
   - Visit your production frontend
   - Click "Sign In"
   - Authenticate with OIDC provider
   - Should redirect back and show user info

7. Monitor Logs
   - Vercel: Vercel Dashboard → Deployments → Logs
   - Render: Render Dashboard → Service → Logs

8. Enable Monitoring (Recommended)
   - Set up Sentry for error tracking
   - Set up uptime monitoring with UptimeRobot or similar
   - Configure email alerts for failures

${GREEN}✅ You're now live in production!${RESET}

`);
}

async function createDeploymentChecklist() {
  const checklistContent = `# Production Deployment Checklist

## Pre-Deployment
- [ ] Code committed and pushed to GitHub
- [ ] All tests passing locally
- [ ] Environment variables template created
- [ ] Dockerfile and vercel.json configured

## Vercel Frontend
- [ ] GitHub repository imported
- [ ] Build settings configured (Vite, frontend/dist)
- [ ] Environment variables added
- [ ] Deployment successful
- [ ] Frontend URL noted: __________

## Render Backend
- [ ] GitHub repository connected
- [ ] Docker environment selected
- [ ] Auto-deploy enabled
- [ ] Environment variables configured
- [ ] Deployment successful (10-15 mins)
- [ ] Backend URL noted: __________

## Post-Deployment
- [ ] Vercel environment variables updated with Render URL
- [ ] Frontend redeployed
- [ ] Frontend URL accessible
- [ ] Backend health check passing (curl /)
- [ ] API endpoint responding (curl /api/workflows)

## OIDC Configuration
- [ ] OIDC provider account created (Azure AD / Auth0)
- [ ] Application registered in OIDC provider
- [ ] Redirect URIs updated with production URLs
- [ ] Client ID and credentials collected
- [ ] Backend env vars updated with OIDC credentials
- [ ] Frontend env vars updated with OIDC config

## Testing & Monitoring
- [ ] Sign-in flow tested end-to-end
- [ ] API endpoints accessible from production
- [ ] Logs checked in Vercel dashboard
- [ ] Logs checked in Render dashboard
- [ ] Error tracking enabled (optional)
- [ ] Uptime monitoring configured (optional)

## Go Live
- [ ] All checklist items complete
- [ ] Production URLs tested and working
- [ ] Team notified of public URLs
- [ ] Documentation updated with production links
- [ ] Support contact info configured

## Maintenance
- [ ] Scheduled log reviews
- [ ] Monthly cost review
- [ ] Quarterly security audit
- [ ] Backup strategy documented
`;

  fs.writeFileSync(path.join(__dirname, '..', 'DEPLOYMENT_CHECKLIST.md'), checklistContent);
  log(GREEN, '✓ Created DEPLOYMENT_CHECKLIST.md');
}

async function main() {
  header('AI WORKFLOW COPILOT - PRODUCTION DEPLOYMENT GUIDE');

  await checkPrerequisites();

  await displayVercelInstructions();

  await displayRenderInstructions();

  await displayGitHubSecretsInstructions();

  await displayPostDeploymentSteps();

  await createDeploymentChecklist();

  header('🚀 NEXT STEPS');
  console.log(`
1. Open Vercel and follow the instructions above
2. Open Render and follow the instructions above
3. Wait for both deployments to complete
4. Update Vercel environment variables with Render URL
5. Test your production URLs
6. Configure OIDC provider
7. Test end-to-end sign-in flow

For detailed information, see: PRODUCTION_DEPLOYMENT.md

Happy deploying! 🎉
`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
