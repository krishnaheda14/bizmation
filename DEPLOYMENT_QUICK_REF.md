# 🚀 Cloudflare Pages - Quick Reference Card

## Exact Settings for Cloudflare Dashboard

| Setting | Value |
|---------|-------|
| **Build command** | `npm ci && npm run build:web` |
| **Build output directory** | `apps/web-app/dist` |
| **Root directory** | Leave empty or `/` |
| **Node version** | `20` (auto-detected) |

---

## Before First Deploy

```powershell
# 1. Test build locally
.\validate-deployment.ps1

# 2. Commit all changes
git add .
git commit -m "Configure Cloudflare Pages deployment"
git push origin main
```

---

## Custom Domain Setup

### If domain is on Cloudflare DNS:
1. Go to your Pages project → **Custom domains**
2. Enter your domain: `app.yourdomain.com`
3. Click **Activate domain**
4. ✅ Done! DNS configured automatically

### If domain is elsewhere:
1. Add CNAME record at your DNS provider:
   ```
   Type: CNAME
   Name: app (or @)
   Value: <your-project>.pages.dev
   ```
2. Wait 5-30 minutes for DNS propagation
3. Return to Cloudflare and click **Activate**

---

## Troubleshooting Quick Fixes

### ❌ Build fails with "Referenced project may not disable emit"
**Status:** ✅ Already fixed in tsconfig files

### ❌ Build fails with "Cannot find module @jewelry-platform/shared-types"
**Status:** ✅ Already fixed with prebuild script

### ❌ Build succeeds but site shows blank page
**Check:** Verify output directory is `apps/web-app/dist` (with the `apps/` prefix)

---

## Monitor Deployment

Watch live build logs at:
`https://dash.cloudflare.com` → Your Project → Deployments

Typical build time: **2-4 minutes**

---

## Deployment URLs

- **Production:** `https://<project-name>.pages.dev`
- **Custom Domain:** `https://yourdomain.com`
- **PR Previews:** `https://<branch>.<project-name>.pages.dev`

---

## Local Build Test

```powershell
# Clean build from scratch
npm ci
npm run build:web

# Should create: apps/web-app/dist/
# Should contain: index.html, assets/, etc.
```

---

## Files Changed for Deployment

✅ Modified:
- `apps/web-app/tsconfig.json` - Removed problematic references
- `apps/web-app/package.json` - Added prebuild, removed unused dependency
- `packages/shared-types/tsconfig.json` - Fixed emit settings
- `tsconfig.json` - Removed composite flag
- `package.json` - Added build:web script

✅ Created:
- `.node-version` - Lock to Node 20
- `.nvmrc` - Node version for nvm users
- `apps/web-app/tsconfig.build.json` - Build-specific config
- `CLOUDFLARE_DEPLOYMENT.md` - Full deployment guide
- `validate-deployment.ps1` - Pre-deploy validation script

---

## Need Help?

📖 Full guide: [CLOUDFLARE_DEPLOYMENT.md](CLOUDFLARE_DEPLOYMENT.md)

💬 Check build logs in Cloudflare dashboard for specific errors
