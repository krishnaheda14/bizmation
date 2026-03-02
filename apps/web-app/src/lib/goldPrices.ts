/**
 * Shared Gold / Silver Price Fetching Utility
 *
 * PRIMARY: fawazahmed0 currency API (jsdelivr CDN) — returns XAU/XAG prices
 *          directly in INR; no CORS proxy needed.
 * FALLBACK: Swissquote via corsproxy.io/allorigins.win + fawazahmed0 USD→INR.
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
    const res = await fetch(url, { signal: controller.signal });
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
    const standard = profiles.find((p: any) => p.spreadProfile === 'standard');
    if (standard?.bid != null && standard?.ask != null) {
      return (standard.bid + standard.ask) / 2;
    }
  }
  const first = data[0]?.spreadProfilePrices?.[0];
  if (first?.bid != null && first?.ask != null) return (first.bid + first.ask) / 2;
  throw new Error('Could not parse bid/ask from Swissquote');
}

/** Try primary per-metal CDN route (XAU/XAG directly in INR). */
async function fetchViaCDN(): Promise<{ xauInr: number; xagInr: number }> {
  const [xauData, xagData] = await Promise.all([
    fetchWithFallback(CDN_XAU_URL, CDN_XAU_URL2),
    fetchWithFallback(CDN_XAG_URL, CDN_XAG_URL2),
  ]);
  const xauInr: number = xauData?.xau?.inr;
  const xagInr: number = xagData?.xag?.inr;
  if (!xauInr || isNaN(xauInr)) throw new Error('Invalid XAU→INR from CDN');
  if (!xagInr || isNaN(xagInr)) throw new Error('Invalid XAG→INR from CDN');
  return { xauInr, xagInr };
}

/** Fallback: Swissquote (USD spot) + fawazahmed0 USD→INR. */
async function fetchViaSwissquote(): Promise<{ xauInr: number; xagInr: number }> {
  const [xauData, xagData, currencyData] = await Promise.all([
    fetchWithFallback(XAU_URL, XAU_URL2),
    fetchWithFallback(XAG_URL, XAG_URL2),
    fetchJSON(CURRENCY_URL),
  ]);
  const xauUsd   = parseSwissquoteMid(xauData);
  const xagUsd   = parseSwissquoteMid(xagData);
  const usdToInr: number = currencyData?.usd?.inr;
  if (!usdToInr || isNaN(usdToInr)) throw new Error('Invalid USD→INR rate');
  return { xauInr: xauUsd * usdToInr, xagInr: xagUsd * usdToInr };
}

export async function fetchLiveMetalRates(): Promise<MetalRate[]> {
  let xauInr: number;
  let xagInr: number;
  let src = 'Live International Market';

  try {
    ({ xauInr, xagInr } = await fetchViaCDN());
    src = 'Live International Market';
  } catch {
    // Try Swissquote fallback
    ({ xauInr, xagInr } = await fetchViaSwissquote());
    src = 'Live International Market';
  }

  const gold24   = (xauInr / TROY_OZ_GRAMS) * IMPORT_DUTY;
  const silver24 = (xagInr / TROY_OZ_GRAMS) * IMPORT_DUTY;
  const now      = new Date().toISOString();

  return [
    // Gold
    { metalType: 'GOLD',   purity: 24, ratePerGram: gold24,                  displayRate: gold24 * 10,                  effectiveDate: now, source: src },
    { metalType: 'GOLD',   purity: 22, ratePerGram: (gold24 * 22) / 24,      displayRate: ((gold24 * 22) / 24) * 10,    effectiveDate: now, source: src },
    { metalType: 'GOLD',   purity: 18, ratePerGram: (gold24 * 18) / 24,      displayRate: ((gold24 * 18) / 24) * 10,    effectiveDate: now, source: src },
    // Silver
    { metalType: 'SILVER', purity: 24, ratePerGram: silver24,                 displayRate: silver24 * 1000,              effectiveDate: now, source: src },
    { metalType: 'SILVER', purity: 22, ratePerGram: (silver24 * 22) / 24,    displayRate: ((silver24 * 22) / 24) * 1000, effectiveDate: now, source: src },
    { metalType: 'SILVER', purity: 18, ratePerGram: (silver24 * 18) / 24,    displayRate: ((silver24 * 18) / 24) * 1000, effectiveDate: now, source: src },
  ];
}
