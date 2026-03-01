/**
 * Shared Gold / Silver Price Fetching Utility
 *
 * Fetches live XAU/XAG prices from Swissquote via a CORS proxy,
 * then converts USD → INR and applies 9% Indian import duty.
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
const IMPORT_DUTY = 1.09;

// CORS-proxied endpoints (browser-safe)
const PROXY = 'https://corsproxy.io/?url=';
const XAU_URL = `${PROXY}${encodeURIComponent('https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD')}`;
const XAG_URL = `${PROXY}${encodeURIComponent('https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAG/USD')}`;
const CURRENCY_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json';

// Fallback proxy if corsproxy.io fails
const PROXY2 = 'https://api.allorigins.win/raw?url=';
const XAU_URL2 = `${PROXY2}${encodeURIComponent('https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD')}`;
const XAG_URL2 = `${PROXY2}${encodeURIComponent('https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAG/USD')}`;

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

async function fetchWithFallback(primary: string, fallback: string): Promise<any> {
  try {
    const res = await fetch(primary, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    const res = await fetch(fallback, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`Fallback HTTP ${res.status}`);
    return await res.json();
  }
}

export async function fetchLiveMetalRates(): Promise<MetalRate[]> {
  const [xauData, xagData, currencyData] = await Promise.all([
    fetchWithFallback(XAU_URL, XAU_URL2),
    fetchWithFallback(XAG_URL, XAG_URL2),
    fetch(CURRENCY_URL).then((r) => {
      if (!r.ok) throw new Error('Currency API error');
      return r.json();
    }),
  ]);

  const xauUsd = parseSwissquoteMid(xauData);
  const xagUsd = parseSwissquoteMid(xagData);
  const usdToInr: number = currencyData?.usd?.inr;
  if (!usdToInr || isNaN(usdToInr)) throw new Error('Invalid USD→INR rate');

  const gold24 = (xauUsd * usdToInr / TROY_OZ_GRAMS) * IMPORT_DUTY;
  const silver24 = (xagUsd * usdToInr / TROY_OZ_GRAMS) * IMPORT_DUTY;

  const now = new Date().toISOString();
  const src = 'Live International Market';

  return [
    // Gold
    { metalType: 'GOLD', purity: 24, ratePerGram: gold24, displayRate: gold24 * 10, effectiveDate: now, source: src },
    { metalType: 'GOLD', purity: 22, ratePerGram: (gold24 * 22) / 24, displayRate: ((gold24 * 22) / 24) * 10, effectiveDate: now, source: src },
    { metalType: 'GOLD', purity: 18, ratePerGram: (gold24 * 18) / 24, displayRate: ((gold24 * 18) / 24) * 10, effectiveDate: now, source: src },
    // Silver
    { metalType: 'SILVER', purity: 24, ratePerGram: silver24, displayRate: silver24 * 1000, effectiveDate: now, source: src },
    { metalType: 'SILVER', purity: 22, ratePerGram: (silver24 * 22) / 24, displayRate: ((silver24 * 22) / 24) * 1000, effectiveDate: now, source: src },
    { metalType: 'SILVER', purity: 18, ratePerGram: (silver24 * 18) / 24, displayRate: ((silver24 * 18) / 24) * 1000, effectiveDate: now, source: src },
  ];
}
