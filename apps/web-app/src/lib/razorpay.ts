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

// ── Razorpay Key ID (safe to expose in browser) ───────────────────────────────
export const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || '';

declare global {
  interface Window {
    Razorpay: any;
  }
}

/** Load the Razorpay checkout.js script (idempotent) */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

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
export async function buyGold(options: BuyGoldOptions) {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    options.onFailure(new Error('Failed to load Razorpay SDK'));
    return;
  }

  if (!RAZORPAY_KEY_ID) {
    options.onFailure(new Error('Razorpay Key ID not configured. Please add VITE_RAZORPAY_KEY_ID to your .env file.'));
    return;
  }

  const amountInPaise = Math.round(options.grams * options.ratePerGram * 100); // Razorpay uses paise

  const razorpayOptions = {
    key: RAZORPAY_KEY_ID,
    amount: amountInPaise,
    currency: 'INR',
    name: 'Gold Purchase',
    description: `${options.grams}g of 24K Gold @ ₹${options.ratePerGram.toFixed(2)}/g`,
    image: 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/gem.svg',
    prefill: {
      name: options.customerName,
      email: options.customerEmail,
      contact: options.customerPhone,
    },
    theme: {
      color: '#D97706', // amber-600
    },
    handler: (response: any) => {
      options.onSuccess(response.razorpay_payment_id);
    },
    modal: {
      ondismiss: () => {
        options.onFailure(new Error('Payment cancelled'));
      },
    },
  };

  const rzp = new window.Razorpay(razorpayOptions);
  rzp.open();
}

export interface AutoPayOptions {
  planAmount: number; // Monthly amount in INR
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  onSuccess: (subscriptionId: string) => void;
  onFailure: (error: any) => void;
}

/** Open Razorpay for setting up AutoPay (Gold SIP) */
export async function setupGoldAutoPay(options: AutoPayOptions) {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    options.onFailure(new Error('Failed to load Razorpay SDK'));
    return;
  }

  if (!RAZORPAY_KEY_ID) {
    options.onFailure(new Error('Razorpay Key ID not configured. Please add VITE_RAZORPAY_KEY_ID to your .env file.'));
    return;
  }

  const amountInPaise = Math.round(options.planAmount * 100);

  const razorpayOptions = {
    key: RAZORPAY_KEY_ID,
    amount: amountInPaise,
    currency: 'INR',
    name: 'Gold AutoPay (SIP)',
    description: `Monthly Gold SIP – ₹${options.planAmount.toLocaleString('en-IN')} / month`,
    recurring: 1,
    prefill: {
      name: options.customerName,
      email: options.customerEmail,
      contact: options.customerPhone,
    },
    theme: {
      color: '#D97706',
    },
    handler: (response: any) => {
      options.onSuccess(response.razorpay_payment_id || response.razorpay_subscription_id || '');
    },
    modal: {
      ondismiss: () => {
        options.onFailure(new Error('AutoPay setup cancelled'));
      },
    },
  };

  const rzp = new window.Razorpay(razorpayOptions);
  rzp.open();
}
