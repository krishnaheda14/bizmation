/**
 * Shop Customers Page — Owner / Staff View
 *
 * Shows all customers registered under this shop with
 * full purchase analytics and expandable order history.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, Loader2, Search, User, ChevronDown, ChevronUp,
  Coins, TrendingUp, ShoppingCart, ArrowUpRight, RefreshCw,
  AlertCircle, Package,
} from 'lucide-react';
import {
  collection, query, where, getDocs, orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  city?: string;
  state?: string;
  kycStatus: string;
  totalGoldPurchasedGrams?: number;
  totalSilverPurchasedGrams?: number;
  totalInvestedInr?: number;
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
}

const fmtInr = (n: number, compact = true) => {
  const v = Number(n) || 0;
  const abs = Math.abs(v);
  if (compact && abs >= 10000000) return `₹${(v / 10000000).toFixed(4)} Cr`;
  if (compact && abs >= 100000) return `₹${(v / 100000).toFixed(4)} L`;
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
};

export const ShopCustomers: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [customers, setCustomers]     = useState<CustomerRecord[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [search, setSearch]           = useState('');
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [ordersMap, setOrdersMap]     = useState<Record<string, Order[]>>({});
  const [ordersLoading, setOrdersLoading] = useState<string | null>(null);
  const shopNameVariants = useMemo(
    () => Array.from(new Set([(userProfile?.shopName ?? ''), (userProfile?.shopName ?? '').toLowerCase(), (userProfile?.shopName ?? '').toUpperCase()].filter(Boolean))),
    [userProfile?.shopName],
  );

  const fetchCustomers = useCallback(async () => {
    if (!currentUser || !userProfile) return;
    if (userProfile.role !== 'OWNER' && userProfile.role !== 'STAFF') {
      setError('Not authorized');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const shopName = userProfile.shopName ?? '';
      if (!shopName) {
        setError('Your account does not have a shop name set.');
        setLoading(false);
        return;
      }
      const q = query(
        collection(db, 'users'),
        where('shopName', 'in', shopNameVariants),
        where('role', '==', 'CUSTOMER'),
        orderBy('name'),
      );
      const snap = await getDocs(q);
      setCustomers(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    } catch {
      setError('Failed to load customers.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, userProfile, shopNameVariants]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const fetchOrders = async (customerId: string, customerEmail: string) => {
    if (ordersMap[customerId]) return; // already loaded
    setOrdersLoading(customerId);
    try {
      const seen: Record<string, Order> = {};
      const q1 = query(collection(db, 'goldOnlineOrders'), where('userId', '==', customerId));
      const s1 = await getDocs(q1);
      s1.docs.forEach(d => { seen[d.id] = { id: d.id, ...(d.data() as any) } as Order; });
      if (customerEmail) {
        try {
          const q2 = query(collection(db, 'goldOnlineOrders'), where('customerEmail', '==', customerEmail));
          const s2 = await getDocs(q2);
          s2.docs.forEach(d => { seen[d.id] = { id: d.id, ...(d.data() as any) } as Order; });
        } catch (err) {
          // console.warn('[ShopCustomers] Email fallback query skipped:', err);
        }
      }
      const sorted = Object.values(seen).sort((a, b) => {
        const at = a.createdAt?.seconds ?? 0;
        const bt = b.createdAt?.seconds ?? 0;
        return bt - at;
      });
      setOrdersMap(prev => ({ ...prev, [customerId]: sorted }));
    } catch {
      setOrdersMap(prev => ({ ...prev, [customerId]: [] }));
    } finally {
      setOrdersLoading(null);
    }
  };

  const toggleExpand = (c: CustomerRecord) => {
    if (expandedId === c.id) {
      setExpandedId(null);
    } else {
      setExpandedId(c.id);
      fetchOrders(c.id, c.email);
    }
  };

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search),
  );

  const totalCustomers = customers.length;
  const totalGold      = customers.reduce((s, c) => s + (c.totalGoldPurchasedGrams ?? 0), 0);
  const totalInvested  = customers.reduce((s, c) => s + (c.totalInvestedInr ?? 0), 0);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-black text-gray-900 dark:text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 border-b border-amber-200 dark:border-yellow-900/30 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black text-amber-900 dark:text-white mb-1 flex items-center gap-3">
              <Users size={32} className="text-amber-500" />
              Shop Customers
            </h1>
            <p className="text-amber-700/70 dark:text-gray-400 text-sm">
              Customers registered under <strong>{userProfile?.shopName}</strong>
            </p>
          </div>
          <button
            onClick={fetchCustomers}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Analytics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Customers', value: String(totalCustomers), icon: <Users size={20} className="text-amber-500" />, bg: 'from-amber-50 to-yellow-50 dark:from-yellow-900/20 dark:to-amber-900/10', border: 'border-amber-200 dark:border-yellow-800/40' },
            { label: 'Total Gold Sold', value: `${totalGold.toFixed(4)}g`, icon: <Coins size={20} className="text-amber-500 dark:text-yellow-400" />, bg: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/10', border: 'border-green-200 dark:border-green-800/40' },
            { label: 'Total Revenue', value: fmtInr(totalInvested), icon: <TrendingUp size={20} className="text-blue-500 dark:text-blue-400" />, bg: 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/10', border: 'border-blue-200 dark:border-blue-800/40' },
          ].map(({ label, value, icon, bg, border }) => (
            <div key={label} className={`bg-gradient-to-br ${bg} border ${border} rounded-2xl p-5 shadow-sm`}>
              <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs font-bold text-stone-500 dark:text-gray-400 uppercase tracking-wide">{label}</span></div>
              <p className="text-2xl font-black text-stone-800 dark:text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 dark:text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Search by name, email or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-amber-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
            <AlertCircle className="text-red-500" size={18} />
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Customers List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-amber-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-900 border border-amber-100 dark:border-gray-800 rounded-2xl">
            <Users size={40} className="text-amber-300 dark:text-yellow-700 mx-auto mb-4" />
            <p className="text-amber-700 dark:text-gray-400 font-semibold">No customers found</p>
            <p className="text-amber-500/70 dark:text-gray-500 text-sm mt-1">
              {customers.length === 0
                ? 'No customers have registered under this shop yet.'
                : 'No customers match your search.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(c => {
              const isExpanded = expandedId === c.id;
              const orders      = ordersMap[c.id];
              const isLoadingOrders = ordersLoading === c.id;
              const joinDate = c.createdAt?.toDate
                ? c.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                : '—';

              return (
                <div key={c.id} className="bg-white dark:bg-gray-950 border border-amber-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                  {/* Customer Row */}
                  <button
                    className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-amber-50/40 dark:hover:bg-gray-900/50 transition-colors"
                    onClick={() => toggleExpand(c)}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center flex-shrink-0">
                      <User size={18} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-stone-800 dark:text-white">{c.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          c.kycStatus === 'VERIFIED'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        }`}>{c.kycStatus}</span>
                      </div>
                      <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5">{c.email} · {c.phone}</p>
                    </div>
                    {/* Analytics pills */}
                    <div className="hidden sm:flex items-center gap-3 flex-shrink-0 text-xs">
                      <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 px-2.5 py-1 rounded-full font-semibold">
                        {(c.totalGoldPurchasedGrams ?? 0).toFixed(4)}g Gold
                      </span>
                      <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2.5 py-1 rounded-full font-semibold">
                        {fmtInr(c.totalInvestedInr ?? 0)}
                      </span>
                      <span className="text-stone-400 dark:text-gray-500">Joined {joinDate}</span>
                    </div>
                    <span className="ml-2 text-amber-400 dark:text-gray-500 flex-shrink-0">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </span>
                  </button>

                  {/* Expanded Order History */}
                  {isExpanded && (
                    <div className="border-t border-amber-100 dark:border-gray-800 bg-amber-50/30 dark:bg-gray-900/40 px-5 pb-5 pt-4">
                      {/* Mobile analytics */}
                      <div className="sm:hidden flex flex-wrap gap-2 mb-4">
                        <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 px-2.5 py-1 rounded-full text-xs font-semibold">
                          {(c.totalGoldPurchasedGrams ?? 0).toFixed(4)}g Gold Bought
                        </span>
                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2.5 py-1 rounded-full text-xs font-semibold">
                          {fmtInr(c.totalInvestedInr ?? 0)} Invested
                        </span>
                        <span className="bg-slate-100 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-full text-xs font-semibold">
                          {(c.totalSilverPurchasedGrams ?? 0).toFixed(4)}g Silver
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <Package size={14} />
                        Order History
                      </h4>

                      {isLoadingOrders ? (
                        <div className="flex items-center gap-2 py-4 text-amber-500">
                          <Loader2 size={16} className="animate-spin" />
                          <span className="text-sm">Loading orders…</span>
                        </div>
                      ) : !orders || orders.length === 0 ? (
                        <p className="text-sm text-stone-400 dark:text-gray-500 py-4">No orders found for this customer.</p>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-amber-100 dark:border-gray-700">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-amber-100/60 dark:bg-gray-800">
                                <th className="text-left py-2.5 px-3 text-amber-700 dark:text-gray-400 text-xs font-semibold uppercase">Date</th>
                                <th className="text-left py-2.5 px-3 text-amber-700 dark:text-gray-400 text-xs font-semibold uppercase">Type</th>
                                <th className="text-left py-2.5 px-3 text-amber-700 dark:text-gray-400 text-xs font-semibold uppercase">Metal</th>
                                <th className="text-right py-2.5 px-3 text-amber-700 dark:text-gray-400 text-xs font-semibold uppercase">Weight</th>
                                <th className="text-right py-2.5 px-3 text-amber-700 dark:text-gray-400 text-xs font-semibold uppercase">Rate/g</th>
                                <th className="text-right py-2.5 px-3 text-amber-700 dark:text-gray-400 text-xs font-semibold uppercase">Amount</th>
                                <th className="text-left py-2.5 px-3 text-amber-700 dark:text-gray-400 text-xs font-semibold uppercase">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {orders.map(o => {
                                const d = o.createdAt?.toDate
                                  ? o.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                  : '—';
                                return (
                                  <tr key={o.id} className="border-t border-amber-50 dark:border-gray-700/60 hover:bg-amber-50/60 dark:hover:bg-gray-800/40 transition-colors">
                                    <td className="py-2 px-3 text-stone-600 dark:text-gray-300 whitespace-nowrap">{d}</td>
                                    <td className="py-2 px-3">
                                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                                        o.type === 'BUY'
                                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                          : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                                      }`}>
                                        {o.type === 'BUY' ? <ShoppingCart size={9} /> : <ArrowUpRight size={9} />}
                                        {o.type}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 font-semibold text-amber-700 dark:text-yellow-400">{o.metal} {o.purity}K</td>
                                    <td className="py-2 px-3 text-right font-bold">{o.grams.toFixed(4)}g</td>
                                    <td className="py-2 px-3 text-right text-stone-500 dark:text-gray-400">{o.ratePerGram != null ? fmtInr(Number(o.ratePerGram), false) : '—'}</td>
                                    <td className="py-2 px-3 text-right font-black text-stone-800 dark:text-white">{o.totalAmountInr != null ? fmtInr(Number(o.totalAmountInr)) : '—'}</td>
                                    <td className="py-2 px-3">
                                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                        o.status === 'SUCCESS'
                                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                          : o.status === 'PENDING'
                                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                      }`}>{o.status}</span>
                                    </td>
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
            })}
          </div>
        )}
      </div>
    </div>
  );
};
