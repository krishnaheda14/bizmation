/**
 * Gold Rate Service
 * 
 * Fetches gold rates from multiple sources and manages rate updates
 */

import axios from 'axios';
import { GoldRate, MetalType } from '@jewelry-platform/shared-types';
import { DatabaseService } from '../database/DatabaseService';

export class GoldRateService {
  private db: DatabaseService;
  private apiKey: string;
  private apiUrl: string;

  constructor(db: DatabaseService) {
    this.db = db;
    this.apiKey = process.env.GOLD_API_KEY || '';
    this.apiUrl = process.env.GOLD_API_URL || 'https://www.goldapi.io/api';
  }

  /**
   * Get current gold rate for metal type and purity
   */
  async getCurrentRate(metalType: MetalType, purity: number): Promise<GoldRate> {
    const query = `
      SELECT * FROM gold_rates
      WHERE metal_type = $1 AND purity = $2 AND is_active = true
      ORDER BY effective_date DESC
      LIMIT 1
    `;

    try {
      const result = await this.db.query(query, [metalType, purity]);

      if (result.rows.length === 0) {
        // Fetch from API if not in database
        return this.fetchAndSaveRate(metalType, purity);
      }

      // If the stored rate is stale (older than TTL), fetch a fresh value.
      const ttlSeconds = Number(process.env.GOLD_RATE_TTL_SECONDS || 60);
      const row = result.rows[0];
      const effective = row.effective_date ? new Date(row.effective_date).getTime() : 0;
      const ageSeconds = (Date.now() - effective) / 1000;
      if (ageSeconds > ttlSeconds) {
        try {
          return await this.fetchAndSaveRate(metalType, purity);
        } catch (err: any) {
          // If live fetch fails, fall back to DB value
          console.warn('[GoldRateService] Live fetch failed, returning cached DB rate:', (err as any)?.message || err);
          return this.mapToGoldRate(row);
        }
      }

      return this.mapToGoldRate(row);
    } catch (err: any) {
      // If database is unreachable, fall back to fetching from external API
      console.warn('[GoldRateService] Database unavailable, falling back to external API:', (err as any)?.message || err);
      return this.fetchAndSaveRate(metalType, purity);
    }
  }

  /**
   * Force a fresh fetch from upstream and save to DB. Public wrapper.
   */
  async fetchLiveRate(metalType: MetalType, purity: number): Promise<GoldRate> {
    return this.fetchAndSaveRate(metalType, purity);
  }

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
  private async fetchFromAPI(metalType: MetalType): Promise<any> {
    try {
      // ── Step 1: Spot price in USD per troy ounce ──────────────────────────
      const instrument = metalType === 'SILVER' ? 'XAG' : 'XAU'; // use XAU for GOLD/PLATINUM
      const swissquoteUrl = `https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/${instrument}/USD`;
      console.log(`[GoldRateService] Fetching ${instrument}/USD from Swissquote: ${swissquoteUrl}`);

      const swissquoteResponse = await axios.get(swissquoteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; bizmation-gold-fetcher/1.0)',
          'Accept': 'application/json',
        },
        timeout: 10000,
      });

      // The response is an array of platform objects.  Each has spreadProfilePrices[].
      // Prefer the "standard" spread profile from the "AT" platform; fall back to first entry / first profile.
      const platforms: any[] = swissquoteResponse.data;
      if (!Array.isArray(platforms) || platforms.length === 0) {
        throw new Error('Swissquote returned empty data');
      }

      // Try to find AT→standard, else first platform→first profile
      let chosenProfile: any = null;
      for (const platform of platforms) {
        const profiles: any[] = platform.spreadProfilePrices || [];
        const standard = profiles.find((p: any) => p.spreadProfile === 'standard');
        if (standard) { chosenProfile = standard; break; }
      }
      if (!chosenProfile) {
        chosenProfile = platforms[0]?.spreadProfilePrices?.[0];
      }
      if (!chosenProfile || chosenProfile.bid == null || chosenProfile.ask == null) {
        throw new Error('Could not parse bid/ask from Swissquote response');
      }

      // Use mid-price (average of bid and ask)
      const pricePerOunceUSD = (chosenProfile.bid + chosenProfile.ask) / 2;
      console.log(`[GoldRateService] ${instrument}/USD mid-price: $${pricePerOunceUSD.toFixed(3)} (bid:${chosenProfile.bid} ask:${chosenProfile.ask})`);

      // ── Step 2: USD → INR ─────────────────────────────────────────────────
      // Primary: exchangerate.fun (real-time, more accurate than daily CDN)
      // Fallback: fawazahmed0 CDN (daily rate)
      let usdToInrRate = 0;
      console.log('[GoldRateService] Fetching USD→INR rate from exchangerate.fun');
      try {
        const erResponse = await axios.get(
          'https://api.exchangerate.fun/latest?base=USD',
          { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bizmation-gold-fetcher/1.0)', 'Accept': 'application/json' }, timeout: 8000 }
        );
        const rate = Number(erResponse.data?.rates?.INR);
        if (isFinite(rate) && rate > 0) {
          usdToInrRate = rate;
          console.log(`[GoldRateService] USD→INR (exchangerate.fun): ${usdToInrRate}`);
        } else {
          throw new Error('Invalid INR rate from exchangerate.fun');
        }
      } catch (erErr: any) {
        console.warn('[GoldRateService] exchangerate.fun failed, falling back to fawazahmed0 CDN:', erErr.message);
        const currencyResponse = await axios.get(
          'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
          { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bizmation-gold-fetcher/1.0)', 'Accept': 'application/json' }, timeout: 10000 }
        );
        usdToInrRate = Number(currencyResponse.data?.usd?.inr);
        if (!isFinite(usdToInrRate) || usdToInrRate <= 0) {
          throw new Error('USD→INR rate not available from any source');
        }
        console.log(`[GoldRateService] USD→INR (fawazahmed0 CDN fallback): ${usdToInrRate}`);
      }

      // ── Step 3: Calculate per-gram INR price ──────────────────────────────
      // 1 troy ounce = 31.1035 grams
      // Add 9% Indian import duty
      const TROY_OZ_GRAMS = 31.1035;
      const IMPORT_DUTY = 1.09; // 9%

      const pricePerGramINR = (pricePerOunceUSD * usdToInrRate / TROY_OZ_GRAMS) * IMPORT_DUTY;

      if (!isFinite(pricePerGramINR) || isNaN(pricePerGramINR)) {
        throw new Error('Computed price per gram is invalid');
      }

      console.log(
        `[GoldRateService] ${metalType} per gram (INR, after 9% duty): ₹${pricePerGramINR.toFixed(2)}` +
        ` | per 10g: ₹${(pricePerGramINR * 10).toFixed(2)}`
      );

      // Purity-proportional rates - applies to BOTH gold and silver
      const calculatePurityRate = (purity: number) => (pricePerGramINR * purity) / 24;

      return {
        price_gram_24k: pricePerGramINR,         // 24÷24 = full price
        price_gram_22k: calculatePurityRate(22), // 22÷24
        price_gram_21k: calculatePurityRate(21),
        price_gram_20k: calculatePurityRate(20),
        price_gram_18k: calculatePurityRate(18), // 18÷24
        price_gram_16k: calculatePurityRate(16),
        price_gram_14k: calculatePurityRate(14),
        timestamp: Date.now(),
        metal: metalType,
        currency: 'INR',
        usdToInr: usdToInrRate,
        priceUSD: pricePerOunceUSD,
      };
    } catch (error: any) {
      console.error('[GoldRateService] Failed to fetch gold rate from API:', error?.message || error, error?.response?.data || 'no response body');
      throw new Error(error?.message || 'Failed to fetch gold rate from external source');
    }
  }

  /**
   * Fetch and save rate
   */
  private async fetchAndSaveRate(metalType: MetalType, purity: number): Promise<GoldRate> {
    const apiData = await this.fetchFromAPI(metalType);

    // Map purity to the correct field from API response
    const purityMap: Record<number, string> = {
      24: 'price_gram_24k',
      22: 'price_gram_22k',
      21: 'price_gram_21k',
      20: 'price_gram_20k',
      18: 'price_gram_18k',
      16: 'price_gram_16k',
      14: 'price_gram_14k',
    };

    const rateField = purityMap[purity] || 'price_gram_24k';
    let ratePerGram = Number(apiData[rateField]);
    if (!isFinite(ratePerGram) || ratePerGram <= 0) {
      throw new Error(`Rate not available or invalid for ${metalType} ${purity}K`);
    }

    const goldRate: GoldRate = {
      id: this.generateId(),
      metalType,
      purity,
      ratePerGram,
      source: 'API',
      effectiveDate: new Date(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const query = `
      INSERT INTO gold_rates (
        id, metal_type, purity, rate_per_gram, source, effective_date, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      goldRate.id,
      goldRate.metalType,
      goldRate.purity,
      goldRate.ratePerGram,
      goldRate.source,
      goldRate.effectiveDate,
      goldRate.isActive,
      goldRate.createdAt,
      goldRate.updatedAt,
    ];

    try {
      const result = await this.db.query(query, values);
      return this.mapToGoldRate(result.rows[0]);
    } catch (err: any) {
      console.warn('[GoldRateService] Failed to save fetched rate to DB, returning rate without persisting:', err?.message || err);
      // Return the constructed goldRate even if DB insert failed
      return goldRate;
    }
  }

  /**
   * Manually update gold rate
   */
  async updateRate(metalType: MetalType, purity: number, ratePerGram: number): Promise<GoldRate> {
    // Deactivate old rates
    await this.db.query(
      'UPDATE gold_rates SET is_active = false WHERE metal_type = $1 AND purity = $2',
      [metalType, purity]
    );

    const numericRate = Number(ratePerGram);
    if (!isFinite(numericRate) || numericRate <= 0) {
      throw new Error('Invalid ratePerGram for manual update');
    }

    const goldRate: GoldRate = {
      id: this.generateId(),
      metalType,
      purity,
      ratePerGram: numericRate,
      source: 'MANUAL',
      effectiveDate: new Date(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const query = `
      INSERT INTO gold_rates (
        id, metal_type, purity, rate_per_gram, source, effective_date, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      goldRate.id,
      goldRate.metalType,
      goldRate.purity,
      goldRate.ratePerGram,
      goldRate.source,
      goldRate.effectiveDate,
      goldRate.isActive,
      goldRate.createdAt,
      goldRate.updatedAt,
    ];

    const result = await this.db.query(query, values);
    return this.mapToGoldRate(result.rows[0]);
  }

  /**
   * Get rate history
   */
  async getRateHistory(
    metalType: MetalType,
    purity: number,
    days: number = 30
  ): Promise<GoldRate[]> {
    const query = `
      SELECT * FROM gold_rates
      WHERE metal_type = $1 AND purity = $2
        AND effective_date >= NOW() - INTERVAL '${days} days'
      ORDER BY effective_date DESC
    `;

    const result = await this.db.query(query, [metalType, purity]);
    return result.rows.map(this.mapToGoldRate);
  }

  /**
   * Auto-update rates (called by cron job)
   */
  async autoUpdateRates(): Promise<void> {
    console.log('[GoldRateService] Auto-updating gold rates...');

    const metalTypes: MetalType[] = [MetalType.GOLD, MetalType.SILVER, MetalType.PLATINUM];
    const purities = [24, 22, 18]; // Common purities

    for (const metalType of metalTypes) {
      for (const purity of purities) {
        try {
          await this.fetchAndSaveRate(metalType, purity);
          console.log(`Updated ${metalType} ${purity}K rate`);
        } catch (error) {
          console.error(`Failed to update ${metalType} ${purity}K:`, error);
        }
      }
    }
  }

  /**
   * Reconcile backend DB rates with upstream API and update if discrepancy
   * exceeds `thresholdPercent`.
   */
  async reconcileAndUpdateAll(thresholdPercent = 0.5): Promise<{ updated: Array<{ metalType: MetalType; purity: number; old?: number; newest: number }> }> {
    const metals: MetalType[] = [MetalType.GOLD, MetalType.SILVER];
    const purities = [24, 22, 18];
    const updated: Array<{ metalType: MetalType; purity: number; old?: number; newest: number }> = [];

    for (const metal of metals) {
      // Fetch upstream once per metal
      let apiData: any;
      try {
        apiData = await this.fetchFromAPI(metal);
      } catch (err: any) {
        console.warn('[GoldRateService] reconcile: failed to fetch upstream for', metal, (err as any)?.message || err);
        continue;
      }

      for (const purity of purities) {
        const purityMap: Record<number, string> = {
          24: 'price_gram_24k',
          22: 'price_gram_22k',
          21: 'price_gram_21k',
          20: 'price_gram_20k',
          18: 'price_gram_18k',
          16: 'price_gram_16k',
          14: 'price_gram_14k',
        };
        const field = purityMap[purity] || 'price_gram_24k';
        const newest = Number(apiData[field]);
        if (!isFinite(newest) || newest <= 0) continue;

        // Get current DB value
        const q = `SELECT * FROM gold_rates WHERE metal_type = $1 AND purity = $2 AND is_active = true ORDER BY effective_date DESC LIMIT 1`;
        let currentRow: any = null;
        try {
          const res = await this.db.query(q, [metal, purity]);
          currentRow = res.rows[0];
        } catch (e) {
          // ignore
        }

        const old = currentRow ? parseFloat(currentRow.rate_per_gram) : undefined;
        let shouldUpdate = false;
        if (old == null) shouldUpdate = true;
        else {
          const diffPercent = Math.abs(newest - old) / old * 100;
          shouldUpdate = diffPercent >= thresholdPercent;
        }

        if (shouldUpdate) {
          // Deactivate old rates and insert new
          try {
            await this.db.query('UPDATE gold_rates SET is_active = false WHERE metal_type = $1 AND purity = $2', [metal, purity]);
            const id = this.generateId();
            const now = new Date();
            const insertQ = `INSERT INTO gold_rates (id, metal_type, purity, rate_per_gram, source, effective_date, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`;
            await this.db.query(insertQ, [id, metal, purity, newest, 'API', now, true, now, now]);
            updated.push({ metalType: metal, purity, old, newest });
          } catch (e: any) {
            console.error('[GoldRateService] reconcile: failed to persist updated rate', (e as any)?.message || e);
          }
        }
      }
    }

    return { updated };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private mapToGoldRate(row: any): GoldRate {
    return {
      id: row.id,
      metalType: row.metal_type,
      purity: row.purity,
      ratePerGram: parseFloat(row.rate_per_gram),
      source: row.source,
      effectiveDate: new Date(row.effective_date),
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
