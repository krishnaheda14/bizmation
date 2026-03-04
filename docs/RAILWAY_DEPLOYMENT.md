# Railway Deployment Guide — Bizmation Backend

This guide deploys the `apps/backend` Node.js + TypeScript service to **Railway** so the gold-rates API is always live.

---

## Prerequisites

| Item | Details |
|------|---------|
| Railway account | Free tier at [railway.app](https://railway.app) |
| GitHub repo | Code must be pushed to a GitHub remote |
| Supabase project | Already running (get URL + service role key from Supabase → Settings → API) |

---

## Step 1 — Push Code to GitHub

If not already done:

```bash
git add .
git commit -m "chore: prepare for Railway deployment"
git remote add origin https://github.com/YOUR_USERNAME/bizmation.git
git push -u origin main
```

---

## Step 2 — Create a New Railway Project

1. Go to **[railway.app](https://railway.app)** and sign in.
2. Click **"New Project"** → **"Deploy from GitHub repo"**.
3. Authorise Railway to access your GitHub account if prompted.
4. Select your **bizmation** repository.
5. Railway will auto-detect the repo — click **"Add variables"** (you'll do this next).

---

## Step 3 — Set the Root Directory

By default Railway tries to build the repo root. You need to point it at the backend sub-folder.

1. In your Railway service, go to **Settings → Build**.
2. Set **Root Directory** to:
   ```
   apps/backend
   ```
3. Railway will now run all build commands from `apps/backend/`.

---

## Step 4 — Configure the Dockerfile

Railway auto-detects the `Dockerfile` at `infrastructure/docker/backend.Dockerfile`.  
You need to tell Railway which Dockerfile to use:

1. In **Settings → Build**, set **Dockerfile Path** to:
   ```
   ../../infrastructure/docker/backend.Dockerfile
   ```
   *(relative to the root directory set in Step 3)*

   **Or** (easier) copy the Dockerfile into `apps/backend/`:
   ```bash
   cp infrastructure/docker/backend.Dockerfile apps/backend/Dockerfile
   git add apps/backend/Dockerfile
   git commit -m "chore: copy Dockerfile for Railway"
   git push
   ```
   Then Railway will find it automatically.

---

## Step 5 — Set Environment Variables

In Railway → your service → **Variables**, add:

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | |
| `PORT` | `3000` | Railway auto-injects `PORT`; keep in sync |
| `SUPABASE_URL` | `https://xxxx.supabase.co` | From Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Service role key (keep secret) |
| `GOLD_RATE_TTL_SECONDS` | `300` | 5-minute cache |

> **Tip**: You can bulk-import from a `.env` file via Railway's "Raw Editor" paste.

---

## Step 6 — Deploy

1. Click **"Deploy"** (or push a new commit — Railway auto-deploys on every push to `main`).
2. Watch the build logs in **Deployments**.  
   Expected output:
   ```
   > tsc --build
   > node dist/server.js
   Server running on port 3000
   Gold rate cron started (every 5 minutes)
   ```
3. Railway assigns a public URL like:  
   `https://bizmation-backend-production.up.railway.app`

---

## Step 7 — Verify the API

Open the Railway URL in a browser or run:

```bash
# Health check
curl https://YOUR_RAILWAY_URL/health

# Current gold rate
curl "https://YOUR_RAILWAY_URL/api/gold-rates/current?metalType=GOLD&purity=24"

# Force reconcile from Swissquote
curl -X POST https://YOUR_RAILWAY_URL/api/gold-rates/reconcile
```

Expected response from `/api/gold-rates/current`:
```json
{
  "success": true,
  "data": {
    "metalType": "GOLD",
    "purity": "24",
    "pricePerGram": 7245.50,
    "currency": "INR",
    "updatedAt": "2025-01-15T09:30:00.000Z"
  }
}
```

---

## Step 8 — Connect Frontend (Cloudflare Pages)

1. Go to **Cloudflare Pages** → your web-app project → **Settings → Environment Variables**.
2. Add (for **Production** environment):
   ```
   VITE_API_URL = https://YOUR_RAILWAY_URL
   ```
3. Trigger a new Pages deployment (push any commit or click "Retry deployment").
4. The frontend will now call your always-live Railway backend instead of localhost.

---

## Step 9 — Custom Domain (Optional)

1. In Railway → Settings → **Domains** → "Add Custom Domain".
2. Enter e.g. `api.yourdomain.com`.
3. Add the CNAME record in your DNS provider as shown.
4. Update `VITE_API_URL` in Cloudflare Pages to use the custom domain.

---

## Automatic Redeploys

Railway redeploys automatically on every `git push` to `main`.  
To configure a different branch: Railway → Settings → **Source → Branch**.

---

## Free Tier Limits (Railway Hobby Plan — $5/month credit)

| Resource | Limit |
|----------|-------|
| Memory | 512 MB |
| CPU | 1 vCPU shared |
| Bandwidth | 100 GB/month |
| Sleep | **No** — always-on (unlike Render free tier) |

The backend is lightweight (Node.js + cron), so it comfortably fits within free credits.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Build fails: `cannot find tsconfig.json` | Confirm Root Directory is `apps/backend` in Step 3 |
| `SUPABASE_URL` not found at runtime | Check env vars are set in Railway Variables (not just local `.env`) |
| Port binding error | Railway injects `PORT` automatically; do **not** hard-code 3000 in server.ts (use `process.env.PORT \|\| 3000`) |
| Gold rates not updating | Check cron logs in Railway → Deployments → Logs; POST `/api/gold-rates/reconcile` to force refresh |
| CORS error from frontend | Add your Cloudflare Pages domain to the CORS allow-list in `apps/backend/src/server.ts` |

---

## CORS Allow-List Update

In `apps/backend/src/server.ts`, update the CORS origin to allow your Cloudflare domain:

```typescript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://YOUR_APP.pages.dev',       // Cloudflare Pages
    'https://your-custom-domain.com',   // optional custom domain
  ],
  credentials: true,
}));
```

Commit and push — Railway redeploys automatically.
