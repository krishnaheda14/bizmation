/**
 * Shared Gold / Silver Price Fetching Utility
 *
 * Flow:
 *   1. Cloudflare Worker URL from VITE_GOLD_WORKER_URL
 *   2. Try /gold-rates (cached) then /gold-rates/live (fresh recompute)
 */
export interface MetalRate {
    metalType: 'GOLD' | 'SILVER';
    purity: number;
    purityLabel?: string;
    ratePerGram: number;
    displayRate: number;
    effectiveDate: string;
    source: string;
}
export interface WorkerData {
    rates: MetalRate[];
    fetchedAt: string;
    source: string;
    xauInr: number;
    xagInr: number;
    xauUsd: number;
    xagUsd: number;
    usdToInr: number;
    inputs?: {
        xauUsd?: {
            value: number;
            source: string;
            url: string;
        };
        xagUsd?: {
            value: number;
            source: string;
            url: string;
        };
        usdToInr?: {
            value: number;
            source: string;
            url: string;
        };
        derived?: {
            xauInrPerTroyOz: number;
            xagInrPerTroyOz: number;
            formula: string;
        };
    };
}
export declare function fetchLiveMetalRates(): Promise<MetalRate[]>;
export declare function fetchWorkerData(): Promise<WorkerData | null>;
//# sourceMappingURL=goldPrices.d.ts.map