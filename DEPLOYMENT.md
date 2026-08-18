Deployment and CI/CD
=====================

This repository includes GitHub Actions workflows to make it easy to deploy the frontend and prepare the backend image for hosting.

Frontend (Vercel)
- Workflow: `.github/workflows/frontend-deploy.yml`
- What it does: builds the `frontend` directory and calls the Vercel GitHub Action to deploy to your Vercel project.
- Required repository secrets:
  - `VERCEL_TOKEN` — Personal token from Vercel
  - `VERCEL_ORG_ID` — Vercel organization id
  - `VERCEL_PROJECT_ID` — Vercel project id

Steps to enable:
1. Push this repository to GitHub (if not already).
2. In Vercel, create a new project and link the GitHub repo.
3. Add the above secrets to GitHub (Settings → Secrets & variables → Actions).
4. Push to `main` — the workflow will build and deploy.

Backend (Render or other container host)
- Workflow: `.github/workflows/backend-build-image.yml`
- What it does: builds a Docker image from `./Dockerfile` and pushes it to GitHub Container Registry (GHCR) as `ghcr.io/<owner>/<repo>:backend-<sha>`.
- Render / other hosts can be configured to pull this image for production.

Steps to enable:
1. Ensure `Dockerfile` exists and builds the backend (this repo already contains `Dockerfile` under `frontend` — customize or add one at repo root if needed).
2. Push to GitHub; the workflow will build and push an image to GHCR.
3. Create a Render Service (or similar) and point it to the GHCR image tag produced by the workflow.

Notes on production-grade improvements
- Use a custom domain and HTTPS fronting (Vercel and Render support this).
- Configure secrets in the hosting provider for database credentials, OIDC client secret, and `AUTH_PUBLIC_KEY` or `AUTH_JWKS_URI`.
- Add monitoring, health checks, and autoscaling rules in the host dashboard.

If you want, I can:
- Create a repo on GitHub and push these files there (requires your GitHub token/consent), or
- Walk you through the Vercel+Render setup step-by-step and finish the deployment once you add the required secrets.
