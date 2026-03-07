/**
 * Inventory API Controller
 */
import { Router } from 'express';
export function inventoryRouter(inventoryService) {
    const router = Router();
    // ==================== METAL LOTS ====================
    /**
     * Create metal lot
     */
    router.post('/metal-lots', async (req, res) => {
        try {
            const shopId = req.headers['x-shop-id'];
            const metalLot = await inventoryService.createMetalLot(shopId, req.body);
            res.status(201).json({
                success: true,
                data: metalLot,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    });
    /**
     * Get metal lots
     */
    router.get('/metal-lots', async (req, res) => {
        try {
            const shopId = req.headers['x-shop-id'];
            const filters = {
                metalType: req.query.metalType,
                purity: req.query.purity ? parseInt(req.query.purity) : undefined,
                hasRemainingWeight: req.query.hasRemainingWeight === 'true',
            };
            const metalLots = await inventoryService.getMetalLots(shopId, filters);
            res.json({
                success: true,
                data: metalLots,
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    });
    /**
     * Get metal lot by ID
     */
    router.get('/metal-lots/:id', async (req, res) => {
        try {
            const shopId = req.headers['x-shop-id'];
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
        }
        catch (error) {
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
    router.post('/products', async (req, res) => {
        try {
            const shopId = req.headers['x-shop-id'];
            const product = await inventoryService.createProduct(shopId, req.body);
            res.status(201).json({
                success: true,
                data: product,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    });
    /**
     * Search products
     */
    router.get('/products', async (req, res) => {
        try {
            const shopId = req.headers['x-shop-id'];
            const filters = {
                category: req.query.category,
                metalType: req.query.metalType,
                purity: req.query.purity ? parseInt(req.query.purity) : undefined,
                isAvailable: req.query.isAvailable ? req.query.isAvailable === 'true' : undefined,
                searchTerm: req.query.search,
            };
            const pagination = req.query.page ? {
                page: parseInt(req.query.page),
                pageSize: parseInt(req.query.pageSize) || 20,
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
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    });
    /**
     * Get product by ID
     */
    router.get('/products/:id', async (req, res) => {
        try {
            const shopId = req.headers['x-shop-id'];
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
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    });
    /**
     * Get product by SKU
     */
    router.get('/products/sku/:sku', async (req, res) => {
        try {
            const shopId = req.headers['x-shop-id'];
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
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    });
    /**
     * Update product
     */
    router.put('/products/:id', async (req, res) => {
        try {
            const shopId = req.headers['x-shop-id'];
            const product = await inventoryService.updateProduct(req.params.id, shopId, req.body);
            res.json({
                success: true,
                data: product,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    });
    /**
     * Delete product
     */
    router.delete('/products/:id', async (req, res) => {
        try {
            const shopId = req.headers['x-shop-id'];
            await inventoryService.deleteProduct(req.params.id, shopId);
            res.json({
                success: true,
                message: 'Product deleted successfully',
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    });
    /**
     * Calculate product valuation
     */
    router.post('/products/calculate-valuation', async (req, res) => {
        try {
            const valuation = await inventoryService.calculateProductValuation(req.body);
            res.json({
                success: true,
                data: valuation,
            });
        }
        catch (error) {
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
    router.get('/gold-rate', async (req, res) => {
        try {
            const metalType = req.query.metalType || 'GOLD';
            const purity = parseInt(req.query.purity) || 22;
            const rate = await inventoryService.getCurrentGoldRate(metalType, purity);
            res.json({
                success: true,
                data: rate,
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    });
    /**
     * Update product prices with new gold rate
     */
    router.post('/update-prices', async (req, res) => {
        try {
            const shopId = req.headers['x-shop-id'];
            const updatedCount = await inventoryService.updateProductPricesWithNewRate(shopId);
            res.json({
                success: true,
                message: `Updated ${updatedCount} products`,
                data: { updatedCount },
            });
        }
        catch (error) {
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
    router.get('/reports/stock-valuation', async (req, res) => {
        try {
            const shopId = req.headers['x-shop-id'];
            const report = await inventoryService.getStockValuation(shopId);
            res.json({
                success: true,
                data: report,
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    });
    return router;
}
//# sourceMappingURL=inventory.controller.js.map