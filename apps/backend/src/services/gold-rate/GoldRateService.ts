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
    
    const result = await this.db.query(query, [metalType, purity]);
    
    if (result.rows.length === 0) {
      // Fetch from API if not in database
      return this.fetchAndSaveRate(metalType, purity);
    }
    
    return this.mapToGoldRate(result.rows[0]);
  }

  /**
   * Fetch rate from external API (GoldPrice.org + Currency API)
   */
  private async fetchFromAPI(metalType: MetalType): Promise<any> {
    try {
      // Step 1: Fetch gold/silver prices in USD
      const goldPriceResponse = await axios.get('https://data-asg.goldprice.org/dbXRates/USD');
      const goldData = goldPriceResponse.data.items[0];
      
      // Step 2: Fetch USD to INR conversion rate
      const currencyResponse = await axios.get('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json');
      const usdToInrRate = 1 / currencyResponse.data.usd.inr;
      
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
      
      // Convert to INR per gram
      // 1 troy ounce = 31.1035 grams
      const pricePerGramINR = (pricePerOunceUSD * usdToInrRate) / 31.1035;
      
      // Calculate rates for different purities (for gold)
      const calculatePurityRate = (purity: number) => {
        return (pricePerGramINR * purity) / 24;
      };
      
      return {
        price_gram_24k: metalType === 'GOLD' ? pricePerGramINR : pricePerGramINR,
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
    } catch (error) {
      console.error('Failed to fetch gold rate from API:', error);
      throw new Error('Failed to fetch gold rate from external source');
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
    
    const result = await this.db.query(query, values);
    return this.mapToGoldRate(result.rows[0]);
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
