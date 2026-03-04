# Live Gold / Silver / USD-INR Rates — Setup Guide

This guide covers three approaches for fetching live market rates:
1. **Current (CDN — zero config)** — already working
2. **Cloudflare Workers** — edge-cached rates globally
3. **Railway backend** — centralised caching via your existing Express server

---

## Approach 1 — Current CDN Setup (Already Working)

The app already fetches rates from two free, no-auth CDN endpoints:

| Data | Source |
|------|--------|
| Gold (XAU/USD) & Silver (XAG/USD) | `cdn.jsdelivr.net/@fawazahmed0/currency-api` |
| USD/INR forex | same API — `usd` → `inr` key |

**No API keys, no sign-up, free forever.**

### How the calculation works

```
goldPriceINR_per_10g = (XAU_USD × USD_INR × 32.1507 × import_duty) / 100
                    ─────────────────────────────────────────────────────
XAU_USD   = spot price in USD per Troy oz
USD_INR   = current forex rate
32.1507   = grams per Troy oz → but we want /10g so actually × (1 oz / 31.1035g × 10g)
import_duty = 1.09 (9%)

Correct formula:
goldPriceINR_per_10g = XAU_USD × (10 / 31.1035) × USD_INR × 1.09

silverPriceINR_per_kg = XAG_USD × (1000 / 31.1035) × USD_INR × 1.09
                        ─ XAG is per Troy oz, 1 kg = 32.1507 oz
```

This logic lives in [apps/web-app/src/lib/goldPrices.ts](../apps/web-app/src/lib/goldPrices.ts).

---

## Approach 2 — Cloudflare Workers (Recommended for Production)

Use a Worker as a proxy/cache layer so the browser never hits external APIs directly (better CORS, better caching).

### Step 1 — Create the Worker

In [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create Worker**

Name it: `bizmation-rates`

Paste this code:

```javascript
// wrangler.toml (local dev) ─ see Step 3 for wrangler setup
// Worker script: rates.js

const GOLD_API  = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json';
const FX_API    = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json';
const CACHE_TTL = 300; // seconds — 5 minutes

export default {
  async fetch(request, env, ctx) {
    // CORS headers for your Pages domain
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Cache-Control': `public, max-age=${CACHE_TTL}`,
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const cache = caches.default;
    const cacheKey = new Request('https://rates-cache.bizmation.com/v1', request);
    let cached = await cache.match(cacheKey);
    if (cached) return cached;

    try {
      const [goldRes, fxRes] = await Promise.all([
        fetch(GOLD_API),
        fetch(FX_API),
      ]);

      const goldData = await goldRes.json();
      const fxData   = await fxRes.json();

      const xauUsd  = goldData.xau?.usd   ?? 0; // price of 1 USD in XAU — invert it
      const usdPerOz = xauUsd > 0 ? 1 / xauUsd : 0; // XAU in USD per oz
      const usdInr  = fxData.usd?.inr    ?? 84;

      // XAG (silver) — fetch separately if needed, or use a second endpoint
      // For now derive silver from a rough ratio or add a second fetch

      const payload = {
        timestamp:   new Date().toISOString(),
        goldUsdPerOz: usdPerOz,
        usdInr,
        // Pre-calculated for convenience:
        goldInrPer10g: usdPerOz * (10 / 31.1035) * usdInr * 1.09,
      };

      const response = new Response(JSON.stringify(payload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

      // Store in Cloudflare edge cache
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      return response;

    } catch (err) {
      return new Response(JSON.stringify({ error: 'Failed to fetch rates', detail: String(err) }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
```

### Step 2 — Add a Custom Route (optional)

In the Worker settings → **Triggers** → add route:
```
rates.yourdomain.com/*
```

Or just use the default `*.workers.dev` URL.

### Step 3 — Local Dev with Wrangler

```bash
npm install -g wrangler
wrangler login

# Create project
mkdir bizmation-rates && cd bizmation-rates
wrangler init

# wrangler.toml
name = "bizmation-rates"
main = "rates.js"
compatibility_date = "2024-01-01"

[triggers]
crons = ["*/5 * * * *"]   # optional: pre-warm cache every 5 min

# Deploy
wrangler deploy
```

### Step 4 — Set `VITE_RATES_WORKER_URL` in Cloudflare Pages

```
VITE_RATES_WORKER_URL = https://bizmation-rates.YOUR_SUBDOMAIN.workers.dev
```

Then in `goldPrices.ts` you can fetch from that Worker URL instead of the CDN directly.

---

## Approach 3 — Railway Backend (Existing Server)

Your Express server at Railway already has a `/api/gold-rates` route via `apps/backend/src/modules/gold-rate/`. It can cache rates in PostgreSQL or in-memory.

### How it works today

The backend fetches from the same CDN source and serves it. Frontend calls:
```
GET https://YOUR_APP.up.railway.app/api/gold-rates
```

### Enable the endpoint

Make sure `VITE_API_URL` is set in Cloudflare Pages:
```
VITE_API_URL = https://YOUR_APP.up.railway.app
```
(No trailing slash. No `/api` suffix — the app adds that.)

### Add a caching layer to Railway (optional)

In `apps/backend/src/services/gold-rate/` add:

```typescript
let ratesCache: { data: GoldRate; fetchedAt: number } | null = null;
const CACHE_MS = 5 * 60 * 1000; // 5 minutes

export async function getCachedRates(): Promise<GoldRate> {
  if (ratesCache && Date.now() - ratesCache.fetchedAt < CACHE_MS) {
    return ratesCache.data;
  }
  const data = await fetchLiveRates(); // your existing fetch logic
  ratesCache = { data, fetchedAt: Date.now() };
  return data;
}
```

---

## Recommended Setup

| Use case | Recommendation |
|----------|---------------|
| Development / MVP | Approach 1 (CDN) — already works |
| Production with global users | Approach 2 (Cloudflare Worker) — fastest |
| Need server-side audit log / DB storage | Approach 3 (Railway) |

For most jewellery shop deployments, **Approach 1 is sufficient.** The CDN has 99.9% uptime, is free, and updates every minute.

---

## USD/INR + Buy/Sell Spread

The current formula uses a flat 9% import duty multiplier. You can add a buy/sell spread:

```typescript
const IMPORT_DUTY  = 1.09;   // 9% govt duty + GST
const MAKING_MARGIN = 1.02;  // 2% platform margin on buy
const BUY_SPREAD   = 0.98;   // 2% lower on sell (what customer receives)

goldBuyPriceINR  = basePrice * MAKING_MARGIN;
goldSellPriceINR = basePrice * BUY_SPREAD;
```

---

## Environment Variables Reference

| Variable | Where to set | Value |
|----------|-------------|-------|
| `VITE_API_URL` | Cloudflare Pages → Settings → Env Vars | `https://YOUR_APP.up.railway.app` |
| `VITE_RATES_WORKER_URL` | Cloudflare Pages (optional) | `https://bizmation-rates.YOUR.workers.dev` |
| `DATABASE_URL` | Railway → Variables | PostgreSQL connection string |
| `TWILIO_ACCOUNT_SID` | Railway → Variables | From Twilio Console |
| `TWILIO_AUTH_TOKEN` | Railway → Variables | From Twilio Console |
| `TWILIO_VERIFY_SERVICE_SID` | Railway → Variables | From Twilio Console → Verify |
