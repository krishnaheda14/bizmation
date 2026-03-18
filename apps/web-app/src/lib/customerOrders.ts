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

export const normalizeGoldPurity = (purity: number): number => {
  if (purity === 24) return 999;
  if (purity === 22) return 916;
  if (purity === 18) return 750;
  return purity;
};

export async function fetchCustomerOrders(params: CustomerOrderQueryParams): Promise<BasicOrder[]> {
  const { uid, email, phone } = params;
  const dedup: Record<string, BasicOrder> = {};

  const queries = [
    query(collection(db, 'goldOnlineOrders'), where('userId', '==', uid)),
    query(collection(db, 'goldOnlineOrders'), where('customerUid', '==', uid)),
  ];

  for (const q of queries) {
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      dedup[d.id] = { id: d.id, ...(d.data() as any) } as BasicOrder;
    });
  }

  // Legacy fallback lookups. Permission-denied should not break the entire load.
  const emailValue = (email ?? '').trim();
  if (emailValue) {
    const candidates = Array.from(new Set([emailValue, emailValue.toLowerCase()]));
    for (const candidate of candidates) {
      try {
        const snap = await getDocs(query(collection(db, 'goldOnlineOrders'), where('customerEmail', '==', candidate)));
        snap.docs.forEach((d) => {
          dedup[d.id] = { id: d.id, ...(d.data() as any) } as BasicOrder;
        });
      } catch {
        // Ignore auth/rule mismatches for legacy fallback paths.
      }
    }
  }

  const phoneValue = (phone ?? '').trim();
  if (phoneValue) {
    const candidates = Array.from(new Set([phoneValue]));
    for (const candidate of candidates) {
      try {
        const snap = await getDocs(query(collection(db, 'goldOnlineOrders'), where('customerPhone', '==', candidate)));
        snap.docs.forEach((d) => {
          dedup[d.id] = { id: d.id, ...(d.data() as any) } as BasicOrder;
        });
      } catch {
        // Ignore auth/rule mismatches for legacy fallback paths.
      }
    }
  }

  return Object.values(dedup).sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
}
