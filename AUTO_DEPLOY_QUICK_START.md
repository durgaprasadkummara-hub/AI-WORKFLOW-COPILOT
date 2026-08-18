# 🤖 Auto-Deploy Setup - ONE TIME ONLY (5 minutes)

## What You Get
After this one-time setup, **every `git push` automatically deploys** to production:
- ✅ Frontend deploys to Vercel (2-3 min)
- ✅ Backend deploys to Render (5-10 min)
- ✅ Zero manual steps needed

---

## The 4 Secrets You Need

Run this to see what you need:

```bash
# Open GitHub Secrets page
open https://github.com/durgaprasadkummara-hub/AI-WORKFLOW-COPILOT/settings/secrets/actions
```

Add these 5 secrets (exact names matter):

| Secret | Where to Get |
|--------|-------------|
| `VERCEL_TOKEN` | https://vercel.com/account/tokens (click "Create Token") |
| `VERCEL_ORG_ID` | https://vercel.com/account/overview (copy your Team ID) |
| `VERCEL_PROJECT_ID` | Vercel Dashboard → Project Settings → Project ID |
| `RENDER_API_KEY` | https://dashboard.render.com/account/api-tokens (click "Create") |
| `RENDER_SERVICE_ID` | Service URL has it: `https://dashboard.render.com/services/srv-xxxxx` |

---

## Detailed Setup

**For complete step-by-step instructions**, see [GITHUB_ACTIONS_SETUP.md](GITHUB_ACTIONS_SETUP.md)

Or just copy-paste the secret names and values above into GitHub Settings.

---

## Test It

After adding secrets, make a test commit:

```bash
git commit --allow-empty -m "test: trigger auto-deploy"
git push origin main
```

Watch the deployments:
1. GitHub Actions: https://github.com/durgaprasadkummara-hub/AI-WORKFLOW-COPILOT/actions
2. Vercel: https://vercel.com/dashboard (check deployments)
3. Render: https://dashboard.render.com (check logs)

---

## That's It! 🎉

From now on, every push = automatic production deployment!

```bash
# You just do this:
git add .
git commit -m "your changes"
git push origin main

# GitHub Actions handles the rest automatically 🚀
```

---

**Next Step**: Read [GITHUB_ACTIONS_SETUP.md](GITHUB_ACTIONS_SETUP.md) for detailed setup with screenshots and troubleshooting.
