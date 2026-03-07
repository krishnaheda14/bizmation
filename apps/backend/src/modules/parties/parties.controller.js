/**
 * Parties Controller
 *
 * Handles customer and wholesaler CRUD operations
 */
import { Router } from 'express';
// Parties router now uses the application's DatabaseService instance
export function partiesRouter(db) {
    const router = Router();
    /**
     * GET /api/parties
     * Query parties from the database.
     * Optional query params:
     *  - type=customer|wholesaler
     *  - shopName=<shop name>  (returns customers belonging to that shop)
     *  - q=<search term>
     */
    router.get('/', async (req, res) => {
        try {
            const { type, shopName, q } = req.query;
            // Base queries
            if (type === 'wholesaler') {
                // Wholesalers are represented in the shops table in this schema
                // If a shopName is provided, filter by name; otherwise list all shops
                if (shopName) {
                    const sql = `SELECT id, name AS businessName, phone, email, address, city, state, pincode, gst_number AS gstin, balance, NULL::integer AS totalPurchases, NULL::timestamp AS lastPurchaseDate FROM shops WHERE name ILIKE $1`;
                    const result = await db.query(sql, [`%${shopName}%`]);
                    return res.json({ success: true, data: result.rows, count: result.rowCount });
                }
                const sqlAll = `SELECT id, name AS businessName, phone, email, address, city, state, pincode, gst_number AS gstin, balance, NULL::integer AS totalPurchases, NULL::timestamp AS lastPurchaseDate FROM shops ORDER BY name LIMIT 100`;
                const resultAll = await db.query(sqlAll);
                return res.json({ success: true, data: resultAll.rows, count: resultAll.rowCount });
            }
            // Default: customers
            // If shopName provided, join shops -> customers
            let sql;
            let params = [];
            if (shopName) {
                sql = `SELECT c.id, c.name, c.phone, c.email, c.address, c.gst_number AS gstin, c.total_purchases AS totalPurchases, c.last_purchase_date AS lastPurchaseDate, s.name AS shopName FROM customers c LEFT JOIN shops s ON c.shop_id = s.id WHERE s.name ILIKE $1`;
                params = [`%${shopName}%`];
            }
            else if (q) {
                sql = `SELECT id, name, phone, email, address, gst_number AS gstin, total_purchases AS totalPurchases, last_purchase_date AS lastPurchaseDate FROM customers WHERE name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1 ORDER BY name LIMIT 200`;
                params = [`%${q}%`];
            }
            else {
                sql = `SELECT id, name, phone, email, address, gst_number AS gstin, total_purchases AS totalPurchases, last_purchase_date AS lastPurchaseDate FROM customers ORDER BY name LIMIT 200`;
            }
            const result = await db.query(sql, params);
            return res.json({ success: true, data: result.rows, count: result.rowCount });
        }
        catch (error) {
            console.error('[Parties API] Error fetching parties:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
    /**
     * POST /api/parties
     * Create a new party (customer or wholesaler).
     * For customers, if `shopName` is provided it will attempt to resolve to a `shop_id`.
     */
    router.post('/', async (req, res) => {
        try {
            const payload = req.body || {};
            const type = (payload.type || 'customer').toLowerCase();
            if (type === 'wholesaler') {
                // Insert into shops - align columns with migrations (owner_name required)
                const id = payload.id || `WHOLE_${Date.now()}`;
                const insertSql = `INSERT INTO shops (id, name, owner_name, email, phone, gst_number, address, city, state, pincode, balance, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW()) RETURNING *`;
                const addr = payload.address ? payload.address : null;
                const params = [
                    id,
                    payload.businessName || payload.shopName || payload.name || null,
                    payload.ownerName || payload.name || null,
                    payload.email || null,
                    payload.phone || null,
                    payload.gstin || null,
                    addr,
                    payload.city || null,
                    payload.state || null,
                    payload.pincode || null,
                    payload.balance || 0,
                ];
                const result = await db.query(insertSql, params);
                return res.status(201).json({ success: true, data: result.rows[0] });
            }
            // Customer
            const id = payload.id || `CUST_${Date.now()}`;
            let shopId = null;
            if (payload.shopName) {
                const shopRes = await db.query('SELECT id FROM shops WHERE name ILIKE $1 LIMIT 1', [`%${payload.shopName}%`]);
                if ((shopRes.rowCount ?? 0) > 0)
                    shopId = shopRes.rows[0].id;
            }
            // Deduplicate by email or phone if available
            if (payload.email || payload.phone) {
                const dupSql = `SELECT * FROM customers WHERE (email = $1 AND email IS NOT NULL) OR (phone = $2 AND phone IS NOT NULL) LIMIT 1`;
                const dupRes = await db.query(dupSql, [payload.email || null, payload.phone || null]);
                if ((dupRes.rowCount ?? 0) > 0) {
                    // Return existing row to make the operation idempotent
                    return res.status(200).json({ success: true, data: dupRes.rows[0], message: 'already_exists' });
                }
            }
            const insertCustomer = `INSERT INTO customers (id, shop_id, name, phone, email, address, gst_number, total_purchases, last_purchase_date, loyalty_points, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW()) RETURNING *`;
            const params = [id, shopId, payload.name || payload.customerName || null, payload.phone || null, payload.email || null, payload.address || null, payload.gstin || null, payload.totalPurchases || 0, payload.lastPurchaseDate || null, payload.loyaltyPoints || 0];
            const created = await db.query(insertCustomer, params);
            return res.status(201).json({ success: true, data: created.rows[0] });
        }
        catch (error) {
            console.error('[Parties API] Error adding party:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
    return router;
}
//# sourceMappingURL=parties.controller.js.map