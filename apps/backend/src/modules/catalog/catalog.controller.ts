/**
 * Catalog Controller
 * 
 * Handles catalog item CRUD operations
 */

import { Router, Request, Response } from 'express';
import { DatabaseService } from '../../services/database/DatabaseService';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../uploads/catalog');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    cb(null, `jewelry-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

export function catalogRouter(db: DatabaseService): Router {
  const router = Router();

  /**
   * GET /api/catalog/items
   * Get all catalog items with optional filters
   */
  router.get('/items', async (req: Request, res: Response) => {
    try {
      const { category, metalType, purityMin, purityMax, search, limit = 100, offset = 0 } = req.query;

      let query = `
        SELECT * FROM catalog_items
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (category) {
        query += ` AND category = $${paramIndex++}`;
        params.push(category);
      }

      if (metalType) {
        query += ` AND metal_type = $${paramIndex++}`;
        params.push(metalType);
      }

      if (purityMin) {
        query += ` AND purity >= $${paramIndex++}`;
        params.push(Number(purityMin));
      }

      if (purityMax) {
        query += ` AND purity <= $${paramIndex++}`;
        params.push(Number(purityMax));
      }

      if (search) {
        query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(Number(limit), Number(offset));

      const result = await db.query(query, params);

      // If database is empty, return sample data
      if (result.rows.length === 0 && offset === 0) {
        const sampleItems = [
          {
            id: 'CAT001',
            name: '22K Gold Mangalsutra Chain',
            description: 'Traditional South Indian style mangalsutra with black beads',
            category: 'Mangalsutra',
            metal_type: 'GOLD',
            purity: 22,
            gross_weight: 15.5,
            net_weight: 14.8,
            stone_weight: 0,
            making_charge_type: 'per_gram',
            making_charge: 450,
            tags: ['mangalsutra', 'traditional', 'south indian'],
            hsn_code: '71131910',
            image_url: null,
            created_at: new Date('2024-01-15').toISOString(),
          },
          {
            id: 'CAT002',
            name: 'Silver Anklet Pair (Payal)',
            description: 'Elegant silver anklets with ghungroo bells',
            category: 'Anklet',
            metal_type: 'SILVER',
            purity: 92.5,
            gross_weight: 45.0,
            net_weight: 45.0,
            stone_weight: 0,
            making_charge_type: 'per_gram',
            making_charge: 85,
            tags: ['anklet', 'payal', 'silver', 'traditional'],
            hsn_code: '71131910',
            image_url: null,
            created_at: new Date('2024-01-14').toISOString(),
          },
          {
            id: 'CAT003',
            name: 'Diamond Necklace Set',
            description: 'Stunning diamond necklace with matching earrings',
            category: 'Necklace',
            metal_type: 'GOLD',
            purity: 18,
            gross_weight: 32.5,
            net_weight: 28.0,
            stone_weight: 4.5,
            making_charge_type: 'per_gram',
            making_charge: 850,
            tags: ['diamond', 'necklace', 'bridal', 'set'],
            hsn_code: '71131910',
            image_url: null,
            created_at: new Date('2024-01-13').toISOString(),
          },
          {
            id: 'CAT004',
            name: 'Gold Bangles (Set of 4)',
            description: 'Traditional 22K gold bangles with intricate design',
            category: 'Bangles',
            metal_type: 'GOLD',
            purity: 22,
            gross_weight: 52.0,
            net_weight: 52.0,
            stone_weight: 0,
            making_charge_type: 'per_gram',
            making_charge: 520,
            tags: ['bangles', 'kangan', 'traditional'],
            hsn_code: '71131910',
            image_url: null,
            created_at: new Date('2024-01-12').toISOString(),
          },
          {
            id: 'CAT005',
            name: 'Small Diamond Nose Pin',
            description: 'Delicate 18K gold nose pin with solitaire diamond',
            category: 'Nose Pin',
            metal_type: 'GOLD',
            purity: 18,
            gross_weight: 0.8,
            net_weight: 0.6,
            stone_weight: 0.2,
            making_charge_type: 'fixed',
            making_charge: 850,
            tags: ['nose pin', 'diamond', 'solitaire'],
            hsn_code: '71131910',
            image_url: null,
            created_at: new Date('2024-01-11').toISOString(),
          },
          {
            id: 'CAT006',
            name: 'Gold Chain (24 inch)',
            description: 'Classic 22K gold chain, 24 inches length',
            category: 'Chain',
            metal_type: 'GOLD',
            purity: 22,
            gross_weight: 18.5,
            net_weight: 18.5,
            stone_weight: 0,
            making_charge_type: 'per_gram',
            making_charge: 380,
            tags: ['chain', 'gold', 'classic'],
            hsn_code: '71131910',
            image_url: null,
            created_at: new Date('2024-01-10').toISOString(),
          },
          {
            id: 'CAT007',
            name: 'Temple Jewellery Earrings',
            description: 'Traditional South Indian temple design earrings',
            category: 'Earrings',
            metal_type: 'GOLD',
            purity: 22,
            gross_weight: 12.5,
            net_weight: 11.8,
            stone_weight: 0.7,
            making_charge_type: 'per_gram',
            making_charge: 650,
            tags: ['earrings', 'temple jewellery', 'traditional'],
            hsn_code: '71131910',
            image_url: null,
            created_at: new Date('2024-01-09').toISOString(),
          },
          {
            id: 'CAT008',
            name: 'Couple Ring Set',
            description: 'Matching 18K gold rings for couples',
            category: 'Ring',
            metal_type: 'GOLD',
            purity: 18,
            gross_weight: 8.5,
            net_weight: 8.5,
            stone_weight: 0,
            making_charge_type: 'per_gram',
            making_charge: 450,
            tags: ['ring', 'couple', 'engagement'],
            hsn_code: '71131910',
            image_url: null,
            created_at: new Date('2024-01-08').toISOString(),
          },
        ];
        
        return res.json({
          success: true,
          data: sampleItems,
          count: sampleItems.length,
        });
      }

      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length,
      });
    } catch (error: any) {
      console.error('[Catalog API] Error fetching items:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch catalog items',
      });
    }
  });

  /**
   * GET /api/catalog/items/:id
   * Get single catalog item by ID
   */
  router.get('/items/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await db.query(
        'SELECT * FROM catalog_items WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Catalog item not found',
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error: any) {
      console.error('[Catalog API] Error fetching item:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch catalog item',
      });
    }
  });

  /**
   * POST /api/catalog/items
   * Create new catalog item
   */
  router.post('/items', upload.single('image'), async (req: Request, res: Response) => {
    try {
      const { data } = req.body;
      const formData = JSON.parse(data);

      const {
        name,
        description,
        category,
        metalType,
        purity,
        weightGrams,
        makingCharges,
        hsnCode,
        tags,
      } = formData;

      // Validate required fields
      if (!name || !category || !metalType) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, category, metalType',
        });
      }

      const imageUrl = req.file ? `/uploads/catalog/${req.file.filename}` : null;

      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const query = `
        INSERT INTO catalog_items (
          id, name, description, category, metal_type, purity,
          weight_grams, making_charges, hsn_code, tags, image_url,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING *
      `;

      const values = [
        id,
        name,
        description || '',
        category,
        metalType,
        purity || 22,
        weightGrams || 0,
        makingCharges || 0,
        hsnCode || '71131910',
        JSON.stringify(tags || []),
        imageUrl,
      ];

      const result = await db.query(query, values);

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Catalog item created successfully',
      });
    } catch (error: any) {
      console.error('[Catalog API] Error creating item:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create catalog item',
      });
    }
  });

  /**
   * PUT /api/catalog/items/:id
   * Update catalog item
   */
  router.put('/items/:id', upload.single('image'), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { data } = req.body;
      const formData = JSON.parse(data);

      const {
        name,
        description,
        category,
        metalType,
        purity,
        weightGrams,
        makingCharges,
        hsnCode,
        tags,
      } = formData;

      let imageUrl = formData.imageUrl;

      // Update image if new file uploaded
      if (req.file) {
        imageUrl = `/uploads/catalog/${req.file.filename}`;
      }

      const query = `
        UPDATE catalog_items
        SET
          name = $1,
          description = $2,
          category = $3,
          metal_type = $4,
          purity = $5,
          weight_grams = $6,
          making_charges = $7,
          hsn_code = $8,
          tags = $9,
          image_url = $10,
          updated_at = NOW()
        WHERE id = $11
        RETURNING *
      `;

      const values = [
        name,
        description || '',
        category,
        metalType,
        purity || 22,
        weightGrams || 0,
        makingCharges || 0,
        hsnCode || '71131910',
        JSON.stringify(tags || []),
        imageUrl,
        id,
      ];

      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Catalog item not found',
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Catalog item updated successfully',
      });
    } catch (error: any) {
      console.error('[Catalog API] Error updating item:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update catalog item',
      });
    }
  });

  /**
   * DELETE /api/catalog/items/:id
   * Delete catalog item
   */
  router.delete('/items/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await db.query(
        'DELETE FROM catalog_items WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Catalog item not found',
        });
      }

      res.json({
        success: true,
        message: 'Catalog item deleted successfully',
      });
    } catch (error: any) {
      console.error('[Catalog API] Error deleting item:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete catalog item',
      });
    }
  });

  return router;
}
