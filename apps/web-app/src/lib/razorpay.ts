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
  customerUid?: string;
  metal?: 'GOLD' | 'SILVER';
  onSuccess: (paymentId: string) => void;
  onFailure: (error: any) => void;
}

/** Open Razorpay checkout for buying gold */
export async function buyGold(options: BuyGoldOptions) {
  try {
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      throw new Error('Failed to load Razorpay SDK');
    }

    if (!RAZORPAY_KEY_ID) {
      throw new Error('Razorpay Key ID not configured. Please add VITE_RAZORPAY_KEY_ID to your .env file.');
    }

    const createRes = await fetch('/api/payments/create-buy-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grams: options.grams,
        ratePerGram: options.ratePerGram,
        customerName: options.customerName,
        customerEmail: options.customerEmail,
        customerPhone: options.customerPhone,
        customerUid: options.customerUid ?? '',
        metal: options.metal ?? 'GOLD',
      }),
    });

    const createJson = await createRes.json().catch(() => ({}));
    if (!createRes.ok || !createJson?.success) {
      throw new Error(createJson?.error || 'Could not create locked payment order.');
    }

    const lockId = String(createJson.data.lockId || '');
    const razorpayOrderId = String(createJson.data.razorpayOrderId || '');
    const amountInPaise = Number(createJson.data.amountPaise || 0);

    if (!lockId || !razorpayOrderId || !amountInPaise) {
      throw new Error('Invalid payment lock response from server.');
    }

    const razorpayOptions = {
      key: RAZORPAY_KEY_ID,
      amount: amountInPaise,
      currency: 'INR',
      order_id: razorpayOrderId,
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
      handler: async (response: any) => {
        try {
          const verifyRes = await fetch('/api/payments/verify-buy-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lockId,
              razorpay_order_id: response?.razorpay_order_id,
              razorpay_payment_id: response?.razorpay_payment_id,
              razorpay_signature: response?.razorpay_signature,
            }),
          });

          const verifyJson = await verifyRes.json().catch(() => ({}));
          if (!verifyRes.ok || !verifyJson?.success) {
            throw new Error(verifyJson?.error || 'Payment verification failed.');
          }
          if (verifyJson?.data?.expired) {
            throw new Error('Payment came after 2-minute lock and has been marked for refund.');
          }

          options.onSuccess(response.razorpay_payment_id);
        } catch (err: any) {
          options.onFailure(err);
        }
      },
      modal: {
        ondismiss: () => {
          options.onFailure(new Error('Payment cancelled'));
        },
      },
    };

    const rzp = new window.Razorpay(razorpayOptions);
    rzp.open();
  } catch (err: any) {
    options.onFailure(err);
  }
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
