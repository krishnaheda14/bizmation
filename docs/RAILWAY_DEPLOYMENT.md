# Railway Deployment Guide — Bizmation Backend

This guide deploys **only the `apps/backend` Node.js service** to Railway.  
Railway uses your GitHub repo for source control, but you can point it at just the backend sub-folder — **no other part of your codebase is built or deployed**.

---

## What Gets Deployed vs. What Stays Private

| Part | Where it deploys |
|------|-----------------|
| `apps/backend/` | **Railway** (Node.js API server) |
| `apps/web-app/` | **Cloudflare Pages** (static frontend) |
| Everything else | **Nowhere** — stays in your repo only |

Railway and Cloudflare Pages each only build their specified directory. The rest of your repo code is never executed on any server.

---

## Prerequisites

| Item | Details |
|------|---------|
| Railway account | Free tier at [railway.app](https://railway.app) |
| GitHub repo | Code pushed to GitHub (already done) |
| Supabase project | Running (get URL + service role key from Supabase → Settings → API) |

---

## Step 1 — Create a New Railway Project

1. Go to **[railway.app](https://railway.app)** and sign in.
2. Click **"New Project"** → **"Deploy from GitHub repo"**.
3. Authorise Railway to access your GitHub account if prompted.
4. Select your **bizmation** repository.

---

## Step 2 — Point Railway at the Backend Only

This is the key step that makes Railway ignore everything except `apps/backend/`:

1. In your Railway service → **Settings → Build**.
2. Set **Root Directory** to:
   ```
   apps/backend
   ```
3. Set **Build Command** to:
   ```
   npm install && npm run build
   ```
4. Set **Start Command** to:
   ```
   node dist/server.js
   ```

Railway will now **only read files inside `apps/backend/`** for building and running. Your frontend code, docs, and everything else is untouched.

---

## Step 3 — Create and Commit a Dockerfile (Recommended)

Copy the existing Dockerfile into `apps/backend/` so Railway finds it automatically:

```bash
# Run this once from your project root
copy infrastructure\docker\backend.Dockerfile apps\backend\Dockerfile
git add apps/backend/Dockerfile
git commit -m "chore: add Railway Dockerfile for backend"
git push
```

Then in Railway → Settings → Build → set **Dockerfile Path** to `Dockerfile` (relative to root directory).

---

## Step 4 — Set Environment Variables

In Railway → your service → **Variables**, add these (Railway keeps them secret — never in code):

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | |
| `PORT` | `3000` | Railway injects this automatically |
| `SUPABASE_URL` | `https://xxxx.supabase.co` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Service role key — keep secret |
| `TWILIO_ACCOUNT_SID` | `ACxxxxxxx` | From Twilio Console |
| `TWILIO_AUTH_TOKEN` | `xxxxxxx` | **Simplest auth — use this** |
| `TWILIO_VERIFY_SERVICE_SID` | `VAxxxxxxx` | Twilio → Verify → Services |
| `GOLD_RATE_TTL_SECONDS` | `300` | 5-minute cache |

> **Twilio setup**: Go to [Twilio Console](https://console.twilio.com) → get Account SID and Auth Token from the dashboard. Then go to **Verify → Services → Create Service** — copy the Service SID (starts with `VA`).

---

## Step 5 — Deploy

Railway auto-deploys on every `git push main`. The first deploy happens automatically after you connect the repo.

Watch the build logs in **Deployments**. Expected output:
```
> tsc --build
> node dist/server.js
Server running on port 3000
[Twilio] Initialising with AccountSID + AuthToken auth
Gold rate cron started (every 5 minutes)
```

Railway assigns a public URL like:
`https://bizmation-backend-production.up.railway.app`

---

## Step 6 — Set `VITE_API_URL` in Cloudflare Pages

1. **Cloudflare Dashboard → Pages** → your web-app project → **Settings → Environment Variables**.
2. Add for the **Production** environment:
   ```
   VITE_API_URL = https://YOUR_RAILWAY_URL
   ```
   (No trailing slash. Copy from Railway → Settings → Domains.)
3. Trigger a new Pages deployment (push any commit or click Retry).

The frontend Phone OTP will now reach Railway. The browser console will show:
```
[sendPhoneOtp] VITE_API_URL env value : https://bizmation-backend-xxx.up.railway.app
[sendPhoneOtp] Full URL               : https://bizmation-backend-xxx.up.railway.app/api/auth/send-otp
```

---

## Step 7 — Deploy Firestore Rules (Critical — Do This First)

The Firestore rules file at `infrastructure/firestore/firestore.rules` must be deployed to Firebase or account creation will fail with permission-denied.

**Option A — Firebase CLI (recommended):**
```bash
npm install -g firebase-tools
firebase login
firebase use --add          # select your Firebase project
firebase deploy --only firestore:rules
```

**Option B — Firebase Console (manual):**
1. Go to [Firebase Console](https://console.firebase.google.com) → your project → **Firestore Database → Rules**.
2. Copy-paste the entire contents of `infrastructure/firestore/firestore.rules`.
3. Click **Publish**.

---

## Step 8 — Verify the API

```bash
# Health check
curl https://YOUR_RAILWAY_URL/health

# Current gold rate
curl "https://YOUR_RAILWAY_URL/api/gold-rates/current?metalType=GOLD&purity=24"

# Test OTP send (replace with real number)
curl -X POST https://YOUR_RAILWAY_URL/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210"}'
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Build fails: `cannot find tsconfig.json` | Confirm Root Directory is `apps/backend` in Step 2 |
| `SUPABASE_URL` not found at runtime | Check env vars are set in Railway Variables, not local `.env` |
| Port binding error | Do **not** hard-code 3000 — use `process.env.PORT \|\| 3000` |
| OTP returns 500 "credentials not configured" | Add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` to Railway Variables |
| Account creation fails with permission-denied | Deploy Firestore rules (Step 7 above) |
| CORS error from frontend | Railway service → Variables → ensure `NODE_ENV=production` is set |

---

## Free Tier Note (Railway Hobby — $5/month credit)

| Resource | Limit |
|----------|-------|
| Memory | 512 MB |
| CPU | 1 vCPU shared |
| Sleep | **No** — always-on (unlike Render free tier) |

The backend (Node.js + cron + Twilio calls) comfortably fits within free credits.

