import { ShopRow } from './types';
export declare const UNASSIGNED_SHOP_NAME = "unassigned-customers";
export declare const UNASSIGNED_SHOP_ID = "UNASSIGNED";
export declare const normalize: (v: string | undefined) => string;
export declare const fmtDate: (ts: any) => string;
export declare const fmtInr: (v: number, compact?: boolean) => string;
export declare const getShopVerificationStatus: (shop: ShopRow) => "PENDING" | "APPROVED" | "REJECTED";
export declare const displayValue: (v: unknown) => string;
export declare const maskedValue: (key: string, v: unknown) => string;
//# sourceMappingURL=utils.d.ts.map