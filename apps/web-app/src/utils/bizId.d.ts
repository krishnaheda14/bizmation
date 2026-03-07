/**
 * Bizmation ID Generator
 *
 * Creates human-readable, collision-resistant IDs for:
 *   - Shops    : BIZ-SHOP-XXXXXXXX
 *   - Customers: BIZ-CUST-XXXXXXXX
 *   - Orders   : BIZ-ORD-XXXXXXXXXXXXXXXX  (timestamp-prefixed for sort)
 *   - Products : BIZ-PROD-XXXXXXXX
 *   - Sessions : BIZ-SES-XXXXXXXXXXXXXXXX
 *
 * The trailing segment is 8–16 chars of base-36 (0-9 + a-z).
 */
export declare const generateShopId: () => string;
export declare const generateCustomerId: () => string;
export declare const generateOrderId: () => string;
export declare const generateProductId: () => string;
export declare const generateSessionId: () => string;
/** Generate a deterministic BUT unique code from a Firebase UID (for referral codes, etc.) */
export declare const uidToShortCode: (uid: string) => string;
//# sourceMappingURL=bizId.d.ts.map