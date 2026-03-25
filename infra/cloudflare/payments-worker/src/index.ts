interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface Env {
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  PAYMENTS_KV: KVNamespace;
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
}

const LOCK_WINDOW_SECONDS = 120;

interface CreateBuyOrderBody {
  grams: number;
  ratePerGram: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerUid?: string;
  metal?: string;
}

interface PriceLockRecord {
  status: 'LOCKED' | 'PAID';
  lockWindowSeconds: number;
  createdAtMs: number;
  expiresAtMs: number;
  customerUid: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  metal: string;
  grams: number;
  ratePerGram: number;
  amountPaise: number;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  verifiedAtMs?: number;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin = origin ?? '*';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(data: unknown, status = 200, origin: string | null = null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}

function validatePositiveNumber(value: any, field: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid ${field}`);
  }
  return n;
}

async function createRazorpayOrder(env: Env, amountPaise: number, receipt: string, notes: Record<string, string>): Promise<string> {
  const keyId = env.RAZORPAY_KEY_ID;
  const keySecret = env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not configured on worker');
  }

  const auth = btoa(`${keyId}:${keySecret}`);
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: 'INR',
      receipt,
      payment_capture: 1,
      notes,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Razorpay order creation failed (${res.status}): ${text}`);
  }
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('Razorpay order creation returned non-JSON response');
  }
  const orderId = String(json.id || '');
  if (!orderId) throw new Error('Razorpay order id missing');
  return orderId;
}

async function hmacSha256Hex(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  const bytes = new Uint8Array(sig);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function handleCreateBuyOrder(request: Request, env: Env, origin: string | null): Promise<Response> {
  const body: CreateBuyOrderBody = await request.json().catch(() => ({} as any));
  try {
    const grams = validatePositiveNumber(body.grams, 'grams');
    const ratePerGram = validatePositiveNumber(body.ratePerGram, 'ratePerGram');
    const customerName = String(body.customerName || '').trim();
    const customerEmail = String(body.customerEmail || '').trim();
    const customerPhone = String(body.customerPhone || '').trim();
    const customerUid = String(body.customerUid || '').trim();
    const metal = String(body.metal || 'GOLD').toUpperCase();

    const amountPaise = Math.round(grams * ratePerGram * 100);
    if (amountPaise < 100) {
      return jsonResponse({ success: false, error: 'Minimum amount should be at least \\u20b91.' }, 400, origin);
    }

    const nowMs = Date.now();
    const expiresAtMs = nowMs + LOCK_WINDOW_SECONDS * 1000;

    const lockId = crypto.randomUUID();
    const receipt = `lock_${lockId.slice(0, 20)}`;

    const razorpayOrderId = await createRazorpayOrder(env, amountPaise, receipt, {
      lockId,
      customerUid,
      metal,
      grams: String(grams),
      ratePerGram: String(ratePerGram),
    });

    const record: PriceLockRecord = {
      status: 'LOCKED',
      lockWindowSeconds: LOCK_WINDOW_SECONDS,
      createdAtMs: nowMs,
      expiresAtMs,
      customerUid,
      customerName,
      customerEmail,
      customerPhone,
      metal,
      grams,
      ratePerGram,
      amountPaise,
      razorpayOrderId,
    };

    await env.PAYMENTS_KV.put(`lock:${lockId}`, JSON.stringify(record), { expirationTtl: LOCK_WINDOW_SECONDS + 3600 });

    return jsonResponse(
      {
        success: true,
        data: {
          lockId,
          razorpayOrderId,
          amountPaise,
          currency: 'INR',
          lockWindowSeconds: LOCK_WINDOW_SECONDS,
          expiresAtMs,
          expiresAt: new Date(expiresAtMs).toISOString(),
          createdAtMs: nowMs,
        },
      },
      200,
      origin,
    );

    return jsonResponse(
      {
        success: true,
        data: {
          expired: false,
          paymentId: razorpayPaymentId,
          lockId,
        },
      },
      200,
      origin
    );
  } catch (err: any) {
    return jsonResponse({ success: false, error: err?.message || 'Failed to create payment order' }, 500, origin);
  }
}

async function handleVerifyBuyPayment(request: Request, env: Env, origin: string | null): Promise<Response> {
  const body: any = await request.json().catch(() => ({} as any));
  const lockId = String(body.lockId || '').trim();
  const razorpayOrderId = String(body.razorpay_order_id || '').trim();
  const razorpayPaymentId = String(body.razorpay_payment_id || '').trim();
  const razorpaySignature = String(body.razorpay_signature || '').trim();

  if (!lockId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return jsonResponse({ success: false, error: 'Missing payment verification payload' }, 400, origin);
  }

  try {
    const expected = await hmacSha256Hex(env.RAZORPAY_KEY_SECRET, `${razorpayOrderId}|${razorpayPaymentId}`);
    if (expected !== razorpaySignature) {
      return jsonResponse({ success: false, error: 'Invalid payment signature' }, 400, origin);
    }

    const key = `lock:${lockId}`;
    const stored = await env.PAYMENTS_KV.get(key);
    if (!stored) {
      return jsonResponse({ success: false, error: 'Price lock record not found' }, 404, origin);
    }
    const record: PriceLockRecord = JSON.parse(stored);

    record.status = 'PAID';
    record.razorpayPaymentId = razorpayPaymentId;
    record.verifiedAtMs = Date.now();
    await env.PAYMENTS_KV.put(key, JSON.stringify(record), { expirationTtl: 3600 });

    await sendTelegramAlert(
      env,
      `🚨 <b>NEW ${record.metal || ""} ORDER (PAID)</b> 🚨\n\n` +
      `<b>Weight:</b> ${record.grams || 0}g\n` +
      `<b>Amount:</b> ₹${((record.amountPaise || 0) / 100).toLocaleString('en-IN')}\n` +
      `<b>Rate:</b> ₹${(record.ratePerGram || 0).toLocaleString('en-IN')}/g\n` +
      `<b>Name:</b> ${record.customerName || 'N/A'}\n` +
      `<b>Phone:</b> ${record.customerPhone || 'N/A'}\n\n` +
      `<i>Please book/hedge this quantity immediately.</i>`
    );

    return jsonResponse(
      {
        success: true,
        data: {
          expired: false,
          paymentId: razorpayPaymentId,
          lockId,
        },
      },
      200,
      origin
    );
  } catch (err: any) {
    return jsonResponse({ success: false, error: err?.message || 'Failed to verify payment' }, 500, origin);
  }
}


async function sendTelegramAlert(env: Env, text: string) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });
  } catch (err: any) {
    console.error('Telegram alert failed:', err?.message);
  }
}

async function handleCreateSubscription(request: Request, env: Env, origin: string | null): Promise<Response> {
  try {
    const body: any = await request.json().catch(() => ({}));
    const freq = body.freq || 'monthly';
    const amountPaise = body.amountPaise;
    const name = body.name || 'Gold SIP';
    const customerNotify = body.customerNotify || 1;
    const totalCount = body.totalCount || 60;
    
    if (!amountPaise || amountPaise < 100) {
      return jsonResponse({ success: false, error: 'Invalid amount' }, 400, origin);
    }

    const keyId = env.RAZORPAY_KEY_ID;
    const keySecret = env.RAZORPAY_KEY_SECRET;
    const auth = btoa(`${keyId}:${keySecret}`);

    // 1. Create Plan
    const planRes = await fetch('https://api.razorpay.com/v1/plans', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        period: freq,
        interval: 1,
        item: { name, amount: amountPaise, currency: 'INR' }
      })
    });
    
    if (!planRes.ok) throw new Error('Razorpay failed to create plan');
    const planData = await planRes.json() as any;
    const planId = planData.id;

    // 2. Create Subscription
    const subRes = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        plan_id: planId,
        total_count: totalCount,
        customer_notify: customerNotify
      })
    });

    if (!subRes.ok) throw new Error('Razorpay failed to create subscription');
    const subData = await subRes.json() as any;

    return jsonResponse({
      success: true,
      data: {
        subscriptionId: subData.id,
        planId
      }
    }, 200, origin);
  } catch (err: any) {
    return jsonResponse({ success: false, error: 'Failed to create subscription: ' + err.message }, 500, origin);
  }
}

async function handleVerifySubscription(request: Request, env: Env, origin: string | null): Promise<Response> {
  try {
    const body: any = await request.json().catch(() => ({}));
    const razorpaySubscriptionId = String(body.razorpay_subscription_id || '').trim();
    const razorpayPaymentId = String(body.razorpay_payment_id || '').trim();
    const razorpaySignature = String(body.razorpay_signature || '').trim();
    const customerUid = String(body.customerUid || 'N/A');
    const planAmount = Number(body.planAmount || 0);

    if (!razorpaySubscriptionId || !razorpayPaymentId || !razorpaySignature) {
      return jsonResponse({ success: false, error: 'Missing subscription verification payload' }, 400, origin);
    }

    const expected = await hmacSha256Hex(env.RAZORPAY_KEY_SECRET, `${razorpayPaymentId}|${razorpaySubscriptionId}`);

    if (expected !== razorpaySignature) {
      return jsonResponse({ success: false, error: 'Invalid subscription signature' }, 400, origin);
    }

    const amountStr = planAmount > 0 ? ` for ₹${planAmount.toLocaleString('en-IN')}` : '';

    // Fire & Forget Telegram Alert (Wait for it in workers using context.waitUntil if available, or just await)
    await sendTelegramAlert(
      env,
      `♻️ <b>NEW SIP (AUTOPAY) ACTIVATED</b> ♻️\n\n` +
      `<b>User ID:</b> <code>${customerUid}</code>\n` +
      `<b>Amount:</b> ₹${planAmount.toLocaleString('en-IN')}\n` +
      `<b>Subscription ID:</b> <code>${razorpaySubscriptionId}</code>\n` +
      `<b>Payment ID:</b> <code>${razorpayPaymentId}</code>\n\n` +
      `<i>A user has successfully set up a new Gold SIP${amountStr}. The first deduction is complete.</i>`
    );

    return jsonResponse(
      {
        success: true,
        data: {
          paymentId: razorpayPaymentId,
          subscriptionId: razorpaySubscriptionId
        }
      },
      200,
      origin
    );
  } catch (err: any) {
    return jsonResponse({ success: false, error: 'Failed to verify subscription' }, 500, origin);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (url.pathname === '/health') {
      return jsonResponse({ success: true, service: 'payments-worker', time: new Date().toISOString() }, 200, origin);
    }

    if (url.pathname === '/api/payments/create-buy-order' && request.method === 'POST') {
      return handleCreateBuyOrder(request, env, origin);
    }

    if (url.pathname === '/api/payments/verify-buy-payment' && request.method === 'POST') {
      return handleVerifyBuyPayment(request, env, origin);
    }

    if ((url.pathname === '/api/payments/create-subscription' || url.pathname === '/payments/create-subscription') && request.method === 'POST') {
      return handleCreateSubscription(request, env, origin);
    }

    if ((url.pathname === '/api/payments/verify-subscription' || url.pathname === '/payments/verify-subscription') && request.method === 'POST') {
      return handleVerifySubscription(request, env, origin);
    }

    return jsonResponse({ success: false, error: 'Not found' }, 404, origin);
  },
};
