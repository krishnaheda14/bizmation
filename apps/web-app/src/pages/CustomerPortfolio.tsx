/**
 * Customer Portfolio Page
 *
 * Shows the logged-in customer's gold purchase history,
 * total holdings, and investment summary.
 */

import React, { useState, useEffect } from 'react';
import {
  Coins, TrendingUp, ShoppingCart, ArrowUpRight,
  Loader2, AlertCircle, RefreshCw, Package,
} from 'lucide-react';
import {
  collection, query, where, orderBy, getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

interface GoldOrder {
  id: string;
  type: 'BUY' | 'SELL';
  metal: string;
  purity: number;
  grams: number;
  ratePerGram: number;
  totalAmountInr: number;
  razorpayPaymentId?: string;
  status: string;
  createdAt: any;
}

export const CustomerPortfolio: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [shopFrozen, setShopFrozen] = useState<boolean>(false);
  useEffect(() => {
    if (!userProfile?.shopName) return;
    import('firebase/firestore').then(({ collection, query, where, getDocs }) => {
      const q = query(collection(db, 'shops'), where('name', '==', userProfile.shopName));
      getDocs(q).then(snap => {
        const shopDoc = snap.docs[0]?.data();
        setShopFrozen(!!shopDoc?.transactionsFrozen);
      });
    });
  }, [userProfile?.shopName]);
  const [orders, setOrders]   = useState<GoldOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const fetchOrders = async () => {
    if (!currentUser) return;
    setLoading(true);
    setError('');
    try {
      // Query orders by email (primary key — all orders store customerEmail)
      const allResults: Record<string, GoldOrder> = {};

      if (currentUser.email) {
        const q = query(
          collection(db, 'goldOnlineOrders'),
          where('customerEmail', '==', currentUser.email),
        );
        const snap = await getDocs(q);
        snap.docs.forEach(d => { allResults[d.id] = { id: d.id, ...(d.data() as any) } as GoldOrder; });
        console.log('[Portfolio] Orders fetched by email:', snap.size, 'for', currentUser.email);
      } else {
        console.warn('[Portfolio] No email on currentUser — cannot fetch orders');
      }

      // Convert to array and sort by createdAt descending (serverTimestamp may be a Firestore Timestamp)
      const combined = Object.values(allResults).sort((a, b) => {
        const at = (a.createdAt && (a.createdAt.seconds ?? a.createdAt.toMillis?.())) || 0;
        const bt = (b.createdAt && (b.createdAt.seconds ?? b.createdAt.toMillis?.())) || 0;
        return bt - at;
      });
      setOrders(combined);
    } catch (e: any) {
      setError('Could not load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [currentUser]);

  const totalBoughtGrams = orders
    .filter(o => o.type === 'BUY' && o.status === 'SUCCESS')
    .reduce((sum, o) => sum + o.grams, 0);

  const totalInvested = orders
    .filter(o => o.type === 'BUY' && o.status === 'SUCCESS')
    .reduce((sum, o) => sum + o.totalAmountInr, 0);

  const totalSoldGrams = orders
    .filter(o => o.type === 'SELL')
    .reduce((sum, o) => sum + o.grams, 0);

  const netGrams = totalBoughtGrams - totalSoldGrams;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-black text-gray-900 dark:text-white">
      {shopFrozen && (
        <div className="max-w-5xl mx-auto mb-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-4 flex items-center gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0" size={22} />
            <div>
              <p className="text-red-700 dark:text-red-300 font-bold text-base">Buy/Sell is currently paused by your shop owner.</p>
              <p className="text-red-700/70 dark:text-red-400 text-xs mt-1">You cannot place new buy or sell orders until your shop owner allows transactions again.</p>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 border-b border-amber-200 dark:border-yellow-900/30 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-black text-amber-900 dark:text-white mb-1 flex items-center gap-3">
            <Coins className="text-amber-500 dark:text-yellow-400" size={32} />
            My Gold Portfolio
          </h1>
          <p className="text-amber-700/70 dark:text-gray-400 text-sm">
            {userProfile?.name ? `Welcome, ${userProfile.name}` : 'Your investment summary & transaction history'}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Gold Held',
              value: `${netGrams.toFixed(3)}g`,
                sub: '24K Gold',
              icon: <Coins size={22} className="text-amber-500 dark:text-yellow-400" />,
              bg: 'from-amber-50 to-yellow-50 dark:from-yellow-900/20 dark:to-amber-900/10',
              border: 'border-amber-200 dark:border-yellow-800/40',
            },
            {
              label: 'Total Bought',
              value: `${totalBoughtGrams.toFixed(3)}g`,
              sub: 'Gross purchase',
              icon: <ShoppingCart size={22} className="text-green-500 dark:text-green-400" />,
              bg: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/10',
              border: 'border-green-200 dark:border-green-800/40',
            },
            {
              label: 'Total Invested',
              value: `₹${totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
              sub: 'All purchases',
              icon: <TrendingUp size={22} className="text-blue-500 dark:text-blue-400" />,
              bg: 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/10',
              border: 'border-blue-200 dark:border-blue-800/40',
            },
            {
              label: 'Sell Requests',
              value: String(orders.filter(o => o.type === 'SELL').length),
              sub: 'Pending / done',
              icon: <ArrowUpRight size={22} className="text-purple-500 dark:text-purple-400" />,
              bg: 'from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/10',
              border: 'border-purple-200 dark:border-purple-800/40',
            },
          ].map(({ label, value, sub, icon, bg, border }) => (
            <div key={label} className={`bg-gradient-to-br ${bg} border ${border} rounded-2xl p-5 shadow-sm`}>
              <div className="flex items-center gap-2 mb-3">{icon}<span className="text-xs font-bold text-stone-500 dark:text-gray-400 uppercase tracking-wide">{label}</span></div>
              <p className="text-2xl font-black text-stone-800 dark:text-white">{value}</p>
              <p className="text-xs text-stone-400 dark:text-gray-500 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Transactions */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-black text-amber-900 dark:text-white flex items-center gap-2">
              <Package size={20} className="text-amber-500" />
              Transaction History
            </h2>
            <button
              onClick={fetchOrders}
              disabled={loading}
              className="flex items-center gap-1.5 text-amber-700 dark:text-yellow-500 hover:text-amber-900 dark:hover:text-yellow-400 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 mb-4">
              <AlertCircle className="text-red-500" size={18} />
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-amber-500" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-900 border border-amber-100 dark:border-gray-800 rounded-2xl">
              <Coins size={40} className="text-amber-300 dark:text-yellow-700 mx-auto mb-4" />
              <p className="text-amber-700 dark:text-gray-400 font-semibold">No transactions yet</p>
              <p className="text-amber-500/70 dark:text-gray-500 text-sm mt-1">Your gold purchases will appear here.</p>
              <a href="#/" className="mt-5 inline-flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl text-sm transition-colors">
                <ShoppingCart size={15} />
                Buy Gold
              </a>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-950 border border-amber-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-amber-100 dark:border-gray-800 bg-amber-50/60 dark:bg-gray-900">
                      <th className="text-left py-3 px-4 text-amber-700 dark:text-gray-400 text-xs font-semibold uppercase">Date</th>
                      <th className="text-left py-3 px-4 text-amber-700 dark:text-gray-400 text-xs font-semibold uppercase">Type</th>
                      <th className="text-left py-3 px-4 text-amber-700 dark:text-gray-400 text-xs font-semibold uppercase">Metal</th>
                      <th className="text-right py-3 px-4 text-amber-700 dark:text-gray-400 text-xs font-semibold uppercase">Grams</th>
                      <th className="text-right py-3 px-4 text-amber-700 dark:text-gray-400 text-xs font-semibold uppercase">Amount</th>
                      <th className="text-left py-3 px-4 text-amber-700 dark:text-gray-400 text-xs font-semibold uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => {
                      const date = order.createdAt?.toDate
                        ? order.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—';
                      return (
                        <tr key={order.id} className="border-b border-amber-50 dark:border-gray-800/60 hover:bg-amber-50/40 dark:hover:bg-gray-900/50 transition-colors">
                          <td className="py-3.5 px-4 text-sm text-stone-600 dark:text-gray-300">{date}</td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                              order.type === 'BUY'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                            }`}>
                              {order.type === 'BUY' ? <ShoppingCart size={10} /> : <ArrowUpRight size={10} />}
                              {order.type}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-sm font-semibold text-amber-700 dark:text-yellow-400">
                            {order.metal} {order.purity}K
                          </td>
                          <td className="py-3.5 px-4 text-right text-sm font-black text-stone-800 dark:text-white">
                            {order.grams.toFixed(3)}g
                          </td>
                          <td className="py-3.5 px-4 text-right text-sm font-black text-stone-800 dark:text-white">
                            ₹{order.totalAmountInr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              order.status === 'SUCCESS'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : order.status === 'PENDING'
                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
