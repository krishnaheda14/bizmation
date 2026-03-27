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
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_CLIENT_EMAIL?: string;
  FIREBASE_PRIVATE_KEY?: string;
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

interface GiftLookupBody {
  phone?: string;
}

interface GiftTransferBody {
  senderUid?: string;
  receiverUid?: string;
  metal?: 'GOLD' | 'SILVER' | string;
  mode?: 'GRAMS' | 'INR' | string;
  value?: number | string;
  currentRate?: number | string;
}

interface RedemptionNotifyBody {
  event?: string;
  requestId?: string;
  status?: string;
  customerName?: string;
  customerPhone?: string;
  shopName?: string;
  metal?: string;
  purity?: number | string;
  grams?: number | string;
  redeemRatePerGram?: number | string;
  estimatedInr?: number | string;
  note?: string;
  actorName?: string;
}

type FirestoreFields = Record<string, any>;

type AccessTokenCache = {
  token: string;
  expiresAtMs: number;
};

let firebaseAccessTokenCache: AccessTokenCache | null = null;

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

function normalizePhoneForLookup(phone: string): string {
  const raw = String(phone || '').trim();
  if (!raw) return '';
  if (raw.startsWith('+')) return '+' + raw.slice(1).replace(/\D/g, '');
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return digits ? `+${digits}` : raw;
}

function getPhoneCandidates(phone: string): string[] {
  const raw = String(phone || '').trim();
  const normalized = normalizePhoneForLookup(raw);
  const digitsOnly = raw.replace(/\D/g, '');
  return Array.from(new Set([raw, normalized, digitsOnly].filter(Boolean)));
}

function base64UrlEncode(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function getFirebaseConfig(env: Env): { projectId: string; clientEmail: string; privateKey: string } {
  const projectId = String(env.FIREBASE_PROJECT_ID || '').trim();
  const clientEmail = String(env.FIREBASE_CLIENT_EMAIL || '').trim();
  const privateKey = String(env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim();

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase config missing on worker. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
  }

  return { projectId, clientEmail, privateKey };
}

async function getFirebaseAccessToken(env: Env): Promise<string> {
  const nowMs = Date.now();
  if (firebaseAccessTokenCache && firebaseAccessTokenCache.expiresAtMs - 60_000 > nowMs) {
    return firebaseAccessTokenCache.token;
  }

  const { clientEmail, privateKey } = getFirebaseConfig(env);
  const issuedAt = Math.floor(nowMs / 1000);
  const expiresAt = issuedAt + 3600;

  const jwtHeader = { alg: 'RS256', typ: 'JWT' };
  const jwtPayload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: issuedAt,
    exp: expiresAt,
  };

  const unsigned = `${base64UrlEncode(JSON.stringify(jwtHeader))}.${base64UrlEncode(JSON.stringify(jwtPayload))}`;

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(unsigned));
  const assertion = `${unsigned}.${base64UrlEncode(new Uint8Array(signature))}`;

  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  const tokenJson: any = await tokenResp.json().catch(() => ({}));
  if (!tokenResp.ok || !tokenJson?.access_token) {
    throw new Error(`Failed to obtain Firebase access token (${tokenResp.status})`);
  }

  firebaseAccessTokenCache = {
    token: String(tokenJson.access_token),
    expiresAtMs: nowMs + Number(tokenJson.expires_in || 3600) * 1000,
  };

  return firebaseAccessTokenCache.token;
}

function firestoreApiBase(env: Env): string {
  const { projectId } = getFirebaseConfig(env);
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
}

function toFirestoreValue(value: any): any {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return { doubleValue: 0 };
    if (Number.isInteger(value)) return { integerValue: String(value) };
    return { doubleValue: value };
  }
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map((v) => toFirestoreValue(v)) } };
  if (typeof value === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) fields[k] = toFirestoreValue(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function toFirestoreFields(data: Record<string, any>): FirestoreFields {
  const fields: FirestoreFields = {};
  for (const [k, v] of Object.entries(data)) fields[k] = toFirestoreValue(v);
  return fields;
}

function fromFirestoreValue(value: any): any {
  if (!value || typeof value !== 'object') return null;
  if ('stringValue' in value) return String(value.stringValue);
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return Boolean(value.booleanValue);
  if ('timestampValue' in value) return String(value.timestampValue);
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return Array.isArray(value.arrayValue?.values) ? value.arrayValue.values.map(fromFirestoreValue) : [];
  if ('mapValue' in value) {
    const out: Record<string, any> = {};
    const fields = value.mapValue?.fields || {};
    for (const [k, v] of Object.entries(fields)) out[k] = fromFirestoreValue(v);
    return out;
  }
  return null;
}

function fromFirestoreDocument(doc: any): Record<string, any> {
  const out: Record<string, any> = {};
  const fields = doc?.fields || {};
  for (const [k, v] of Object.entries(fields)) out[k] = fromFirestoreValue(v);
  return out;
}

async function firestoreGetDoc(env: Env, token: string, collection: string, docId: string): Promise<any | null> {
  const url = `${firestoreApiBase(env)}/${collection}/${encodeURIComponent(docId)}`;
  const resp = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (resp.status === 404) return null;
  const json: any = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(`Firestore read failed (${resp.status})`);
  return json;
}

async function firestoreRunPhoneQuery(env: Env, token: string, phone: string): Promise<any | null> {
  const url = `${firestoreApiBase(env)}:runQuery`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'users' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'phone' },
            op: 'EQUAL',
            value: { stringValue: phone },
          },
        },
        limit: 1,
      },
    }),
  });

  const json: any = await resp.json().catch(() => ([]));
  if (!resp.ok) throw new Error(`Firestore query failed (${resp.status})`);
  if (!Array.isArray(json)) return null;
  const found = json.find((row: any) => row?.document);
  return found?.document || null;
}

async function firestoreCreateDoc(env: Env, token: string, collection: string, docId: string, data: Record<string, any>): Promise<void> {
  const url = `${firestoreApiBase(env)}/${collection}?documentId=${encodeURIComponent(docId)}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Firestore write failed (${resp.status}): ${text}`);
  }
}

async function handleGiftLookupUser(request: Request, env: Env, origin: string | null): Promise<Response> {
  const body: GiftLookupBody = await request.json().catch(() => ({} as any));
  const phone = String(body.phone || '').trim();
  if (!phone) {
    return jsonResponse({ success: false, error: 'Phone number required' }, 400, origin);
  }

  try {
    const token = await getFirebaseAccessToken(env);
    const candidates = getPhoneCandidates(phone);

    for (const candidate of candidates) {
      const phoneDoc = await firestoreGetDoc(env, token, 'phoneIndex', candidate);
      if (!phoneDoc) continue;

      const phoneData = fromFirestoreDocument(phoneDoc);
      const uid = String(phoneData?.uid || '').trim();
      if (!uid) continue;

      const userDoc = await firestoreGetDoc(env, token, 'users', uid);
      if (!userDoc) continue;

      const userData = fromFirestoreDocument(userDoc);
      return jsonResponse(
        {
          success: true,
          data: {
            found: true,
            uid,
            name: String(userData?.name || 'User'),
            phone: String(userData?.phone || candidate),
          },
        },
        200,
        origin,
      );
    }

    for (const candidate of candidates) {
      const userDoc = await firestoreRunPhoneQuery(env, token, candidate);
      if (!userDoc) continue;
      const userData = fromFirestoreDocument(userDoc);
      const uid = String(userDoc?.name || '').split('/').pop() || '';
      if (!uid) continue;

      return jsonResponse(
        {
          success: true,
          data: {
            found: true,
            uid,
            name: String(userData?.name || 'User'),
            phone: String(userData?.phone || candidate),
          },
        },
        200,
        origin,
      );
    }

    return jsonResponse({ success: true, data: { found: false } }, 200, origin);
  } catch (err: any) {
    return jsonResponse({ success: false, error: err?.message || 'Gift lookup failed' }, 500, origin);
  }
}

async function handleGiftTransfer(request: Request, env: Env, origin: string | null): Promise<Response> {
  const body: GiftTransferBody = await request.json().catch(() => ({} as any));

  const senderUid = String(body.senderUid || '').trim();
  const receiverUid = String(body.receiverUid || '').trim();
  const metal = String(body.metal || '').toUpperCase();
  const mode = String(body.mode || '').toUpperCase();
  const value = Number(body.value);
  const currentRate = Number(body.currentRate);

  if (!senderUid || !receiverUid || !metal || !mode || !Number.isFinite(value) || value <= 0 || !Number.isFinite(currentRate) || currentRate <= 0) {
    return jsonResponse({ success: false, error: 'Missing gift transfer parameters' }, 400, origin);
  }

  if (senderUid === receiverUid) {
    return jsonResponse({ success: false, error: 'Sender and receiver cannot be same' }, 400, origin);
  }

  let grams = 0;
  let amount = 0;
  if (mode === 'GRAMS') {
    grams = value;
    amount = grams * currentRate;
  } else {
    amount = value;
    grams = amount / currentRate;
  }

  if (!Number.isFinite(grams) || grams <= 0 || !Number.isFinite(amount) || amount <= 0) {
    return jsonResponse({ success: false, error: 'Invalid transfer amount' }, 400, origin);
  }

  try {
    const token = await getFirebaseAccessToken(env);
    const senderDoc = await firestoreGetDoc(env, token, 'users', senderUid);
    const receiverDoc = await firestoreGetDoc(env, token, 'users', receiverUid);

    if (!senderDoc || !receiverDoc) {
      return jsonResponse({ success: false, error: 'Sender or receiver not found' }, 404, origin);
    }

    const senderData = fromFirestoreDocument(senderDoc);
    const receiverData = fromFirestoreDocument(receiverDoc);

    const purity = metal === 'GOLD' ? 995 : 999;
    const now = new Date().toISOString();

    const giftSentId = crypto.randomUUID();
    const giftReceivedId = crypto.randomUUID();

    await firestoreCreateDoc(env, token, 'goldOnlineOrders', giftSentId, {
      userId: senderUid,
      customerUid: senderUid,
      type: 'SELL',
      metal,
      purity,
      grams,
      ratePerGram: currentRate,
      marketRatePerGram: currentRate,
      totalAmountInr: amount,
      status: 'SUCCESS',
      isGift: true,
      giftReceiverUid: receiverUid,
      giftReceiverName: String(receiverData?.name || ''),
      giftReceiverPhone: String(receiverData?.phone || ''),
      customerName: String(senderData?.name || ''),
      customerEmail: String(senderData?.email || ''),
      createdAt: now,
      updatedAt: now,
    });

    await firestoreCreateDoc(env, token, 'goldOnlineOrders', giftReceivedId, {
      userId: receiverUid,
      customerUid: receiverUid,
      type: 'BUY',
      metal,
      purity,
      grams,
      ratePerGram: currentRate,
      marketRatePerGram: currentRate,
      totalAmountInr: amount,
      status: 'SUCCESS',
      isGift: true,
      giftSenderUid: senderUid,
      giftSenderName: String(senderData?.name || ''),
      customerName: String(receiverData?.name || ''),
      customerEmail: String(receiverData?.email || ''),
      createdAt: now,
      updatedAt: now,
    });

    return jsonResponse({ success: true, data: { grams, amount } }, 200, origin);
  } catch (err: any) {
    return jsonResponse({ success: false, error: err?.message || 'Gift transfer failed' }, 500, origin);
  }
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

async function handleRedemptionNotify(request: Request, env: Env, origin: string | null): Promise<Response> {
  const body: RedemptionNotifyBody = await request.json().catch(() => ({} as any));
  const requestId = String(body.requestId || '').trim();
  const status = String(body.status || '').trim().toUpperCase() || 'PENDING';
  const event = String(body.event || status || '').trim().toUpperCase() || 'UPDATED';
  if (!requestId) {
    return jsonResponse({ success: false, error: 'requestId is required' }, 400, origin);
  }

  const customer = String(body.customerName || 'Customer');
  const phone = String(body.customerPhone || 'N/A');
  const shopName = String(body.shopName || 'N/A');
  const metal = String(body.metal || 'GOLD').toUpperCase();
  const purity = String(body.purity || '');
  const grams = Number(body.grams || 0);
  const rate = Number(body.redeemRatePerGram || 0);
  const amount = Number(body.estimatedInr || 0);
  const note = String(body.note || '').trim();
  const actorName = String(body.actorName || 'System');

  await sendTelegramAlert(
    env,
    `📉 <b>REDEMPTION ${event}</b>\n\n` +
    `<b>Status:</b> ${status}\n` +
    `<b>Request ID:</b> <code>${requestId}</code>\n` +
    `<b>Customer:</b> ${customer}\n` +
    `<b>Phone:</b> ${phone}\n` +
    `<b>Shop:</b> ${shopName}\n` +
    `<b>Metal:</b> ${metal} ${purity}\n` +
    `<b>Quantity:</b> ${grams.toFixed(4)}g\n` +
    `<b>Rate:</b> ₹${rate.toLocaleString('en-IN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}/g\n` +
    `<b>Amount:</b> ₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
    `<b>By:</b> ${actorName}` +
    (note ? `\n<b>Note:</b> ${note}` : '')
  );

  return jsonResponse({ success: true }, 200, origin);
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

    if ((url.pathname === '/api/payments/gift/lookup-user' || url.pathname === '/payments/gift/lookup-user') && request.method === 'POST') {
      return handleGiftLookupUser(request, env, origin);
    }

    if ((url.pathname === '/api/payments/gift/transfer' || url.pathname === '/payments/gift/transfer') && request.method === 'POST') {
      return handleGiftTransfer(request, env, origin);
    }

    if ((url.pathname === '/api/payments/create-subscription' || url.pathname === '/payments/create-subscription') && request.method === 'POST') {
      return handleCreateSubscription(request, env, origin);
    }

    if ((url.pathname === '/api/payments/verify-subscription' || url.pathname === '/payments/verify-subscription') && request.method === 'POST') {
      return handleVerifySubscription(request, env, origin);
    }

    if ((url.pathname === '/api/payments/redemption/notify' || url.pathname === '/payments/redemption/notify') && request.method === 'POST') {
      return handleRedemptionNotify(request, env, origin);
    }

    return jsonResponse({ success: false, error: 'Not found' }, 404, origin);
  },
};
