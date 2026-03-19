/**
 * SuperAdmin Dashboard
 * Access: SUPER_ADMIN role only
 * Shows complete visibility across shops, users, orders, and commissions.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

interface ShopRow {
  id: string;
  name?: string;
  ownerUid?: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  ownerCode?: string;
  bizShopId?: string;
  city?: string;
  state?: string;
  country?: string;
  businessAddress?: string;
  businessPincode?: string;
  panNumber?: string;
  gstNumber?: string;
  hallmarkLicenseNumber?: string;
  aadhaarNumber?: string;
  aadhaarLast4?: string;
  verificationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  verificationRequestedAt?: any;
  verificationReviewedAt?: any;
  verificationReviewedBy?: string;
  verificationNote?: string;
  shopVerificationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  shopVerificationNote?: string;
  verified?: boolean;
  createdAt?: any;
  updatedAt?: any;
  [k: string]: any;
}

interface UserRow {
  id: string;
  uid?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  shopName?: string;
  shopId?: string;
  ownerCode?: string;
  bizCustomerId?: string;
  bizShopId?: string;
  city?: string;
  state?: string;
  country?: string;
  kycStatus?: string;
  totalGoldPurchasedGrams?: number;
  totalSilverPurchasedGrams?: number;
  totalInvestedInr?: number;
  phoneVerified?: boolean;
  shopVerificationStatus?: string;
  shopVerificationNote?: string;
  shopVerified?: boolean;
  createdAt?: any;
  updatedAt?: any;
  [k: string]: any;
}

interface PlatformOrderRow {
  id: string;
  type?: 'BUY' | 'SELL';
  status?: string;
  metal?: string;
  purity?: number;
  grams?: number;
  ratePerGram?: number;
  marketRatePerGram?: number;
  commissionPerGram?: number;
  shopCommissionInr?: number;
  totalAmountInr?: number;
  bullionBaseAmountInr?: number;
  bullionSettlementAmountInr?: number;
  bullionPayoutStatus?: string;
  customerUid?: string;
  userId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  razorpayPaymentId?: string;
  shopId?: string;
  shopName?: string;
  createdAt?: any;
  updatedAt?: any;
  [k: string]: any;
}

interface Tab {
  key: 'shops' | 'customers' | 'orders' | 'stats';
  label: string;
}

const TABS: Tab[] = [
  { key: 'shops', label: 'Shops' },
  { key: 'customers', label: 'Users' },
  { key: 'orders', label: 'Orders' },
  { key: 'stats', label: 'Platform' },
];

const fmtDate = (ts: any): string => {
  if (!ts) return '-';
  if (ts?.seconds) return new Date(ts.seconds * 1000).toLocaleString('en-IN');
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-IN');
};

const fmtInr = (v: number, compact = true) => {
  const n = Number(v) || 0;
  const abs = Math.abs(n);
  if (compact && abs >= 10000000) return `₹${(n / 10000000).toFixed(4)} Cr`;
  if (compact && abs >= 100000) return `₹${(n / 100000).toFixed(4)} L`;
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
};

const normalize = (v: string | undefined) => String(v || '').trim().toLowerCase();
const UNASSIGNED_SHOP_NAME = 'unassigned-customers';
const UNASSIGNED_SHOP_ID = 'UNASSIGNED';

const getShopVerificationStatus = (shop: ShopRow): 'PENDING' | 'APPROVED' | 'REJECTED' => {
  const raw = String(shop.verificationStatus ?? shop.shopVerificationStatus ?? 'PENDING').toUpperCase();
  if (raw === 'APPROVED' || raw === 'REJECTED') return raw;
  return 'PENDING';
};

const displayValue = (v: unknown): string => {
  if (v == null || v === '') return '-';
  if (typeof v === 'object') {
    const anyV = v as any;
    if (anyV?.seconds) return fmtDate(anyV);
    return JSON.stringify(v);
  }
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
};

const maskedValue = (key: string, v: unknown): string => {
  const value = displayValue(v);
  if (value === '-') return value;
  const lower = key.toLowerCase();
  if (lower.includes('aadhaar') && !lower.includes('last4')) {
    const digits = value.replace(/\D/g, '');
    const last4 = digits.slice(-4);
    return last4 ? `********${last4}` : '************';
  }
  if (lower.includes('pan') && value.length >= 4) {
    return `${value.slice(0, 2)}******${value.slice(-2)}`;
  }
  return value;
};

const DetailGrid: React.FC<{ title: string; rows: Array<{ label: string; value: string }> }> = ({ title, rows }) => (
  <div className="rounded-2xl border border-amber-100 bg-white p-4">
    <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-3">{title}</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {rows.map((r) => (
        <div key={r.label} className="rounded-xl bg-amber-50/60 px-3 py-2 border border-amber-100">
          <p className="text-[10px] uppercase tracking-wide text-amber-600 font-semibold">{r.label}</p>
          <p className="text-xs text-stone-700 break-words">{r.value}</p>
        </div>
      ))}
    </div>
  </div>
);

export function SuperAdmin() {
  const { currentUser, userProfile, signOut } = useAuth();
  const [tab, setTab] = useState<Tab['key']>('shops');
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [orders, setOrders] = useState<PlatformOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [loadErr, setLoadErr] = useState('');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [verifyNote, setVerifyNote] = useState<Record<string, string>>({});
  const [expandedShopId, setExpandedShopId] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [actionDebug, setActionDebug] = useState<string[]>([]);

  const pushDebug = (msg: string) => {
    const t = new Date().toLocaleTimeString('en-IN');
    setActionDebug((prev) => [`[${t}] ${msg}`, ...prev].slice(0, 40));
  };

  if (userProfile?.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center space-y-3 p-8">
          <div className="text-6xl">🔒</div>
          <h2 className="text-2xl font-bold text-stone-700">Access Denied</h2>
          <p className="text-stone-500 text-sm">This area is restricted to super administrators.</p>
          <button
            onClick={() => {
              window.location.hash = '#/';
            }}
            className="mt-4 px-6 py-2 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setLoadErr('');
    try {
      const [shopsSnap, usersSnap, ordersSnap] = await Promise.all([
        getDocs(query(collection(db, 'shops'), orderBy('name'))),
        getDocs(collection(db, 'users')),
        getDocs(query(collection(db, 'goldOnlineOrders'), orderBy('createdAt', 'desc'))),
      ]);

      setShops(shopsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as ShopRow)));
      setUsers(usersSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as UserRow)));
      setOrders(ordersSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as PlatformOrderRow)));
    } catch (err: any) {
      console.error('[SuperAdmin] loadData error:', err?.code, err?.message);
      setLoadErr(err?.message ?? 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }

  const totalCommission = useMemo(() => orders.reduce((s, o) => s + (Number(o.shopCommissionInr) || 0), 0), [orders]);
  const pendingCommission = useMemo(() => orders.reduce((s, o) => {
    const unsettled = (o.bullionPayoutStatus ?? 'UNSETTLED').toUpperCase() !== 'SETTLED';
    return (o.type === 'BUY' && unsettled) ? s + (Number(o.shopCommissionInr) || 0) : s;
  }, 0), [orders]);
  const settledCommission = useMemo(() => orders.reduce((s, o) => {
    const settled = (o.bullionPayoutStatus ?? '').toUpperCase() === 'SETTLED';
    return (o.type === 'BUY' && settled) ? s + (Number(o.shopCommissionInr) || 0) : s;
  }, 0), [orders]);

  const commissionByMetal = useMemo(() => {
    const gold = orders
      .filter((o) => (o.metal ?? '').toUpperCase() === 'GOLD')
      .reduce((s, o) => s + (Number(o.shopCommissionInr) || 0), 0);
    const silver = orders
      .filter((o) => (o.metal ?? '').toUpperCase() === 'SILVER')
      .reduce((s, o) => s + (Number(o.shopCommissionInr) || 0), 0);
    return { gold, silver };
  }, [orders]);

  const pendingShops = useMemo(
    () => shops.filter((s) => getShopVerificationStatus(s) === 'PENDING'),
    [shops],
  );

  const unassignedCustomers = useMemo(
    () => users.filter((u) => (u.role ?? '').toUpperCase() === 'CUSTOMER' && (
      normalize(u.shopId) === normalize(UNASSIGNED_SHOP_ID)
      || normalize(u.shopName) === normalize(UNASSIGNED_SHOP_NAME)
      || (!u.shopId && !u.shopName)
    )),
    [users],
  );

  const filteredShops = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return shops;
    return shops.filter((s) =>
      (s.name ?? '').toLowerCase().includes(q)
      || (s.bizShopId ?? '').toLowerCase().includes(q)
      || (s.ownerCode ?? '').toLowerCase().includes(q)
      || (s.ownerName ?? '').toLowerCase().includes(q)
      || (s.email ?? '').toLowerCase().includes(q)
      || (s.phone ?? '').toLowerCase().includes(q),
    );
  }, [shops, search]);

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      (u.name ?? '').toLowerCase().includes(q)
      || (u.email ?? '').toLowerCase().includes(q)
      || (u.phone ?? '').toLowerCase().includes(q)
      || (u.role ?? '').toLowerCase().includes(q)
      || (u.shopName ?? '').toLowerCase().includes(q)
      || (u.shopId ?? '').toLowerCase().includes(q)
      || (u.bizCustomerId ?? '').toLowerCase().includes(q)
      || (u.bizShopId ?? '').toLowerCase().includes(q),
    );
  }, [users, search]);

  const filteredOrders = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return orders;
    return orders.filter((o) =>
      (o.customerName ?? '').toLowerCase().includes(q)
      || (o.customerEmail ?? '').toLowerCase().includes(q)
      || (o.shopName ?? '').toLowerCase().includes(q)
      || (o.shopId ?? '').toLowerCase().includes(q)
      || (o.metal ?? '').toLowerCase().includes(q)
      || (o.type ?? '').toLowerCase().includes(q)
      || (o.status ?? '').toLowerCase().includes(q)
      || (o.userId ?? '').toLowerCase().includes(q)
      || (o.customerUid ?? '').toLowerCase().includes(q)
      || (o.razorpayPaymentId ?? '').toLowerCase().includes(q),
    );
  }, [orders, search]);

  const ordersForShop = (shop: ShopRow) =>
    orders.filter((o) =>
      (o.shopId && shop.id && o.shopId === shop.id)
      || (normalize(o.shopName) && normalize(shop.name) && normalize(o.shopName) === normalize(shop.name)),
    );

  const ordersForUser = (user: UserRow) =>
    orders.filter((o) =>
      (o.userId && o.userId === user.id)
      || (o.customerUid && o.customerUid === user.id)
      || (!!user.email && !!o.customerEmail && normalize(user.email) === normalize(o.customerEmail)),
    );

  const setShopVerification = async (shop: ShopRow, status: 'APPROVED' | 'REJECTED') => {
    const actorUid = currentUser?.uid || userProfile?.uid || '';
    if (!actorUid) {
      pushDebug('Abort approve/reject: missing actor uid.');
      setActionMsg({ type: 'err', text: 'Cannot process action: missing super admin uid in session.' });
      return;
    }
    setActionLoading((prev) => ({ ...prev, [shop.id]: true }));
    pushDebug(`Action started: ${status} | shopId=${shop.id} | shop=${shop.name || '-'} | actor=${actorUid}`);
    try {
      const note = (verifyNote[shop.id] ?? '').trim();
      await updateDoc(doc(db, 'shops', shop.id), {
        verificationStatus: status,
        shopVerificationStatus: status,
        verificationReviewedAt: serverTimestamp(),
        verificationReviewedBy: actorUid,
        verificationNote: note,
        shopVerificationNote: note,
        verified: status === 'APPROVED',
        updatedAt: serverTimestamp(),
      });
      pushDebug('Shop document update: success');

      try {
        const shopAfter = await getDoc(doc(db, 'shops', shop.id));
        const statusAfter = String(
          shopAfter.data()?.verificationStatus
          ?? shopAfter.data()?.shopVerificationStatus
          ?? '-',
        );
        pushDebug(`Shop status after write: ${statusAfter}`);
      } catch (e: any) {
        pushDebug(`Shop readback failed: ${e?.message || 'unknown error'}`);
      }

      const linkedUserIds = Array.from(new Set(
        users
          .filter((u) => ['OWNER', 'STAFF'].includes((u.role ?? '').toUpperCase()))
          .filter((u) =>
            (shop.ownerUid && u.id === shop.ownerUid)
            || (shop.ownerUid && u.uid === shop.ownerUid)
            || (!!shop.id && u.shopId === shop.id)
            || (!!shop.bizShopId && u.bizShopId === shop.bizShopId)
            || (!!shop.name && normalize(u.shopName) === normalize(shop.name))
            || (!!shop.ownerCode && normalize(u.ownerCode) === normalize(shop.ownerCode))
            || (!!shop.email && normalize(u.email) === normalize(shop.email))
          )
          .map((u) => u.id)
          .concat(shop.ownerUid ? [shop.ownerUid] : []),
      ));
      pushDebug(`Linked owner/staff users resolved: ${linkedUserIds.length}`);

      const userWriteResults = await Promise.allSettled(linkedUserIds.map((uid) =>
        updateDoc(doc(db, 'users', uid), {
          shopVerificationStatus: status,
          shopVerificationReviewedAt: serverTimestamp(),
          shopVerificationReviewedBy: actorUid,
          shopVerificationNote: note,
          shopVerified: status === 'APPROVED',
          updatedAt: serverTimestamp(),
        }),
      ));
      const userWriteFailures = userWriteResults.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
      if (userWriteFailures.length > 0) {
        pushDebug(`User updates had failures: ${userWriteFailures.length}`);
        userWriteFailures.slice(0, 3).forEach((f, idx) => pushDebug(`User update error ${idx + 1}: ${String(f.reason?.message || f.reason)}`));
      } else {
        pushDebug('All linked user updates: success');
      }

      // Optimistic local update so the status flips instantly in UI.
      setShops((prev) => prev.map((s) => s.id === shop.id ? {
        ...s,
        verificationStatus: status,
        shopVerificationStatus: status,
        verificationNote: note,
        shopVerificationNote: note,
        verified: status === 'APPROVED',
      } : s));

      if (linkedUserIds.length > 0) {
        setUsers((prev) => prev.map((u) => linkedUserIds.includes(u.id) ? {
          ...u,
          shopVerificationStatus: status,
          shopVerificationNote: note,
          shopVerified: status === 'APPROVED',
        } : u));
      }

      setActionMsg({ type: 'ok', text: `You have successfully ${status === 'APPROVED' ? 'approved' : 'rejected'} ${shop.name || 'the shop'}.` });
      setTimeout(() => setActionMsg(null), 9000);
      pushDebug('Action completed successfully.');
      await loadData();
      pushDebug('Data reload after action: success');
    } catch (err: any) {
      setActionMsg({ type: 'err', text: err?.message ?? 'Failed to update verification status.' });
      setTimeout(() => setActionMsg(null), 10000);
      pushDebug(`Action failed: ${err?.code || ''} ${err?.message || 'unknown error'}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [shop.id]: false }));
    }
  };

  const kycBadge = (s?: string) => {
    const base = 'text-xs px-2 py-0.5 rounded-full font-medium';
    if (s === 'VERIFIED') return <span className={`${base} bg-green-100 text-green-700`}>Verified</span>;
    if (s === 'REJECTED') return <span className={`${base} bg-red-100 text-red-700`}>Rejected</span>;
    return <span className={`${base} bg-amber-100 text-amber-700`}>Pending</span>;
  };

  const verificationBadge = (s?: string) => {
    const v = s ?? 'PENDING';
    if (v === 'APPROVED') return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">Approved</span>;
    if (v === 'REJECTED') return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">Rejected</span>;
    return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">Pending</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50 to-yellow-50">
      <div className="sticky top-0 z-40 backdrop-blur-md" style={{ background: 'rgba(255,251,235,0.92)', borderBottom: '1px solid rgba(251,191,36,0.25)' }}>
        <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-amber-900">Super Admin Console</h1>
            <p className="text-xs text-amber-600">Complete Visibility: shops, users, orders, commissions</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-stone-500 hidden sm:block">{userProfile?.email}</span>
            <button
              onClick={loadData}
              className="px-3 py-1.5 text-xs rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-700 font-medium transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={signOut}
              className="px-3 py-1.5 text-xs rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
        <div className="max-w-[1200px] mx-auto px-4 pb-0 flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                setSearch('');
                setExpandedShopId(null);
                setExpandedUserId(null);
              }}
              className="px-4 py-2 text-sm font-semibold rounded-t-xl transition-all border-b-2"
              style={tab === t.key
                ? { color: '#92400e', borderColor: '#f59e0b', background: 'rgba(253,243,212,0.6)' }
                : { color: '#a8a29e', borderColor: 'transparent' }}
            >
              {t.label}
              {t.key === 'shops' && <span className="ml-1.5 text-xs bg-amber-200 text-amber-800 rounded-full px-1.5 py-px">{shops.length}</span>}
              {t.key === 'customers' && <span className="ml-1.5 text-xs bg-amber-200 text-amber-800 rounded-full px-1.5 py-px">{users.length}</span>}
              {t.key === 'orders' && <span className="ml-1.5 text-xs bg-amber-200 text-amber-800 rounded-full px-1.5 py-px">{orders.length}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 py-6">
        {actionMsg && (
          <div className={`mb-4 rounded-2xl px-4 py-3 text-sm border ${actionMsg.type === 'ok' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {actionMsg.text}
          </div>
        )}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
            <p className="text-amber-700 text-sm">Loading platform data...</p>
          </div>
        ) : loadErr ? (
          <div className="rounded-2xl p-6 bg-red-50 border border-red-200 text-red-700 text-sm">
            <p className="font-semibold mb-1">Failed to load data</p>
            <p className="font-mono text-xs">{loadErr}</p>
            <button
              onClick={loadData}
              className="mt-3 px-4 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {tab !== 'stats' && (
              <div className="mb-5">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${tab}...`}
                  className="w-full max-w-md rounded-2xl border border-amber-200 bg-white/90 px-4 py-2.5 text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>
            )}

            {tab === 'shops' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
                  <CardStat label="Total Shops" value={String(shops.length)} />
                  <CardStat label="Pending Verification" value={String(pendingShops.length)} valueClass="text-red-700" />
                  <CardStat label="Approved Shops" value={String(shops.filter((s) => getShopVerificationStatus(s) === 'APPROVED').length)} valueClass="text-green-700" />
                  <CardStat label="Shops With Orders" value={String(shops.filter((s) => ordersForShop(s).length > 0).length)} />
                </div>

                <div className="mb-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                  <p className="text-xs font-bold text-stone-700 uppercase tracking-wide mb-2">Approval Debug Trace</p>
                  {actionDebug.length === 0 ? (
                    <p className="text-xs text-stone-500">No actions yet.</p>
                  ) : (
                    <div className="max-h-36 overflow-auto space-y-1">
                      {actionDebug.map((line, idx) => (
                        <p key={idx} className="text-[11px] font-mono text-stone-700">{line}</p>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-3xl overflow-hidden shadow-sm border border-amber-100 bg-white/90 backdrop-blur">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[1100px]">
                      <thead>
                        <tr style={{ background: 'linear-gradient(90deg,rgba(253,243,212,0.9),rgba(253,243,212,0.5))' }}>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-amber-800 uppercase">Shop</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-amber-800 uppercase">Owner</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-amber-800 uppercase">Contact</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-amber-800 uppercase">Codes</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-amber-800 uppercase">Verification</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-amber-800 uppercase">Orders</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-amber-800 uppercase">Commission</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-amber-800 uppercase">Review</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-amber-800 uppercase">More</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredShops.length === 0 && (
                          <tr><td colSpan={9} className="text-center py-12 text-stone-400 text-sm">No shops found</td></tr>
                        )}
                        {filteredShops.map((s, i) => {
                          const sOrders = ordersForShop(s);
                          const sCommission = sOrders.reduce((sum, o) => sum + (Number(o.shopCommissionInr) || 0), 0);
                          const isExpanded = expandedShopId === s.id;
                          return (
                            <React.Fragment key={s.id}>
                              <tr className={i % 2 === 0 ? 'bg-white/60' : 'bg-amber-50/40'}>
                                <td className="px-4 py-3">
                                  <p className="font-semibold text-stone-800">{s.name || '-'}</p>
                                  <p className="text-xs text-stone-500">{s.city || '-'} {s.state ? `, ${s.state}` : ''}</p>
                                </td>
                                <td className="px-4 py-3 text-stone-700">
                                  <p className="font-medium">{s.ownerName || '-'}</p>
                                  <p className="text-xs text-stone-500 font-mono">{s.ownerUid || '-'}</p>
                                </td>
                                <td className="px-4 py-3 text-stone-700">
                                  <p>{s.phone || '-'}</p>
                                  <p className="text-xs text-stone-500">{s.email || '-'}</p>
                                </td>
                                <td className="px-4 py-3 text-stone-700">
                                  <p className="text-xs font-mono">Owner Code: {s.ownerCode || '-'}</p>
                                </td>
                                <td className="px-4 py-3">{verificationBadge(getShopVerificationStatus(s))}</td>
                                <td className="px-4 py-3 text-right font-semibold text-stone-700">{sOrders.length}</td>
                                <td className="px-4 py-3 text-right font-bold text-amber-800">{fmtInr(sCommission)}</td>
                                <td className="px-4 py-3">
                                  <div className="space-y-2">
                                    <input
                                      type="text"
                                      placeholder="Review note"
                                      value={verifyNote[s.id] ?? ''}
                                      onChange={(e) => setVerifyNote((prev) => ({ ...prev, [s.id]: e.target.value }))}
                                      className="w-full rounded-lg border border-amber-200 bg-white px-2 py-1 text-xs text-stone-700"
                                    />
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => setShopVerification(s, 'APPROVED')}
                                        disabled={!!actionLoading[s.id]}
                                        className="px-2 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-60"
                                      >{actionLoading[s.id] ? 'Saving...' : 'Approve'}</button>
                                      <button
                                        onClick={() => setShopVerification(s, 'REJECTED')}
                                        disabled={!!actionLoading[s.id]}
                                        className="px-2 py-1 rounded-lg text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-60"
                                      >{actionLoading[s.id] ? 'Saving...' : 'Reject'}</button>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() => setExpandedShopId(isExpanded ? null : s.id)}
                                    className="px-2 py-1 rounded-lg text-xs font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200"
                                  >
                                    {isExpanded ? 'Hide' : 'Details'}
                                  </button>
                                </td>
                              </tr>

                              {isExpanded && (
                                <tr className="bg-white">
                                  <td colSpan={9} className="px-4 py-4 border-t border-amber-100">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                      <DetailGrid
                                        title="Shop Details"
                                        rows={[
                                          { label: 'Shop Name', value: maskedValue('name', s.name) },
                                          { label: 'Shop ID', value: maskedValue('id', s.id) },
                                          { label: 'Business Shop ID', value: maskedValue('bizShopId', s.bizShopId) },
                                          { label: 'Owner Name', value: maskedValue('ownerName', s.ownerName) },
                                          { label: 'Owner UID', value: maskedValue('ownerUid', s.ownerUid) },
                                          { label: 'Owner Code', value: maskedValue('ownerCode', s.ownerCode) },
                                          { label: 'Email', value: maskedValue('email', s.email) },
                                          { label: 'Phone', value: maskedValue('phone', s.phone) },
                                          { label: 'Business Address', value: maskedValue('businessAddress', s.businessAddress) },
                                          { label: 'Pincode', value: maskedValue('businessPincode', s.businessPincode) },
                                          { label: 'PAN', value: maskedValue('panNumber', s.panNumber) },
                                          { label: 'GST', value: maskedValue('gstNumber', s.gstNumber) },
                                          { label: 'Hallmark License', value: maskedValue('hallmarkLicenseNumber', s.hallmarkLicenseNumber) },
                                          { label: 'Aadhaar', value: maskedValue('aadhaarNumber', s.aadhaarNumber) },
                                          { label: 'Aadhaar Last 4', value: maskedValue('aadhaarLast4', s.aadhaarLast4) },
                                          { label: 'Verification', value: getShopVerificationStatus(s) },
                                          { label: 'Reviewed At', value: maskedValue('verificationReviewedAt', s.verificationReviewedAt) },
                                          { label: 'Reviewed By', value: maskedValue('verificationReviewedBy', s.verificationReviewedBy) },
                                          { label: 'Review Note', value: maskedValue('verificationNote', s.verificationNote ?? s.shopVerificationNote) },
                                        ]}
                                      />
                                      <div className="rounded-2xl border border-amber-100 bg-white p-3">
                                        <p className="text-xs font-bold text-amber-800 uppercase mb-2">Orders Under Shop ({sOrders.length})</p>
                                        <div className="overflow-x-auto">
                                          <table className="w-full text-xs min-w-[700px]">
                                            <thead>
                                              <tr className="border-b border-amber-100">
                                                <th className="text-left py-1 pr-2">Date</th>
                                                <th className="text-left py-1 pr-2">Customer</th>
                                                <th className="text-left py-1 pr-2">Type</th>
                                                <th className="text-left py-1 pr-2">Metal</th>
                                                <th className="text-right py-1 pr-2">Grams</th>
                                                <th className="text-right py-1 pr-2">Amount</th>
                                                <th className="text-right py-1 pr-2">Commission</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {sOrders.slice(0, 20).map((o) => (
                                                <tr key={o.id} className="border-b border-stone-100">
                                                  <td className="py-1 pr-2">{fmtDate(o.createdAt)}</td>
                                                  <td className="py-1 pr-2">{o.customerName || o.customerEmail || '-'}</td>
                                                  <td className="py-1 pr-2">{o.type || '-'}</td>
                                                  <td className="py-1 pr-2">{o.metal || '-'} {o.purity ? `(${o.purity})` : ''}</td>
                                                  <td className="py-1 pr-2 text-right">{Number(o.grams || 0).toFixed(4)}</td>
                                                  <td className="py-1 pr-2 text-right">{fmtInr(Number(o.totalAmountInr || 0))}</td>
                                                  <td className="py-1 pr-2 text-right">{fmtInr(Number(o.shopCommissionInr || 0))}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {tab === 'customers' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
                  <CardStat label="Total Users" value={String(users.length)} />
                  <CardStat label="Customers" value={String(users.filter((u) => u.role === 'CUSTOMER').length)} />
                  <CardStat label="Owners" value={String(users.filter((u) => u.role === 'OWNER').length)} />
                  <CardStat label="Staff" value={String(users.filter((u) => u.role === 'STAFF').length)} />
                </div>
                <div className="mb-4">
                  <CardStat label="Unassigned Customers" value={String(unassignedCustomers.length)} valueClass="text-amber-800" />
                </div>

                <div className="rounded-3xl overflow-hidden shadow-sm border border-amber-100 bg-white/90 backdrop-blur">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[1200px]">
                      <thead>
                        <tr style={{ background: 'linear-gradient(90deg,rgba(253,243,212,0.9),rgba(253,243,212,0.5))' }}>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-amber-800 uppercase">User</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-amber-800 uppercase">Role</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-amber-800 uppercase">Contact</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-amber-800 uppercase">Shop Link</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-amber-800 uppercase">KYC</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-amber-800 uppercase">Orders</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-amber-800 uppercase">Commission</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-amber-800 uppercase">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.length === 0 && (
                          <tr><td colSpan={8} className="text-center py-12 text-stone-400 text-sm">No users found</td></tr>
                        )}
                        {filteredUsers.map((u, i) => {
                          const uOrders = ordersForUser(u);
                          const uCommission = uOrders.reduce((sum, o) => sum + (Number(o.shopCommissionInr) || 0), 0);
                          const isExpanded = expandedUserId === u.id;
                          return (
                            <React.Fragment key={u.id}>
                              <tr className={i % 2 === 0 ? 'bg-white/60' : 'bg-amber-50/40'}>
                                <td className="px-4 py-3">
                                  <p className="font-semibold text-stone-800">{u.name || '-'}</p>
                                  <p className="text-xs text-stone-500 font-mono">{u.id}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-stone-100 text-stone-700">{u.role || '-'}</span>
                                </td>
                                <td className="px-4 py-3 text-stone-700">
                                  <p>{u.email || '-'}</p>
                                  <p className="text-xs text-stone-500">{u.phone || '-'}</p>
                                </td>
                                <td className="px-4 py-3 text-stone-700">
                                  <p className="text-xs">shopName: {u.shopName || '-'}</p>
                                  <p className="text-xs">shopId: {u.shopId || '-'}</p>
                                </td>
                                <td className="px-4 py-3">{kycBadge(u.kycStatus)}</td>
                                <td className="px-4 py-3 text-right font-semibold text-stone-700">{uOrders.length}</td>
                                <td className="px-4 py-3 text-right font-bold text-amber-800">{fmtInr(uCommission)}</td>
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() => setExpandedUserId(isExpanded ? null : u.id)}
                                    className="px-2 py-1 rounded-lg text-xs font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200"
                                  >
                                    {isExpanded ? 'Hide' : 'Details'}
                                  </button>
                                </td>
                              </tr>

                              {isExpanded && (
                                <tr className="bg-white">
                                  <td colSpan={8} className="px-4 py-4 border-t border-amber-100">
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                      <DetailGrid
                                        title="User Details"
                                        rows={[
                                          { label: 'Name', value: maskedValue('name', u.name) },
                                          { label: 'User ID', value: maskedValue('id', u.id) },
                                          { label: 'UID', value: maskedValue('uid', u.uid) },
                                          { label: 'Role', value: maskedValue('role', u.role) },
                                          { label: 'Email', value: maskedValue('email', u.email) },
                                          { label: 'Phone', value: maskedValue('phone', u.phone) },
                                          { label: 'Shop Name', value: maskedValue('shopName', u.shopName) },
                                          { label: 'Shop ID', value: maskedValue('shopId', u.shopId) },
                                          { label: 'Owner Code', value: maskedValue('ownerCode', u.ownerCode) },
                                          { label: 'Customer ID', value: maskedValue('bizCustomerId', u.bizCustomerId) },
                                          { label: 'Business Shop ID', value: maskedValue('bizShopId', u.bizShopId) },
                                          { label: 'City', value: maskedValue('city', u.city) },
                                          { label: 'State', value: maskedValue('state', u.state) },
                                          { label: 'Country', value: maskedValue('country', u.country) },
                                          { label: 'KYC Status', value: maskedValue('kycStatus', u.kycStatus) },
                                          { label: 'Shop Verification', value: maskedValue('shopVerificationStatus', u.shopVerificationStatus) },
                                          { label: 'Shop Verification Note', value: maskedValue('shopVerificationNote', u.shopVerificationNote) },
                                          { label: 'Phone Verified', value: maskedValue('phoneVerified', u.phoneVerified) },
                                          { label: 'Gold Purchased (g)', value: maskedValue('totalGoldPurchasedGrams', Number(u.totalGoldPurchasedGrams || 0).toFixed(4)) },
                                          { label: 'Silver Purchased (g)', value: maskedValue('totalSilverPurchasedGrams', Number(u.totalSilverPurchasedGrams || 0).toFixed(4)) },
                                          { label: 'Total Invested', value: fmtInr(Number(u.totalInvestedInr || 0)) },
                                          { label: 'Created At', value: maskedValue('createdAt', u.createdAt) },
                                          { label: 'Updated At', value: maskedValue('updatedAt', u.updatedAt) },
                                        ]}
                                      />

                                      <div className="rounded-2xl border border-amber-100 bg-white p-3">
                                        <p className="text-xs font-bold text-amber-800 uppercase mb-2">All Orders For User ({uOrders.length})</p>
                                        <div className="overflow-x-auto max-h-[320px]">
                                          <table className="w-full text-xs min-w-[1100px]">
                                            <thead>
                                              <tr className="border-b border-amber-100">
                                                <th className="text-left py-1 pr-2">Date</th>
                                                <th className="text-left py-1 pr-2">Order ID</th>
                                                <th className="text-left py-1 pr-2">Type</th>
                                                <th className="text-left py-1 pr-2">Metal</th>
                                                <th className="text-right py-1 pr-2">Grams</th>
                                                <th className="text-right py-1 pr-2">Market/g</th>
                                                <th className="text-right py-1 pr-2">Order/g</th>
                                                <th className="text-right py-1 pr-2">Commission</th>
                                                <th className="text-right py-1 pr-2">Total</th>
                                                <th className="text-left py-1 pr-2">Status</th>
                                                <th className="text-left py-1 pr-2">Payout</th>
                                                <th className="text-left py-1 pr-2">Payment ID</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {uOrders.map((o) => (
                                                <tr key={o.id} className="border-b border-stone-100">
                                                  <td className="py-1 pr-2">{fmtDate(o.createdAt)}</td>
                                                  <td className="py-1 pr-2 font-mono">{o.id}</td>
                                                  <td className="py-1 pr-2">{o.type || '-'}</td>
                                                  <td className="py-1 pr-2">{o.metal || '-'} {o.purity ? `(${o.purity})` : ''}</td>
                                                  <td className="py-1 pr-2 text-right">{Number(o.grams || 0).toFixed(4)}</td>
                                                  <td className="py-1 pr-2 text-right">{fmtInr(Number(o.marketRatePerGram || 0), false)}</td>
                                                  <td className="py-1 pr-2 text-right">{fmtInr(Number(o.ratePerGram || 0), false)}</td>
                                                  <td className="py-1 pr-2 text-right">{fmtInr(Number(o.shopCommissionInr || 0))}</td>
                                                  <td className="py-1 pr-2 text-right">{fmtInr(Number(o.totalAmountInr || 0))}</td>
                                                  <td className="py-1 pr-2">{o.status || '-'}</td>
                                                  <td className="py-1 pr-2">{o.bullionPayoutStatus || '-'}</td>
                                                  <td className="py-1 pr-2">{o.razorpayPaymentId || '-'}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {tab === 'orders' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
                  <CardStat label="Platform Orders" value={String(orders.length)} />
                  <CardStat label="Total Commission" value={fmtInr(totalCommission)} valueClass="text-amber-800" />
                  <CardStat label="Pending Commission" value={fmtInr(pendingCommission)} valueClass="text-red-700" />
                  <CardStat label="Settled Commission" value={fmtInr(settledCommission)} valueClass="text-green-700" />
                  <CardStat label="Gold/Silver Comm." value={`${fmtInr(commissionByMetal.gold)} / ${fmtInr(commissionByMetal.silver)}`} valueClass="text-stone-700" />
                </div>

                <div className="rounded-3xl overflow-hidden shadow-sm border border-amber-100 bg-white/90 backdrop-blur">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[1800px]">
                      <thead>
                        <tr style={{ background: 'linear-gradient(90deg,rgba(253,243,212,0.9),rgba(253,243,212,0.5))' }}>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-amber-800 uppercase">Date</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-amber-800 uppercase">Order ID</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-amber-800 uppercase">Customer</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-amber-800 uppercase">UserId</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-amber-800 uppercase">CustomerUid</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-amber-800 uppercase">Shop</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-amber-800 uppercase">ShopId</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-amber-800 uppercase">Type</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-amber-800 uppercase">Metal</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-amber-800 uppercase">Grams</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-amber-800 uppercase">Market/g</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-amber-800 uppercase">Order/g</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-amber-800 uppercase">Commission/g</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-amber-800 uppercase">Commission</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-amber-800 uppercase">Total</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-amber-800 uppercase">Status</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-amber-800 uppercase">Payout</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-amber-800 uppercase">Payment ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.length === 0 && (
                          <tr><td colSpan={18} className="text-center py-12 text-stone-400 text-sm">No orders found</td></tr>
                        )}
                        {filteredOrders.map((o, i) => (
                          <tr key={o.id} className={i % 2 === 0 ? 'bg-white/60' : 'bg-amber-50/40'}>
                            <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{fmtDate(o.createdAt)}</td>
                            <td className="px-4 py-3 font-mono text-xs text-stone-700">{o.id}</td>
                            <td className="px-4 py-3 text-stone-700">{o.customerName || o.customerEmail || '-'}</td>
                            <td className="px-4 py-3 font-mono text-xs text-stone-600">{o.userId || '-'}</td>
                            <td className="px-4 py-3 font-mono text-xs text-stone-600">{o.customerUid || '-'}</td>
                            <td className="px-4 py-3 text-stone-700">{o.shopName || '-'}</td>
                            <td className="px-4 py-3 font-mono text-xs text-stone-600">{o.shopId || '-'}</td>
                            <td className="px-4 py-3 font-semibold text-stone-700">{o.type || '-'} <span className="text-xs text-stone-400">{o.status || ''}</span></td>
                            <td className="px-4 py-3 text-stone-700">{o.metal || '-'} {o.purity ? `(${o.purity})` : ''}</td>
                            <td className="px-4 py-3 text-right text-stone-700">{Number(o.grams || 0).toFixed(4)}</td>
                            <td className="px-4 py-3 text-right text-stone-700">{fmtInr(Number(o.marketRatePerGram || 0), false)}</td>
                            <td className="px-4 py-3 text-right text-stone-700">{fmtInr(Number(o.ratePerGram || 0), false)}</td>
                            <td className="px-4 py-3 text-right text-stone-700">{fmtInr(Number(o.commissionPerGram || 0), false)}</td>
                            <td className="px-4 py-3 text-right font-bold text-amber-800">{fmtInr(Number(o.shopCommissionInr || 0))}</td>
                            <td className="px-4 py-3 text-right font-bold text-stone-800">{fmtInr(Number(o.totalAmountInr || 0))}</td>
                            <td className="px-4 py-3 text-xs font-semibold text-stone-600">{o.status || '-'}</td>
                            <td className="px-4 py-3 text-xs font-semibold text-stone-600">{o.bullionPayoutStatus || '-'}</td>
                            <td className="px-4 py-3 text-xs text-stone-600">{o.razorpayPaymentId || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {tab === 'stats' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <CardStat label="Total Shops" value={String(shops.length)} />
                <CardStat label="Total Users" value={String(users.length)} />
                <CardStat label="Customers" value={String(users.filter((u) => u.role === 'CUSTOMER').length)} />
                <CardStat label="Owners" value={String(users.filter((u) => u.role === 'OWNER').length)} />
                <CardStat label="Staff" value={String(users.filter((u) => u.role === 'STAFF').length)} />
                <CardStat label="Platform Orders" value={String(orders.length)} />
                <CardStat label="Total Commission" value={fmtInr(totalCommission)} valueClass="text-amber-800" />
                <CardStat label="Pending Commission" value={fmtInr(pendingCommission)} valueClass="text-red-700" />
                <CardStat label="Settled Commission" value={fmtInr(settledCommission)} valueClass="text-green-700" />
                <CardStat label="Gold Commission" value={fmtInr(commissionByMetal.gold)} valueClass="text-amber-800" />
                <CardStat label="Silver Commission" value={fmtInr(commissionByMetal.silver)} valueClass="text-slate-700" />
                <CardStat label="Pending Shop Verification" value={String(pendingShops.length)} valueClass="text-red-700" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const CardStat: React.FC<{ label: string; value: string; valueClass?: string }> = ({ label, value, valueClass }) => (
  <div className="rounded-2xl p-4 bg-white border border-amber-100 shadow-sm">
    <p className="text-xs text-stone-500">{label}</p>
    <p className={`text-xl font-black mt-1 ${valueClass ?? 'text-stone-800'}`}>{value}</p>
  </div>
);
