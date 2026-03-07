/**
 * Razorpay Integration Library
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW TO SET YOUR RAZORPAY KEY:
 *   1. Open apps/web-app/.env  (create it from .env.example if it doesn't exist)
 *   2. Add the line:
 *        VITE_RAZORPAY_KEY_ID=rzp_live_XXXXXXXXXXXXXX
 *      (Use rzp_test_... for testing)
 *   3. Restart the dev server
 *
 * Your Razorpay Key ID can be found at:
 *   Razorpay Dashboard → Settings → API Keys → Key ID
 *
 * NEVER put your Key Secret in this file or any client-side code.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export declare const RAZORPAY_KEY_ID: any;
declare global {
    interface Window {
        Razorpay: any;
    }
}
/** Load the Razorpay checkout.js script (idempotent) */
export declare function loadRazorpayScript(): Promise<boolean>;
export interface BuyGoldOptions {
    grams: number;
    ratePerGram: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    onSuccess: (paymentId: string) => void;
    onFailure: (error: any) => void;
}
/** Open Razorpay checkout for buying gold */
export declare function buyGold(options: BuyGoldOptions): Promise<void>;
export interface AutoPayOptions {
    planAmount: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    onSuccess: (subscriptionId: string) => void;
    onFailure: (error: any) => void;
}
/** Open Razorpay for setting up AutoPay (Gold SIP) */
export declare function setupGoldAutoPay(options: AutoPayOptions): Promise<void>;
//# sourceMappingURL=razorpay.d.ts.map