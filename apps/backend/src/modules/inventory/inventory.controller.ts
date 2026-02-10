/**
 * Inventory API Controller
 */

import { Router, Request, Response } from 'express';
import { InventoryService } from './inventory.service';
import { MetalType, ProductCategory } from '@jewelry-platform/shared-types';

export function inventoryRouter(inventoryService: InventoryService): Router {
  const router = Router();

  // ==================== METAL LOTS ====================

  /**
   * Create metal lot
   */
  router.post('/metal-lots', async (req: Request, res: Response) => {
    try {
      const shopId = req.headers['x-shop-id'] as string;
      const metalLot = await inventoryService.createMetalLot(shopId, req.body);
      
      res.status(201).json({
        success: true,
        data: metalLot,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * Get metal lots
   */
  router.get('/metal-lots', async (req: Request, res: Response) => {
    try {
      const shopId = req.headers['x-shop-id'] as string;
      const filters = {
        metalType: req.query.metalType as MetalType | undefined,
        purity: req.query.purity ? parseInt(req.query.purity as string) : undefined,
        hasRemainingWeight: req.query.hasRemainingWeight === 'true',
      };
      
      const metalLots = await inventoryService.getMetalLots(shopId, filters);
      
      res.json({
        success: true,
        data: metalLots,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * Get metal lot by ID
   */
  router.get('/metal-lots/:id', async (req: Request, res: Response) => {
    try {
      const shopId = req.headers['x-shop-id'] as string;
      const metalLot = await inventoryService.getMetalLotById(req.params.id, shopId);
      
      if (!metalLot) {
        return res.status(404).json({
          success: false,
          error: 'Metal lot not found',
        });
      }
      
      res.json({
        success: true,
        data: metalLot,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // ==================== PRODUCTS ====================

  /**
   * Create product
   */
  router.post('/products', async (req: Request, res: Response) => {
    try {
      const shopId = req.headers['x-shop-id'] as string;
      const product = await inventoryService.createProduct(shopId, req.body);
      
      res.status(201).json({
        success: true,
        data: product,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * Search products
   */
  router.get('/products', async (req: Request, res: Response) => {
    try {
      const shopId = req.headers['x-shop-id'] as string;
      
      const filters = {
        category: req.query.category as ProductCategory | undefined,
        metalType: req.query.metalType as MetalType | undefined,
        purity: req.query.purity ? parseInt(req.query.purity as string) : undefined,
        isAvailable: req.query.isAvailable ? req.query.isAvailable === 'true' : undefined,
        searchTerm: req.query.search as string | undefined,
      };
      
      const pagination = req.query.page ? {
        page: parseInt(req.query.page as string),
        pageSize: parseInt(req.query.pageSize as string) || 20,
      } : undefined;
      
      const result = await inventoryService.searchProducts(shopId, filters, pagination);
      
      res.json({
        success: true,
        data: result.products,
        total: result.total,
        page: pagination?.page || 1,
        pageSize: pagination?.pageSize || result.total,
        totalPages: pagination ? Math.ceil(result.total / pagination.pageSize) : 1,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * Get product by ID
   */
  router.get('/products/:id', async (req: Request, res: Response) => {
    try {
      const shopId = req.headers['x-shop-id'] as string;
      const product = await inventoryService.getProductById(req.params.id, shopId);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found',
        });
      }
      
      res.json({
        success: true,
        data: product,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * Get product by SKU
   */
  router.get('/products/sku/:sku', async (req: Request, res: Response) => {
    try {
      const shopId = req.headers['x-shop-id'] as string;
      const product = await inventoryService.getProductBySKU(req.params.sku, shopId);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found',
        });
      }
      
      res.json({
        success: true,
        data: product,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * Update product
   */
  router.put('/products/:id', async (req: Request, res: Response) => {
    try {
      const shopId = req.headers['x-shop-id'] as string;
      const product = await inventoryService.updateProduct(req.params.id, shopId, req.body);
      
      res.json({
        success: true,
        data: product,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * Delete product
   */
  router.delete('/products/:id', async (req: Request, res: Response) => {
    try {
      const shopId = req.headers['x-shop-id'] as string;
      await inventoryService.deleteProduct(req.params.id, shopId);
      
      res.json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * Calculate product valuation
   */
  router.post('/products/calculate-valuation', async (req: Request, res: Response) => {
    try {
      const valuation = await inventoryService.calculateProductValuation(req.body);
      
      res.json({
        success: true,
        data: valuation,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  });

  // ==================== GOLD RATE ====================

  /**
   * Get current gold rate
   */
  router.get('/gold-rate', async (req: Request, res: Response) => {
    try {
      const metalType = (req.query.metalType as MetalType) || 'GOLD';
      const purity = parseInt(req.query.purity as string) || 22;
      
      const rate = await inventoryService.getCurrentGoldRate(metalType, purity);
      
      res.json({
        success: true,
        data: rate,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * Update product prices with new gold rate
   */
  router.post('/update-prices', async (req: Request, res: Response) => {
    try {
      const shopId = req.headers['x-shop-id'] as string;
      const updatedCount = await inventoryService.updateProductPricesWithNewRate(shopId);
      
      res.json({
        success: true,
        message: `Updated ${updatedCount} products`,
        data: { updatedCount },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // ==================== REPORTS ====================

  /**
   * Get stock valuation report
   */
  router.get('/reports/stock-valuation', async (req: Request, res: Response) => {
    try {
      const shopId = req.headers['x-shop-id'] as string;
      const report = await inventoryService.getStockValuation(shopId);
      
      res.json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  return router;
}
