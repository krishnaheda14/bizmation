/**
 * Shared Gold / Silver Price Fetching Utility
 *
 * Flow:
 *   1. Cloudflare Worker URL from VITE_GOLD_WORKER_URL
 *   2. Try /gold-rates (cached) then /gold-rates/live (fresh recompute)
 *
 * Purity grades returned:
 *   GOLD  — 999 (24K), 995 (24K), 916 (22K), 750 (18K)   displayRate = per 10g
 *   SILVER — 999 only (no hidden surcharge) displayRate = per 1kg
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
  inputs?: {
    xauUsd?: { value: number; source: string; url: string };
    xagUsd?: { value: number; source: string; url: string };
    usdToInr?: { value: number; source: string; url: string };
    derived?: {
      xauInrPerTroyOz: number;
      xagInrPerTroyOz: number;
      formula: string;
    };
  };
}

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

function getWorkerUrl(): string {
  const raw = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOLD_WORKER_URL)
    ? String((import.meta as any).env.VITE_GOLD_WORKER_URL)
    : '';
  return raw.trim().replace(/\/$/, '');
}

export async function fetchLiveMetalRates(): Promise<MetalRate[]> {
  const workerUrl = getWorkerUrl();
  if (!workerUrl) {
    throw new Error('VITE_GOLD_WORKER_URL is not configured.');
  }

  try {
    const workerRes = await fetchJSON(`${workerUrl}/gold-rates`, 6000);
    const data = workerRes?.data;
    if (data?.rates && Array.isArray(data.rates) && data.rates.length >= 4) {
      return (data.rates as MetalRate[]).map((r) => ({
        ...r,
        effectiveDate: data.fetchedAt ?? new Date().toISOString(),
        source: `Worker (${data.source ?? 'KV cache'})`,
      }));
    }
  } catch {
    const workerLive = await fetchJSON(`${workerUrl}/gold-rates/live`, 9000);
    const data = workerLive?.data;
    if (data?.rates && Array.isArray(data.rates) && data.rates.length >= 4) {
      return (data.rates as MetalRate[]).map((r) => ({
        ...r,
        effectiveDate: data.fetchedAt ?? new Date().toISOString(),
        source: `Worker (${data.source ?? 'Live'})`,
      }));
    }
  }

  throw new Error('Could not fetch rates from Cloudflare worker.');
}

/**
 * Fetch full market-data snapshot from the Cloudflare Worker.
 * Returns null if the worker is unavailable or not configured.
 * Used by GoldRates page and debug panels to display raw XAU/USD, XAG/USD, USD/INR values.
 */
export async function fetchWorkerData(): Promise<WorkerData | null> {
  const workerUrl = getWorkerUrl();
  if (!workerUrl) return null;
  try {
    const res = await fetchJSON(`${workerUrl}/gold-rates`, 6000);
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
