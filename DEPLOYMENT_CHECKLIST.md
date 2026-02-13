# 🚀 Quick Deployment Checklist

Copy-paste this checklist and mark off as you complete each step!

---

## ☁️ 1. FRONTEND (10 minutes)

- [ ] Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
- [ ] Workers & Pages → Create → Pages → Connect Git
- [ ] Select repository: `jewelry-retail-platform`
- [ ] Build settings:
  - Build command: `npm ci && npm run build:web`
  - Build output: `apps/web-app/dist`
  - Node version: 20
- [ ] Deploy!
- [ ] **Copy your URL:** `https://__________.pages.dev`

---

## 💾 2. DATABASE (15 minutes)

- [ ] Go to [Neon.tech](https://neon.tech)
- [ ] Sign up with GitHub
- [ ] Create project: `jewelry-platform`
- [ ] Select region closest to you
- [ ] **Copy connection string:**
  ```
  postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
  ```
- [ ] Run migration:
  ```bash
  psql "<connection-string>" < apps/backend/scripts/migrate.sql
  ```

---

## 📦 3. FILE STORAGE (5 minutes)

- [ ] Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
- [ ] R2 → Create bucket → Name: `jewelry-assets`
- [ ] R2 → Manage API Tokens → Create token
- [ ] Permissions: Object Read & Write
- [ ] **Copy credentials:**
  - Access Key ID: `____________________`
  - Secret Access Key: `____________________`
  - Endpoint: `https://____.r2.cloudflarestorage.com`

---

## 🔧 4. BACKEND (15 minutes)

- [ ] Go to [Railway.app](https://railway.app)
- [ ] New Project → Deploy from GitHub
- [ ] Select repo → Railway auto-detects
- [ ] Settings → Build config:
  - Build: `npm ci && npm run build -w apps/backend`
  - Start: `cd apps/backend && npm start`
- [ ] Variables → Add all from `.env.production.example`
- [ ] Paste your Neon database URL
- [ ] Paste your R2 credentials
- [ ] Generate JWT_SECRET:
  ```bash node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- [ ] Deploy!
- [ ] Settings → Networking → Generate Domain
- [ ] **Copy backend URL:** `https://__________.railway.app`
- [ ] Test: `curl https://your-backend.railway.app/health`

---

## 🤖 5. AI SERVICES (20 minutes - includes model download)

- [ ] Go to [Render.com](https://render.com)  
- [ ] Sign up with GitHub
- [ ] New → Web Service → Connect repo
- [ ] Settings:
  - Name: `jewelry-ai-services`
  - Root: `ai-services/image-processing`
  - Build: `pip install -r ../requirements.txt`
  - Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- [ ] Add environment variables from `.env.render.example`
- [ ] Create Service
- [ ] ⏱️ Wait 10-15 min for first deploy (models downloading)
- [ ] **Copy AI URL:** `https://__________.onrender.com`
- [ ] Test: `curl https://your-ai-service.onrender.com/`

---

## 🔗 6. CONNECT EVERYTHING (5 minutes)

### Update Backend (Railway):
- [ ] Railway → Variables → Add:
  ```
  AI_SERVICE_URL=https://your-ai-service.onrender.com
  ```
- [ ] Railway auto-redeploys

### Update Frontend (Cloudflare):
- [ ] Cloudflare Pages → Settings → Environment Variables
- [ ] Production tab → Add:
  ```
  VITE_API_URL=https://your-backend.railway.app
  VITE_AI_SERVICE_URL=https://your-ai-service.onrender.com
  VITE_APP_ENV=production
  ```
- [ ] Deployments → Retry deployment

---

## ✅ 7. TEST EVERYTHING (10 minutes)

- [ ] **Frontend loads:** Open `https://your-domain.pages.dev`
- [ ] **Backend health:** `curl https://your-backend.railway.app/health`
- [ ] **Login works:** Create account → Login
- [ ] **Gold rates fetch:** Go to Gold Rates page → Fetch Live Rates
  - Should show ₹/gram prices for Gold 22K, 24K, 18K
- [ ] **Image upload:** Catalog → Upload image
  - Background should be removed
  - Tags should be auto-generated
- [ ] **Database:** Add a product → Refresh page → Product still there

---

## 🎉 DONE!

**Your URLs:**
- Frontend: `https://__________.pages.dev`
- Backend: `https://__________.railway.app`
- AI Service: `https://__________.onrender.com`

**Monthly Cost:** $0 (all free tiers!)

**Scaling:** See [PRODUCTION_DEPLOYMENT_COMPLETE.md](PRODUCTION_DEPLOYMENT_COMPLETE.md) Part 12

---

## 🐛 Something Not Working?

1. Check service logs:
   - Backend: Railway dashboard → Logs
   - AI: Render dashboard → Logs
   - Frontend: Browser console (F12)

2. Verify environment variables:
   - All URLs correct?
   - Database connection string has `?sslmode=require`?
   - JWT_SECRET is 64 characters?

3. Common issues:
   - Gold rates not fetching? Backend might not be able to reach free APIs
   - AI processing slow? First request after 15 min takes 30-60s (cold start)
   - Database error? Neon free tier hibernates after 7 days (wake it up)
   - Upload failing? Check R2 CORS policy

4. Still stuck? Check:
   - [PRODUCTION_DEPLOYMENT_COMPLETE.md](PRODUCTION_DEPLOYMENT_COMPLETE.md) - Full guide
   - [CLOUDFLARE_DEPLOYMENT.md](CLOUDFLARE_DEPLOYMENT.md) - Frontend details  
   - [BUILD_FIX_SUMMARY.md](BUILD_FIX_SUMMARY.md) - Build issues

---

**Total Setup Time:** ~70 minutes  
**Experience Level Required:** Beginner (just follow the steps!)  
**Cost:** $0/month to start, scales as you grow

**Happy Deploying! 🚀💎**
