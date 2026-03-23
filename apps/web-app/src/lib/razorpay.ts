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
  onOrderCreated?: (payload: {
    lockId: string;
    expiresAt: string;
    lockWindowSeconds: number;
    razorpayOrderId: string;
    amountPaise: number;
  }) => void;
  onDebug?: (message: string) => void;
  onSuccess: (paymentId: string) => void;
  onFailure: (error: any) => void;
}

const PAYMENT_API_PREFIX = '/api/payments';

function buildPaymentsUrl(path: string): string {
  return path;
}

function previewResponseBody(bodyText: string): string {
  const compact = bodyText.replace(/\s+/g, ' ').trim();
  if (!compact) return '<empty>';
  return compact.length > 260 ? `${compact.slice(0, 260)}...` : compact;
}

function asError(input: unknown, fallback: string): Error {
  if (input instanceof Error) return input;
  if (typeof input === 'string' && input.trim()) return new Error(input);
  return new Error(fallback);
}

/** Open Razorpay checkout for buying gold */
export async function buyGold(options: BuyGoldOptions) {
  const debug = (message: string) => {
    options.onDebug?.(message);
  };

  debug(`Buy request started for ${options.metal ?? 'GOLD'} (${options.grams}g)`);

  const loaded = await loadRazorpayScript();
  if (!loaded) {
    const error = new Error('Failed to load Razorpay SDK');
    debug(`Failure: ${error.message}`);
    options.onFailure(error);
    return;
  }

  if (!RAZORPAY_KEY_ID) {
    const error = new Error('Razorpay Key ID not configured. Please add VITE_RAZORPAY_KEY_ID to your .env file.');
    debug(`Failure: ${error.message}`);
    options.onFailure(error);
    return;
  }

  let lockId = '';
  let razorpayOrderId = '';
  let amountInPaise = 0;
  try {
    const createUrl = buildPaymentsUrl(`${PAYMENT_API_PREFIX}/create-buy-order`);
    debug('Creating payment lock for buy order...');

    const createRes = await fetch(createUrl, {
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

    const createBodyText = await createRes.text();
    const createJson = (() => {
      try {
        return JSON.parse(createBodyText);
      } catch {
        return {} as any;
      }
    })();
    const contentType = createRes.headers.get('content-type') || 'unknown';
    debug(`Create order response (${createRes.url || createUrl}): HTTP ${createRes.status} | Content-Type: ${contentType} | Body: ${previewResponseBody(createBodyText)}`);

    if (!createRes.ok || !createJson?.success) {
      throw new Error(createJson?.error || `Could not create locked payment order (HTTP ${createRes.status}).`);
    }

    lockId = String(createJson.data?.lockId || '');
    razorpayOrderId = String(createJson.data?.razorpayOrderId || '');
    amountInPaise = Number(createJson.data?.amountPaise || 0);

    if (!lockId || !razorpayOrderId || !amountInPaise) {
      throw new Error('Invalid payment lock response from server.');
    }

    const expiresAt = String(createJson.data?.expiresAt || '');
    const lockWindowSeconds = Number(createJson.data?.lockWindowSeconds || 120);
    options.onOrderCreated?.({
      lockId,
      expiresAt,
      lockWindowSeconds,
      razorpayOrderId,
      amountPaise: amountInPaise,
    });
  } catch (err: any) {
    const error = asError(err, 'Could not create locked payment order.');
    debug(`Failure: ${error.message}`);
    options.onFailure(error);
    return;
  }

  const razorpayOptions = {
    key: RAZORPAY_KEY_ID,
    amount: amountInPaise,
    currency: 'INR',
    order_id: razorpayOrderId,
    name: `${options.metal === 'SILVER' ? 'Silver' : 'Gold'} Purchase`,
    description: `${options.grams}g of ${options.metal === 'SILVER' ? 'Silver' : '24K Gold'} @ ₹${options.ratePerGram.toFixed(2)}/g`,
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
        const verifyUrl = buildPaymentsUrl(`${PAYMENT_API_PREFIX}/verify-buy-payment`);
        debug('Payment captured in Razorpay, verifying signature...');

        const verifyRes = await fetch(verifyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lockId,
            razorpay_order_id: response?.razorpay_order_id,
            razorpay_payment_id: response?.razorpay_payment_id,
            razorpay_signature: response?.razorpay_signature,
          }),
        });

        const verifyBodyText = await verifyRes.text();
        const verifyJson = (() => {
          try {
            return JSON.parse(verifyBodyText);
          } catch {
            return {} as any;
          }
        })();
        debug(`Verify response (${verifyRes.url || verifyUrl}): HTTP ${verifyRes.status} | Body: ${previewResponseBody(verifyBodyText)}`);

        if (!verifyRes.ok || !verifyJson?.success) {
          throw new Error(verifyJson?.error || 'Payment verification failed.');
        }
        debug(`Success: payment verified (${response.razorpay_payment_id})`);
        options.onSuccess(response.razorpay_payment_id);
      } catch (err: any) {
        const error = asError(err, 'Payment verification failed.');
        debug(`Failure: ${error.message}`);
        options.onFailure(error);
      }
    },
    modal: {
      ondismiss: () => {
        const error = new Error('Payment cancelled');
        debug(`Failure: ${error.message}`);
        options.onFailure(error);
      },
    },
  };

  debug('Opening Razorpay checkout...');
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
