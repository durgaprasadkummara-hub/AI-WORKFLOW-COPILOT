# OIDC Authentication Setup Guide

This guide walks you through setting up OIDC authentication for the AI Workflow Copilot. Choose one of the quickstart options below.

## Option 1: Azure AD (Recommended for Enterprise)

### Prerequisites
- Azure subscription (free tier works)
- Admin access to Azure AD tenant

### Step 1: Register Application in Azure AD

1. Go to [Azure Portal](https://portal.azure.com) → **Azure Active Directory** → **App registrations** → **+ New registration**
2. **Name**: `AI Workflow Copilot`
3. **Supported account types**: Select "Accounts in this organizational directory only" (or multi-tenant if needed)
4. **Redirect URI**: 
   - Platform: Web
   - URI: `http://localhost:5173/auth/callback` (for local dev)
   - Add another: `https://your-frontend-domain.com/auth/callback` (for production)
5. Click **Register**

### Step 2: Create Client Secret

1. Go to **Certificates & secrets** → **+ New client secret**
2. **Description**: `AI Workflow Copilot Dev`
3. **Expires**: 6 months (choose what fits your security policy)
4. Copy the **Value** (you won't see it again!)

### Step 3: Collect Configuration Values

1. From **Overview** tab:
   - Copy **Application (client) ID**
   - Copy **Directory (tenant) ID**

2. Authority URL: `https://login.microsoftonline.com/{tenant-id}/v2.0`

3. JWKS URI: `https://login.microsoftonline.com/{tenant-id}/discovery/v2.0/keys`

### Step 4: Configure API Permissions

1. Go to **API permissions** → **+ Add a permission**
2. Select **Microsoft Graph** → **Delegated permissions**
3. Search and select: `profile`, `email`, `openid`
4. Click **Grant admin consent for [tenant]**

### Step 5: Add Custom Roles (Optional - for RBAC)

1. Go to **App roles** → **Create app role**
2. Add roles:
   - **Editor** - Can create/edit workflows
   - **Admin** - Full access
   - **Viewer** - Read-only

3. Set **Value** to `editor`, `admin`, `viewer` respectively

### Step 6: Configure Backend (.env)

Create or update `.env` in project root:

```bash
# Backend Auth Configuration
AUTH_ISSUER=https://login.microsoftonline.com/{tenant-id}/v2.0
AUTH_JWKS_URI=https://login.microsoftonline.com/{tenant-id}/discovery/v2.0/keys
AUTH_AUDIENCE={client-id}
```

### Step 7: Configure Frontend (.env.local in frontend/ folder)

```bash
VITE_API_BASE_URL=http://localhost:4001/api
VITE_OIDC_AUTHORITY=https://login.microsoftonline.com/{tenant-id}/v2.0
VITE_OIDC_CLIENT_ID={client-id}
VITE_OIDC_REDIRECT_URI=http://localhost:5173/auth/callback
VITE_OIDC_SCOPE=openid profile email api://{client-id}/editor api://{client-id}/admin api://{client-id}/viewer
```

### Step 8: Test Locally

```bash
# Terminal 1: Backend
npm start

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Public tunnel (optional)
npx localtunnel --port 5173
```

Navigate to `http://localhost:5173`, click **Sign In**, and test the OIDC flow.

---

## Option 2: Auth0 (Quickest for Testing)

### Prerequisites
- [Auth0 Account](https://auth0.com) - Free tier includes 1000 user sessions/month

### Step 1: Create Auth0 Application

1. Go to [Auth0 Dashboard](https://manage.auth0.com)
2. **Applications** → **+ Create Application**
3. **Name**: `AI Workflow Copilot`
4. **Application Type**: `Single Page Web Applications`
5. Click **Create**

### Step 2: Configure Application Settings

1. Go to **Application URIs**:
   - **Allowed Callback URLs**: `http://localhost:5173/auth/callback`
   - **Allowed Logout URLs**: `http://localhost:5173/`
   - **Allowed Web Origins**: `http://localhost:5173`
2. Click **Save Changes**

### Step 3: Collect Credentials

From **Settings** tab:
- **Domain**: `your-tenant.auth0.com`
- **Client ID**: Copy this

Authority URL: `https://your-tenant.auth0.com`  
JWKS URI: `https://your-tenant.auth0.com/.well-known/jwks.json`

### Step 4: Create Custom API

1. Go to **Applications** → **APIs** → **+ Create API**
2. **Name**: `AI Workflow Copilot API`
3. **Identifier**: `https://workflow-api`
4. Click **Create**

### Step 5: Add Scopes

1. Go to your API → **Scopes** tab
2. Add:
   - `editor:create` - Create workflows
   - `admin:manage` - Manage all
   - `viewer:read` - View workflows

### Step 6: Configure Backend (.env)

```bash
AUTH_ISSUER=https://your-tenant.auth0.com
AUTH_JWKS_URI=https://your-tenant.auth0.com/.well-known/jwks.json
AUTH_AUDIENCE=https://workflow-api
```

### Step 7: Configure Frontend (.env.local in frontend/)

```bash
VITE_API_BASE_URL=http://localhost:4001/api
VITE_OIDC_AUTHORITY=https://your-tenant.auth0.com
VITE_OIDC_CLIENT_ID={your-client-id}
VITE_OIDC_REDIRECT_URI=http://localhost:5173/auth/callback
VITE_OIDC_SCOPE=openid profile email https://workflow-api/editor:create https://workflow-api/admin:manage
```

### Step 8: Test

Same as Azure AD (see Step 8 above).

---

## Option 3: Mock OIDC (for Testing Without External Provider)

For quick testing without setting up a real OAuth2 provider:

### Create Mock Token Generator

Create `scripts/mock-token.js`:

```javascript
const jwt = require('jsonwebtoken');

const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA2a5...
-----END RSA PRIVATE KEY-----`;

const payload = {
  sub: 'user-123',
  email: 'test@example.com',
  roles: ['editor', 'admin'],
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
};

const token = jwt.sign(payload, privateKey, { algorithm: 'RS256', keyid: 'mock-key-1' });
console.log('Mock Token:', token);
```

### Use in Tests

```bash
# Generate token
node scripts/mock-token.js

# Use with curl
curl -H "Authorization: Bearer <token>" http://localhost:4001/api/workflows
```

---

## Verification Steps

### 1. Test Frontend Login

```bash
npm run dev  # in frontend/
```

Visit `http://localhost:5173`:
1. Click **Sign In** button
2. Redirected to OIDC provider login
3. Enter credentials
4. Redirected back to app with user info displayed

### 2. Test Protected API Endpoint

```bash
# Get token from browser console:
# localStorage.getItem('oidc.user:...')

curl -H "Authorization: Bearer <your-token>" \
  http://localhost:4001/api/workflows
```

Should return 200 with workflows list. If 401, token validation failed.

### 3. Test Workflow Editor

1. Login via OIDC
2. Go to **Editor** page
3. Drag workflow nodes
4. Click **Save Workflow**
5. Check browser dev tools → Network tab for POST to `/api/workflows`
6. Should see 200 response with saved workflow

---

## Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for:
- Deploying frontend to Vercel
- Deploying backend to Render
- Configuring OIDC redirect URIs for production domains
- Setting up GitHub Actions secrets

---

## Troubleshooting

### "Signing key not found"
- **Cause**: Backend can't fetch JWKS keys
- **Fix**: Verify `AUTH_JWKS_URI` is correct and accessible
- **Check**: `curl https://your-issuer/.well-known/jwks.json`

### "Invalid audience"
- **Cause**: Token audience doesn't match backend config
- **Fix**: Ensure `AUTH_AUDIENCE` matches token aud claim
- **Check**: Decode token at [jwt.io](https://jwt.io)

### "Missing Authorization header"
- **Cause**: Frontend not sending Bearer token
- **Fix**: Check `getAccessToken()` in [frontend/src/services/api.ts](./frontend/src/services/api.ts)
- **Verify**: Browser dev tools → Network → Request Headers

### Frontend blank after login redirect
- **Cause**: AuthService.handleCallback() not triggered
- **Fix**: Verify [frontend/src/pages/AuthCallback.tsx](./frontend/src/pages/AuthCallback.tsx) exists
- **Check**: Router has callback route

---

## Next Steps

1. **Choose OIDC provider** (Azure AD recommended for enterprise)
2. **Follow quickstart steps** for your provider
3. **Update .env files** with your credentials
4. **Restart backend**: `npm start`
5. **Test login flow** end-to-end
6. **Deploy to production** following [DEPLOYMENT.md](./DEPLOYMENT.md)
