    # Cloudflare Worker — Continuous Gold & Silver Price Fetcher

## Overview

This document explains how to deploy a **Cloudflare Worker** that:
1. Fetches live XAU/XAG → INR rates every **5 minutes** via a Cron Trigger
2. Stores the computed per-gram rates in **Cloudflare KV** (key-value store)
3. Exposes a simple **REST endpoint** (`/gold-rates`) so your Cloudflare Pages frontend can fetch real-time rates **without needing the Railway backend to be running**

This replaces the current flow where rates only update when the Express backend is alive.

---

## Architecture

```
┌───────────────────────────────────────────────────────┐
│  Cloudflare Cron Trigger (every 5 minutes)            │
│  → Worker fetches:                                    │
│      • fawazahmed0 CDN (XAU/XAG → INR)               │
│      • Fallback: Swissquote (USD) + USD/INR rate      │
│  → Stores in Cloudflare KV: "gold_rates_cache"       │
└───────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────┐
│  Cloudflare Pages (your Vite/React app)               │
│  → fetch("https://your-worker.workers.dev/gold-rates")│
│  → Gets JSON with live rates (max 5 min old)          │
│  → Falls back to CDN APIs if worker unavailable       │
└───────────────────────────────────────────────────────┘
```

---

## Step 1 — Create a Cloudflare KV Namespace

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **KV**
2. Click **Create namespace**
3. Name it: `GOLD_RATES_KV`
4. Copy the **Namespace ID** shown (you need it in `wrangler.toml`)

---

## Step 2 — Create the Worker

### 2a. Install Wrangler CLI

```bash
npm install -g wrangler
wrangler login
```

### 2b. Create worker project

```bash
mkdir gold-rates-worker
cd gold-rates-worker
wrangler init --no-git
```

Choose: **"Hello World" Worker** → **TypeScript** → **No** (no Git).

### 2c. Replace `wrangler.toml`

```toml
name = "gold-rates-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# Cron: fetch every 5 minutes
[triggers]
crons = ["*/5 * * * *"]

# KV binding — paste your Namespace ID from Step 1
[[kv_namespaces]]
binding = "GOLD_RATES_KV"
id      = "PASTE_YOUR_KV_NAMESPACE_ID_HERE"

# Optional: preview KV namespace (for local dev with wrangler dev)
# preview_id = "PASTE_YOUR_KV_PREVIEW_NAMESPACE_ID_HERE"
```

### 2d. Replace `src/index.ts` with the complete worker code below

```typescript
/**
 * Cloudflare Worker — Gold & Silver Rate Fetcher
 *
 * • Cron trigger: every 5 minutes → fetch rates → store in KV
 * • GET /gold-rates → serve cached rates from KV (JSON)
 * • GET /gold-rates/live → bypass cache, fetch fresh (for debugging)
 *
 * Pricing formula (matches your frontend goldPrices.ts exactly):
 *   XAU/XAG rates in INR per troy oz  (from fawazahmed0 CDN)
 *   Per gram = (INR per troy oz) / 31.1035
 *   With 9% import duty = per_gram × 1.09
 *   Per 10g gold  = per_gram_24k × 10
 *   Per 1kg silver = per_gram_24k × 1000
 *   22K = (24K × 22) / 24
 *   18K = (24K × 18) / 24
 */

export interface Env {
  GOLD_RATES_KV: KVNamespace;
}

// ── Constants — must match goldPrices.ts ──────────────────────────────────────
const TROY_OZ_GRAMS = 31.1035;
const IMPORT_DUTY   = 1.09;      // 9% import duty for Indian market

// ── Primary API: fawazahmed0 / jsdelivr CDN (INR direct) ─────────────────────
const CDN_XAU_PRIMARY = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json';
const CDN_XAU_MIRROR  = 'https://latest.currency-api.pages.dev/v1/currencies/xau.json';
const CDN_XAG_PRIMARY = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xag.json';
const CDN_XAG_MIRROR  = 'https://latest.currency-api.pages.dev/v1/currencies/xag.json';

// ── Fallback: Swissquote (USD) + fawazahmed0 USD→INR ─────────────────────────
// NOTE: No CORS proxy needed in Workers (server-side!)
const SWISSQUOTE_XAU = 'https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD';
const SWISSQUOTE_XAG = 'https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAG/USD';
const USD_TO_INR_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json';

// ── Types ─────────────────────────────────────────────────────────────────────
interface MetalRate {
  metalType: 'GOLD' | 'SILVER';
  purity: 24 | 22 | 18;
  ratePerGram: number;
  displayRate: number;
  effectiveDate: string;
  source: string;
}

interface CachedRates {
  rates: MetalRate[];
  fetchedAt: string;
  source: string;
  xauInr: number;
  xagInr: number;
  usdToInr?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchJSON(url: string, timeoutMs = 8000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'BizmationGoldWorker/1.0' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithFallback(primary: string, fallback: string): Promise<any> {
  try   { return await fetchJSON(primary); }
  catch { return await fetchJSON(fallback); }
}

function parseSwissquoteMid(data: any[]): number {
  if (!Array.isArray(data) || data.length === 0) throw new Error('Empty Swissquote response');
  for (const platform of data) {
    const profiles: any[] = platform.spreadProfilePrices || [];
    for (const name of ['standard', 'premium', 'prime']) {
      const p = profiles.find((x: any) => x.spreadProfile === name);
      if (p?.bid != null && p?.ask != null) return (p.bid + p.ask) / 2;
    }
  }
  const first = data[0]?.spreadProfilePrices?.[0];
  if (first?.bid != null && first?.ask != null) return (first.bid + first.ask) / 2;
  throw new Error('Could not parse bid/ask from Swissquote');
}

// ── Fetch via fawazahmed0 CDN (primary method) ────────────────────────────────
async function fetchViaCDN(): Promise<{ xauInr: number; xagInr: number; source: string }> {
  const bust = `?_=${Date.now()}`;
  const [xauData, xagData] = await Promise.all([
    fetchWithFallback(CDN_XAU_PRIMARY + bust, CDN_XAU_MIRROR + bust),
    fetchWithFallback(CDN_XAG_PRIMARY + bust, CDN_XAG_MIRROR + bust),
  ]);

  const xauInr: number = xauData?.xau?.inr;
  const xagInr: number = xagData?.xag?.inr;

  if (!xauInr || isNaN(xauInr) || xauInr < 1000)
    throw new Error(`Invalid XAU→INR from CDN: ${xauInr}`);
  if (!xagInr || isNaN(xagInr) || xagInr < 1)
    throw new Error(`Invalid XAG→INR from CDN: ${xagInr}`);

  return { xauInr, xagInr, source: 'fawazahmed0-CDN' };
}

// ── Fetch via Swissquote (fallback) ──────────────────────────────────────────
async function fetchViaSwissquote(): Promise<{ xauInr: number; xagInr: number; usdToInr: number; source: string }> {
  const bust = `?_=${Date.now()}`;
  const [xauData, xagData, usdData] = await Promise.all([
    fetchJSON(SWISSQUOTE_XAU + bust),
    fetchJSON(SWISSQUOTE_XAG + bust),
    fetchJSON(USD_TO_INR_URL + bust),
  ]);

  const xauUsd  = parseSwissquoteMid(xauData);
  const xagUsd  = parseSwissquoteMid(xagData);
  const usdToInr: number = Number(usdData?.usd?.inr);

  if (!isFinite(usdToInr) || usdToInr <= 0) throw new Error('No valid USD→INR rate');

  return {
    xauInr:   xauUsd * usdToInr,
    xagInr:   xagUsd * usdToInr,
    usdToInr,
    source:   'Swissquote+fawazahmed0',
  };
}

// ── Build MetalRate array from troy-oz INR prices ────────────────────────────
function buildRates(xauInr: number, xagInr: number, source: string, now: string): MetalRate[] {
  // Gold 24K per gram = (INR per troy oz / 31.1035) × 1.09 import duty
  const gold24 = (xauInr / TROY_OZ_GRAMS) * IMPORT_DUTY;

  // Silver 24K per gram = (INR per troy oz / 31.1035) × 1.09
  const silver24 = (xagInr / TROY_OZ_GRAMS) * IMPORT_DUTY;

  return [
    // Gold
    {
      metalType: 'GOLD', purity: 24,
      ratePerGram: gold24,
      displayRate: gold24 * 10,               // per 10 grams
      effectiveDate: now, source,
    },
    {
      metalType: 'GOLD', purity: 22,
      ratePerGram: (gold24 * 22) / 24,
      displayRate: ((gold24 * 22) / 24) * 10, // per 10 grams
      effectiveDate: now, source,
    },
    {
      metalType: 'GOLD', purity: 18,
      ratePerGram: (gold24 * 18) / 24,
      displayRate: ((gold24 * 18) / 24) * 10, // per 10 grams
      effectiveDate: now, source,
    },
    // Silver
    {
      metalType: 'SILVER', purity: 24,
      ratePerGram: silver24,
      displayRate: silver24 * 1000,               // per 1 kg
      effectiveDate: now, source,
    },
    {
      metalType: 'SILVER', purity: 22,
      ratePerGram: (silver24 * 22) / 24,
      displayRate: ((silver24 * 22) / 24) * 1000, // per 1 kg
      effectiveDate: now, source,
    },
    {
      metalType: 'SILVER', purity: 18,
      ratePerGram: (silver24 * 18) / 24,
      displayRate: ((silver24 * 18) / 24) * 1000, // per 1 kg
      effectiveDate: now, source,
    },
  ];
}

// ── Core fetch and cache logic ────────────────────────────────────────────────
async function fetchAndCacheRates(env: Env): Promise<CachedRates> {
  const now = new Date().toISOString();

  let xauInr: number;
  let xagInr: number;
  let usdToInr: number | undefined;
  let source: string;

  // Try CDN first, fall back to Swissquote
  try {
    ({ xauInr, xagInr, source } = await fetchViaCDN());
  } catch (cdnErr) {
    console.error('[Worker] CDN fetch failed, trying Swissquote:', cdnErr);
    try {
      ({ xauInr, xagInr, usdToInr, source } = await fetchViaSwissquote());
    } catch (swissErr) {
      console.error('[Worker] Swissquote fetch also failed:', swissErr);
      throw new Error(`All price sources failed. CDN: ${cdnErr}. Swissquote: ${swissErr}`);
    }
  }

  const rates = buildRates(xauInr, xagInr, source, now);
  const cached: CachedRates = { rates, fetchedAt: now, source, xauInr, xagInr, usdToInr };

  // Store in KV with 10-minute TTL (cron runs every 5 min, this is safety margin)
  await env.GOLD_RATES_KV.put('gold_rates_cache', JSON.stringify(cached), {
    expirationTtl: 600,
  });

  console.log(`[Worker] Rates cached at ${now}. XAU/INR: ${xauInr.toFixed(2)}, XAG/INR: ${xagInr.toFixed(2)}, Source: ${source}`);
  return cached;
}

// ── CORS headers ──────────────────────────────────────────────────────────────
function corsHeaders(origin: string | null): Record<string, string> {
  // Accept requests from your Cloudflare Pages domain or localhost
  const allowed = [
    'https://bizmation.pages.dev',
    'https://bizmation.com',
    'http://localhost:5173',
    'http://localhost:4173',
  ];
  const allowOrigin = (origin && allowed.some(o => origin.startsWith(o.replace(/\/$/, ''))))
    ? origin
    : allowed[0];

  return {
    'Access-Control-Allow-Origin':  allowOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age':       '86400',
  };
}

function jsonResponse(data: unknown, status = 200, origin: string | null = null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60, s-maxage=60',
      ...corsHeaders(origin),
    },
  });
}

// ── Worker main export ────────────────────────────────────────────────────────
export default {
  // ── HTTP request handler ─────────────────────────────────────────────────
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url    = new URL(request.url);
    const origin = request.headers.get('Origin');

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // GET /gold-rates — serve from KV cache (fast, ~1ms)
    if (url.pathname === '/gold-rates' && request.method === 'GET') {
      try {
        const cached = await env.GOLD_RATES_KV.get('gold_rates_cache');
        if (cached) {
          const data: CachedRates = JSON.parse(cached);
          return jsonResponse({ success: true, data, cached: true }, 200, origin);
        }
        // Cache miss — fetch fresh and store
        const fresh = await fetchAndCacheRates(env);
        return jsonResponse({ success: true, data: fresh, cached: false }, 200, origin);
      } catch (err: any) {
        return jsonResponse({ success: false, error: err.message }, 503, origin);
      }
    }

    // GET /gold-rates/live — bypass KV, always fetch fresh (for manual refresh)
    if (url.pathname === '/gold-rates/live' && request.method === 'GET') {
      try {
        const fresh = await fetchAndCacheRates(env);
        return jsonResponse({ success: true, data: fresh, cached: false }, 200, origin);
      } catch (err: any) {
        return jsonResponse({ success: false, error: err.message }, 503, origin);
      }
    }

    // GET /health
    if (url.pathname === '/health') {
      return jsonResponse({ status: 'ok', worker: 'gold-rates-worker', time: new Date().toISOString() }, 200, origin);
    }

    return jsonResponse({ error: 'Not found. Use GET /gold-rates' }, 404, origin);
  },

  // ── Cron trigger — runs every 5 minutes ──────────────────────────────────
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      fetchAndCacheRates(env).catch(err =>
        console.error('[Worker/cron] Fetch failed:', err)
      )
    );
  },
};
```

---

## Step 3 — Deploy the Worker

```bash
# From the gold-rates-worker folder
wrangler deploy

# You will see output like:
# Uploaded gold-rates-worker (X sec upload)
# Published gold-rates-worker (X sec)
# https://gold-rates-worker.YOUR-SUBDOMAIN.workers.dev
```

**Copy your worker URL** — you need it in Step 5.

---

## Step 4 — Test the Worker

```bash
# Check health
curl https://gold-rates-worker.YOUR-SUBDOMAIN.workers.dev/health

# Get cached rates (will fetch fresh on first call)
curl https://gold-rates-worker.YOUR-SUBDOMAIN.workers.dev/gold-rates

# Force fresh fetch
curl https://gold-rates-worker.YOUR-SUBDOMAIN.workers.dev/gold-rates/live
```

**Expected response:**
```json
{
  "success": true,
  "cached": true,
  "data": {
    "fetchedAt": "2026-03-07T10:00:00.000Z",
    "source": "fawazahmed0-CDN",
    "xauInr": 228450.23,
    "xagInr": 2723.45,
    "rates": [
      { "metalType": "GOLD", "purity": 24, "ratePerGram": 8003.41, "displayRate": 80034.10, ... },
      { "metalType": "GOLD", "purity": 22, "ratePerGram": 7336.46, "displayRate": 73364.60, ... },
      { "metalType": "GOLD", "purity": 18, "ratePerGram": 6002.56, "displayRate": 60025.60, ... },
      { "metalType": "SILVER", "purity": 24, "ratePerGram": 95.37, "displayRate": 95370.00, ... },
      ...
    ]
  }
}
```

---

## Step 5 — Connect Your Cloudflare Pages Frontend

### 5a. Add environment variable in Cloudflare Pages

1. Go to Cloudflare Dashboard → **Workers & Pages** → your Pages project → **Settings** → **Environment Variables**
2. Add variable:
   - **Variable name:** `VITE_GOLD_WORKER_URL`
   - **Value:** `https://gold-rates-worker.YOUR-SUBDOMAIN.workers.dev`
3. Click **Save** and **redeploy** (trigger a new deploy from Git)

### 5b. Update `goldPrices.ts` to use the worker

Replace the `fetchLiveMetalRates` function's opening section in `apps/web-app/src/lib/goldPrices.ts`:

The new priority order should be:
1. **Cloudflare Worker** (fastest — cached KV, 5-min freshness)
2. **Railway backend** (if worker down)
3. **fawazahmed0 CDN** (public fallback)
4. **Swissquote** (last resort)

Here is the updated beginning of `fetchLiveMetalRates` to add **before** the existing backend block:

```typescript
export async function fetchLiveMetalRates(): Promise<MetalRate[]> {
  const now = new Date().toISOString();

  // ── Priority 1: Cloudflare Worker (pre-cached, always available) ──────────
  const WORKER_URL = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOLD_WORKER_URL)
    ? ((import.meta as any).env.VITE_GOLD_WORKER_URL as string).replace(/\/$/, '')
    : '';

  if (WORKER_URL) {
    try {
      const res  = await fetchJSON(`${WORKER_URL}/gold-rates`, 5000);
      const data = res?.data;
      if (data?.rates && Array.isArray(data.rates) && data.rates.length >= 6) {
        // Stamp the rates with the fetch timestamp so UI shows when they were updated
        return data.rates.map((r: MetalRate) => ({
          ...r,
          effectiveDate: data.fetchedAt ?? now,
          source: `Worker (${data.source ?? 'cached'})`,
        }));
      }
    } catch (workerErr) {
      console.warn('[goldPrices] Worker fetch failed, falling back:', workerErr);
    }
  }

  // ── Priority 2: Backend (if VITE_API_URL is set) ──────────────────────────
  // ... rest of existing code ...
```

---

## Step 6 — Auto Refresh on the Frontend (Real-time)

In `GoldRates.tsx`, add polling so the UI refreshes every 5 minutes automatically:

```tsx
// In your GoldRates component, add this useEffect AFTER the existing one:
useEffect(() => {
  const FIVE_MINUTES = 5 * 60 * 1000;
  const interval = setInterval(() => {
    fetchRates(); // already defined in your component
  }, FIVE_MINUTES);
  return () => clearInterval(interval);
}, []);
```

---

## Step 7 — Enable Cron in Cloudflare Dashboard

1. Go to Cloudflare Dashboard → **Workers & Pages** → `gold-rates-worker` → **Triggers** → **Cron Triggers**
2. You should see `*/5 * * * *` already listed (from `wrangler.toml`)
3. If not, click **Add Cron Trigger** → enter `*/5 * * * *` → Save

---

## How the Calculations Work

All calculations match `goldPrices.ts` exactly:

| Step | Formula | Example |
|------|---------|---------|
| XAU/INR per troy oz | From CDN | ₹228,450 |
| Gold 24K per gram | `228450 / 31.1035 = 7344.2` | ₹7,344 |
| + 9% Import Duty | `7344.2 × 1.09 = 8005.2` | ₹8,005 |
| Gold 22K per gram | `8005.2 × 22/24 = 7338.1` | ₹7,338 |
| Gold 18K per gram | `8005.2 × 18/24 = 6003.9` | ₹6,003 |
| Display (per 10g) | `per_gram × 10` | ₹80,052 |
| XAG/INR per troy oz | From CDN | ₹2,723 |
| Silver 24K per gram | `2723/31.1035 × 1.09 = 95.4` | ₹95.4 |
| Display (per 1kg) | `per_gram × 1000` | ₹95,400 |

---

## Troubleshooting

### Worker not updating rates
- Check **Cron Triggers** tab in Cloudflare Dashboard — should show last run time
- Run `wrangler tail` to see live logs:
  ```bash
  wrangler tail gold-rates-worker
  ```

### CORS error in browser
- Add your Pages domain to the `allowed` array in the `corsHeaders` function
- Redeploy: `wrangler deploy`

### KV not found error
- Make sure `id` in `wrangler.toml` matches the actual KV namespace ID from dashboard
- Run `wrangler kv:namespace list` to see all namespaces

### Rates look incorrect
- Use `/gold-rates/live` endpoint to bypass cache and see freshly computed values
- Check worker logs: `wrangler tail`
- Verify the CDN APIs are returning valid data:
  ```bash
  curl "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json" | grep -o '"inr":[0-9.]*'
  ```

### Local development
```bash
wrangler dev
# Worker runs at http://localhost:8787
# Test: curl http://localhost:8787/gold-rates
```

---

## Summary Checklist

- [ ] KV namespace created in Cloudflare Dashboard
- [ ] `wrangler.toml` updated with correct KV namespace ID
- [ ] `src/index.ts` replaced with complete worker code above
- [ ] `wrangler deploy` run successfully
- [ ] Worker URL copied (e.g. `https://gold-rates-worker.abc.workers.dev`)
- [ ] `VITE_GOLD_WORKER_URL` added to Cloudflare Pages environment variables
- [ ] `goldPrices.ts` updated to call worker first (Step 5b)
- [ ] Auto-refresh interval added in `GoldRates.tsx` (Step 6)
- [ ] Cron trigger showing `*/5 * * * *` in Worker dashboard
