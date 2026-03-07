/**
 * Gold Rate Service
 *
 * Fetches gold rates from multiple sources and manages rate updates
 */
import { DatabaseService } from '../database/DatabaseService';
export declare class GoldRateService {
    private db;
    private apiKey;
    private apiUrl;
    constructor(db: DatabaseService);
    /**
     * Get current gold rate for metal type and purity
     */
    getCurrentRate(metalType: MetalType, purity: number): Promise<GoldRate>;
    /**
     * Force a fresh fetch from upstream and save to DB. Public wrapper.
     */
    fetchLiveRate(metalType: MetalType, purity: number): Promise<GoldRate>;
    /**
     * Fetch rate from external API
     *
     * Gold/Silver spot price source: Swissquote public-quotes feed (XAU/USD, XAG/USD)
     * Currency source:               fawazahmed0 currency-api (USD → INR)
     *
     * Calculation:
     *   pricePerGramINR = (spotUSD × usdToInr) / 31.1035 (troy ounce → grams)
     *   After that 9% Indian import duty is applied.
     */
    private fetchFromAPI;
    /**
     * Fetch and save rate
     */
    private fetchAndSaveRate;
    /**
     * Manually update gold rate
     */
    updateRate(metalType: MetalType, purity: number, ratePerGram: number): Promise<GoldRate>;
    /**
     * Get rate history
     */
    getRateHistory(metalType: MetalType, purity: number, days?: number): Promise<GoldRate[]>;
    /**
     * Auto-update rates (called by cron job)
     */
    autoUpdateRates(): Promise<void>;
    /**
     * Reconcile backend DB rates with upstream API and update if discrepancy
     * exceeds `thresholdPercent`.
     */
    reconcileAndUpdateAll(thresholdPercent?: number): Promise<{
        updated: Array<{
            metalType: MetalType;
            purity: number;
            old?: number;
            newest: number;
        }>;
    }>;
    private generateId;
    private mapToGoldRate;
}
//# sourceMappingURL=GoldRateService.d.ts.map