/**
 * Parties Management Page
 *
 * For OWNER/STAFF:
 *   - Customers tab -> queries Firestore `users` where shopName == owner's shopName
 *   - Wholesalers tab -> queries Firestore `shops` collection
 * Customer rows expand to show their goldOnlineOrders.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  collection, query, where, getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Users, Store, Search, Phone, Mail, MapPin,
  Building2, ChevronDown, ChevronUp, Loader2,
  ShoppingCart, RefreshCw, AlertCircle, Shield,
} from 'lucide-react';

// --- Types ------------------------------------------------------------------

interface CustomerParty {
  uid: string;
  name: string;
  email: string;
  phone: string;
  city?: string;
  state?: string;
  kycStatus?: string;
  shopName?: string;
  role: string;
  panNumber?: string;
  aadhaarLast4?: string;
  totalGoldPurchasedGrams?: number;
  totalSilverPurchasedGrams?: number;
  totalInvestedInr?: number;
  createdAt?: any;
  phoneVerified?: boolean;
}

interface ShopParty {
  id: string;
  name: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  gstNumber?: string;
  panNumber?: string;
  createdAt?: any;
}

interface Order {
  id: string;
  type: 'BUY' | 'SELL';
  metal: string;
  purity: number;
  grams: number;
  ratePerGram: number;
  totalAmountInr: number;
  status: string;
  createdAt: any;
  razorpayPaymentId?: string;
}

// --- Main Component ---------------------------------------------------------

export const Parties: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [debugRates, setDebugRates] = useState<any>(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugError, setDebugError] = useState('');
  const [shopFreeze, setShopFreeze] = useState<boolean>(false);
  const [freezeLoading, setFreezeLoading] = useState(false);
  // Fetch shop freeze status
  useEffect(() => {
    if (!userProfile?.role || userProfile.role !== 'OWNER' || !currentUser) return;
    const shopId = currentUser.uid;
    import('firebase/firestore').then(({ doc, getDoc }) => {
      getDoc(doc(db, 'shops', shopId)).then(snap => {
        setShopFreeze(!!snap.data()?.transactionsFrozen);
      });
    });
  }, [userProfile?.role, currentUser]);
  // Toggle freeze
  const handleFreezeToggle = async () => {
    if (!currentUser) return;
    setFreezeLoading(true);
    const shopId = currentUser.uid;
    const newVal = !shopFreeze;
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'shops', shopId), { transactionsFrozen: newVal });
      setShopFreeze(newVal);
    } catch (e: any) {
      alert('Failed to update freeze status: ' + (e?.message ?? ''));
    } finally {
      setFreezeLoading(false);
    }
  };
  // Price debug fetch — uses real-time sources:
  //   XAU/USD, XAG/USD  → Swissquote via corsproxy (real-time)
  //   USD/INR            → exchangerate.fun (real-time, fallback: fawazahmed0 CDN)
  //   XAU/INR, XAG/INR  → fawazahmed0 CDN (direct INR values used in UI calculations)
  const fetchDebugRates = async () => {
    setDebugLoading(true); setDebugError('');
    try {
      const { fetchLiveMetalRates } = await import('../lib/goldPrices');
      const bust = `?_=${Date.now()}`;

      // Helper: parse Swissquote mid-price from proxied response
      const parseSQMid = (data: any[]): number | null => {
        if (!Array.isArray(data) || data.length === 0) return null;
        for (const platform of data) {
          const profiles: any[] = platform.spreadProfilePrices || [];
          for (const name of ['standard', 'premium', 'prime']) {
            const p = profiles.find((x: any) => x.spreadProfile === name);
            if (p?.bid != null && p?.ask != null) return (p.bid + p.ask) / 2;
          }
        }
        const first = data[0]?.spreadProfilePrices?.[0];
        return (first?.bid != null && first?.ask != null) ? (first.bid + first.ask) / 2 : null;
      };

      // Fetch all sources in parallel (Swissquote primary for USD prices)
      const PROXY = 'https://corsproxy.io/?url=';
      const [xauCdn, xagCdn, sqXauRaw, sqXagRaw, erFun] = await Promise.all([
        fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json' + bust, { cache: 'no-store' }).then(r => r.json()).catch(() => null),
        fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xag.json' + bust, { cache: 'no-store' }).then(r => r.json()).catch(() => null),
        fetch(PROXY + encodeURIComponent('https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD') + '&_=' + Date.now(), { cache: 'no-store' }).then(r => r.json()).catch(() => null),
        fetch(PROXY + encodeURIComponent('https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAG/USD') + '&_=' + Date.now(), { cache: 'no-store' }).then(r => r.json()).catch(() => null),
        fetch('https://api.exchangerate.fun/latest?base=USD' + '&_=' + Date.now(), { cache: 'no-store' }).then(r => r.json()).catch(() => null),
      ]);

      // USD/INR: prefer exchangerate.fun, fallback to CDN
      const usdInrEr = erFun?.rates?.INR;
      const usdInrCdn = (await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json' + bust, { cache: 'no-store' }).then(r => r.json()).catch(() => null))?.usd?.inr;
      const usdInr = (usdInrEr && isFinite(usdInrEr)) ? usdInrEr : usdInrCdn;

      // Swissquote real-time XAU/USD and XAG/USD (preferred)
      const xauUsdSQ = sqXauRaw ? parseSQMid(sqXauRaw) : null;
      const xagUsdSQ = sqXagRaw ? parseSQMid(sqXagRaw) : null;

      // If Swissquote provided valid mid prices, prefer them over CDN daily values
      const xauUsdPreferred = (xauUsdSQ && isFinite(xauUsdSQ)) ? xauUsdSQ : xauCdn?.xau?.usd;
      const xagUsdPreferred = (xagUsdSQ && isFinite(xagUsdSQ)) ? xagUsdSQ : xagCdn?.xag?.usd;

      // Compute price-per-gram (INR) derived from Swissquote USD spot and exchangerate.fun
      const TROY_OZ_GRAMS = 31.1035;
      const IMPORT_DUTY = 1.09;
      let derivedGold24GramInr: number | null = null;
      if (xauUsdSQ && isFinite(xauUsdSQ) && isFinite(usdInr) && usdInr > 0) {
        derivedGold24GramInr = (xauUsdSQ * usdInr / TROY_OZ_GRAMS) * IMPORT_DUTY;
      }

      // Fetch backend rates (single source of truth). We'll compare backend 24K with Swissquote-derived 24K.
      const backendRates = await fetchLiveMetalRates().catch(() => null);
      const backendGold24 = backendRates?.find((r: any) => r.metalType === 'GOLD' && r.purity === 24)?.ratePerGram;

      // If both backend and Swissquote-derived exist, compare and auto-sync if they differ significantly
      const mismatchThresholdPercent = 0.5; // 0.5% allowed diff
      let syncAction = 'none';
      if (derivedGold24GramInr && isFinite(derivedGold24GramInr) && backendGold24 && isFinite(backendGold24)) {
        const diffPercent = Math.abs(backendGold24 - derivedGold24GramInr) / derivedGold24GramInr * 100;
        if (diffPercent > mismatchThresholdPercent) {
          // Force a backend reconcile to pull fresh Swissquote values and update DB
          try {
            const API_BASE = (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_URL) ? (import.meta as any).env.VITE_API_URL as string : '';
            const reconcilePath = '/api/gold-rates/reconcile?thresholdPercent=0';
            const reconcileUrl = API_BASE ? (API_BASE.replace(/\/$/, '') + reconcilePath) : reconcilePath;
            await fetch(reconcileUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' } , cache: 'no-store' , body: JSON.stringify({ thresholdPercent: 0 }) }).catch(() => null);
            // re-fetch backend rates after reconcile
            const refreshed = await fetchLiveMetalRates().catch(() => null);
            if (refreshed) {
              // replace backendRates
              // eslint-disable-next-line no-param-reassign
              // @ts-ignore
              backendRates.length = 0; backendRates.push(...refreshed);
              syncAction = 'reconciled';
            } else {
              syncAction = 'reconcile_failed';
            }
          } catch (reErr) {
            syncAction = 'reconcile_error';
          }
        } else {
          syncAction = 'matched';
        }
      }

      setDebugRates({
        xauUsd: xauUsdPreferred,
        xagUsd: xagUsdPreferred,
        usdInr,
        xauInr: xauCdn?.xau?.inr,
        xagInr: xagCdn?.xag?.inr,
        rates: backendRates || [],
        fetchedAt: new Date().toLocaleTimeString(),
        syncAction,
      });
    } catch (e: any) {
      setDebugError('Failed to fetch rates: ' + (e?.message ?? ''));
    } finally {
      setDebugLoading(false);
    }
  };
  useEffect(() => {
    if (userProfile?.role === 'OWNER') {
      fetchDebugRates();
      const timer = setInterval(fetchDebugRates, 10000);
      return () => clearInterval(timer);
    }
  }, [userProfile?.role]);

  const [customers, setCustomers]   = useState<CustomerParty[]>([]);
  const [shops, setShops]           = useState<ShopParty[]>([]);
  const [activeTab, setActiveTab]   = useState<'customers' | 'wholesalers'>('customers');
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  const [expandedUid, setExpandedUid]     = useState<string | null>(null);
  const [ordersMap, setOrdersMap]         = useState<Record<string, Order[]>>({});
  const [ordersLoading, setOrdersLoading] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    if (!currentUser || !userProfile) return;
    const shopName = userProfile.shopName ?? '';
    if (!shopName) {
      console.warn('[Parties] No shopName on owner profile - cannot filter customers');
      setCustomers([]);
      return;
    }
    console.log('[Parties] Fetching customers for shopName:', shopName);
    try {
      const q = query(
        collection(db, 'users'),
        where('shopName', '==', shopName),
        where('role', '==', 'CUSTOMER'),
      );
      const snap = await getDocs(q);
      const results = snap.docs.map(d => ({ uid: d.id, ...(d.data() as any) } as CustomerParty));
      console.log('[Parties] Customers fetched:', results.length, results.map(c => c.name));
      setCustomers(results);
    } catch (e: any) {
      console.error('[Parties] Error fetching customers:', e);
      setError('Failed to load customers. Check Firestore rules: ' + (e?.message ?? ''));
    }
  }, [currentUser, userProfile]);

  const fetchShops = useCallback(async () => {
    if (!currentUser) return;
    console.log('[Parties] Fetching shops from Firestore...');
    try {
      const snap = await getDocs(collection(db, 'shops'));
      const results = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as ShopParty));
      console.log('[Parties] Shops fetched:', results.length, results.map(s => s.name));
      setShops(results);
    } catch (e: any) {
      console.error('[Parties] Error fetching shops:', e);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!userProfile) return;
    setLoading(true);
    setError('');
    Promise.all([fetchCustomers(), fetchShops()]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.shopName]);

  const fetchOrdersFor = async (customer: CustomerParty) => {
    if (ordersMap[customer.uid] !== undefined) {
      setExpandedUid(prev => prev === customer.uid ? null : customer.uid);
      return;
    }
    setExpandedUid(customer.uid);
    setOrdersLoading(customer.uid);
    console.log('[Parties] Loading orders for customer:', customer.name, customer.uid);
    try {
      // Query orders by email only (consistent with how HomeLanding stores orders)
      const all: Record<string, Order> = {};
      if (customer.email) {
        const q = query(collection(db, 'goldOnlineOrders'), where('customerEmail', '==', customer.email));
        const s = await getDocs(q);
        s.docs.forEach(d => { all[d.id] = { id: d.id, ...(d.data() as any) }; });
        console.log('[Parties] Orders by email for', customer.name, ':', s.size);
      } else {
        console.warn('[Parties] Customer has no email — cannot load orders:', customer.name);
      }
      const sorted = Object.values(all).sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      console.log('[Parties] Total unique orders for', customer.name, ':', sorted.length);
      setOrdersMap(prev => ({ ...prev, [customer.uid]: sorted }));
    } catch (e: any) {
      console.error('[Parties] Error loading orders:', e);
      setOrdersMap(prev => ({ ...prev, [customer.uid]: [] }));
    } finally {
      setOrdersLoading(null);
    }
  };

  const filteredCustomers = customers.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) || c.email?.toLowerCase().includes(search.toLowerCase()),
  );
  const filteredShops = shops.filter(s =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.phone?.includes(search),
  );

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-gray-950 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 border-b border-amber-200 dark:border-yellow-900/30 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-amber-900 dark:text-white flex items-center gap-3">
              <Users className="text-amber-500 dark:text-yellow-400" size={30} />
              Parties
            </h1>
            <p className="text-amber-700/70 dark:text-gray-400 text-sm mt-1">
              {userProfile?.shopName ? 'Shop: ' + userProfile.shopName : 'Customers & Wholesalers'}
            </p>
          </div>
          <button
            onClick={() => { setLoading(true); Promise.all([fetchCustomers(), fetchShops()]).finally(() => setLoading(false)); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-all shadow-sm active:scale-95"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-5">
                {/* Owner Price Debug Panel */}
                {userProfile?.role === 'OWNER' && (
                  <div className="bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-700 rounded-2xl p-6 mb-6 shadow-sm">
                    <h2 className="text-lg font-black text-amber-900 dark:text-amber-400 mb-2 flex items-center gap-2">
                      <Shield size={20} className="text-amber-500" /> Price Debug Panel
                    </h2>
                    <div className="flex flex-wrap gap-6 items-center mb-3">
                      <div>
                        <span className="text-xs font-bold text-stone-500 dark:text-gray-400">XAU/USD:</span>
                        <span className="ml-2 font-mono text-base text-amber-700 dark:text-yellow-400">{debugRates?.xauUsd?.toFixed?.(2) ?? '—'}</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-stone-500 dark:text-gray-400">XAG/USD:</span>
                        <span className="ml-2 font-mono text-base text-amber-700 dark:text-yellow-400">{debugRates?.xagUsd?.toFixed?.(2) ?? '—'}</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-stone-500 dark:text-gray-400">USD/INR:</span>
                        <span className="ml-2 font-mono text-base text-green-700 dark:text-green-400">{debugRates?.usdInr?.toFixed?.(2) ?? '—'}</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-stone-500 dark:text-gray-400">XAU/INR:</span>
                        <span className="ml-2 font-mono text-base text-amber-700 dark:text-yellow-400">{debugRates?.xauInr?.toLocaleString?.('en-IN', { maximumFractionDigits: 0 }) ?? '—'}</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-stone-500 dark:text-gray-400">XAG/INR:</span>
                        <span className="ml-2 font-mono text-base text-amber-700 dark:text-yellow-400">{debugRates?.xagInr?.toLocaleString?.('en-IN', { maximumFractionDigits: 0 }) ?? '—'}</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-stone-500 dark:text-gray-400">Fetched:</span>
                        <span className="ml-2 font-mono text-xs text-stone-500">{debugRates?.fetchedAt ?? ''}</span>
                      </div>
                    </div>
                    <div className="mb-2">
                      <button onClick={fetchDebugRates} disabled={debugLoading} className="px-3 py-1.5 rounded bg-amber-500 text-white font-bold text-xs mr-2">
                        {debugLoading ? 'Refreshing…' : 'Manual Refresh'}
                      </button>
                      <span className="text-xs text-stone-400">Auto-refreshes every 10s</span>
                    </div>
                    {debugError && <div className="text-xs text-red-500 mb-2">{debugError}</div>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      {debugRates?.rates?.map?.((r: any) => (
                        <div key={r.metalType + r.purity} className="bg-amber-50 dark:bg-gray-800 rounded-xl p-3 border border-amber-100 dark:border-gray-700">
                          <div className="font-bold text-amber-700 dark:text-yellow-400 mb-1">{r.metalType} {r.purity}K</div>
                          <div className="text-xs text-stone-500 dark:text-gray-400">Per gram: <span className="font-mono text-base text-amber-900 dark:text-yellow-300">{r.ratePerGram?.toFixed?.(2)}</span></div>
                          <div className="text-xs text-stone-500 dark:text-gray-400">Display rate: <span className="font-mono">{r.displayRate?.toLocaleString?.('en-IN', { maximumFractionDigits: 0 })}</span></div>
                          <div className="text-xs text-stone-400 mt-1">Source: {r.source}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center gap-4">
                      <span className="text-xs font-bold text-stone-500 dark:text-gray-400">Freeze Transactions:</span>
                      <button onClick={handleFreezeToggle} disabled={freezeLoading} className={shopFreeze ? 'px-4 py-2 rounded bg-red-500 text-white font-bold text-xs' : 'px-4 py-2 rounded bg-green-500 text-white font-bold text-xs'}>
                        {freezeLoading ? 'Saving…' : shopFreeze ? 'Unfreeze (Allow Buy/Sell)' : 'Freeze (Pause Buy/Sell)'}
                      </button>
                      <span className={shopFreeze ? 'text-xs text-red-500 font-bold' : 'text-xs text-green-500 font-bold'}>
                        {shopFreeze ? 'Currently Paused' : 'Transactions Allowed'}
                      </span>
                    </div>
                  </div>
                )}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-3">
            <AlertCircle className="text-red-500 flex-shrink-0" size={18} />
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Customers', value: customers.length, icon: <Users size={20} className="text-blue-500" /> },
            { label: 'Wholesalers', value: shops.length, icon: <Store size={20} className="text-green-500" /> },
            { label: 'Shop', value: userProfile?.shopName ?? '-', icon: <Building2 size={20} className="text-amber-500" /> },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-gray-900 border border-amber-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                {s.icon}
              </div>
              <div>
                <p className="text-xs text-stone-500 dark:text-gray-400 font-medium">{s.label}</p>
                <p className="text-lg font-black text-stone-800 dark:text-white leading-tight">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <input
            type="text"
            placeholder="Search by name, phone or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-amber-200 dark:border-gray-700 text-stone-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 shadow-sm"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-2xl bg-white dark:bg-gray-900 border border-amber-100 dark:border-gray-800 w-fit shadow-sm">
          {(['customers', 'wholesalers'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={activeTab === tab
                ? { background: 'linear-gradient(135deg,#fde68a,#f59e0b)', color: '#451a03' }
                : { color: '#92400e' }}>
              {tab === 'customers' ? <Users size={16} /> : <Store size={16} />}
              {tab === 'customers' ? 'Customers (' + customers.length + ')' : 'Wholesalers (' + shops.length + ')'}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-amber-500" /></div>
        ) : activeTab === 'customers' ? (
          filteredCustomers.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-3xl border border-amber-100 dark:border-gray-800 shadow-sm">
              <Users size={40} className="text-amber-300 dark:text-amber-700 mx-auto mb-4" />
              <p className="text-amber-800 dark:text-gray-300 font-bold">No customers found</p>
              <p className="text-amber-600/70 dark:text-gray-500 text-sm mt-1">
                Customers who sign up with shop name <strong>{userProfile?.shopName}</strong> will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCustomers.map(customer => (
                <CustomerCard
                  key={customer.uid}
                  customer={customer}
                  expanded={expandedUid === customer.uid}
                  orders={ordersMap[customer.uid]}
                  ordersLoading={ordersLoading === customer.uid}
                  onToggle={() => fetchOrdersFor(customer)}
                />
              ))}
            </div>
          )
        ) : (
          filteredShops.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-3xl border border-amber-100 dark:border-gray-800 shadow-sm">
              <Store size={40} className="text-green-300 mx-auto mb-4" />
              <p className="text-stone-700 dark:text-gray-300 font-bold">No wholesalers found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredShops.map(shop => (
                <ShopCard key={shop.id} shop={shop} />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

// --- Customer Card ----------------------------------------------------------

interface CustomerCardProps {
  customer: CustomerParty;
  expanded: boolean;
  orders?: Order[];
  ordersLoading: boolean;
  onToggle: () => void;
}

const CustomerCard: React.FC<CustomerCardProps> = ({ customer, expanded, orders, ordersLoading, onToggle }) => {
  const initials = customer.name?.split(' ').map((n: string) => n[0]).slice(0,2).join('').toUpperCase() || '?';
  const totalGold = (orders ?? []).filter(o => o.type === 'BUY' && o.status === 'SUCCESS').reduce((s, o) => s + o.grams, 0);
  const totalInvested = (orders ?? []).filter(o => o.type === 'BUY' && o.status === 'SUCCESS').reduce((s, o) => s + o.totalAmountInr, 0);

  return (
    <div className="bg-white dark:bg-gray-900 border border-amber-100 dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4 p-5">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#fde68a,#f59e0b)', color: '#451a03' }}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-black text-stone-800 dark:text-white">{customer.name}</h3>
            <span className={'text-[10px] font-bold px-2 py-0.5 rounded-full ' + (customer.kycStatus === 'VERIFIED' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400')}>
              KYC {customer.kycStatus ?? 'PENDING'}
            </span>
            {customer.phoneVerified && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">Phone Verified</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-stone-500 dark:text-gray-400">
            {customer.phone && <span className="flex items-center gap-1"><Phone size={11} />{customer.phone}</span>}
            {customer.email && <span className="flex items-center gap-1 truncate max-w-[180px]"><Mail size={11} />{customer.email}</span>}
            {(customer.city || customer.state) && <span className="flex items-center gap-1"><MapPin size={11} />{[customer.city, customer.state].filter(Boolean).join(', ')}</span>}
          </div>
        </div>
        <button onClick={onToggle}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-gray-800 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-gray-700 transition-colors border border-amber-200 dark:border-gray-700">
          {expanded ? <><ChevronUp size={14} />Hide</> : <><ChevronDown size={14} />Orders</>}
        </button>
      </div>

      {orders !== undefined && (
        <div className="grid grid-cols-3 border-t border-amber-50 dark:border-gray-800 divide-x divide-amber-50 dark:divide-gray-800">
          {[{ label: 'Orders', value: orders.length }, { label: 'Gold', value: totalGold.toFixed(3) + 'g' }, { label: 'Invested', value: 'Rs.' + totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 0 }) }].map(s => (
            <div key={s.label} className="py-2.5 text-center">
              <p className="text-xs font-black text-stone-700 dark:text-white">{s.value}</p>
              <p className="text-[10px] text-stone-400 dark:text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {expanded && (
        <div className="border-t border-amber-100 dark:border-gray-800 px-5 py-4">
          <h4 className="text-xs font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest mb-3">Transaction History</h4>
          {ordersLoading ? (
            <div className="flex justify-center py-6"><Loader2 size={22} className="animate-spin text-amber-500" /></div>
          ) : !orders || orders.length === 0 ? (
            <p className="text-sm text-stone-400 py-4 text-center">No transactions found.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-amber-100 dark:border-gray-800">
                    {['Date','Type','Metal','Grams','Amount','Status'].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-amber-700 dark:text-gray-400 font-semibold uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => {
                    const d = o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'}) : '-';
                    return (
                      <tr key={o.id} className="border-b border-amber-50 dark:border-gray-800/50 hover:bg-amber-50/40 dark:hover:bg-gray-800/40">
                        <td className="py-2 px-3 text-stone-500 dark:text-gray-400">{d}</td>
                        <td className="py-2 px-3"><span className={'font-bold px-1.5 py-0.5 rounded ' + (o.type==='BUY'?'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400':'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400')}>{o.type}</span></td>
                        <td className="py-2 px-3 font-semibold text-amber-700 dark:text-yellow-400">{o.metal} {o.purity}K</td>
                        <td className="py-2 px-3 font-black text-stone-800 dark:text-white">{o.grams?.toFixed?.(3)}g</td>
                        <td className="py-2 px-3 font-black text-stone-800 dark:text-white">Rs.{o.totalAmountInr?.toLocaleString?.('en-IN',{maximumFractionDigits:0})}</td>
                        <td className="py-2 px-3"><span className={'font-bold px-1.5 py-0.5 rounded ' + (o.status==='SUCCESS'?'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400':o.status==='PENDING'?'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400':'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400')}>{o.status}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- Shop Card --------------------------------------------------------------

const ShopCard: React.FC<{ shop: ShopParty }> = ({ shop }) => (
  <div className="bg-white dark:bg-gray-900 border border-green-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-11 h-11 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
        <Store size={22} className="text-green-600 dark:text-green-400" />
      </div>
      <div>
        <h3 className="font-black text-stone-800 dark:text-white">{shop.name}</h3>
        {shop.ownerName && <p className="text-xs text-stone-400 dark:text-gray-500">{shop.ownerName}</p>}
      </div>
    </div>
    <div className="space-y-1.5 text-xs text-stone-500 dark:text-gray-400">
      {shop.phone && <p className="flex items-center gap-2"><Phone size={12} />{shop.phone}</p>}
      {shop.email && <p className="flex items-center gap-2 truncate"><Mail size={12} />{shop.email}</p>}
      {(shop.city || shop.state) && <p className="flex items-center gap-2"><MapPin size={12} />{[shop.city, shop.state].filter(Boolean).join(', ')}</p>}
      {shop.gstNumber && <p className="flex items-center gap-2"><Shield size={12} />GST: {shop.gstNumber}</p>}
    </div>
  </div>
);
