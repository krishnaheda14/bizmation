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
    displayRate: number;
    effectiveDate: string;
    source: string;
}
export declare function fetchLiveMetalRates(): Promise<MetalRate[]>;
//# sourceMappingURL=goldPrices.d.ts.map