export interface Env {
  GOLD_RATES_KV: KVNamespace;
}

const TROY_OZ_GRAMS = 31.1035;
const IMPORT_DUTY = 1.09;
/**
 * Silver 5% surcharge: covers handling, storage and assay charges.
 * This surcharge is NOT shown as a label in the public UI.
 * The displayed silver 999 price already includes it.
 * Visible only to super-admin and in this source file.
 */
const SILVER_SURCHARGE = 1.05;

const CDN_XAU_PRIMARY = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json';
const CDN_XAU_MIRROR  = 'https://latest.currency-api.pages.dev/v1/currencies/xau.json';
const CDN_XAG_PRIMARY = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xag.json';
const CDN_XAG_MIRROR  = 'https://latest.currency-api.pages.dev/v1/currencies/xag.json';
const USD_TO_INR_URL  = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json';

const SWISSQUOTE_XAU = 'https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD';
const SWISSQUOTE_XAG = 'https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAG/USD';

interface MetalRate {
  metalType: 'GOLD' | 'SILVER';
  /** Numeric purity: 999, 995, 916, 750 for gold; 999 for silver */
  purity: number;
  /** Human-readable label: "24K (999)", "24K (995)", "22K (916)", "18K (750)", "999" */
  purityLabel: string;
  ratePerGram: number;
  /** Per 10g for gold; per 1kg for silver */
  displayRate: number;
  effectiveDate: string;
  source: string;
}

interface CachedRates {
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

async function fetchJSON(url: string, timeoutMs = 8000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'BizmationGoldWorker/1.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithFallback(primary: string, fallback: string): Promise<any> {
  try { return await fetchJSON(primary); } catch { return await fetchJSON(fallback); }
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

async function fetchViaCDN(): Promise<{ xauInr: number; xagInr: number; xauUsd: number; xagUsd: number; usdToInr: number; source: string }> {
  const bust = `?_=${Date.now()}`;
  const [xauData, xagData, usdData] = await Promise.all([
    fetchWithFallback(CDN_XAU_PRIMARY + bust, CDN_XAU_MIRROR + bust),
    fetchWithFallback(CDN_XAG_PRIMARY + bust, CDN_XAG_MIRROR + bust),
    fetchJSON(USD_TO_INR_URL + bust),
  ]);
  const xauInr: number = xauData?.xau?.inr;
  const xagInr: number = xagData?.xag?.inr;
  const usdToInr: number = Number(usdData?.usd?.inr);
  if (!xauInr || isNaN(xauInr) || xauInr < 1000) throw new Error(`Invalid XAU→INR from CDN: ${xauInr}`);
  if (!xagInr || isNaN(xagInr) || xagInr < 1) throw new Error(`Invalid XAG→INR from CDN: ${xagInr}`);
  if (!isFinite(usdToInr) || usdToInr <= 0) throw new Error(`Invalid USD→INR from CDN: ${usdToInr}`);
  return { xauInr, xagInr, xauUsd: xauInr / usdToInr, xagUsd: xagInr / usdToInr, usdToInr, source: 'fawazahmed0-CDN' };
}

async function fetchViaSwissquote(): Promise<{ xauInr: number; xagInr: number; xauUsd: number; xagUsd: number; usdToInr: number; source: string }> {
  const bust = `?_=${Date.now()}`;
  const [xauData, xagData, usdData] = await Promise.all([
    fetchJSON(SWISSQUOTE_XAU + bust),
    fetchJSON(SWISSQUOTE_XAG + bust),
    fetchJSON(USD_TO_INR_URL + bust),
  ]);
  const xauUsd = parseSwissquoteMid(xauData);
  const xagUsd = parseSwissquoteMid(xagData);
  const usdToInr: number = Number(usdData?.usd?.inr);
  if (!isFinite(usdToInr) || usdToInr <= 0) throw new Error('No valid USD→INR rate');
  return { xauInr: xauUsd * usdToInr, xagInr: xagUsd * usdToInr, xauUsd, xagUsd, usdToInr, source: 'Swissquote+fawazahmed0' };
}

/**
 * Build display rates from raw spot prices.
 *
 * Gold purity grades (Indian market):
 *   999 (24K) = spot_base × (999/995)  — highest purity, 0.4% premium over 995
 *   995 (24K) = spot_base              — most liquid physical bar/coin purity (the market reference)
 *   916 (22K) = spot_base × (916/995)  — hallmark jewellery standard
 *   750 (18K) = spot_base × (750/995)  — fashion/designer jewellery
 *
 * Silver:
 *   999 only — includes SILVER_SURCHARGE (5% extra handling/assay charge).
 *   The surcharge is silently applied; the final per-gram/per-kg price is shown.
 *
 * displayRate: per 10g for gold, per 1kg for silver.
 */
function buildRates(xauInr: number, xagInr: number, source: string, now: string): MetalRate[] {
  // Spot price → per gram for 995 purity (most common Indian physical bar)
  const base995 = (xauInr / TROY_OZ_GRAMS) * IMPORT_DUTY;
  const gold999 = base995 * (999 / 995);
  const gold916 = base995 * (916 / 995);
  const gold750 = base995 * (750 / 995);

  // Silver 999 with 5% surcharge (not shown as label in public UI)
  const silver999 = ((xagInr / TROY_OZ_GRAMS) * IMPORT_DUTY) * SILVER_SURCHARGE;

  return [
    { metalType: 'GOLD',   purity: 999, purityLabel: '24K (999)', ratePerGram: gold999,  displayRate: gold999  * 10,    effectiveDate: now, source },
    { metalType: 'GOLD',   purity: 995, purityLabel: '24K (995)', ratePerGram: base995,  displayRate: base995  * 10,    effectiveDate: now, source },
    { metalType: 'GOLD',   purity: 916, purityLabel: '22K (916)', ratePerGram: gold916,  displayRate: gold916  * 10,    effectiveDate: now, source },
    { metalType: 'GOLD',   purity: 750, purityLabel: '18K (750)', ratePerGram: gold750,  displayRate: gold750  * 10,    effectiveDate: now, source },
    { metalType: 'SILVER', purity: 999, purityLabel: '999',       ratePerGram: silver999, displayRate: silver999 * 1000, effectiveDate: now, source },
  ];
}

async function fetchAndCacheRates(env: Env): Promise<CachedRates> {
  const now = new Date().toISOString();
  let xauInr: number, xagInr: number, xauUsd: number, xagUsd: number, usdToInr: number, source: string;
  try { ({ xauInr, xagInr, xauUsd, xagUsd, usdToInr, source } = await fetchViaCDN()); }
  catch (cdnErr) {
    console.error('[Worker] CDN fetch failed, trying Swissquote:', cdnErr);
    try { ({ xauInr, xagInr, xauUsd, xagUsd, usdToInr, source } = await fetchViaSwissquote()); }
    catch (swissErr) { console.error('[Worker] Swissquote fetch also failed:', swissErr); throw new Error(`All price sources failed.`); }
  }
  const rates = buildRates(xauInr, xagInr, source, now);
  const cached: CachedRates = { rates, fetchedAt: now, source, xauInr, xagInr, xauUsd, xagUsd, usdToInr };
  try {
    if (!env.GOLD_RATES_KV) throw new Error('GOLD_RATES_KV binding not found');
    await env.GOLD_RATES_KV.put('gold_rates_cache', JSON.stringify(cached), { expirationTtl: 600 });
    console.log(`[Worker] Cached at ${now} | XAU/USD: ${xauUsd.toFixed(2)} | XAG/USD: ${xagUsd.toFixed(4)} | USD/INR: ${usdToInr.toFixed(2)} | Source: ${source}`);
  } catch (kvErr) {
    console.warn('[Worker] Could not write to KV:', (kvErr as any)?.message || kvErr);
  }
  return cached;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = ['https://bizmation.pages.dev', 'https://bizmation.com', 'http://localhost:5173', 'http://localhost:4173'];
  const allowOrigin = (origin && allowed.some(o => origin.startsWith(o.replace(/\/$/, '')))) ? origin : allowed[0];
  return { 'Access-Control-Allow-Origin': allowOrigin, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' };
}

function jsonResponse(data: unknown, status = 200, origin: string | null = null): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60, s-maxage=60', ...corsHeaders(origin) } });
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    console.log(`[Worker] Incoming request ${request.method} ${url.pathname}`);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });

    // serve root as the same as /gold-rates to make visiting the worker url useful
    if ((url.pathname === '/' || url.pathname === '/gold-rates') && request.method === 'GET') {
      try {
        let cachedStr: string | null = null;
        try { cachedStr = env.GOLD_RATES_KV ? await env.GOLD_RATES_KV.get('gold_rates_cache') : null; } catch (e) { console.warn('[Worker] KV get failed:', e?.message || e); }
        if (cachedStr) { const data: CachedRates = JSON.parse(cachedStr); return jsonResponse({ success: true, data, cached: true }, 200, origin); }
        const fresh = await fetchAndCacheRates(env);
        return jsonResponse({ success: true, data: fresh, cached: false }, 200, origin);
      } catch (err: any) { return jsonResponse({ success: false, error: err.message }, 503, origin); }
    }

    if (url.pathname === '/gold-rates/live' && request.method === 'GET') {
      try { const fresh = await fetchAndCacheRates(env); return jsonResponse({ success: true, data: fresh, cached: false }, 200, origin); }
      catch (err: any) { return jsonResponse({ success: false, error: err.message }, 503, origin); }
    }

    if (url.pathname === '/health') return jsonResponse({ status: 'ok', worker: 'gold-rates-worker', time: new Date().toISOString() }, 200, origin);
    return jsonResponse({ error: 'Not found. Use GET /gold-rates' }, 404, origin);
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(fetchAndCacheRates(env).catch(err => console.error('[Worker/cron] Fetch failed:', err)));
  },
};
