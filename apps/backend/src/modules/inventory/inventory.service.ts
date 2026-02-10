/**
 * Inventory Service
 * 
 * Handles CRUD operations for metal lots and products,
 * gold rate integration, and stock valuation.
 */

import {
  Product,
  MetalLot,
  ProductCategory,
  MetalType,
  GoldRate,
  ProductValuation,
  StockReport,
} from '@jewelry-platform/shared-types';
import { GoldRateService } from '../services/gold-rate/GoldRateService';
import { DatabaseService } from '../services/database/DatabaseService';

export class InventoryService {
  private db: DatabaseService;
  private goldRateService: GoldRateService;

  constructor(db: DatabaseService, goldRateService: GoldRateService) {
    this.db = db;
    this.goldRateService = goldRateService;
  }

  // ==================== METAL LOT OPERATIONS ====================

  /**
   * Create a new metal lot
   */
  async createMetalLot(shopId: string, data: Omit<MetalLot, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus' | 'version'>): Promise<MetalLot> {
    const metalLot: MetalLot = {
      id: this.generateId(),
      shopId,
      ...data,
      remainingWeightGrams: data.weightGrams, // Initially all weight is available
      createdAt: new Date(),
      updatedAt: new Date(),
      syncStatus: 'SYNCED' as any,
      version: 1,
    };

    const query = `
      INSERT INTO metal_lots (
        id, shop_id, metal_type, purity, weight_grams, purchase_date,
        purchase_rate, total_cost, supplier, invoice_number,
        remaining_weight_grams, notes, created_at, updated_at, sync_status, version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const values = [
      metalLot.id,
      metalLot.shopId,
      metalLot.metalType,
      metalLot.purity,
      metalLot.weightGrams,
      metalLot.purchaseDate,
      metalLot.purchaseRate,
      metalLot.totalCost,
      metalLot.supplier,
      metalLot.invoiceNumber,
      metalLot.remainingWeightGrams,
      metalLot.notes,
      metalLot.createdAt,
      metalLot.updatedAt,
      metalLot.syncStatus,
      metalLot.version,
    ];

    const result = await this.db.query(query, values);
    return this.mapToMetalLot(result.rows[0]);
  }

  /**
   * Get metal lot by ID
   */
  async getMetalLotById(id: string, shopId: string): Promise<MetalLot | null> {
    const query = `
      SELECT * FROM metal_lots
      WHERE id = $1 AND shop_id = $2 AND deleted_at IS NULL
    `;
    const result = await this.db.query(query, [id, shopId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapToMetalLot(result.rows[0]);
  }

  /**
   * Get all metal lots for a shop
   */
  async getMetalLots(
    shopId: string,
    filters?: {
      metalType?: MetalType;
      purity?: number;
      hasRemainingWeight?: boolean;
    }
  ): Promise<MetalLot[]> {
    let query = `
      SELECT * FROM metal_lots
      WHERE shop_id = $1 AND deleted_at IS NULL
    `;
    const values: any[] = [shopId];
    let paramCount = 1;

    if (filters?.metalType) {
      paramCount++;
      query += ` AND metal_type = $${paramCount}`;
      values.push(filters.metalType);
    }

    if (filters?.purity) {
      paramCount++;
      query += ` AND purity = $${paramCount}`;
      values.push(filters.purity);
    }

    if (filters?.hasRemainingWeight) {
      query += ` AND remaining_weight_grams > 0`;
    }

    query += ` ORDER BY purchase_date DESC`;

    const result = await this.db.query(query, values);
    return result.rows.map(this.mapToMetalLot);
  }

  /**
   * Update metal lot remaining weight
   */
  async updateMetalLotWeight(id: string, shopId: string, weightUsed: number): Promise<void> {
    const query = `
      UPDATE metal_lots
      SET remaining_weight_grams = remaining_weight_grams - $1,
          updated_at = $2,
          version = version + 1
      WHERE id = $3 AND shop_id = $4 AND deleted_at IS NULL
    `;
    await this.db.query(query, [weightUsed, new Date(), id, shopId]);
  }

  // ==================== PRODUCT OPERATIONS ====================

  /**
   * Create a new product
   */
  async createProduct(shopId: string, data: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus' | 'version'>): Promise<Product> {
    // Calculate cost price based on current gold rate and making charges
    const valuation = await this.calculateProductValuation({
      metalType: data.metalType,
      purity: data.purity,
      grossWeightGrams: data.grossWeightGrams,
      netWeightGrams: data.netWeightGrams,
      makingCharges: data.makingCharges,
      wastagePercentage: data.wastagePercentage,
    });

    const product: Product = {
      id: this.generateId(),
      shopId,
      ...data,
      costPrice: valuation.totalValue,
      sellingPrice: data.sellingPrice || valuation.totalValue * 1.15, // 15% markup if not specified
      createdAt: new Date(),
      updatedAt: new Date(),
      syncStatus: 'SYNCED' as any,
      version: 1,
    };

    // Update metal lot if specified
    if (product.metalLotId) {
      await this.updateMetalLotWeight(
        product.metalLotId,
        shopId,
        product.netWeightGrams
      );
    }

    const query = `
      INSERT INTO products (
        id, shop_id, metal_lot_id, sku, name, category, metal_type, purity,
        gross_weight_grams, net_weight_grams, stone_weight_carats, making_charges,
        wastage_percentage, custom_design, hsn_code, is_hallmarked, hallmark_number,
        images, tags, description, cost_price, selling_price, is_available,
        location, created_at, updated_at, sync_status, version
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
      )
      RETURNING *
    `;

    const values = [
      product.id,
      product.shopId,
      product.metalLotId,
      product.sku,
      product.name,
      product.category,
      product.metalType,
      product.purity,
      product.grossWeightGrams,
      product.netWeightGrams,
      product.stoneWeightCarats,
      product.makingCharges,
      product.wastagePercentage,
      product.customDesign,
      product.hsnCode,
      product.isHallmarked,
      product.hallmarkNumber,
      JSON.stringify(product.images),
      JSON.stringify(product.tags),
      product.description,
      product.costPrice,
      product.sellingPrice,
      product.isAvailable,
      product.location,
      product.createdAt,
      product.updatedAt,
      product.syncStatus,
      product.version,
    ];

    const result = await this.db.query(query, values);
    return this.mapToProduct(result.rows[0]);
  }

  /**
   * Get product by ID
   */
  async getProductById(id: string, shopId: string): Promise<Product | null> {
    const query = `
      SELECT * FROM products
      WHERE id = $1 AND shop_id = $2 AND deleted_at IS NULL
    `;
    const result = await this.db.query(query, [id, shopId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapToProduct(result.rows[0]);
  }

  /**
   * Get product by SKU (barcode)
   */
  async getProductBySKU(sku: string, shopId: string): Promise<Product | null> {
    const query = `
      SELECT * FROM products
      WHERE sku = $1 AND shop_id = $2 AND deleted_at IS NULL
    `;
    const result = await this.db.query(query, [sku, shopId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapToProduct(result.rows[0]);
  }

  /**
   * Search products
   */
  async searchProducts(
    shopId: string,
    filters?: {
      category?: ProductCategory;
      metalType?: MetalType;
      purity?: number;
      isAvailable?: boolean;
      searchTerm?: string;
    },
    pagination?: {
      page: number;
      pageSize: number;
    }
  ): Promise<{ products: Product[]; total: number }> {
    let query = `
      SELECT * FROM products
      WHERE shop_id = $1 AND deleted_at IS NULL
    `;
    const values: any[] = [shopId];
    let paramCount = 1;

    if (filters?.category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      values.push(filters.category);
    }

    if (filters?.metalType) {
      paramCount++;
      query += ` AND metal_type = $${paramCount}`;
      values.push(filters.metalType);
    }

    if (filters?.purity) {
      paramCount++;
      query += ` AND purity = $${paramCount}`;
      values.push(filters.purity);
    }

    if (filters?.isAvailable !== undefined) {
      paramCount++;
      query += ` AND is_available = $${paramCount}`;
      values.push(filters.isAvailable);
    }

    if (filters?.searchTerm) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR sku ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      values.push(`%${filters.searchTerm}%`);
    }

    // Count total
    const countResult = await this.db.query(
      query.replace('SELECT *', 'SELECT COUNT(*)'),
      values
    );
    const total = parseInt(countResult.rows[0].count);

    // Add pagination
    if (pagination) {
      const offset = (pagination.page - 1) * pagination.pageSize;
      query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      values.push(pagination.pageSize, offset);
    } else {
      query += ` ORDER BY created_at DESC`;
    }

    const result = await this.db.query(query, values);
    const products = result.rows.map(this.mapToProduct);

    return { products, total };
  }

  /**
   * Update product
   */
  async updateProduct(
    id: string,
    shopId: string,
    updates: Partial<Product>
  ): Promise<Product> {
    const product = await this.getProductById(id, shopId);
    if (!product) {
      throw new Error('Product not found');
    }

    const updatedProduct = {
      ...product,
      ...updates,
      updatedAt: new Date(),
      version: product.version + 1,
    };

    const query = `
      UPDATE products
      SET name = $1, category = $2, metal_type = $3, purity = $4,
          gross_weight_grams = $5, net_weight_grams = $6, stone_weight_carats = $7,
          making_charges = $8, wastage_percentage = $9, hsn_code = $10,
          is_hallmarked = $11, hallmark_number = $12, images = $13, tags = $14,
          description = $15, selling_price = $16, is_available = $17, location = $18,
          updated_at = $19, version = $20
      WHERE id = $21 AND shop_id = $22
      RETURNING *
    `;

    const values = [
      updatedProduct.name,
      updatedProduct.category,
      updatedProduct.metalType,
      updatedProduct.purity,
      updatedProduct.grossWeightGrams,
      updatedProduct.netWeightGrams,
      updatedProduct.stoneWeightCarats,
      updatedProduct.makingCharges,
      updatedProduct.wastagePercentage,
      updatedProduct.hsnCode,
      updatedProduct.isHallmarked,
      updatedProduct.hallmarkNumber,
      JSON.stringify(updatedProduct.images),
      JSON.stringify(updatedProduct.tags),
      updatedProduct.description,
      updatedProduct.sellingPrice,
      updatedProduct.isAvailable,
      updatedProduct.location,
      updatedProduct.updatedAt,
      updatedProduct.version,
      id,
      shopId,
    ];

    const result = await this.db.query(query, values);
    return this.mapToProduct(result.rows[0]);
  }

  /**
   * Delete product (soft delete)
   */
  async deleteProduct(id: string, shopId: string): Promise<void> {
    const query = `
      UPDATE products
      SET deleted_at = $1, updated_at = $1, version = version + 1
      WHERE id = $2 AND shop_id = $3
    `;
    await this.db.query(query, [new Date(), id, shopId]);
  }

  // ==================== GOLD RATE INTEGRATION ====================

  /**
   * Get current gold rate for metal type and purity
   */
  async getCurrentGoldRate(metalType: MetalType, purity: number): Promise<GoldRate> {
    return this.goldRateService.getCurrentRate(metalType, purity);
  }

  /**
   * Update all product prices based on new gold rates
   */
  async updateProductPricesWithNewRate(shopId: string): Promise<number> {
    const products = await this.searchProducts(shopId, { isAvailable: true });
    let updatedCount = 0;

    for (const product of products.products) {
      try {
        const newValuation = await this.calculateProductValuation({
          metalType: product.metalType,
          purity: product.purity,
          grossWeightGrams: product.grossWeightGrams,
          netWeightGrams: product.netWeightGrams,
          makingCharges: product.makingCharges,
          wastagePercentage: product.wastagePercentage,
        });

        // Update cost price, maintain markup percentage for selling price
        const markupPercentage = (product.sellingPrice - product.costPrice) / product.costPrice;
        const newSellingPrice = newValuation.totalValue * (1 + markupPercentage);

        await this.updateProduct(product.id, shopId, {
          costPrice: newValuation.totalValue,
          sellingPrice: newSellingPrice,
        });

        updatedCount++;
      } catch (error) {
        console.error(`Failed to update product ${product.id}:`, error);
      }
    }

    return updatedCount;
  }

  // ==================== STOCK VALUATION ====================

  /**
   * Calculate valuation for a product
   */
  async calculateProductValuation(params: {
    metalType: MetalType;
    purity: number;
    grossWeightGrams: number;
    netWeightGrams: number;
    makingCharges: number;
    wastagePercentage: number;
  }): Promise<ProductValuation> {
    const goldRate = await this.getCurrentGoldRate(params.metalType, params.purity);
    
    // Calculate metal value (net weight * rate)
    const metalValue = params.netWeightGrams * goldRate.ratePerGram;
    
    // Calculate wastage (wastage % of net weight * rate)
    const wastageValue = (params.netWeightGrams * params.wastagePercentage / 100) * goldRate.ratePerGram;
    
    // Stone value (placeholder - would be calculated separately)
    const stoneValue = 0;
    
    // Subtotal before GST
    const subtotal = metalValue + wastageValue + params.makingCharges + stoneValue;
    
    // GST (3% for gold jewelry in India)
    const gstAmount = subtotal * 0.03;
    
    // Total value
    const totalValue = subtotal + gstAmount;

    return {
      metalValue: metalValue + wastageValue,
      makingCharges: params.makingCharges,
      stoneValue,
      gstAmount,
      totalValue,
      currentGoldRate: goldRate.ratePerGram,
    };
  }

  /**
   * Get total stock valuation
   */
  async getStockValuation(shopId: string): Promise<StockReport> {
    const products = await this.searchProducts(shopId);
    
    let totalStockValue = 0;
    const metalWiseValue: Record<MetalType, number> = {} as any;
    const categoryWiseCount: Record<ProductCategory, number> = {} as any;
    const deadStock: Product[] = [];
    
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    for (const product of products.products) {
      // Add to total value
      totalStockValue += product.costPrice;
      
      // Metal-wise value
      metalWiseValue[product.metalType] = (metalWiseValue[product.metalType] || 0) + product.costPrice;
      
      // Category-wise count
      categoryWiseCount[product.category] = (categoryWiseCount[product.category] || 0) + 1;
      
      // Dead stock (not sold in 6 months)
      if (product.createdAt < sixMonthsAgo && product.isAvailable) {
        deadStock.push(product);
      }
    }

    return {
      totalProducts: products.total,
      availableProducts: products.products.filter(p => p.isAvailable).length,
      soldProducts: products.products.filter(p => !p.isAvailable).length,
      totalStockValue,
      metalWiseValue,
      categoryWiseCount,
      deadStock,
    };
  }

  // ==================== HELPER METHODS ====================

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private mapToMetalLot(row: any): MetalLot {
    return {
      id: row.id,
      shopId: row.shop_id,
      metalType: row.metal_type,
      purity: row.purity,
      weightGrams: parseFloat(row.weight_grams),
      purchaseDate: new Date(row.purchase_date),
      purchaseRate: parseFloat(row.purchase_rate),
      totalCost: parseFloat(row.total_cost),
      supplier: row.supplier,
      invoiceNumber: row.invoice_number,
      remainingWeightGrams: parseFloat(row.remaining_weight_grams),
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      syncStatus: row.sync_status,
      version: row.version,
      lastSyncedAt: row.last_synced_at ? new Date(row.last_synced_at) : undefined,
    };
  }

  private mapToProduct(row: any): Product {
    return {
      id: row.id,
      shopId: row.shop_id,
      metalLotId: row.metal_lot_id,
      sku: row.sku,
      name: row.name,
      category: row.category,
      metalType: row.metal_type,
      purity: row.purity,
      grossWeightGrams: parseFloat(row.gross_weight_grams),
      netWeightGrams: parseFloat(row.net_weight_grams),
      stoneWeightCarats: row.stone_weight_carats ? parseFloat(row.stone_weight_carats) : undefined,
      makingCharges: parseFloat(row.making_charges),
      wastagePercentage: parseFloat(row.wastage_percentage),
      customDesign: row.custom_design,
      hsnCode: row.hsn_code,
      isHallmarked: row.is_hallmarked,
      hallmarkNumber: row.hallmark_number,
      images: JSON.parse(row.images || '[]'),
      tags: JSON.parse(row.tags || '[]'),
      description: row.description,
      costPrice: parseFloat(row.cost_price),
      sellingPrice: parseFloat(row.selling_price),
      isAvailable: row.is_available,
      location: row.location,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      syncStatus: row.sync_status,
      version: row.version,
      lastSyncedAt: row.last_synced_at ? new Date(row.last_synced_at) : undefined,
    };
  }
}
