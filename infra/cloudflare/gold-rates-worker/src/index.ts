export interface Env {
  GOLD_RATES_KV: KVNamespace;
}

const TROY_OZ_GRAMS = 31.1035;
const IMPORT_DUTY = 1.09;

const CDN_XAU_PRIMARY = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json';
const CDN_XAU_MIRROR = 'https://latest.currency-api.pages.dev/v1/currencies/xau.json';
const CDN_XAG_PRIMARY = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xag.json';
const CDN_XAG_MIRROR = 'https://latest.currency-api.pages.dev/v1/currencies/xag.json';

const SWISSQUOTE_XAU = 'https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD';
const SWISSQUOTE_XAG = 'https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAG/USD';
const USD_TO_INR_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json';

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

async function fetchViaCDN(): Promise<{ xauInr: number; xagInr: number; source: string }> {
  const bust = `?_=${Date.now()}`;
  const [xauData, xagData] = await Promise.all([
    fetchWithFallback(CDN_XAU_PRIMARY + bust, CDN_XAU_MIRROR + bust),
    fetchWithFallback(CDN_XAG_PRIMARY + bust, CDN_XAG_MIRROR + bust),
  ]);
  const xauInr: number = xauData?.xau?.inr;
  const xagInr: number = xagData?.xag?.inr;
  if (!xauInr || isNaN(xauInr) || xauInr < 1000) throw new Error(`Invalid XAU→INR from CDN: ${xauInr}`);
  if (!xagInr || isNaN(xagInr) || xagInr < 1) throw new Error(`Invalid XAG→INR from CDN: ${xagInr}`);
  return { xauInr, xagInr, source: 'fawazahmed0-CDN' };
}

async function fetchViaSwissquote(): Promise<{ xauInr: number; xagInr: number; usdToInr: number; source: string }> {
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
  return { xauInr: xauUsd * usdToInr, xagInr: xagUsd * usdToInr, usdToInr, source: 'Swissquote+fawazahmed0' };
}

function buildRates(xauInr: number, xagInr: number, source: string, now: string): MetalRate[] {
  const gold24 = (xauInr / TROY_OZ_GRAMS) * IMPORT_DUTY;
  const silver24 = (xagInr / TROY_OZ_GRAMS) * IMPORT_DUTY;
  return [
    { metalType: 'GOLD', purity: 24, ratePerGram: gold24, displayRate: gold24 * 10, effectiveDate: now, source },
    { metalType: 'GOLD', purity: 22, ratePerGram: (gold24 * 22) / 24, displayRate: ((gold24 * 22) / 24) * 10, effectiveDate: now, source },
    { metalType: 'GOLD', purity: 18, ratePerGram: (gold24 * 18) / 24, displayRate: ((gold24 * 18) / 24) * 10, effectiveDate: now, source },
    { metalType: 'SILVER', purity: 24, ratePerGram: silver24, displayRate: silver24 * 1000, effectiveDate: now, source },
    { metalType: 'SILVER', purity: 22, ratePerGram: (silver24 * 22) / 24, displayRate: ((silver24 * 22) / 24) * 1000, effectiveDate: now, source },
    { metalType: 'SILVER', purity: 18, ratePerGram: (silver24 * 18) / 24, displayRate: ((silver24 * 18) / 24) * 1000, effectiveDate: now, source },
  ];
}

async function fetchAndCacheRates(env: Env): Promise<CachedRates> {
  const now = new Date().toISOString();
  let xauInr: number, xagInr: number, usdToInr: number | undefined, source: string;
  try { ({ xauInr, xagInr, source } = await fetchViaCDN()); }
  catch (cdnErr) {
    console.error('[Worker] CDN fetch failed, trying Swissquote:', cdnErr);
    try { ({ xauInr, xagInr, usdToInr, source } = await fetchViaSwissquote()); }
    catch (swissErr) { console.error('[Worker] Swissquote fetch also failed:', swissErr); throw new Error(`All price sources failed.`); }
  }
  const rates = buildRates(xauInr, xagInr, source, now);
  const cached: CachedRates = { rates, fetchedAt: now, source, xauInr, xagInr, usdToInr };
  try {
    if (!env.GOLD_RATES_KV) throw new Error('GOLD_RATES_KV binding not found');
    await env.GOLD_RATES_KV.put('gold_rates_cache', JSON.stringify(cached), { expirationTtl: 600 });
    console.log(`[Worker] Rates cached at ${now}. XAU/INR: ${xauInr.toFixed(2)}, XAG/INR: ${xagInr.toFixed(2)}, Source: ${source}`);
  } catch (kvErr) {
    console.warn('[Worker] Could not write to KV (running without KV?):', kvErr?.message || kvErr);
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
