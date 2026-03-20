import { ShopRow, UserRow } from './types';

export const UNASSIGNED_SHOP_NAME = 'unassigned-customers';
export const UNASSIGNED_SHOP_ID = 'UNASSIGNED';

export const normalize = (v: string | undefined) => String(v || '').trim().toLowerCase();

export const fmtDate = (ts: any): string => {
  if (!ts) return '-';
  if (ts?.seconds) return new Date(ts.seconds * 1000).toLocaleString('en-IN');
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-IN');
};

export const fmtInr = (v: number, compact = true) => {
  const n = Number(v) || 0;
  const abs = Math.abs(n);
  
  if (abs === 0) return '₹0';

  if (compact && abs >= 10000000) return `₹${(n / 10000000).toFixed(4)} Cr`;
  if (compact && abs >= 100000) return `₹${(n / 100000).toFixed(4)} L`;
  
  // Smart decimals for small commissions
  if (abs < 0.01) return `₹${n.toFixed(6)}`;
  if (abs < 1) return `₹${n.toFixed(4)}`;
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const getShopVerificationStatus = (shop: ShopRow): 'PENDING' | 'APPROVED' | 'REJECTED' => {
  const raw = String(shop.verificationStatus ?? shop.shopVerificationStatus ?? 'PENDING').toUpperCase();
  if (raw === 'APPROVED' || raw === 'REJECTED') return raw;
  return 'PENDING';
};

export const displayValue = (v: unknown): string => {
  if (v == null || v === '') return '-';
  if (typeof v === 'object') {
    const anyV = v as any;
    if (anyV?.seconds) return fmtDate(anyV);
    return JSON.stringify(v);
  }
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
};

export const maskedValue = (key: string, v: unknown): string => {
  const value = displayValue(v);
  if (value === '-') return value;
  const lower = key.toLowerCase();
  if (lower.includes('aadhaar') && !lower.includes('last4')) {
    const digits = value.replace(/\D/g, '');
    const last4 = digits.slice(-4);
    return last4 ? `********${last4}` : '************';
  }
  if (lower.includes('pan') && value.length >= 4) {
    return `${value.slice(0, 2)}******${value.slice(-2)}`;
  }
  return value;
};
