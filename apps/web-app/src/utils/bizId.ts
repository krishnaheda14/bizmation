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

const B36_CHARS = '0123456789abcdefghijklmnopqrstuvwxyz';

function randomSegment(len: number): string {
  let out = '';
  const arr = crypto.getRandomValues(new Uint8Array(len));
  for (let i = 0; i < len; i++) {
    out += B36_CHARS[arr[i] % 36];
  }
  return out.toUpperCase();
}

/** Millisecond timestamp encoded in base-36 (for lexicographic sort) */
function tsSegment(): string {
  return Date.now().toString(36).toUpperCase().padStart(9, '0');
}

export const generateShopId     = () => `BIZ-SHOP-${randomSegment(8)}`;
export const generateCustomerId = () => `BIZ-CUST-${randomSegment(8)}`;
export const generateOrderId    = () => `BIZ-ORD-${tsSegment()}${randomSegment(6)}`;
export const generateProductId  = () => `BIZ-PROD-${randomSegment(8)}`;
export const generateSessionId  = () => `BIZ-SES-${tsSegment()}${randomSegment(4)}`;

/** Generate a deterministic BUT unique code from a Firebase UID (for referral codes, etc.) */
export const uidToShortCode = (uid: string): string =>
  uid.slice(0, 8).toUpperCase();
