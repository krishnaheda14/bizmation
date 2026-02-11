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

      return this.mapToGoldRate(result.rows[0]);
    } catch (err: any) {
      // If database is unreachable, fall back to fetching from external API
      console.warn('[GoldRateService] Database unavailable, falling back to external API:', err?.message || err);
      return this.fetchAndSaveRate(metalType, purity);
    }
  }

  /**
   * Fetch rate from external API (GoldPrice.org + Currency API)
   */
  private async fetchFromAPI(metalType: MetalType): Promise<any> {
    try {
      // Step 1: Fetch gold/silver prices in USD
      console.log('[GoldRateService] Fetching gold/silver prices from data-asg.goldprice.org');
      const goldPriceResponse = await axios.get('https://data-asg.goldprice.org/dbXRates/USD', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; gold-rate-fetcher/1.0)',
          'Accept': 'application/json',
        },
        timeout: 10000,
      });
      const goldData = goldPriceResponse?.data?.items && goldPriceResponse.data.items[0];

      // Step 2: Fetch USD to INR conversion rate
      console.log('[GoldRateService] Fetching currency conversion from jsDelivr currency-api');
      const currencyResponse = await axios.get('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; gold-rate-fetcher/1.0)',
          'Accept': 'application/json',
        },
        timeout: 10000,
      });
      
      // The currency API returns `usd.inr` as INR per 1 USD (e.g. 83.33)
      const usdData = currencyResponse.data && currencyResponse.data.usd;
      const usdToInrRate = usdData && typeof usdData.inr === 'number' ? usdData.inr : undefined; // INR per USD

      console.log(`[Gold Rate API] XAU Price: $${goldData.xauPrice}, XAG Price: $${goldData.xagPrice}`);
      console.log(`[Gold Rate API] USD to INR Rate (raw): ${usdToInrRate}`);
      if (!usdToInrRate || isNaN(usdToInrRate)) {
        throw new Error('Currency conversion (USD->INR) not available from currency API');
      }
      
      // Get price per troy ounce in USD
      let pricePerOunceUSD = 0;
      if (metalType === 'GOLD') {
        pricePerOunceUSD = goldData.xauPrice;
      } else if (metalType === 'SILVER') {
        pricePerOunceUSD = goldData.xagPrice;
      } else {
        // Fallback to gold for platinum/diamond
        pricePerOunceUSD = goldData.xauPrice;
      }
      
      // Convert to INR per gram (1 troy ounce = 31.1035 grams)
      const pricePerGramINR = (pricePerOunceUSD * usdToInrRate) / 31.1035;

      if (!isFinite(pricePerGramINR) || isNaN(pricePerGramINR)) {
        throw new Error('Computed price per gram is invalid');
      }
      
      console.log(`[Gold Rate API] ${metalType} price per gram: ₹${pricePerGramINR.toFixed(2)}`);
      
      // Calculate rates for different purities (for gold)
      const calculatePurityRate = (purity: number) => {
        return (pricePerGramINR * purity) / 24;
      };
      
      return {
        price_gram_24k: pricePerGramINR,
        price_gram_22k: metalType === 'GOLD' ? calculatePurityRate(22) : pricePerGramINR,
        price_gram_21k: metalType === 'GOLD' ? calculatePurityRate(21) : pricePerGramINR,
        price_gram_20k: metalType === 'GOLD' ? calculatePurityRate(20) : pricePerGramINR,
        price_gram_18k: metalType === 'GOLD' ? calculatePurityRate(18) : pricePerGramINR,
        price_gram_16k: metalType === 'GOLD' ? calculatePurityRate(16) : pricePerGramINR,
        price_gram_14k: metalType === 'GOLD' ? calculatePurityRate(14) : pricePerGramINR,
        timestamp: goldData.ts,
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
    const ratePerGram = apiData[rateField];
    
    if (!ratePerGram) {
      throw new Error(`Rate not available for ${metalType} ${purity}K`);
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
    
    const goldRate: GoldRate = {
      id: this.generateId(),
      metalType,
      purity,
      ratePerGram,
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
    
    const metalTypes: MetalType[] = ['GOLD', 'SILVER', 'PLATINUM'];
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
