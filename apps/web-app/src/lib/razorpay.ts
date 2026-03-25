/**
 * Razorpay Integration Library
 *
 * Set VITE_RAZORPAY_KEY_ID in apps/web-app/.env
 */

export const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || '';

declare global {
  interface Window {
    Razorpay: any;
  }
}

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
  onLockCreated?: (lockData: { lockId: string; expiresAtMs: number; createdAtMs: number }) => void;
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
  onSuccess: (paymentId: string, details: { totalAmountInr: number; lockId: string }) => void;
  onFailure: (error: any) => void;
  onLockCreated?: (lockData: { lockId: string; expiresAtMs: number; createdAtMs: number }) => void;
  onDebug?: (details: string) => void;
}

function getApiBaseUrl(): string {
  const raw = String(import.meta.env.VITE_API_URL || '').trim();
  if (!raw) return '';
  return raw.replace(/\/$/, '');
}

function normalizePath(path: string): string {
  if (!path) return '/';
  return path.startsWith('/') ? path : `/${path}`;
}

function getPathVariants(path: string): string[] {
  const normalized = normalizePath(path);
  const variants = [normalized];
  if (normalized.startsWith('/api/')) {
    variants.push(normalized.replace(/^\/api/, ''));
  } else {
    variants.push(`/api${normalized}`);
  }
  return Array.from(new Set(variants));
}

function withBase(base: string, path: string): string {
  const normalizedPath = normalizePath(path);
  if (base.endsWith('/api') && normalizedPath.startsWith('/api/')) {
    return `${base}${normalizedPath.replace(/^\/api/, '')}`;
  }
  return `${base}${normalizedPath}`;
}

function isTwilioConfiguredAsApiBase(): boolean {
  const base = getApiBaseUrl();
  return !!base && isTwilioOtpWorkerUrl(base);
}

function paymentConfigHint(): string {
  if (isTwilioConfiguredAsApiBase()) {
    return 'VITE_API_URL currently points to Twilio OTP worker. Set VITE_API_URL to your backend API base URL (example: https://your-backend-domain.com).';
  }
  return 'Ensure /api/payments routes are reverse-proxied to backend or set VITE_API_URL to your backend API base URL.';
}

function isTwilioOtpWorkerUrl(url: string): boolean {
  return /twilio-otp-worker/i.test(url);
}

function isLocalhostRuntime(): boolean {
  return typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
}

function getApiCandidates(paths: string[]): string[] {
  const candidates: string[] = [];

  // Always try same-origin first so frontend reverse-proxy rules can route payments.
  if (typeof window !== 'undefined') {
    for (const path of paths) {
      candidates.push(path);
    }
  }

  const base = getApiBaseUrl();
  if (base && !isTwilioOtpWorkerUrl(base)) {
    for (const path of paths) {
      candidates.push(withBase(base, path));
    }
  }

  if (candidates.length === 0 && isLocalhostRuntime()) {
    for (const path of paths) {
      candidates.push(path);
    }
  }

  return Array.from(new Set(candidates));
}

async function fetchWithFallback(
  path: string,
  init: RequestInit,
  onDebug?: (details: string) => void,
): Promise<{ res: Response; url: string }> {
  const pathVariants = getPathVariants(path);
  const candidates = getApiCandidates(pathVariants);
  if (candidates.length === 0) {
    throw new Error('No valid payment API route found. Configure same-origin /api proxy or set VITE_API_URL to backend (not Twilio OTP worker).');
  }
  let lastErr: any = null;
  for (const url of candidates) {
    try {
      const res = await fetch(url, init);
      const retriableRoutingStatus = res.status === 404 || res.status === 405;
      if (!retriableRoutingStatus || url === candidates[candidates.length - 1]) {
        return { res, url };
      }
      onDebug?.(`Endpoint returned HTTP ${res.status} on ${url}; trying fallback endpoint.`);
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

function asError(input: unknown, fallback: string): Error {
  if (input instanceof Error) return input;
  if (typeof input === 'string' && input.trim()) return new Error(input);
  return new Error(fallback);
}

export async function buyGold(options: BuyGoldOptions) {
  const debug = (message: string) => options.onDebug?.(message);

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
  let expiresAt = '';
  let lockWindowSeconds = 120;

  try {
    debug('Creating payment lock for buy order...');
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
    debug(`Create order response (${createCall.url}): HTTP ${createRes.status} ${createRes.statusText} | Content-Type: ${createParsed.contentType || 'unknown'} | Body: ${responseSnippet(createParsed.text)}`);

    if (!createRes.ok || !createJson?.success) {
      const fallback = !createJson
        ? `Payment service returned non-JSON response (${createRes.status} ${createRes.statusText}). ${paymentConfigHint()}`
        : `Could not create locked payment order (${createRes.status} ${createRes.statusText})`;
      throw new Error(createJson?.error || createJson?.message || fallback);
    }

    lockId = String(createJson.data?.lockId || '');
    razorpayOrderId = String(createJson.data?.razorpayOrderId || '');
    amountInPaise = Number(createJson.data?.amountPaise || 0);
    expiresAt = String(createJson.data?.expiresAt || '');
    lockWindowSeconds = Number(createJson.data?.lockWindowSeconds || 120);

    const expiresAtMs = Number(createJson.data?.expiresAtMs || Date.parse(expiresAt) || 0);
    const createdAtMs = Number(createJson.data?.createdAtMs || Date.now());

    if (!lockId || !razorpayOrderId || !amountInPaise) {
      throw new Error('Invalid payment lock response from server.');
    }

    options.onOrderCreated?.({
      lockId,
      expiresAt,
      lockWindowSeconds,
      razorpayOrderId,
      amountPaise: amountInPaise,
    });

    if (options.onLockCreated && expiresAtMs > 0) {
      options.onLockCreated({ lockId, expiresAtMs, createdAtMs });
    }
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
    description: `${options.grams}g of ${options.metal === 'SILVER' ? 'Silver' : '24K Gold'} @ INR ${options.ratePerGram.toFixed(2)}/g`,
    image: 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/gem.svg',
    prefill: {
      name: options.customerName,
      email: options.customerEmail,
      contact: options.customerPhone,
    },
    theme: {
      color: '#D97706',
    },
    handler: async (response: any) => {
      try {
        debug('Payment captured in Razorpay, verifying signature...');
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
        debug(`Verify response (${verifyCall.url}): HTTP ${verifyRes.status} ${verifyRes.statusText} | Content-Type: ${verifyParsed.contentType || 'unknown'} | Body: ${responseSnippet(verifyParsed.text)}`);

        if (!verifyRes.ok || !verifyJson?.success) {
          const fallback = !verifyJson
            ? `Payment verification returned non-JSON response (${verifyRes.status} ${verifyRes.statusText}).`
            : 'Payment verification failed.';
          throw new Error(verifyJson?.error || fallback);
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

  if (!lockId || !razorpayOrderId || !amountInPaise) {
    options.onFailure(new Error('Invalid coin payment lock response from server.'));
    return;
  }

  if (options.onLockCreated && expiresAtMs > 0) {
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
            customerUid: options.customerUid,
            planAmount: options.planAmount,
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

  const freqLabelMap: Record<AutoPayOptions['frequency'], string> = {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
  };

  const metalLabel = options.metal === 'GOLD' ? 'Gold' : 'Silver';
  const freqLabel = freqLabelMap[options.frequency] ?? 'monthly';

  try {
    options.onDebug?.('Creating subscription on backend...');
    const createSubRes = await fetchWithFallback('/payments/create-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        freq: freqLabel,
        amountPaise: amountInPaise,
        name: `${metalLabel} SIP`,
        customerUid: options.customerUid,
        customerName: options.customerName,
        customerPhone: options.customerPhone,
      })
    }, options.onDebug);

    const { json: createSubData, text: createSubText } = await readApiResponse(createSubRes.res);
    options.onDebug?.(`Create subscription response: HTTP ${createSubRes.res.status} | ${responseSnippet(createSubText)}`);


    if (!createSubData?.success || !createSubData.data?.subscriptionId) {
      options.onDebug?.('Subscription creation failed: ' + JSON.stringify(createSubData));
      throw new Error(createSubData?.error || 'Failed to create subscription on backend');
    }

    const { subscriptionId } = createSubData.data;
    options.onDebug?.('Backend returned subscriptionId: ' + subscriptionId);

    const razorpayOptions = {
      key: RAZORPAY_KEY_ID,
      subscription_id: subscriptionId,
      name: 'GOLD SIP',
      description: `${metalLabel} SIP - ₹${options.planAmount.toLocaleString('en-IN')} / ${freqLabel}`,
      prefill: {
        name: options.customerName,
        email: options.customerEmail,
        contact: options.customerPhone,
      },
      theme: {
        color: '#D97706',
      },
      handler: async (response: any) => {
        options.onDebug?.(`Payment successful, verifying subscription... ${JSON.stringify(response)}`);
        try {
          const verifyRes = await fetchWithFallback('/payments/verify-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
              customerUid: options.customerUid,
              planAmount: options.planAmount,
            })
          }, options.onDebug);

          const { json: verifyData, text: verifyText } = await readApiResponse(verifyRes.res);
          options.onDebug?.(`Verify subscription response: HTTP ${verifyRes.res.status} | ${responseSnippet(verifyText)}`);

          if (!verifyData?.success) {
            options.onDebug?.('Verification failed: ' + JSON.stringify(verifyData));
            options.onFailure(new Error(verifyData?.error || 'Subscription verification failed'));
            return;
          }

          options.onDebug?.('Subscription verified successfully!');
          options.onSuccess(verifyData.data.subscriptionId);
        } catch (err: any) {
          options.onDebug?.('Error in verification: ' + err.message);
          options.onFailure(err);
        }
      },
      modal: {
        ondismiss: () => {
          options.onDebug?.('User closed the Razorpay modal');
          options.onFailure(new Error('AutoPay setup cancelled'));
        },
      },
    };

    const rzp = new window.Razorpay(razorpayOptions);
    rzp.open();
  } catch (backendError: any) {
    options.onFailure(backendError);
  }
}


