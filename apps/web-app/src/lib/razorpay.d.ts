/**
 * Razorpay Integration Library
 *
 * Set VITE_RAZORPAY_KEY_ID in apps/web-app/.env
 */
export declare const RAZORPAY_KEY_ID: any;
declare global {
    interface Window {
        Razorpay: any;
    }
}
export declare function loadRazorpayScript(): Promise<boolean>;
export interface BuyGoldOptions {
    grams: number;
    ratePerGram: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerUid?: string;
    metal?: 'GOLD' | 'SILVER';
    onOrderCreated?: (payload: {
        lockId: string;
        expiresAt: string;
        lockWindowSeconds: number;
        razorpayOrderId: string;
        amountPaise: number;
    }) => void;
    onLockCreated?: (lockData: {
        lockId: string;
        expiresAtMs: number;
        createdAtMs: number;
    }) => void;
    onDebug?: (message: string) => void;
    onSuccess: (paymentId: string) => void;
    onFailure: (error: any) => void;
}
export interface BuyCoinsOptions {
    metal: 'GOLD' | 'SILVER';
    gramsPerCoin: number;
    quantity: number;
    ratePerGram: number;
    makingChargesPerCoinInr: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerUid?: string;
    onSuccess: (paymentId: string, details: {
        totalAmountInr: number;
        lockId: string;
    }) => void;
    onFailure: (error: any) => void;
    onLockCreated?: (lockData: {
        lockId: string;
        expiresAtMs: number;
        createdAtMs: number;
    }) => void;
    onDebug?: (details: string) => void;
}
export declare function buyGold(options: BuyGoldOptions): Promise<void>;
export declare function buyCoins(options: BuyCoinsOptions): Promise<void>;
export interface AutoPayOptions {
    planAmount: number;
    /** GOLD SIP can be configured for both gold and silver */
    metal: 'GOLD' | 'SILVER';
    /** SIP frequency */
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerUid?: string;
    onDebug?: (message: string) => void;
    onSuccess: (subscriptionId: string) => void;
    onFailure: (error: any) => void;
}
export declare function setupGoldAutoPay(options: AutoPayOptions): Promise<void>;
//# sourceMappingURL=razorpay.d.ts.map