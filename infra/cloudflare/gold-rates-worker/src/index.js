const TROY_OZ_GRAMS = 31.1035;
const IMPORT_DUTY = 1.09;
const SWISSQUOTE_XAU = 'https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD';
const SWISSQUOTE_XAG = 'https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAG/USD';
const YAHOO_USDINR_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart/INR=X?interval=1m&range=1d';
const YAHOO_USDINR_QUOTE = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=INR=X';
async function fetchJSON(url, timeoutMs = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'BizmationGoldWorker/1.0' } });
        if (!res.ok)
            throw new Error(`HTTP ${res.status} from ${url}`);
        return await res.json();
    }
    finally {
        clearTimeout(timer);
    }
}
async function fetchWithFallback(primary, fallback) {
    try {
        return await fetchJSON(primary);
    }
    catch {
        return await fetchJSON(fallback);
    }
}
function parseSwissquoteMid(data) {
    if (!Array.isArray(data) || data.length === 0)
        throw new Error('Empty Swissquote response');
    for (const platform of data) {
        const profiles = platform.spreadProfilePrices || [];
        for (const name of ['standard', 'premium', 'prime']) {
            const p = profiles.find((x) => x.spreadProfile === name);
            if (p?.bid != null && p?.ask != null)
                return (p.bid + p.ask) / 2;
        }
    }
    const first = data[0]?.spreadProfilePrices?.[0];
    if (first?.bid != null && first?.ask != null)
        return (first.bid + first.ask) / 2;
    throw new Error('Could not parse bid/ask from Swissquote');
}
async function fetchYahooUsdInr() {
    const bust = `&_=${Date.now()}`;
    const chartData = await fetchJSON(`${YAHOO_USDINR_CHART}${bust}`);
    const result = chartData?.chart?.result?.[0];
    const metaPrice = Number(result?.meta?.regularMarketPrice);
    if (isFinite(metaPrice) && metaPrice > 0)
        return metaPrice;
    const closes = result?.indicators?.quote?.[0]?.close ?? [];
    for (let i = closes.length - 1; i >= 0; i -= 1) {
        const v = Number(closes[i]);
        if (isFinite(v) && v > 0)
            return v;
    }
    const quoteData = await fetchJSON(`${YAHOO_USDINR_QUOTE}&_=${Date.now()}`);
    const q = Number(quoteData?.quoteResponse?.result?.[0]?.regularMarketPrice);
    if (isFinite(q) && q > 0)
        return q;
    throw new Error('No valid USD/INR from Yahoo Finance');
}
async function fetchViaSwissquote() {
    const bust = `?_=${Date.now()}`;
    const [xauData, xagData, usdData] = await Promise.all([
        fetchJSON(SWISSQUOTE_XAU + bust),
        fetchJSON(SWISSQUOTE_XAG + bust),
        fetchYahooUsdInr(),
    ]);
    const xauUsd = parseSwissquoteMid(xauData);
    const xagUsd = parseSwissquoteMid(xagData);
    if (!isFinite(xauUsd) || xauUsd < 500 || xauUsd > 10000)
        throw new Error(`Invalid XAU/USD from Swissquote: ${xauUsd}`);
    if (!isFinite(xagUsd) || xagUsd < 1 || xagUsd > 200)
        throw new Error(`Invalid XAG/USD from Swissquote: ${xagUsd}`);
    const usdToInr = Number(usdData);
    if (!isFinite(usdToInr) || usdToInr <= 0)
        throw new Error('No valid USD→INR rate');
    return { xauInr: xauUsd * usdToInr, xagInr: xagUsd * usdToInr, xauUsd, xagUsd, usdToInr, source: 'Swissquote+YahooFinance' };
}
/**
 * Build display rates from raw spot prices.
 *
 * Gold purity grades (Indian market):
 *   999 (24K) = spot_base × (999/995)  - highest purity, 0.4% premium over 995
 *   995 (24K) = spot_base              - most liquid physical bar/coin purity (the market reference)
 *   916 (22K) = spot_base × (916/995)  - hallmark jewellery standard
 *   750 (18K) = spot_base × (750/995)  - fashion/designer jewellery
 *
 * Silver:
 *   999 only - no hidden surcharge.
 *
 * displayRate: per 10g for gold, per 1kg for silver.
 */
function buildRates(xauInr, xagInr, source, now) {
    // Spot price → per gram for 995 purity (most common Indian physical bar)
    const base995 = (xauInr / TROY_OZ_GRAMS) * IMPORT_DUTY;
    const gold999 = base995 * (999 / 995);
    const gold916 = base995 * (916 / 995);
    const gold750 = base995 * (750 / 995);
    const silver999 = (xagInr / TROY_OZ_GRAMS) * IMPORT_DUTY;
    return [
        { metalType: 'GOLD', purity: 999, purityLabel: '24K (999)', ratePerGram: gold999, displayRate: gold999 * 10, effectiveDate: now, source },
        { metalType: 'GOLD', purity: 995, purityLabel: '24K (995)', ratePerGram: base995, displayRate: base995 * 10, effectiveDate: now, source },
        { metalType: 'GOLD', purity: 916, purityLabel: '22K (916)', ratePerGram: gold916, displayRate: gold916 * 10, effectiveDate: now, source },
        { metalType: 'GOLD', purity: 750, purityLabel: '18K (750)', ratePerGram: gold750, displayRate: gold750 * 10, effectiveDate: now, source },
        { metalType: 'SILVER', purity: 999, purityLabel: '999', ratePerGram: silver999, displayRate: silver999 * 1000, effectiveDate: now, source },
    ];
}
async function fetchAndCacheRates(env) {
    const now = new Date().toISOString();
    let xauInr, xagInr, xauUsd, xagUsd, usdToInr, source;
    ({ xauInr, xagInr, xauUsd, xagUsd, usdToInr, source } = await fetchViaSwissquote());
    const rates = buildRates(xauInr, xagInr, source, now);
    const cached = {
        rates,
        fetchedAt: now,
        source,
        xauInr,
        xagInr,
        xauUsd,
        xagUsd,
        usdToInr,
        inputs: {
            xauUsd: { value: xauUsd, source: 'Swissquote BBO midpoint', url: SWISSQUOTE_XAU },
            xagUsd: { value: xagUsd, source: 'Swissquote BBO midpoint', url: SWISSQUOTE_XAG },
            usdToInr: { value: usdToInr, source: 'Yahoo Finance INR=X', url: YAHOO_USDINR_CHART },
            derived: {
                xauInrPerTroyOz: xauInr,
                xagInrPerTroyOz: xagInr,
                formula: 'metalInrPerTroyOz = metalUsdPerTroyOz * usdToInr',
            },
        },
    };
    try {
        if (!env.GOLD_RATES_KV)
            throw new Error('GOLD_RATES_KV binding not found');
        await env.GOLD_RATES_KV.put('gold_rates_cache', JSON.stringify(cached), { expirationTtl: 600 });
        console.log(`[Worker] Cached at ${now} | XAU/USD: ${xauUsd.toFixed(2)} | XAG/USD: ${xagUsd.toFixed(4)} | USD/INR: ${usdToInr.toFixed(2)} | Source: ${source}`);
    }
    catch (kvErr) {
        console.warn('[Worker] Could not write to KV:', kvErr?.message || kvErr);
    }
    return cached;
}
function corsHeaders(origin) {
    const allowOrigin = origin ?? '*';
    return { 'Access-Control-Allow-Origin': allowOrigin, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' };
}
function jsonResponse(data, status = 200, origin = null) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60, s-maxage=60', ...corsHeaders(origin) } });
}
export default {
    async fetch(request, env, _ctx) {
        const url = new URL(request.url);
        const origin = request.headers.get('Origin');
        console.log(`[Worker] Incoming request ${request.method} ${url.pathname}`);
        if (request.method === 'OPTIONS')
            return new Response(null, { status: 204, headers: corsHeaders(origin) });
        // serve root as the same as /gold-rates to make visiting the worker url useful
        if ((url.pathname === '/' || url.pathname === '/gold-rates') && request.method === 'GET') {
            try {
                let cachedStr = null;
                try {
                    cachedStr = env.GOLD_RATES_KV ? await env.GOLD_RATES_KV.get('gold_rates_cache') : null;
                }
                catch (e) {
                    console.warn('[Worker] KV get failed:', e?.message || e);
                }
                if (cachedStr) {
                    const data = JSON.parse(cachedStr);
                    return jsonResponse({ success: true, data, cached: true }, 200, origin);
                }
                const fresh = await fetchAndCacheRates(env);
                return jsonResponse({ success: true, data: fresh, cached: false }, 200, origin);
            }
            catch (err) {
                return jsonResponse({ success: false, error: err.message }, 503, origin);
            }
        }
        if (url.pathname === '/gold-rates/live' && request.method === 'GET') {
            try {
                const fresh = await fetchAndCacheRates(env);
                return jsonResponse({ success: true, data: fresh, cached: false }, 200, origin);
            }
            catch (err) {
                return jsonResponse({ success: false, error: err.message }, 503, origin);
            }
        }
        if (url.pathname === '/health')
            return jsonResponse({ status: 'ok', worker: 'gold-rates-worker', time: new Date().toISOString() }, 200, origin);
        return jsonResponse({ error: 'Not found. Use GET /gold-rates' }, 404, origin);
    },
    async scheduled(_event, env, ctx) {
        ctx.waitUntil(fetchAndCacheRates(env).catch(err => console.error('[Worker/cron] Fetch failed:', err)));
    },
};
//# sourceMappingURL=index.js.map