export interface GiftLookupResult {
  found: boolean;
  name?: string;
  uid?: string;
  phone?: string;
}

interface GiftTransferRequest {
  senderUid: string;
  receiverUid: string;
  metal: 'GOLD' | 'SILVER';
  mode: 'GRAMS' | 'INR';
  value: number;
  currentRate: number;
}

interface GiftTransferResponse {
  grams: number;
  amount: number;
}

function getApiBaseUrl(): string {
  const raw = String(import.meta.env.VITE_API_URL || '').trim();
  return raw ? raw.replace(/\/$/, '') : '';
}

function normalizePath(path: string): string {
  if (!path) return '/';
  return path.startsWith('/') ? path : `/${path}`;
}

function withBase(base: string, path: string): string {
  const normalizedPath = normalizePath(path);
  if (base.endsWith('/api') && normalizedPath.startsWith('/api/')) {
    return `${base}${normalizedPath.replace(/^\/api/, '')}`;
  }
  return `${base}${normalizedPath}`;
}

function getApiCandidates(path: string): string[] {
  const normalized = normalizePath(path);
  const base = getApiBaseUrl();
  const candidates: string[] = [];

  // Prefer explicit backend base first to bypass misconfigured Pages proxy.
  if (base) {
    candidates.push(withBase(base, normalized));
  }

  // Same-origin fallback via Pages functions.
  candidates.push(normalized);

  // Secondary fallback between /api and non-/api variants.
  if (normalized.startsWith('/api/')) {
    candidates.push(normalized.replace(/^\/api/, ''));
  } else {
    candidates.push(`/api${normalized}`);
  }

  return Array.from(new Set(candidates));
}

async function readJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function fetchGiftApi(path: string, init: RequestInit): Promise<{ res: Response; url: string; json: any }> {
  const candidates = getApiCandidates(path);
  console.debug('[GiftLookup] endpoint candidates:', candidates);

  let lastErr: any = null;
  for (const url of candidates) {
    try {
      const res = await fetch(url, init);
      const json = await readJson(res);
      console.debug('[GiftLookup] endpoint result:', { url, status: res.status, body: json });

      // Retry on routing misses only.
      if ((res.status === 404 || res.status === 405) && url !== candidates[candidates.length - 1]) {
        continue;
      }
      return { res, url, json };
    } catch (err: any) {
      lastErr = err;
      console.error('[GiftLookup] endpoint error:', { url, error: err?.message || err });
    }
  }

  throw lastErr || new Error('Unable to reach gift API');
}

function normalizePhoneForLookup(raw: string): string {
  let s = String(raw || '').trim();
  if (!s) return '';
  if (s.startsWith('+')) {
    return '+' + s.slice(1).replace(/\D/g, '');
  }
  s = s.replace(/\D/g, '');
  if (s.length === 10) return '+91' + s;
  if (s.length === 12 && s.startsWith('91')) return '+' + s;
  return '+' + s;
}

async function callLookup(phone: string): Promise<GiftLookupResult> {
  console.debug('[GiftLookup] lookup phone:', phone);
  const payload = { phone: String(phone || '').trim() };
  const { res, json, url } = await fetchGiftApi('/api/payments/gift/lookup-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const message = json?.error || json?.message || `Lookup failed with HTTP ${res.status} at ${url}`;
    throw new Error(message);
  }
  if (!json?.success) {
    throw new Error(json?.error || 'Lookup failed');
  }
  console.debug('[GiftLookup] response for phone', phone, ':', json?.data || null);
  return (json.data || { found: false }) as GiftLookupResult;
}

export async function lookupGiftReceiver(phone: string): Promise<GiftLookupResult> {
  const raw = String(phone || '').trim();
  if (!raw) return { found: false };

  const normalized = normalizePhoneForLookup(raw);
  const legacy = raw.replace(/\D/g, '');
  const candidates = Array.from(new Set([raw, normalized, legacy].filter(Boolean)));
  console.debug('[GiftLookup] candidates:', candidates);

  let last: GiftLookupResult = { found: false };
  for (const candidate of candidates) {
    const result = await callLookup(candidate);
    if (result?.found) return result;
    last = result;
  }

  return last;
}

export async function transferGift(request: GiftTransferRequest): Promise<GiftTransferResponse> {
  const { res, json, url } = await fetchGiftApi('/api/payments/gift/transfer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const message = json?.error || json?.message || `Gift transfer failed with HTTP ${res.status} at ${url}`;
    throw new Error(message);
  }

  if (!json?.success || !json.data) {
    throw new Error(json?.error || 'Gift transfer failed');
  }

  return json.data as GiftTransferResponse;
}
