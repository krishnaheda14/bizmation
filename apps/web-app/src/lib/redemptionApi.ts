export type RedemptionTelegramEvent = 'CREATED' | 'APPROVED' | 'SETTLED' | 'REJECTED' | 'CANCELLED' | 'PAYOUT_FAILED';

export interface RedemptionTelegramPayload {
  event: RedemptionTelegramEvent;
  requestId: string;
  status: string;
  customerName?: string;
  customerPhone?: string;
  shopName?: string;
  metal?: string;
  purity?: number | string;
  grams?: number;
  redeemRatePerGram?: number;
  estimatedInr?: number;
  note?: string;
  actorName?: string;
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

  if (base) {
    candidates.push(withBase(base, normalized));
  }

  candidates.push(normalized);

  if (normalized.startsWith('/api/')) {
    candidates.push(normalized.replace(/^\/api/, ''));
  } else {
    candidates.push(`/api${normalized}`);
  }

  return Array.from(new Set(candidates));
}

export async function notifyRedemptionTelegram(payload: RedemptionTelegramPayload): Promise<boolean> {
  const candidates = getApiCandidates('/api/payments/redemption/notify');

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) return true;
      if (res.status !== 404 && res.status !== 405) {
        return false;
      }
    } catch {
      // Try fallback candidate.
    }
  }

  return false;
}

export interface ApprovePayoutResponse {
  requestId: string;
  payoutId: string;
  payoutStatus: string;
  payoutMode: string;
  fundAccountType: 'vpa' | 'bank_account';
}

export async function approveRedemptionPayout(input: {
  requestId: string;
  adminNote?: string;
  actorName?: string;
}): Promise<ApprovePayoutResponse> {
  const candidates = getApiCandidates('/api/payments/redemption/approve-and-payout');
  let lastError: string | null = null;

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const text = await res.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }

      if (res.ok && json?.success && json?.data?.payoutId) {
        return json.data as ApprovePayoutResponse;
      }

      if (res.status !== 404 && res.status !== 405) {
        throw new Error(json?.error || `Approve payout failed with HTTP ${res.status}`);
      }
      lastError = json?.error || `Endpoint not available at ${url}`;
    } catch (err: any) {
      lastError = err?.message || 'Network error while approving payout';
    }
  }

  throw new Error(lastError || 'Unable to reach payout approval API');
}
