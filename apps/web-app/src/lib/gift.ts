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

async function readJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function lookupGiftReceiver(phone: string): Promise<GiftLookupResult> {
  const payload = { phone: String(phone || '').trim() };
  const res = await fetch('/api/payments/gift/lookup-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const json = await readJson(res);
  if (!res.ok) {
    const message = json?.error || json?.message || `Lookup failed with HTTP ${res.status}`;
    throw new Error(message);
  }

  if (!json?.success) {
    throw new Error(json?.error || 'Lookup failed');
  }

  return json.data as GiftLookupResult;
}

export async function transferGift(request: GiftTransferRequest): Promise<GiftTransferResponse> {
  const res = await fetch('/api/payments/gift/transfer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  const json = await readJson(res);
  if (!res.ok) {
    const message = json?.error || json?.message || `Gift transfer failed with HTTP ${res.status}`;
    throw new Error(message);
  }

  if (!json?.success || !json.data) {
    throw new Error(json?.error || 'Gift transfer failed');
  }

  return json.data as GiftTransferResponse;
}
