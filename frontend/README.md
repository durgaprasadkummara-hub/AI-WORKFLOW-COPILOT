# AI Workflow Copilot — Frontend

Scaffolded Vite + React + TypeScript frontend for the AI Workflow Copilot backend.

Quick start

```bash
cd frontend
npm install
npm run dev
```

Environment

- `VITE_API_BASE_URL` — base URL for the backend API (default `http://localhost:4001/api`).
- `VITE_API_BASE_URL` — base URL for the backend API (default `http://localhost:4001/api`).
- `VITE_OIDC_AUTHORITY` — OpenID Connect issuer (e.g. Azure AD, Okta)
- `VITE_OIDC_CLIENT_ID` — OIDC client id
- `VITE_OIDC_REDIRECT_URI` — Redirect URI for auth callback
- `VITE_OIDC_POST_LOGOUT_REDIRECT` — Post logout redirect
- `VITE_OIDC_SCOPE` — Scopes to request (defaults to `openid profile email roles`)

Build & Production

```bash
npm run build
# Serve using 'npm run preview' or build Docker image using the provided Dockerfile
```

CI

A GitHub Actions workflow is provided at `.github/workflows/ci.yml`.
