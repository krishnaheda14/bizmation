/**
 * Analytics Page – Owner only
 *
 * Real-time view of all gold/silver transactions for the shop:
 *  • Total volume (grams) and value (INR) by metal
 *  • Top customers by purchase value
 *  • Recent transactions feed
 *  • Daily / monthly trend cards
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  collection, query, where, onSnapshot, orderBy, Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  BarChart3, TrendingUp, TrendingDown, Users, RefreshCw,
  Coins, ArrowUpRight, ArrowDownLeft, Calendar, Award,
} from 'lucide-react';

interface Order {
  id: string;
  type: 'BUY' | 'SELL';
  metal: string;
  purity: number;
  grams: number;
  ratePerGram: number;
  totalAmountInr: number;
  status: string;
  customerName?: string;
  customerEmail?: string;
  shopCommissionInr?: number;
  bullionPayoutStatus?: string;
  createdAt: any;
}

interface MetalStats {
  totalGrams: number;
  totalInr: number;
  buyGrams: number;
  sellGrams: number;
  buyInr: number;
  sellInr: number;
  commissionInr: number;
}

const GOLD_COMMISSION_PER_GRAM = 20;
const SILVER_COMMISSION_PER_GRAM = 2;

const fmtInr = (n: number) =>
  '₹' + Math.round(n).toLocaleString('en-IN');

const fmtGrams = (n: number) =>
  n >= 1000 ? (n / 1000).toFixed(2) + ' kg' : n.toFixed(3) + ' g';

export const Analytics: React.FC = () => {
  const { userProfile } = useAuth();
  const shopName = userProfile?.shopName ?? '';
  const shopNameVariants = useMemo(
    () => Array.from(new Set([shopName, shopName.toLowerCase(), shopName.toUpperCase()].filter(Boolean))),
    [shopName],
  );

  const [orders,    setOrders]    = useState<Order[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [lastUpdate, setLastUpdate] = useState('');

  // Real-time listener
  useEffect(() => {
    if (!shopName) return;
    setLoading(true);

    const q = query(
      collection(db, 'goldOnlineOrders'),
      where('shopName', 'in', shopNameVariants),
      orderBy('createdAt', 'desc'),
    );

    const unsub = onSnapshot(q, snap => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      setOrders(rows);
      setLastUpdate(new Date().toLocaleTimeString());
      setLoading(false);
    }, () => setLoading(false));

    return () => unsub();
  }, [shopName, shopNameVariants]);

  // Compute stats
  const computeStats = (metal: string): MetalStats => {
    const subset = orders.filter(o => (o.metal ?? '').toUpperCase() === metal.toUpperCase());
    return subset.reduce((acc, o) => {
      const g = Number(o.grams) || 0;
      const inr = Number(o.totalAmountInr) || 0;
      const commission = Number(o.shopCommissionInr)
        || ((o.type === 'BUY')
          ? g * ((metal.toUpperCase() === 'GOLD') ? GOLD_COMMISSION_PER_GRAM : SILVER_COMMISSION_PER_GRAM)
          : 0);
      if (o.type === 'BUY') { acc.buyGrams += g; acc.buyInr += inr; }
      else { acc.sellGrams += g; acc.sellInr += inr; }
      acc.commissionInr += commission;
      acc.totalGrams = acc.buyGrams - acc.sellGrams;
      acc.totalInr += inr;
      return acc;
    }, { totalGrams: 0, totalInr: 0, buyGrams: 0, sellGrams: 0, buyInr: 0, sellInr: 0, commissionInr: 0 });
  };

  const gold   = computeStats('GOLD');
  const silver = computeStats('SILVER');

  // Top customers
  const customerMap: Record<string, { name: string; email: string; totalInr: number; totalGrams: number }> = {};
  orders.forEach(o => {
    const key = o.customerEmail ?? o.customerName ?? 'Unknown';
    if (!customerMap[key]) customerMap[key] = { name: o.customerName ?? key, email: o.customerEmail ?? '', totalInr: 0, totalGrams: 0 };
    customerMap[key].totalInr   += Number(o.totalAmountInr) || 0;
    customerMap[key].totalGrams += Number(o.grams) || 0;
  });
  const topCustomers = Object.values(customerMap).sort((a, b) => b.totalInr - a.totalInr).slice(0, 5);

  // Today's orders
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayOrders = orders.filter(o => {
    const ts = o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : new Date(o.createdAt);
    return ts >= today;
  });
  const todayInr = todayOrders.reduce((s, o) => s + (Number(o.totalAmountInr) || 0), 0);

  const totalCommission = orders.reduce((s, o) => {
    const g = Number(o.grams) || 0;
    const fallback = (o.type === 'BUY')
      ? g * (((o.metal ?? '').toUpperCase() === 'GOLD') ? GOLD_COMMISSION_PER_GRAM : SILVER_COMMISSION_PER_GRAM)
      : 0;
    return s + (Number(o.shopCommissionInr) || fallback);
  }, 0);

  const pendingCommission = orders.reduce((s, o) => {
    const isBuy = (o.type ?? '').toUpperCase() === 'BUY';
    const unsettled = (o.bullionPayoutStatus ?? 'UNSETTLED').toUpperCase() !== 'SETTLED';
    if (!isBuy || !unsettled) return s;
    const g = Number(o.grams) || 0;
    const fallback = g * (((o.metal ?? '').toUpperCase() === 'GOLD') ? GOLD_COMMISSION_PER_GRAM : SILVER_COMMISSION_PER_GRAM);
    return s + (Number(o.shopCommissionInr) || fallback);
  }, 0);

  const StatCard: React.FC<{ label: string; value: string; sub?: string; icon: React.ReactNode; accent: string }> =
    ({ label, value, sub, icon, accent }) => (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-amber-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
          {icon}
        </div>
        <ArrowUpRight size={16} className="text-amber-400 group-hover:text-amber-600 transition-colors" />
      </div>
      <p className="text-xs text-stone-500 dark:text-gray-400 font-medium">{label}</p>
      <p className="text-xl font-black text-stone-800 dark:text-white mt-0.5">{value}</p>
      {sub && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{sub}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-gray-950 pb-16">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 dark:from-gray-900 dark:to-gray-900 border-b border-amber-200 dark:border-yellow-900/30 px-4 sm:px-8 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-amber-900 dark:text-white flex items-center gap-3">
              <BarChart3 className="text-amber-500" size={28} />
              Analytics
            </h1>
            <p className="text-amber-700/70 dark:text-gray-400 text-sm mt-1">
              Real-time gold & silver transactions · {shopName}
            </p>
          </div>
          <div className="text-right">
            {loading ? (
              <RefreshCw size={18} className="text-amber-400 animate-spin" />
            ) : (
              <p className="text-xs text-amber-500">Live · {lastUpdate}</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-8 space-y-8">

        {/* Today summary */}
        <div className="bg-gradient-to-r from-amber-500 to-yellow-500 rounded-2xl p-6 text-amber-950 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold opacity-80">Today's Total Revenue</p>
              <p className="text-4xl font-black mt-1">{fmtInr(todayInr)}</p>
              <p className="text-sm opacity-70 mt-1">{todayOrders.length} transactions today</p>
            </div>
            <Calendar size={48} className="opacity-30" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-amber-100 dark:border-gray-800 shadow-sm">
            <p className="text-xs text-stone-500 dark:text-gray-400 font-medium">Total Commission Earned</p>
            <p className="text-3xl font-black text-amber-800 dark:text-amber-400 mt-1">{fmtInr(totalCommission)}</p>
            <p className="text-xs text-stone-400 mt-1">All buy orders till date</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-amber-100 dark:border-gray-800 shadow-sm">
            <p className="text-xs text-stone-500 dark:text-gray-400 font-medium">Commission Pending From Bullion</p>
            <p className="text-3xl font-black text-red-700 dark:text-red-400 mt-1">{fmtInr(pendingCommission)}</p>
            <p className="text-xs text-stone-400 mt-1">Unsettled orders</p>
          </div>
        </div>

        {/* Gold stats */}
        <div>
          <h2 className="text-lg font-black text-amber-900 dark:text-white mb-4 flex items-center gap-2">
            <Coins size={20} className="text-amber-500" /> Gold
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <StatCard label="Net Holding (sold to customers)" value={fmtGrams(gold.buyGrams)} sub={fmtInr(gold.buyInr) + ' bought'} icon={<TrendingUp size={18} className="text-amber-700" />} accent="bg-amber-100 dark:bg-amber-900/30" />
            <StatCard label="Total Sold (redeemed)" value={fmtGrams(gold.sellGrams)} sub={fmtInr(gold.sellInr) + ' redeemed'} icon={<TrendingDown size={18} className="text-red-500" />} accent="bg-red-50 dark:bg-red-900/20" />
            <StatCard label="Total Orders" value={String(orders.filter(o => o.metal?.toUpperCase() === 'GOLD').length)} sub="All time" icon={<BarChart3 size={18} className="text-amber-700" />} accent="bg-amber-100 dark:bg-amber-900/30" />
            <StatCard label="Commission" value={fmtInr(gold.commissionInr)} sub="Gold buy commissions" icon={<ArrowUpRight size={18} className="text-green-600" />} accent="bg-green-50 dark:bg-green-900/20" />
          </div>
        </div>

        {/* Silver stats */}
        <div>
          <h2 className="text-lg font-black text-amber-900 dark:text-white mb-4 flex items-center gap-2">
            <Coins size={20} className="text-stone-400" /> Silver
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <StatCard label="Net Holding (sold to customers)" value={fmtGrams(silver.buyGrams)} sub={fmtInr(silver.buyInr) + ' bought'} icon={<TrendingUp size={18} className="text-stone-500" />} accent="bg-stone-100 dark:bg-stone-900/30" />
            <StatCard label="Total Sold (redeemed)" value={fmtGrams(silver.sellGrams)} sub={fmtInr(silver.sellInr) + ' redeemed'} icon={<TrendingDown size={18} className="text-red-500" />} accent="bg-red-50 dark:bg-red-900/20" />
            <StatCard label="Total Orders" value={String(orders.filter(o => o.metal?.toUpperCase() === 'SILVER').length)} sub="All time" icon={<BarChart3 size={18} className="text-stone-500" />} accent="bg-stone-100 dark:bg-stone-900/30" />
            <StatCard label="Commission" value={fmtInr(silver.commissionInr)} sub="Silver buy commissions" icon={<ArrowUpRight size={18} className="text-green-600" />} accent="bg-green-50 dark:bg-green-900/20" />
          </div>
        </div>

        {/* Top Customers & Recent Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top customers */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-amber-100 dark:border-gray-800 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-amber-100 dark:border-gray-800 flex items-center gap-2">
              <Award size={18} className="text-amber-500" />
              <h3 className="font-black text-amber-900 dark:text-white">Top Customers</h3>
            </div>
            {topCustomers.length === 0 ? (
              <p className="text-center text-stone-400 py-8 text-sm">No transactions yet</p>
            ) : (
              <div className="divide-y divide-amber-50 dark:divide-gray-800">
                {topCustomers.map((c, i) => (
                  <div key={c.email} className="flex items-center gap-4 px-6 py-3 hover:bg-amber-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-white font-black text-xs flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-stone-800 dark:text-white text-sm truncate">{c.name}</p>
                      <p className="text-xs text-stone-400 truncate">{c.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-amber-700 dark:text-amber-400 text-sm">{fmtInr(c.totalInr)}</p>
                      <p className="text-xs text-stone-400">{fmtGrams(c.totalGrams)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent transactions */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-amber-100 dark:border-gray-800 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-amber-100 dark:border-gray-800 flex items-center gap-2">
              <RefreshCw size={18} className="text-amber-500" />
              <h3 className="font-black text-amber-900 dark:text-white">Recent Transactions</h3>
            </div>
            {orders.length === 0 ? (
              <p className="text-center text-stone-400 py-8 text-sm">No transactions yet</p>
            ) : (
              <div className="divide-y divide-amber-50 dark:divide-gray-800 max-h-80 overflow-y-auto">
                {orders.slice(0, 20).map(o => {
                  const isBuy = o.type === 'BUY';
                  const ts = o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : new Date(o.createdAt ?? 0);
                  return (
                    <div key={o.id} className="flex items-center gap-3 px-6 py-3 hover:bg-amber-50/50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isBuy ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                        {isBuy
                          ? <ArrowUpRight size={16} className="text-green-600" />
                          : <ArrowDownLeft size={16} className="text-red-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-stone-700 dark:text-stone-300 truncate">
                          {isBuy ? 'Buy' : 'Sell'} · {o.metal} {o.purity}K · {fmtGrams(Number(o.grams) || 0)}
                        </p>
                        <p className="text-[10px] text-stone-400 truncate">{o.customerName ?? o.customerEmail ?? '—'}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-black ${isBuy ? 'text-green-600' : 'text-red-500'}`}>
                          {fmtInr(Number(o.totalAmountInr) || 0)}
                        </p>
                        <p className="text-[10px] text-stone-400">
                          {ts.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
