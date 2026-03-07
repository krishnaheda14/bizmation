/**
 * Inventory Service
 *
 * Handles CRUD operations for metal lots and products,
 * gold rate integration, and stock valuation.
 */
import { GoldRateService } from '../../services/gold-rate/GoldRateService';
import { DatabaseService } from '../../services/database/DatabaseService';
export declare class InventoryService {
    private db;
    private goldRateService;
    constructor(db: DatabaseService, goldRateService: GoldRateService);
    /**
     * Create a new metal lot
     */
    createMetalLot(shopId: string, data: Omit<MetalLot, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus' | 'version'>): Promise<MetalLot>;
    /**
     * Get metal lot by ID
     */
    getMetalLotById(id: string, shopId: string): Promise<MetalLot | null>;
    /**
     * Get all metal lots for a shop
     */
    getMetalLots(shopId: string, filters?: {
        metalType?: MetalType;
        purity?: number;
        hasRemainingWeight?: boolean;
    }): Promise<MetalLot[]>;
    /**
     * Update metal lot remaining weight
     */
    updateMetalLotWeight(id: string, shopId: string, weightUsed: number): Promise<void>;
    /**
     * Create a new product
     */
    createProduct(shopId: string, data: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus' | 'version'>): Promise<Product>;
    /**
     * Get product by ID
     */
    getProductById(id: string, shopId: string): Promise<Product | null>;
    /**
     * Get product by SKU (barcode)
     */
    getProductBySKU(sku: string, shopId: string): Promise<Product | null>;
    /**
     * Search products
     */
    searchProducts(shopId: string, filters?: {
        category?: ProductCategory;
        metalType?: MetalType;
        purity?: number;
        isAvailable?: boolean;
        searchTerm?: string;
    }, pagination?: {
        page: number;
        pageSize: number;
    }): Promise<{
        products: Product[];
        total: number;
    }>;
    /**
     * Update product
     */
    updateProduct(id: string, shopId: string, updates: Partial<Product>): Promise<Product>;
    /**
     * Delete product (soft delete)
     */
    deleteProduct(id: string, shopId: string): Promise<void>;
    /**
     * Get current gold rate for metal type and purity
     */
    getCurrentGoldRate(metalType: MetalType, purity: number): Promise<GoldRate>;
    /**
     * Update all product prices based on new gold rates
     */
    updateProductPricesWithNewRate(shopId: string): Promise<number>;
    /**
     * Calculate valuation for a product
     */
    calculateProductValuation(params: {
        metalType: MetalType;
        purity: number;
        grossWeightGrams: number;
        netWeightGrams: number;
        makingCharges: number;
        wastagePercentage: number;
    }): Promise<ProductValuation>;
    /**
     * Get total stock valuation
     */
    getStockValuation(shopId: string): Promise<StockReport>;
    private generateId;
    private mapToMetalLot;
    private mapToProduct;
}
//# sourceMappingURL=inventory.service.d.ts.map