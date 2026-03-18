/**
 * SuperAdmin Dashboard
 * Access: SUPER_ADMIN role only
 * Shows: all registered shops, all customers, platform-level stats
 */
import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

interface ShopRow {
  id: string;
  name: string;
  ownerUid: string;
  ownerEmail?: string;
  bizShopId?: string;
  ownerCode?: string;
  verificationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  verificationRequestedAt?: any;
  verificationReviewedAt?: any;
  verificationReviewedBy?: string;
  verificationNote?: string;
  verified?: boolean;
  createdAt?: string;
  city?: string;
  phone?: string;
}

interface CustomerRow {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  bizCustomerId?: string;
  shopName?: string;
  shopId?: string;
  createdAt?: string;
  kycStatus?: string;
}

interface PlatformOrderRow {
  id: string;
  type: 'BUY' | 'SELL';
  status?: string;
  metal?: string;
  purity?: number;
  grams?: number;
  ratePerGram?: number;
  marketRatePerGram?: number;
  totalAmountInr?: number;
  shopCommissionInr?: number;
  bullionPayoutStatus?: string;
  customerName?: string;
  customerEmail?: string;
  shopName?: string;
  createdAt?: any;
}

interface Tab { key: 'shops' | 'customers' | 'orders' | 'stats'; label: string }
const TABS: Tab[] = [
  { key: 'shops',     label: 'Shops'     },
  { key: 'customers', label: 'Customers' },
  { key: 'orders',    label: 'Orders'    },
  { key: 'stats',     label: 'Platform'  },
];

export function SuperAdmin() {
  const { userProfile, signOut } = useAuth();
  const [tab, setTab]           = useState<Tab['key']>('shops');
  const [shops, setShops]       = useState<ShopRow[]>([]);
  const [customers, setCust]    = useState<CustomerRow[]>([]);
  const [orders, setOrders]     = useState<PlatformOrderRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [loadErr, setLoadErr]   = useState('');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [verifyNote, setVerifyNote] = useState<Record<string, string>>({});

  // Guard — should never render for non-super-admin
  if (userProfile?.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center space-y-3 p-8">
          <div className="text-6xl">🔒</div>
          <h2 className="text-2xl font-bold text-stone-700">Access Denied</h2>
          <p className="text-stone-500 text-sm">This area is restricted to super administrators.</p>
          <button onClick={() => { window.location.hash = '#/'; }}
            className="mt-4 px-6 py-2 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 transition-colors">
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
      // Load all shops
      const shopsSnap = await getDocs(query(collection(db, 'shops'), orderBy('name')));
      const shopList: ShopRow[] = shopsSnap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<ShopRow, 'id'>),
      }));
      setShops(shopList);

      // Load all users — SUPER_ADMIN has read access via Firestore rules.
      // We read shopName directly from the user profile (stored during sign-up)
      // rather than doing N individual shop lookups.
      const usersSnap = await getDocs(collection(db, 'users'));
      console.log('[SuperAdmin] Loaded', usersSnap.docs.length, 'user docs');

      const custList: CustomerRow[] = [];
      for (const ud of usersSnap.docs) {
        const data = ud.data();
        if (data.role === 'CUSTOMER') {
          custList.push({
            id: ud.id,
            name: data.name ?? '',
            email: data.email ?? '',
            phone: data.phone ?? '',
            bizCustomerId: data.bizCustomerId ?? '',
            shopId: data.shopId ?? '',
            // shopName is stored directly on the user profile (lowercase)
            shopName: data.shopName ?? '',
            createdAt: data.createdAt ?? '',
            kycStatus: data.kycStatus ?? 'PENDING',
          });
        }
      }
      console.log('[SuperAdmin] Found', custList.length, 'customers');
      setCust(custList);

      const ordersSnap = await getDocs(query(collection(db, 'goldOnlineOrders'), orderBy('createdAt', 'desc')));
      const orderRows = ordersSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as PlatformOrderRow));
      setOrders(orderRows);
    } catch (err: any) {
      console.error('[SuperAdmin] loadData error:', err?.code, err?.message);
      setLoadErr(err?.message ?? 'Failed to load data. Check Firestore rules are deployed.');
    } finally {
      setLoading(false);
    }
  }

  const filteredShops = shops.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.bizShopId?.toLowerCase().includes(search.toLowerCase()) ||
    s.city?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCust = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.bizCustomerId?.toLowerCase().includes(search.toLowerCase()) ||
    c.shopName?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredOrders = orders.filter(o => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (o.customerName ?? '').toLowerCase().includes(q)
      || (o.customerEmail ?? '').toLowerCase().includes(q)
      || (o.shopName ?? '').toLowerCase().includes(q)
      || (o.metal ?? '').toLowerCase().includes(q)
      || (o.type ?? '').toLowerCase().includes(q)
      || (o.status ?? '').toLowerCase().includes(q);
  });

  const totalCommission = orders.reduce((sum, o) => sum + (Number(o.shopCommissionInr) || 0), 0);
  const unsettledCommission = orders.reduce((sum, o) => {
    const isBuy = (o.type ?? '').toUpperCase() === 'BUY';
    const unsettled = (o.bullionPayoutStatus ?? 'UNSETTLED').toUpperCase() !== 'SETTLED';
    return isBuy && unsettled ? sum + (Number(o.shopCommissionInr) || 0) : sum;
  }, 0);

  const pendingShops = shops.filter((s) => (s.verificationStatus ?? 'PENDING') === 'PENDING');

  const setShopVerification = async (shop: ShopRow, status: 'APPROVED' | 'REJECTED') => {
    if (!userProfile?.uid) return;
    setActionLoading((prev) => ({ ...prev, [shop.id]: true }));
    try {
      const note = (verifyNote[shop.id] ?? '').trim();
      await updateDoc(doc(db, 'shops', shop.id), {
        verificationStatus: status,
        verificationReviewedAt: serverTimestamp(),
        verificationReviewedBy: userProfile.uid,
        verificationNote: note,
        verified: status === 'APPROVED',
        updatedAt: serverTimestamp(),
      });

      if (shop.ownerUid) {
        await updateDoc(doc(db, 'users', shop.ownerUid), {
          shopVerificationStatus: status,
          shopVerificationReviewedAt: serverTimestamp(),
          shopVerificationReviewedBy: userProfile.uid,
          shopVerificationNote: note,
          shopVerified: status === 'APPROVED',
          updatedAt: serverTimestamp(),
        });
      }

      await loadData();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to update verification status.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [shop.id]: false }));
    }
  };

  const kycBadge = (s?: string) => {
    const base = 'text-xs px-2 py-0.5 rounded-full font-medium';
    if (s === 'VERIFIED')  return <span className={`${base} bg-green-100 text-green-700`}>Verified</span>;
    if (s === 'REJECTED')  return <span className={`${base} bg-red-100 text-red-700`}>Rejected</span>;
    return                        <span className={`${base} bg-amber-100 text-amber-700`}>Pending</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50 to-yellow-50">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-md" style={{ background:'rgba(255,251,235,0.92)', borderBottom:'1px solid rgba(251,191,36,0.25)' }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-amber-900">Super Admin Console</h1>
            <p className="text-xs text-amber-600">Bizmation Platform — Full Visibility</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-stone-500 hidden sm:block">{userProfile?.email}</span>
            <button onClick={signOut}
              className="px-3 py-1.5 text-xs rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium transition-colors">
              Sign Out
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-4 pb-0 flex gap-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setSearch(''); }}
              className="px-4 py-2 text-sm font-semibold rounded-t-xl transition-all border-b-2"
              style={tab === t.key
                ? { color:'#92400e', borderColor:'#f59e0b', background:'rgba(253,243,212,0.6)' }
                : { color:'#a8a29e', borderColor:'transparent' }}>
              {t.label}
              {t.key === 'shops'     && <span className="ml-1.5 text-xs bg-amber-200 text-amber-800 rounded-full px-1.5 py-px">{shops.length}</span>}
              {t.key === 'customers' && <span className="ml-1.5 text-xs bg-amber-200 text-amber-800 rounded-full px-1.5 py-px">{customers.length}</span>}
              {t.key === 'orders'    && <span className="ml-1.5 text-xs bg-amber-200 text-amber-800 rounded-full px-1.5 py-px">{orders.length}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
            <p className="text-amber-700 text-sm">Loading platform data…</p>
          </div>
        ) : loadErr ? (
          <div className="rounded-2xl p-6 bg-red-50 border border-red-200 text-red-700 text-sm">
            <p className="font-semibold mb-1">Failed to load data</p>
            <p className="font-mono text-xs">{loadErr}</p>
            <p className="mt-2 text-xs text-red-500">Make sure Firestore rules are deployed:<br />
              <code className="bg-red-100 px-1 rounded">firebase deploy --only firestore:rules</code>
            </p>
            <button onClick={loadData} className="mt-3 px-4 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold transition-colors">Retry</button>
          </div>
        ) : (
          <>
            {/* Search bar */}
            {tab !== 'stats' && (
              <div className="mb-5">
                <input
                  type="search"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={`Search ${tab}…`}
                  className="w-full max-w-md rounded-2xl border border-amber-200 bg-white/80 px-4 py-2.5 text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>
            )}

            {/* ── Shops Tab ──────────────────────────────────────────── */}
            {tab === 'shops' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-2xl p-4 bg-white border border-amber-100">
                    <p className="text-xs text-stone-500">Total Shops</p>
                    <p className="text-xl font-black text-stone-800 mt-1">{shops.length}</p>
                  </div>
                  <div className="rounded-2xl p-4 bg-white border border-amber-100">
                    <p className="text-xs text-stone-500">Pending Verification</p>
                    <p className="text-xl font-black text-red-700 mt-1">{pendingShops.length}</p>
                  </div>
                  <div className="rounded-2xl p-4 bg-white border border-amber-100">
                    <p className="text-xs text-stone-500">Approved Shops</p>
                    <p className="text-xl font-black text-green-700 mt-1">{shops.filter(s => s.verificationStatus === 'APPROVED').length}</p>
                  </div>
                </div>

                <div className="rounded-3xl overflow-hidden shadow-sm border border-amber-100 bg-white/80 backdrop-blur">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background:'linear-gradient(90deg,rgba(253,243,212,0.9),rgba(253,243,212,0.5))' }}>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-amber-800 uppercase tracking-wider">Shop Name</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-amber-800 uppercase tracking-wider">Biz ID</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-amber-800 uppercase tracking-wider">Owner Code</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-amber-800 uppercase tracking-wider">City</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-amber-800 uppercase tracking-wider">Verification</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-amber-800 uppercase tracking-wider">Review Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredShops.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-12 text-stone-400 text-sm">No shops found</td></tr>
                    )}
                    {filteredShops.map((s, i) => (
                      <tr key={s.id} className={i % 2 === 0 ? 'bg-white/60' : 'bg-amber-50/40'}>
                        <td className="px-5 py-3 font-medium text-stone-800">{s.name || '—'}</td>
                        <td className="px-5 py-3 font-mono text-xs text-amber-700">{s.bizShopId || '—'}</td>
                        <td className="px-5 py-3 font-mono text-xs text-amber-700">{s.ownerCode || '—'}</td>
                        <td className="px-5 py-3 text-stone-600">{s.city || '—'}</td>
                        <td className="px-5 py-3">
                          {(s.verificationStatus ?? 'PENDING') === 'APPROVED' && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">Approved</span>}
                          {(s.verificationStatus ?? 'PENDING') === 'REJECTED' && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">Rejected</span>}
                          {(s.verificationStatus ?? 'PENDING') === 'PENDING' && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">Pending</span>}
                        </td>
                        <td className="px-5 py-3">
                          {(s.verificationStatus ?? 'PENDING') === 'PENDING' ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                placeholder="Review note (optional)"
                                value={verifyNote[s.id] ?? ''}
                                onChange={(e) => setVerifyNote((prev) => ({ ...prev, [s.id]: e.target.value }))}
                                className="w-full rounded-lg border border-amber-200 bg-white px-2 py-1 text-xs text-stone-700"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setShopVerification(s, 'APPROVED')}
                                  disabled={!!actionLoading[s.id]}
                                  className="px-2 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-60"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => setShopVerification(s, 'REJECTED')}
                                  disabled={!!actionLoading[s.id]}
                                  className="px-2 py-1 rounded-lg text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-60"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-stone-500">Reviewed</p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}

            {/* ── Customers Tab ──────────────────────────────────────── */}
            {tab === 'customers' && (
              <div className="rounded-3xl overflow-hidden shadow-sm border border-amber-100 bg-white/80 backdrop-blur">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background:'linear-gradient(90deg,rgba(253,243,212,0.9),rgba(253,243,212,0.5))' }}>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-amber-800 uppercase tracking-wider">Name</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-amber-800 uppercase tracking-wider">Cust ID</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-amber-800 uppercase tracking-wider">Shop</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-amber-800 uppercase tracking-wider">Phone</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-amber-800 uppercase tracking-wider">KYC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCust.length === 0 && (
                      <tr><td colSpan={5} className="text-center py-12 text-stone-400 text-sm">No customers found</td></tr>
                    )}
                    {filteredCust.map((c, i) => (
                      <tr key={c.id} className={i % 2 === 0 ? 'bg-white/60' : 'bg-amber-50/40'}>
                        <td className="px-5 py-3 font-medium text-stone-800">{c.name || '—'}</td>
                        <td className="px-5 py-3 font-mono text-xs text-amber-700">{c.bizCustomerId || '—'}</td>
                        <td className="px-5 py-3 text-stone-600">{c.shopName || '—'}</td>
                        <td className="px-5 py-3 text-stone-600">{c.phone || '—'}</td>
                        <td className="px-5 py-3">{kycBadge(c.kycStatus)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Orders Tab ─────────────────────────────────────────── */}
            {tab === 'orders' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-2xl p-4 bg-white border border-amber-100">
                    <p className="text-xs text-stone-500">Total Platform Orders</p>
                    <p className="text-xl font-black text-stone-800 mt-1">{orders.length}</p>
                  </div>
                  <div className="rounded-2xl p-4 bg-white border border-amber-100">
                    <p className="text-xs text-stone-500">Shop Commission (All Time)</p>
                    <p className="text-xl font-black text-amber-800 mt-1">₹{Math.round(totalCommission).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="rounded-2xl p-4 bg-white border border-amber-100">
                    <p className="text-xs text-stone-500">Commission Pending Payout</p>
                    <p className="text-xl font-black text-red-700 mt-1">₹{Math.round(unsettledCommission).toLocaleString('en-IN')}</p>
                  </div>
                </div>

                <div className="rounded-3xl overflow-hidden shadow-sm border border-amber-100 bg-white/80 backdrop-blur">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background:'linear-gradient(90deg,rgba(253,243,212,0.9),rgba(253,243,212,0.5))' }}>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-amber-800 uppercase tracking-wider">Date</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-amber-800 uppercase tracking-wider">Customer</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-amber-800 uppercase tracking-wider">Shop</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-amber-800 uppercase tracking-wider">Type</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-amber-800 uppercase tracking-wider">Metal</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-amber-800 uppercase tracking-wider">Grams</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-amber-800 uppercase tracking-wider">Market/g</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-amber-800 uppercase tracking-wider">Order/g</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-amber-800 uppercase tracking-wider">Commission</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-amber-800 uppercase tracking-wider">Order Total</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-amber-800 uppercase tracking-wider">Payout</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.length === 0 && (
                          <tr><td colSpan={11} className="text-center py-12 text-stone-400 text-sm">No orders found</td></tr>
                        )}
                        {filteredOrders.map((o, i) => {
                          const d = o.createdAt?.seconds
                            ? new Date(o.createdAt.seconds * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                            : '—';
                          return (
                            <tr key={o.id} className={i % 2 === 0 ? 'bg-white/60' : 'bg-amber-50/40'}>
                              <td className="px-4 py-3 text-stone-600">{d}</td>
                              <td className="px-4 py-3 text-stone-700">{o.customerName || o.customerEmail || '—'}</td>
                              <td className="px-4 py-3 text-stone-700">{o.shopName || '—'}</td>
                              <td className="px-4 py-3 font-semibold text-stone-700">{o.type || '—'} <span className="text-xs text-stone-400">{o.status || ''}</span></td>
                              <td className="px-4 py-3 text-stone-700">{o.metal || '—'} {o.purity ? `(${o.purity})` : ''}</td>
                              <td className="px-4 py-3 text-right text-stone-700">{Number(o.grams || 0).toFixed(3)}</td>
                              <td className="px-4 py-3 text-right text-stone-700">₹{Math.round(Number(o.marketRatePerGram || 0)).toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3 text-right text-stone-700">₹{Math.round(Number(o.ratePerGram || 0)).toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3 text-right font-bold text-amber-800">₹{Math.round(Number(o.shopCommissionInr || 0)).toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3 text-right font-bold text-stone-800">₹{Math.round(Number(o.totalAmountInr || 0)).toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3 text-xs font-semibold text-stone-600">{o.bullionPayoutStatus || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ── Platform Stats Tab ─────────────────────────────────── */}
            {tab === 'stats' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: 'Total Shops',       value: shops.length,           icon: '🏪', color: '#fde68a' },
                  { label: 'Total Customers',    value: customers.length,       icon: '👥', color: '#bfdbfe' },
                  { label: 'Verified KYC',       value: customers.filter(c=>c.kycStatus==='VERIFIED').length, icon: '✅', color: '#bbf7d0' },
                  { label: 'Pending KYC',        value: customers.filter(c=>c.kycStatus!=='VERIFIED').length, icon: '⏳', color: '#fed7aa' },
                  { label: 'Avg Cust/Shop',      value: shops.length ? (customers.length / shops.length).toFixed(1) : '0', icon: '📊', color: '#e9d5ff' },
                  { label: 'Platform Orders',    value: orders.length, icon: '🧾', color: '#fecaca' },
                  { label: 'Total Commission',   value: '₹' + Math.round(totalCommission).toLocaleString('en-IN'), icon: '💸', color: '#bbf7d0' },
                ].map(stat => (
                  <div key={stat.label} className="rounded-3xl p-6 flex items-center gap-4 shadow-sm border border-amber-100 bg-white/80 backdrop-blur">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0" style={{ background: stat.color }}>
                      {stat.icon}
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-stone-800">{stat.value}</p>
                      <p className="text-xs text-stone-500 font-medium">{stat.label}</p>
                    </div>
                  </div>
                ))}

                {/* Shops list mini */}
                <div className="col-span-full rounded-3xl p-5 shadow-sm border border-amber-100 bg-white/80 backdrop-blur">
                  <h3 className="text-sm font-semibold text-stone-700 mb-3">All Registered Shops</h3>
                  <div className="flex flex-wrap gap-2">
                    {shops.map(s => (
                      <span key={s.id} className="px-3 py-1 rounded-full text-xs bg-amber-100 text-amber-800 font-medium">{s.name}</span>
                    ))}
                    {shops.length === 0 && <p className="text-stone-400 text-xs">No shops registered yet.</p>}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
