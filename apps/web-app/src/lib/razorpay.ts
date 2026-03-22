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
  onLockCreated?: (lockData: { lockId: string; expiresAtMs: number; createdAtMs: number }) => void;
  onDebug?: (details: string) => void;
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
  onSuccess: (paymentId: string, details: { totalAmountInr: number; lockId: string }) => void;
  onFailure: (error: any) => void;
  onLockCreated?: (lockData: { lockId: string; expiresAtMs: number; createdAtMs: number }) => void;
  onDebug?: (details: string) => void;
}

function getApiBaseUrl(): string {
  const explicit = String(import.meta.env.VITE_PAYMENTS_API_URL || import.meta.env.VITE_BACKEND_API_URL || '').trim();
  const fallback = String(import.meta.env.VITE_API_URL || '').trim();
  const raw = explicit || fallback;
  if (!raw) return '';
  // Guardrail: Twilio worker handles OTP and should never be used for payment endpoints.
  if (/twilio-otp-worker/i.test(raw)) return '';
  return raw.replace(/\/$/, '');
}

function toApiUrl(path: string): string {
  const base = getApiBaseUrl();
  if (!base) return path;
  return `${base}${path}`;
}

function getApiCandidates(path: string): string[] {
  const base = getApiBaseUrl();
  if (!base) return [path];
  const primary = `${base}${path}`;
  return [primary, path];
}

async function fetchWithFallback(
  path: string,
  init: RequestInit,
  onDebug?: (details: string) => void,
): Promise<{ res: Response; url: string }> {
  const candidates = getApiCandidates(path);
  let lastErr: any = null;
  for (const url of candidates) {
    try {
      const res = await fetch(url, init);
      if (res.status !== 404 || url === candidates[candidates.length - 1]) {
        return { res, url };
      }
      onDebug?.(`Endpoint returned 404 on ${url}; trying fallback endpoint.`);
    } catch (err: any) {
      lastErr = err;
      onDebug?.(`Network error on ${url}: ${err?.message || 'unknown error'}`);
    }
  }
  throw lastErr || new Error('Unable to reach payment API endpoint');
}

async function readApiResponse(res: Response): Promise<{ json: any; text: string; contentType: string }> {
  const contentType = String(res.headers.get('content-type') || '');
  const text = await res.text().catch(() => '');
  if (!text) return { json: null, text: '', contentType };
  try {
    return { json: JSON.parse(text), text, contentType };
  } catch {
    return { json: null, text, contentType };
  }
}

function responseSnippet(text: string): string {
  if (!text) return '(empty response body)';
  const compact = text.replace(/\s+/g, ' ').trim();
  return compact.length > 220 ? `${compact.slice(0, 220)}...` : compact;
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

  options.onDebug?.(`Creating payment lock for buy order...`);
  const createCall = await fetchWithFallback('/api/payments/create-buy-order', {
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
  }, options.onDebug);
  const createRes = createCall.res;

  const createParsed = await readApiResponse(createRes);
  const createJson = createParsed.json;
  options.onDebug?.(
    `Create order response (${createCall.url}): HTTP ${createRes.status} ${createRes.statusText} | Content-Type: ${createParsed.contentType || 'unknown'} | Body: ${responseSnippet(createParsed.text)}`,
  );

  if (!createRes.ok || !createJson?.success) {
    const fallback = !createJson
      ? `Payment service returned non-JSON response (${createRes.status} ${createRes.statusText}). Check VITE_API_URL/backend routing.`
      : `Could not create locked payment order (${createRes.status} ${createRes.statusText})`;
    const errMsg = createJson?.error || createJson?.message || fallback;
    options.onFailure(new Error(errMsg));
    return;
  }

  const lockId = String(createJson.data.lockId || '');
  const razorpayOrderId = String(createJson.data.razorpayOrderId || '');
  const amountInPaise = Number(createJson.data.amountPaise || 0);
  const expiresAtMs = Number(createJson.data.expiresAtMs || 0);
  const createdAtMs = Number(createJson.data.createdAtMs || 0);

  if (!lockId || !razorpayOrderId || !amountInPaise || !expiresAtMs) {
    options.onFailure(new Error('Invalid payment lock response from server.'));
    return;
  }

  // Notify the frontend that the lock has been created on the server
  // This allows the timer to be synchronized with server time
  if (options.onLockCreated) {
    options.onLockCreated({
      lockId,
      expiresAtMs,
      createdAtMs,
    });
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
        options.onDebug?.('Verifying payment...');
        const verifyCall = await fetchWithFallback('/api/payments/verify-buy-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lockId,
            razorpay_order_id: response?.razorpay_order_id,
            razorpay_payment_id: response?.razorpay_payment_id,
            razorpay_signature: response?.razorpay_signature,
          }),
        }, options.onDebug);
        const verifyRes = verifyCall.res;

        const verifyParsed = await readApiResponse(verifyRes);
        const verifyJson = verifyParsed.json;
        options.onDebug?.(
          `Verify payment response (${verifyCall.url}): HTTP ${verifyRes.status} ${verifyRes.statusText} | Content-Type: ${verifyParsed.contentType || 'unknown'} | Body: ${responseSnippet(verifyParsed.text)}`,
        );
        if (!verifyRes.ok || !verifyJson?.success) {
          const fallback = !verifyJson
            ? `Payment verification returned non-JSON response (${verifyRes.status} ${verifyRes.statusText}).`
            : 'Payment verification failed.';
          throw new Error(verifyJson?.error || fallback);
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
}

/** Open Razorpay checkout for physical coin purchase (includes making charges) */
export async function buyCoins(options: BuyCoinsOptions) {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    options.onFailure(new Error('Failed to load Razorpay SDK'));
    return;
  }

  if (!RAZORPAY_KEY_ID) {
    options.onFailure(new Error('Razorpay Key ID not configured. Please add VITE_RAZORPAY_KEY_ID to your .env file.'));
    return;
  }

  const totalGrams = options.gramsPerCoin * options.quantity;
  const coinBaseAmountInr = totalGrams * options.ratePerGram;
  const makingChargesInr = options.makingChargesPerCoinInr * options.quantity;
  const totalAmountInr = coinBaseAmountInr + makingChargesInr;
  if (!isFinite(totalAmountInr) || totalAmountInr <= 0) {
    options.onFailure(new Error('Invalid coin order amount.'));
    return;
  }

  options.onDebug?.('Creating payment lock for coin order...');
  const createCall = await fetchWithFallback('/api/payments/create-buy-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grams: 1,
      ratePerGram: totalAmountInr,
      customerName: options.customerName,
      customerEmail: options.customerEmail,
      customerPhone: options.customerPhone,
      customerUid: options.customerUid ?? '',
      metal: options.metal,
    }),
  }, options.onDebug);
  const createRes = createCall.res;
  const createParsed = await readApiResponse(createRes);
  const createJson = createParsed.json;
  options.onDebug?.(
    `Create coin order response (${createCall.url}): HTTP ${createRes.status} ${createRes.statusText} | Content-Type: ${createParsed.contentType || 'unknown'} | Body: ${responseSnippet(createParsed.text)}`,
  );

  if (!createRes.ok || !createJson?.success) {
    const fallback = !createJson
      ? `Payment service returned non-JSON response (${createRes.status} ${createRes.statusText}).`
      : `Could not create coin payment order (${createRes.status} ${createRes.statusText})`;
    const errMsg = createJson?.error || createJson?.message || fallback;
    options.onFailure(new Error(errMsg));
    return;
  }

  const lockId = String(createJson.data.lockId || '');
  const razorpayOrderId = String(createJson.data.razorpayOrderId || '');
  const amountInPaise = Number(createJson.data.amountPaise || 0);
  const expiresAtMs = Number(createJson.data.expiresAtMs || 0);
  const createdAtMs = Number(createJson.data.createdAtMs || 0);

  if (!lockId || !razorpayOrderId || !amountInPaise || !expiresAtMs) {
    options.onFailure(new Error('Invalid coin payment lock response from server.'));
    return;
  }

  if (options.onLockCreated) {
    options.onLockCreated({ lockId, expiresAtMs, createdAtMs });
  }

  const razorpayOptions = {
    key: RAZORPAY_KEY_ID,
    amount: amountInPaise,
    currency: 'INR',
    order_id: razorpayOrderId,
    name: `${options.metal === 'GOLD' ? 'Gold' : 'Silver'} Coin Purchase`,
    description: `${options.quantity} x ${options.gramsPerCoin}g ${options.metal} coin(s) + making charges`,
    image: 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/coins.svg',
    prefill: {
      name: options.customerName,
      email: options.customerEmail,
      contact: options.customerPhone,
    },
    theme: {
      color: options.metal === 'GOLD' ? '#D97706' : '#64748B',
    },
    handler: async (response: any) => {
      try {
        options.onDebug?.('Verifying coin payment...');
        const verifyCall = await fetchWithFallback('/api/payments/verify-buy-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lockId,
            razorpay_order_id: response?.razorpay_order_id,
            razorpay_payment_id: response?.razorpay_payment_id,
            razorpay_signature: response?.razorpay_signature,
          }),
        }, options.onDebug);
        const verifyRes = verifyCall.res;
        const verifyParsed = await readApiResponse(verifyRes);
        const verifyJson = verifyParsed.json;
        options.onDebug?.(
          `Verify coin payment response (${verifyCall.url}): HTTP ${verifyRes.status} ${verifyRes.statusText} | Content-Type: ${verifyParsed.contentType || 'unknown'} | Body: ${responseSnippet(verifyParsed.text)}`,
        );
        if (!verifyRes.ok || !verifyJson?.success) {
          throw new Error(verifyJson?.error || 'Coin payment verification failed.');
        }
        if (verifyJson?.data?.expired) {
          throw new Error('Payment came after 2-minute lock and has been marked for refund.');
        }
        options.onSuccess(response.razorpay_payment_id, { totalAmountInr, lockId });
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
