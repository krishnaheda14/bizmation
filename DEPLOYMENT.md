# Cloudflare Pages Deployment Guide

## 📋 Deployment Configuration

### Frontend (Web App) Deployment

**Framework Preset:** `Vite`

**Build Command:**
```bash
cd apps/web-app && npm install && npm run build
```

**Build Output Directory:**
```
apps/web-app/dist
```

**Root Directory:** Leave as `/` (root)

**Environment Variables to Add:**
```
NODE_VERSION=18
VITE_AI_SERVICE_URL=https://your-backend-url.com
```

---

## 🔧 Step-by-Step Deployment Process

### 1. Connect GitHub Repository
1. Go to https://dash.cloudflare.com/
2. Click **"Pages"** in the sidebar
3. Click **"Create a project"**
4. Click **"Connect to Git"**
5. Select **GitHub** and authorize Cloudflare
6. Select your repository: `krishnaheda14/bizmation`

### 2. Configure Build Settings
- **Project Name:** `bizmation-jewelry-pos`
- **Production Branch:** `main`
- **Framework Preset:** Select **`Vite`**
- **Build Command:** 
  ```bash
  cd apps/web-app && npm install && npm run build
  ```
- **Build Output Directory:** 
  ```
  apps/web-app/dist
  ```

### 3. Environment Variables
Click **"Add environment variable"** and add:

| Variable Name | Value |
|---------------|-------|
| NODE_VERSION | 18 |
| VITE_AI_SERVICE_URL | https://api.yourdomain.com |

### 4. Deploy Backend Separately
Cloudflare Pages only hosts static sites. For the backend:

**Option A: Cloudflare Workers (Recommended)**
- Deploy backend to Cloudflare Workers
- Use Wrangler CLI: `npm install -g wrangler`
- Create wrangler.toml in apps/backend

**Option B: Railway.app**
- Sign up at https://railway.app
- Connect GitHub repo
- Select `apps/backend` folder
- Railway auto-detects Node.js
- Add environment variables

**Option C: Render.com**
- Sign up at https://render.com
- Create new Web Service
- Connect GitHub repo
- Root Directory: `apps/backend`
- Build Command: `npm install`
- Start Command: `npm start`

### 5. Update Backend URL
After backend deployment, update Cloudflare Pages:
- Go to Settings > Environment Variables
- Update `VITE_AI_SERVICE_URL` with your backend URL

---

## 🔐 Environment Variables Checklist

### Frontend (.env in web-app)
```env
VITE_AI_SERVICE_URL=https://your-backend-url.com
```

### Backend (.env in backend)
```env
PORT=3000
NODE_ENV=production

# DeepSeek AI API (Primary)
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# OpenAI (Optional Fallback)
OPENAI_API_KEY=your_openai_key_optional

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# JWT
JWT_SECRET=your_secure_jwt_secret
JWT_EXPIRY=7d
```
DATABASE_URL=postgresql://user:password@host:5432/database
DEEPSEEK_API_KEY=your_deepseek_api_key_here
OPENAI_API_KEY=your_openai_api_key_here  # Fallback
GEMINI_API_KEY=your_gemini_api_key_here  # Fallback
```

---

## 📊 Post-Deployment Steps

1. **Test the Deployment**
   - Visit your Cloudflare Pages URL
   - Test all features
   - Check browser console for errors

2. **Set Up Custom Domain (Optional)**
   - Go to Cloudflare Pages > Custom Domains
   - Add your domain
   - Update DNS records

3. **Enable Analytics**
   - Enable Cloudflare Web Analytics
   - Monitor performance and usage

4. **Set Up Preview Deployments**
   - Every PR creates a preview URL automatically
   - Test features before merging to main

---

## 🐛 Troubleshooting

**Build Failed?**
- Check Node version (use 18)
- Verify package.json scripts
- Check build logs in Cloudflare dashboard

**ENV Variables Not Working?**
- Prefix with `VITE_` for frontend
- Redeploy after adding variables
- Clear cache and retry

**404 Errors?**
- Check build output directory path
- Ensure dist folder is generated
- Verify routing configuration

---

## 🔄 Continuous Deployment

Now configured! Every push to `main` branch automatically:
1. Triggers new build on Cloudflare Pages
2. Runs build command
3. Deploys updated site
4. Previous version remains accessible

**Branch Deployments:**
- `main` → Production URL
- Other branches → Preview URLs

