# Cloudflare Pages Deployment Guide

## 🚀 Quick Setup

### Cloudflare Pages Configuration

Use these exact settings in your Cloudflare Pages dashboard:

| Setting | Value |
|---------|-------|
| **Build command** | `npm ci && npm run build:web` |
| **Build output directory** | `apps/web-app/dist` |
| **Root directory** | `/` (leave empty) |
| **Build system version** | 3 (latest) |
| **Node.js version** | 20 (auto-detected from .node-version) |

### Environment Variables (Optional)

Add these in Cloudflare Pages > Settings > Environment Variables:

```
NODE_VERSION=20
NPM_FLAGS=--legacy-peer-deps
```

---

## 📋 Pre-Deployment Checklist

### 1. ✅ Verify Local Build
Test the build locally before pushing:

```bash
# From project root
npm ci
npm run build:web
```

This should complete without errors and create `apps/web-app/dist` directory.

### 2. ✅ Check Git Repository
Ensure all changes are committed:

```bash
git status
git add .
git commit -m "Configure for Cloudflare Pages deployment"
git push origin main
```

### 3. ✅ Workspace Structure
Your monorepo structure should be:
```
/
├── .node-version          # Node 20
├── .nvmrc                 # Node 20
├── package.json           # Root workspace
├── apps/
│   └── web-app/
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsconfig.build.json
│       ├── vite.config.ts
│       └── src/
└── packages/
    └── shared-types/
        ├── package.json
        ├── tsconfig.json
        └── src/
```

---

## 🔧 Cloudflare Pages Setup

### Step 1: Connect Repository

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**
3. Select your GitHub/GitLab repository
4. Authorize Cloudflare to access your repo

### Step 2: Configure Build Settings

After selecting your repository:

```yaml
Framework preset: None (or Vite)
Build command: npm ci && npm run build:web
Build output directory: apps/web-app/dist
Root directory: /
```

**Important**: Don't use `cd apps/web-app` in the build command. The monorepo build handles dependencies correctly from the root.

### Step 3: Advanced Settings

Expand **Environment variables** (optional):
- `NODE_VERSION`: `20`

Click **Save and Deploy**

---

## 🎯 Custom Domain Setup

### Step 4: Add Custom Domain

Once your first deployment succeeds:

1. Go to your Cloudflare Pages project
2. Click **Custom domains** tab
3. Click **Set up a custom domain**

#### Option A: Domain on Cloudflare (Recommended)

If your domain DNS is managed by Cloudflare:
1. Enter your domain (e.g., `mystore.com` or `app.mystore.com`)
2. Click **Activate domain**
3. DNS records are added automatically ✅

#### Option B: External DNS

If your domain is elsewhere:
1. Enter your domain
2. Copy the CNAME record provided:
   ```
   Name: app (or @)
   Type: CNAME
   Value: <your-project>.pages.dev
   ```
3. Add this CNAME record to your DNS provider
4. Wait for DNS propagation (5-30 minutes)
5. Return to Cloudflare and click **Activate**

---

## 🔍 Troubleshooting

### Build Fails: "Cannot find module '@jewelry-platform/shared-types'"

**Solution**: ✅ Already fixed. The `build:packages` script ensures `shared-types` builds before web-app.

### Build Fails: "Referenced project may not disable emit"

**Solution**: Already fixed. The web-app uses `tsconfig.build.json` which prevents reference issues.

### Build Fails: "ENOENT: no such file or directory"

**Cause**: Cloudflare can't find workspace dependencies.

**Solution**: Use the exact build command:
```bash
npm ci && npm run build:web
```
This installs all workspace dependencies from root.

### Build Succeeds but Site Shows 404

**Solution**: Check build output directory is correct: `apps/web-app/dist`

### Workspace Dependency Version Mismatch

**Solution**: Lock workspace versions using exact dependencies:
```json
{
  "dependencies": {
    "@jewelry-platform/shared-types": "workspace:*"
  }
}
```

---

## 🔄 Continuous Deployment

Every push to your main branch triggers automatic deployment:

1. **Commit changes**:
   ```bash
   git add .
   git commit -m "Update feature"
   git push origin main
   ```

2. **Monitor deployment**:
   - Go to Cloudflare Pages > Your Project > Deployments
   - Watch real-time build logs
   - Deployment typically takes 2-4 minutes

3. **Preview deployments**:
   - Every pull request gets a unique preview URL
   - Test changes before merging

---

## 🌐 Production URLs

After successful deployment:

- **Default URL**: `https://<project-name>.pages.dev`
- **Custom Domain**: `https://yourdomain.com` (after Step 4)
- **Preview URLs**: `https://<branch>.<project-name>.pages.dev`

---

## 📊 Post-Deployment Verification

### 1. Check Build Logs
Look for these success indicators:
```
✅ Building shared-types package...
✅ Building web app...
✅ Build complete! Output in apps/web-app/dist
```

### 2. Test Core Features

Visit your deployed site and verify:
- [ ] Page loads without errors
- [ ] React app renders correctly
- [ ] PWA manifest loads
- [ ] API proxy works (if backend is deployed)
- [ ] Service worker registers
- [ ] Offline functionality works

### 3. Check Browser Console
- No red errors
- No 404s for missing assets
- No TypeScript/build errors

---

## 🔐 Environment-Specific Configuration

### Production Environment Variables

Add these in Cloudflare Pages for production:

```env
VITE_API_URL=https://api.yourdomain.com
VITE_APP_ENV=production
```

### Update vite.config.ts (if needed)

```typescript
export default defineConfig({
  // ... existing config
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(
      process.env.VITE_API_URL || 'http://localhost:3000'
    ),
  },
});
```

---

## 🆘 Getting Help

If deployment still fails:

1. **Check build logs** in Cloudflare Pages dashboard
2. **Test locally**:
   ```bash
   npm ci
   npm run build:web
   cd apps/web-app
   npm run preview
   ```
3. **Common issues**:
   - Node version mismatch → Check `.node-version` file
   - Missing dependencies → Run `npm ci` from root
   - TypeScript errors → Run `npm run build:packages` first

---

## ✅ Success Checklist

- [x] TypeScript project references fixed
- [x] Workspace dependencies properly configured
- [x] Node version locked to 20
- [x] Build command optimized for monorepo
- [x] Output directory correctly set
- [x] Custom domain ready for setup
- [x] Continuous deployment enabled
- [x] TypeScript errors fixed (MetalType enum, Customer interface)
- [x] Import.meta.env types configured
- [x] Build validated locally and succeeds

**Your app is now production-ready on Cloudflare Pages!** 🎉
