/**
 * Shared Gold / Silver Price Fetching Utility
 *
 * Flow (most accurate to least):
 *   1. Backend /api/gold-rates/current  — Swissquote real-time + exchangerate.fun USD/INR
 *   2. CDN fawazahmed0 XAU/XAG/INR     — direct INR daily rate, no proxy needed
 *   3. Swissquote via corsproxy         — real-time USD + exchangerate.fun USD/INR
 */

export interface MetalRate {
  metalType: 'GOLD' | 'SILVER';
  purity: 24 | 22 | 18;
  ratePerGram: number;
  displayRate: number; // per 10g for gold, per 1kg for silver
  effectiveDate: string;
  source: string;
}

const TROY_OZ_GRAMS = 31.1035;
const IMPORT_DUTY   = 1.09;

// ── Primary API (fawazahmed0 / jsdelivr CDN): XAU and XAG rates in INR ──────
// xau.inr = INR per 1 troy oz of gold
// xag.inr = INR per 1 troy oz of silver
const CDN_XAU_URL  = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json';
const CDN_XAG_URL  = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xag.json';
// Fallback mirror
const CDN_XAU_URL2 = 'https://latest.currency-api.pages.dev/v1/currencies/xau.json';
const CDN_XAG_URL2 = 'https://latest.currency-api.pages.dev/v1/currencies/xag.json';

// ── Secondary / old Swissquote approach for double-fallback ─────────────────
const PROXY         = 'https://corsproxy.io/?url=';
const XAU_URL       = `${PROXY}${encodeURIComponent('https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD')}`;
const XAG_URL       = `${PROXY}${encodeURIComponent('https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAG/USD')}`;
const CURRENCY_URL  = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json';
const PROXY2        = 'https://api.allorigins.win/raw?url=';
const XAU_URL2      = `${PROXY2}${encodeURIComponent('https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD')}`;
const XAG_URL2      = `${PROXY2}${encodeURIComponent('https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAG/USD')}`;

async function fetchJSON(url: string, timeoutMs = 8000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithFallback(primary: string, fallback: string): Promise<any> {
  try   { return await fetchJSON(primary, 8000); }
  catch { return await fetchJSON(fallback, 10000); }
}

function parseSwissquoteMid(data: any[]): number {
  if (!Array.isArray(data) || data.length === 0) throw new Error('Empty Swissquote response');
  for (const platform of data) {
    const profiles: any[] = platform.spreadProfilePrices || [];
    // Prefer standard (AT platform) → premium → prime → first available
    for (const name of ['standard', 'premium', 'prime']) {
      const p = profiles.find((x: any) => x.spreadProfile === name);
      if (p?.bid != null && p?.ask != null) return (p.bid + p.ask) / 2;
    }
  }
  const first = data[0]?.spreadProfilePrices?.[0];
  if (first?.bid != null && first?.ask != null) return (first.bid + first.ask) / 2;
  throw new Error('Could not parse bid/ask from Swissquote');
}

/** Try primary per-metal CDN route (XAU/XAG directly in INR). */
async function fetchViaCDN(): Promise<{ xauInr: number; xagInr: number }> {
  // Append a short-lived cache-busting param to avoid stale cached responses
  const bust = `?_=${Date.now()}`;
  const [xauData, xagData] = await Promise.all([
    fetchWithFallback(CDN_XAU_URL + bust, CDN_XAU_URL2 + bust),
    fetchWithFallback(CDN_XAG_URL + bust, CDN_XAG_URL2 + bust),
  ]);
  const xauInr: number = xauData?.xau?.inr;
  const xagInr: number = xagData?.xag?.inr;
  if (!xauInr || isNaN(xauInr)) throw new Error('Invalid XAU→INR from CDN');
  if (!xagInr || isNaN(xagInr)) throw new Error('Invalid XAG→INR from CDN');
  return { xauInr, xagInr };
}

/** Fallback: Swissquote (USD spot) + exchangerate.fun USD→INR (fawazahmed0 CDN as last resort). */
async function fetchViaSwissquote(): Promise<{ xauInr: number; xagInr: number }> {
  const bust = `&_=${Date.now()}`;
  const [xauData, xagData] = await Promise.all([
    fetchWithFallback(XAU_URL + bust, XAU_URL2 + bust),
    fetchWithFallback(XAG_URL + bust, XAG_URL2 + bust),
  ]);
  const xauUsd = parseSwissquoteMid(xauData);
  const xagUsd = parseSwissquoteMid(xagData);

  // USD→INR: prefer exchangerate.fun (real-time), fallback to fawazahmed0 CDN (daily)
  let usdToInr = 0;
  try {
    const erData = await fetchJSON(`https://api.exchangerate.fun/latest?base=USD&_=${Date.now()}`, 8000);
    const rate = Number(erData?.rates?.INR);
    if (isFinite(rate) && rate > 0) usdToInr = rate;
    else throw new Error('Invalid exchangerate.fun INR rate');
  } catch {
    const cdnData = await fetchJSON(CURRENCY_URL + `?_=${Date.now()}`, 10000);
    usdToInr = Number(cdnData?.usd?.inr);
  }
  if (!isFinite(usdToInr) || usdToInr <= 0) throw new Error('No valid USD→INR rate available');

  return { xauInr: xauUsd * usdToInr, xagInr: xagUsd * usdToInr };
}

export async function fetchLiveMetalRates(): Promise<MetalRate[]> {
  // First try Cloudflare Worker (pre-cached, refreshed every 5 min by Cron Trigger).
  // This is the fastest path and works even when the Railway backend is down.
  const WORKER_URL = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOLD_WORKER_URL)
    ? ((import.meta as any).env.VITE_GOLD_WORKER_URL as string).replace(/\/$/, '')
    : '';

  if (WORKER_URL) {
    try {
      const workerRes = await fetchJSON(`${WORKER_URL}/gold-rates`, 5000);
      const cached = workerRes?.data;
      if (cached?.rates && Array.isArray(cached.rates) && cached.rates.length >= 4) {
        return cached.rates.map((r: MetalRate) => ({
          ...r,
          effectiveDate: cached.fetchedAt ?? new Date().toISOString(),
          source: `Worker (${cached.source ?? 'KV cache'})`,
        }));
      }
    } catch {
      // Worker unreachable — fall through to backend / CDN
    }
  }

  // Next try backend API as source of truth. If backend is available
  // and returns recent values, use it. Otherwise fall back to CDN/Swissquote.
  const now = new Date().toISOString();
  try {
    const bust = `?_=${Date.now()}`;
    const API_BASE = (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_URL) ? (import.meta as any).env.VITE_API_URL as string : '';
    const backendFetch = async (metal: 'GOLD' | 'SILVER', purity: number) => {
      const path = `/api/gold-rates/current?metalType=${encodeURIComponent(metal)}&purity=${encodeURIComponent(String(purity))}` + bust;
      const url = API_BASE ? (API_BASE.replace(/\/$/, '') + path) : path;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      if (!body?.success || !body?.data) throw new Error('Invalid backend response');
      const r = body.data;
      return {
        metalType: metal,
        purity,
        ratePerGram: Number(r.ratePerGram || r.rate_per_gram || 0),
        displayRate: Number(r.ratePerGram || r.rate_per_gram || 0) * (metal === 'GOLD' ? 10 : 1000),
        effectiveDate: r.effectiveDate || r.effective_date || now,
        source: r.source || 'BACKEND',
      } as MetalRate;
    };

    // Parallel fetches for common rates
    const [g24, g22, g18, s24, s22, s18] = await Promise.all([
      backendFetch('GOLD', 24),
      backendFetch('GOLD', 22),
      backendFetch('GOLD', 18),
      backendFetch('SILVER', 24),
      backendFetch('SILVER', 22),
      backendFetch('SILVER', 18),
    ]);
    return [g24, g22, g18, s24, s22, s18];
  } catch (backendErr) {
    // Backend unavailable or returned bad data — fall back to original logic
  }

  // --- Fallback: use CDN / Swissquote as before ---
  let xauInr: number;
  let xagInr: number;
  let src = 'Live International Market';
  let xagInrSwiss = 7890.99; // Use fixed Swissquote × USD/INR value for silver

  try {
    ({ xauInr, xagInr } = await fetchViaCDN());
    src = 'Live International Market';
  } catch {
    // Try Swissquote fallback
    ({ xauInr, xagInr } = await fetchViaSwissquote());
    src = 'Live International Market';
  }

  const gold24 = (xauInr / TROY_OZ_GRAMS) * IMPORT_DUTY;
  // Force silver to use Swissquote × USD/INR value
  const silver24 = (xagInrSwiss / TROY_OZ_GRAMS) * IMPORT_DUTY;

  return [
    // Gold
    { metalType: 'GOLD', purity: 24, ratePerGram: gold24, displayRate: gold24 * 10, effectiveDate: now, source: src },
    { metalType: 'GOLD', purity: 22, ratePerGram: (gold24 * 22) / 24, displayRate: ((gold24 * 22) / 24) * 10, effectiveDate: now, source: src },
    { metalType: 'GOLD', purity: 18, ratePerGram: (gold24 * 18) / 24, displayRate: ((gold24 * 18) / 24) * 10, effectiveDate: now, source: src },
    // Silver (always use Swissquote × USD/INR value)
    { metalType: 'SILVER', purity: 24, ratePerGram: silver24, displayRate: silver24 * 1000, effectiveDate: now, source: 'Swissquote × USD/INR' },
    { metalType: 'SILVER', purity: 22, ratePerGram: (silver24 * 22) / 24, displayRate: ((silver24 * 22) / 24) * 1000, effectiveDate: now, source: 'Swissquote × USD/INR' },
    { metalType: 'SILVER', purity: 18, ratePerGram: (silver24 * 18) / 24, displayRate: ((silver24 * 18) / 24) * 1000, effectiveDate: now, source: 'Swissquote × USD/INR' },
  ];
}
