# Production Deployment Checklist

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
