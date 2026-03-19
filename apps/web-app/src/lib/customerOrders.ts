import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

export interface CustomerOrderQueryParams {
  uid: string;
  email?: string;
  phone?: string;
}

export interface BasicOrder {
  id: string;
  userId?: string;
  customerUid?: string;
  customerEmail?: string;
  customerPhone?: string;
  type?: string;
  metal?: string;
  purity?: number;
  grams?: number;
  status?: string;
  createdAt?: any;
  [key: string]: any;
}

export interface CustomerOrderFetchStep {
  label: string;
  ok: boolean;
  count: number;
  errorCode?: string;
  errorMessage?: string;
}

export interface CustomerOrderFetchDebug {
  uid: string;
  email: string;
  phone: string;
  totalUnique: number;
  steps: CustomerOrderFetchStep[];
}

export interface CustomerOrderFetchResult {
  orders: BasicOrder[];
  debug: CustomerOrderFetchDebug;
}

export const normalizeGoldPurity = (purity: number): number => {
  if (purity === 24) return 999;
  if (purity === 22) return 916;
  if (purity === 18) return 750;
  return purity;
};

export async function fetchCustomerOrdersWithDebug(params: CustomerOrderQueryParams): Promise<CustomerOrderFetchResult> {
  const { uid, email, phone } = params;
  const dedup: Record<string, BasicOrder> = {};
  const steps: CustomerOrderFetchStep[] = [];

  const runQuery = async (label: string, q: ReturnType<typeof query>, allowFailure = false) => {
    try {
      const snap = await getDocs(q);
      snap.docs.forEach((d) => {
        dedup[d.id] = { id: d.id, ...(d.data() as any) } as BasicOrder;
      });
      steps.push({ label, ok: true, count: snap.size });
    } catch (err: any) {
      const errorCode = err?.code ? String(err.code) : undefined;
      const errorMessage = err?.message ? String(err.message) : 'Unknown query error';
      steps.push({ label, ok: false, count: 0, errorCode, errorMessage });
      if (!allowFailure) {
        throw err;
      }
    }
  };

  const queries = [
    { label: 'primary:userId', q: query(collection(db, 'goldOnlineOrders'), where('userId', '==', uid)) },
    { label: 'primary:customerUid', q: query(collection(db, 'goldOnlineOrders'), where('customerUid', '==', uid)) },
  ];

  for (const entry of queries) {
    await runQuery(entry.label, entry.q, false);
  }

  // Legacy fallback lookups. Permission-denied should not break the entire load.
  const emailValue = (email ?? '').trim();
  if (emailValue) {
    const candidates = Array.from(new Set([emailValue, emailValue.toLowerCase()]));
    for (const candidate of candidates) {
      await runQuery(
        `fallback:customerEmail:${candidate}`,
        query(collection(db, 'goldOnlineOrders'), where('customerEmail', '==', candidate)),
        true,
      );
    }
  }

  const phoneValue = (phone ?? '').trim();
  if (phoneValue && Object.keys(dedup).length === 0) {
    const candidates = Array.from(new Set([phoneValue]));
    for (const candidate of candidates) {
      await runQuery(
        `fallback:customerPhone:${candidate}`,
        query(collection(db, 'goldOnlineOrders'), where('customerPhone', '==', candidate)),
        true,
      );
    }
  } else if (phoneValue) {
    steps.push({
      label: `fallback:customerPhone:${phoneValue}`,
      ok: true,
      count: 0,
      errorMessage: 'skipped (already matched by userId/customerUid/email)',
    });
  }

  const orders = Object.values(dedup).sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
  return {
    orders,
    debug: {
      uid,
      email: emailValue,
      phone: phoneValue,
      totalUnique: orders.length,
      steps,
    },
  };
}

export async function fetchCustomerOrders(params: CustomerOrderQueryParams): Promise<BasicOrder[]> {
  const result = await fetchCustomerOrdersWithDebug(params);
  return result.orders;
}
