/**
 * Shared Gold / Silver Price Fetching Utility
 *
 * Flow (most accurate to least):
 *   1. Cloudflare Worker (KV cache, refreshed every 5 min by Cron Trigger)
 *   2. Backend /api/gold-rates/current  — Swissquote real-time
 *   3. CDN fawazahmed0 XAU/XAG/INR     — direct INR daily rate
 *   4. Swissquote via corsproxy         — real-time USD + fawazahmed0 USD/INR
 *
 * Purity grades returned:
 *   GOLD  — 999 (24K), 995 (24K), 916 (22K), 750 (18K)   displayRate = per 10g
 *   SILVER — 999 only (5% handling surcharge silently included) displayRate = per 1kg
 */

export interface MetalRate {
  metalType: 'GOLD' | 'SILVER';
  /** Numeric purity: 999, 995, 916, 750 for gold; 999 for silver */
  purity: number;
  /** Human-readable label e.g. "24K (999)", "22K (916)", "999" */
  purityLabel?: string;
  ratePerGram: number;
  /** Per 10g for gold; per 1kg for silver */
  displayRate: number;
  effectiveDate: string;
  source: string;
}

/** Full market-data snapshot returned by the Cloudflare Worker */
export interface WorkerData {
  rates: MetalRate[];
  fetchedAt: string;
  source: string;
  /** XAU (gold) in INR per troy oz */
  xauInr: number;
  /** XAG (silver) in INR per troy oz */
  xagInr: number;
  /** XAU (gold) in USD per troy oz */
  xauUsd: number;
  /** XAG (silver) in USD per troy oz */
  xagUsd: number;
  /** USD → INR conversion rate used */
  usdToInr: number;
}

const TROY_OZ_GRAMS = 31.1035;
const IMPORT_DUTY   = 1.09;
/**
 * Silver surcharge applied silently on top of import duty.
 * Not shown in the public UI — only visible to super-admin and in this file.
 */
const SILVER_SURCHARGE = 1.05;

/**
 * Build the 5-rate array (4 gold purities + 1 silver 999) from raw spot prices.
 * Mirrors the worker's buildRates() exactly.
 *   Gold base = spot_per_gram_995 = (xauInr / TROY_OZ) * IMPORT_DUTY
 *   999 = base × (999/995)   |   916 = base × (916/995)   |   750 = base × (750/995)
 *   Silver 999 = silver_base × SILVER_SURCHARGE
 */
function buildRatesFromSpot(xauInr: number, xagInr: number, source: string): MetalRate[] {
  const now = new Date().toISOString();
  const base995 = (xauInr / TROY_OZ_GRAMS) * IMPORT_DUTY;
  const gold999 = base995 * (999 / 995);
  const gold916 = base995 * (916 / 995);
  const gold750 = base995 * (750 / 995);
  const silver999 = ((xagInr / TROY_OZ_GRAMS) * IMPORT_DUTY) * SILVER_SURCHARGE;
  return [
    { metalType: 'GOLD',   purity: 999, purityLabel: '24K (999)', ratePerGram: gold999,  displayRate: gold999  * 10,    effectiveDate: now, source },
    { metalType: 'GOLD',   purity: 995, purityLabel: '24K (995)', ratePerGram: base995,  displayRate: base995  * 10,    effectiveDate: now, source },
    { metalType: 'GOLD',   purity: 916, purityLabel: '22K (916)', ratePerGram: gold916,  displayRate: gold916  * 10,    effectiveDate: now, source },
    { metalType: 'GOLD',   purity: 750, purityLabel: '18K (750)', ratePerGram: gold750,  displayRate: gold750  * 10,    effectiveDate: now, source },
    { metalType: 'SILVER', purity: 999, purityLabel: '999',       ratePerGram: silver999, displayRate: silver999 * 1000, effectiveDate: now, source },
  ];
}

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
  // ── 1. Cloudflare Worker (fastest, KV-cached, refreshed every 5 min) ──────
  const WORKER_URL = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOLD_WORKER_URL)
    ? ((import.meta as any).env.VITE_GOLD_WORKER_URL as string).replace(/\/$/, '')
    : '';

  if (WORKER_URL) {
    try {
      const workerRes = await fetchJSON(`${WORKER_URL}/gold-rates`, 5000);
      const data = workerRes?.data;
      if (data?.rates && Array.isArray(data.rates) && data.rates.length >= 4) {
        return (data.rates as MetalRate[]).map((r) => ({
          ...r,
          effectiveDate: data.fetchedAt ?? new Date().toISOString(),
          source: `Worker (${data.source ?? 'KV cache'})`,
        }));
      }
    } catch {
      // Worker unreachable — fall through to backend / CDN
    }
  }

  // ── 2. CDN / Swissquote fallback ─────────────────────────────────────────
  let xauInr: number;
  let xagInr: number;
  let src = 'Live International Market';

  try {
    ({ xauInr, xagInr } = await fetchViaCDN());
  } catch {
    ({ xauInr, xagInr } = await fetchViaSwissquote());
    src = 'Live International Market (Swissquote)';
  }

  return buildRatesFromSpot(xauInr, xagInr, src);
}

/**
 * Fetch full market-data snapshot from the Cloudflare Worker.
 * Returns null if the worker is unavailable or not configured.
 * Used by GoldRates page and debug panels to display raw XAU/USD, XAG/USD, USD/INR values.
 */
export async function fetchWorkerData(): Promise<WorkerData | null> {
  const WORKER_URL = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOLD_WORKER_URL)
    ? ((import.meta as any).env.VITE_GOLD_WORKER_URL as string).replace(/\/$/, '')
    : '';
  if (!WORKER_URL) return null;
  try {
    const res = await fetchJSON(`${WORKER_URL}/gold-rates`, 6000);
    const data: WorkerData = res?.data;
    if (!data?.rates?.length) return null;
    return {
      ...data,
      rates: (data.rates as MetalRate[]).map((r) => ({
        ...r,
        effectiveDate: data.fetchedAt ?? new Date().toISOString(),
        source: `Worker (${data.source ?? 'KV cache'})`,
      })),
    };
  } catch {
    return null;
  }
}
