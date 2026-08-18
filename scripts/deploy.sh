#!/bin/bash

# AI Workflow Copilot - Deployment Automation Script
# This script helps set up and deploy to Vercel and Render

set -e

echo "🚀 AI Workflow Copilot - Production Deployment Setup"
echo "======================================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites installed${NC}"
echo ""

# Get user inputs
echo -e "${BLUE}Deployment Configuration${NC}"
echo ""

read -p "Enter your GitHub username: " GITHUB_USER
read -p "Enter your GitHub repository name (default: AI-WORKFLOW-COPILOT): " REPO_NAME
REPO_NAME=${REPO_NAME:-AI-WORKFLOW-COPILOT}

echo ""
echo -e "${YELLOW}VERCEL SETUP${NC}"
echo ""
echo "1. Go to: https://vercel.com/new"
echo "2. Click 'Import Git Repository'"
echo "3. Select: ${GITHUB_USER}/${REPO_NAME}"
echo "4. Configure:"
echo "   - Framework: Vite"
echo "   - Build Command: npm run build"
echo "   - Output Directory: frontend/dist"
echo "   - Environment Variables:"
echo "     VITE_API_BASE_URL=<your-render-backend-url>/api"
echo "     VITE_OIDC_AUTHORITY=<your-oidc-authority>"
echo "     VITE_OIDC_CLIENT_ID=<your-client-id>"
echo "     VITE_OIDC_REDIRECT_URI=https://<your-vercel-domain>.vercel.app/auth/callback"
echo "     VITE_OIDC_SCOPE=openid profile email"
echo "5. Click Deploy"
echo ""
read -p "Press Enter when Vercel deployment is complete..."

echo ""
echo -e "${YELLOW}RENDER SETUP${NC}"
echo ""
echo "1. Go to: https://dashboard.render.com"
echo "2. Click '+ New' → 'Web Service'"
echo "3. Click 'Connect Repository'"
echo "4. Select: ${GITHUB_USER}/${REPO_NAME}"
echo "5. Configure:"
echo "   - Name: ai-workflow-copilot-backend"
echo "   - Environment: Docker"
echo "   - Region: Select closest to you"
echo "   - Branch: main"
echo "   - Auto-deploy: ON"
echo "6. Add Environment Variables:"
echo "   AUTH_ISSUER=<your-oidc-issuer>"
echo "   AUTH_JWKS_URI=<your-jwks-uri>"
echo "   AUTH_AUDIENCE=<your-client-id>"
echo "   DATABASE_URL=file:./prisma/dev.db"
echo "   NODE_ENV=production"
echo "   LOG_LEVEL=info"
echo "7. Click 'Create Web Service' (Wait 10-15 minutes)"
echo ""
read -p "Press Enter when Render deployment is complete..."

echo ""
read -p "Enter your Vercel frontend URL: " VERCEL_URL
read -p "Enter your Render backend URL: " RENDER_URL

echo ""
echo -e "${BLUE}Updating Configuration${NC}"

# Create .env.production file with template
cat > .env.production << EOF
# Production Environment Variables
NODE_ENV=production
LOG_LEVEL=info
PORT=4001

# OIDC Configuration
AUTH_ISSUER=https://login.microsoftonline.com/{tenant-id}/v2.0
AUTH_JWKS_URI=https://login.microsoftonline.com/{tenant-id}/discovery/v2.0/keys
AUTH_AUDIENCE={client-id}

# Database
DATABASE_URL=file:./prisma/dev.db

# CORS
CORS_ORIGIN=${VERCEL_URL}
EOF

echo -e "${GREEN}✓ Created .env.production template${NC}"

echo ""
echo -e "${BLUE}Testing Deployments${NC}"
echo ""

echo "Testing Frontend..."
curl -s -o /dev/null -w "Frontend Status: %{http_code}\n" "${VERCEL_URL}/"

echo "Testing Backend..."
curl -s -o /dev/null -w "Backend Status: %{http_code}\n" "${RENDER_URL}/"

echo ""
echo -e "${GREEN}✅ Deployment Setup Complete!${NC}"
echo ""
echo "Your production URLs:"
echo "  Frontend: ${VERCEL_URL}"
echo "  Backend:  ${RENDER_URL}"
echo ""
echo "Next steps:"
echo "1. Configure OIDC provider (Azure AD/Auth0)"
echo "2. Update OIDC redirect URIs to: ${VERCEL_URL}/auth/callback"
echo "3. Test sign-in flow"
echo "4. Monitor logs in Vercel and Render dashboards"
echo ""
