/**
 * Customer Portfolio Page
 *
 * Focus: Holdings, avg buy price, current market value, P&L
 * Transaction history lives in the Orders page.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Coins, TrendingUp, TrendingDown, ShoppingCart,
  Loader2, AlertCircle, RefreshCw,
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { fetchLiveMetalRates, type MetalRate } from '../lib/goldPrices';
import { fetchCustomerOrders, normalizeGoldPurity } from '../lib/customerOrders';

interface GoldOrder {
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

interface HoldingCard {
  metal: string;
  purity: number;
  netGrams: number;
  totalInvested: number;
  avgBuyPrice: number;
  currentPrice: number;
  currentValue: number;
  pnlAmount: number;
  pnlPct: number;
}

export const CustomerPortfolio: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [orders,      setOrders]     = useState<GoldOrder[]>([]);
  const [rates,       setRates]      = useState<MetalRate[]>([]);
  const [loading,     setLoading]    = useState(true);
  const [error,       setError]      = useState('');
  const [shopFrozen,  setShopFrozen] = useState(false);

  // Shop freeze check
  useEffect(() => {
    if (!userProfile?.shopName) return;
    import('firebase/firestore').then(({ collection: col, query: q, where: w, getDocs: gd }) => {
      gd(q(col(db, 'shops'), w('name', '==', userProfile.shopName))).then(snap => {
        setShopFrozen(!!snap.docs[0]?.data().transactionsFrozen);
      });
    });
  }, [userProfile?.shopName]);

  const fetchAll = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true); setError('');
    try {
      const rateData = await fetchLiveMetalRates();
      setRates(rateData);

      const loaded = await fetchCustomerOrders({
        uid: currentUser.uid,
        email: currentUser.email ?? userProfile?.email ?? '',
        phone: userProfile?.phone ?? '',
      });
      setOrders(loaded as GoldOrder[]);
    } catch { setError('Could not load portfolio. Please try again.'); }
    finally { setLoading(false); }
  }, [currentUser, userProfile]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derive holdings per metal/purity ──────────────────────────────────────
  const holdings: HoldingCard[] = (() => {
    const map: Record<string, { buyGrams: number; sellGrams: number; totalInvested: number }> = {};
    for (const o of orders) {
      if (o.type === 'BUY' && o.status !== 'SUCCESS') continue;
      const normalizedPurity = normalizeGoldPurity(Number(o.purity) || 0);
      const key = `${o.metal}_${normalizedPurity}`;
      if (!map[key]) map[key] = { buyGrams: 0, sellGrams: 0, totalInvested: 0 };
      if (o.type === 'BUY') {
        map[key].buyGrams     += o.grams;
        map[key].totalInvested += o.totalAmountInr;
      } else {
        map[key].sellGrams += o.grams;
      }
    }
    return Object.entries(map).map(([key, v]) => {
      const [metal, purityStr] = key.split('_');
      const purity       = Number(purityStr);
      const netGrams     = v.buyGrams - v.sellGrams;
      const avgBuyPrice  = v.buyGrams > 0 ? v.totalInvested / v.buyGrams : 0;
      const liveRate     = rates.find(r => r.metalType === metal && r.purity === purity);
      const currentPrice = liveRate?.ratePerGram ?? 0;
      const currentValue = netGrams * currentPrice;
      const costBasis    = netGrams * avgBuyPrice;
      const pnlAmount    = currentValue - costBasis;
      const pnlPct       = costBasis > 0 ? (pnlAmount / costBasis) * 100 : 0;
      return { metal, purity, netGrams, totalInvested: v.totalInvested, avgBuyPrice, currentPrice, currentValue, pnlAmount, pnlPct };
    }).filter(h => h.netGrams > 0.001);
  })();

  const totalInvested     = orders.filter(o => o.type === 'BUY' && o.status === 'SUCCESS').reduce((s, o) => s + o.totalAmountInr, 0);
  const totalOrders       = orders.length;
  const totalGoldBought   = orders.filter(o => o.type === 'BUY' && o.status === 'SUCCESS' && o.metal === 'GOLD').reduce((s, o) => s + o.grams, 0);
  const totalSilverBought = orders.filter(o => o.type === 'BUY' && o.status === 'SUCCESS' && o.metal === 'SILVER').reduce((s, o) => s + o.grams, 0);
  const totalCurrentValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  const costBasisTotal    = holdings.reduce((s, h) => s + h.netGrams * h.avgBuyPrice, 0);
  const totalPnL          = totalCurrentValue - costBasisTotal;
  const totalPnLPct       = costBasisTotal > 0 ? (totalPnL / costBasisTotal) * 100 : 0;
  const isProfitable      = totalPnL >= 0;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-black text-gray-900 dark:text-white">
      {/* Freeze banner */}
      {shopFrozen && (
        <div className="px-4 pt-4 max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-3 flex items-center gap-3">
            <AlertCircle className="text-red-500 shrink-0" size={20} />
            <p className="text-red-700 dark:text-red-300 text-sm font-semibold">Transactions are paused by your shop owner.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-br from-amber-50 via-yellow-50 to-stone-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 border-b border-amber-200 dark:border-yellow-900/30 px-4 sm:px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl px-4 py-3 bg-white/80 dark:bg-gray-900 border border-amber-100 dark:border-gray-800">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-gray-400">Total Orders</p>
              <p className="text-2xl font-black text-stone-800 dark:text-white mt-0.5">{totalOrders}</p>
            </div>
            <div className="rounded-2xl px-4 py-3 bg-white/80 dark:bg-gray-900 border border-amber-100 dark:border-gray-800">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-yellow-400">Gold Bought</p>
              <p className="text-2xl font-black text-amber-900 dark:text-yellow-300 mt-0.5">{totalGoldBought.toFixed(3)}<span className="text-sm font-semibold ml-1">g</span></p>
            </div>
            <div className="rounded-2xl px-4 py-3 bg-white/80 dark:bg-gray-900 border border-amber-100 dark:border-gray-800">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-gray-400">Silver Bought</p>
              <p className="text-2xl font-black text-slate-700 dark:text-gray-200 mt-0.5">{totalSilverBought.toFixed(3)}<span className="text-sm font-semibold ml-1">g</span></p>
            </div>
          </div>

          <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-amber-900 dark:text-white flex items-center gap-3">
              <Coins className="text-amber-500 dark:text-yellow-400" size={30} />
              My Portfolio
            </h1>
            <p className="text-amber-600/70 dark:text-gray-400 text-sm mt-0.5">
              Live holdings, avg cost basis &amp; P&amp;L
            </p>
          </div>
          <button onClick={fetchAll} disabled={loading}
            className="flex items-center gap-1.5 text-amber-700 dark:text-yellow-500 hover:text-amber-900 dark:hover:text-yellow-400 text-sm font-medium transition-colors disabled:opacity-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {error && (
          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
            <AlertCircle className="text-red-500" size={18} />
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={32} className="animate-spin text-amber-500" />
          </div>
        ) : (
          <>
            {/* ── Overall P&L banner ───────────────────────────────────────── */}
            {holdings.length > 0 && (
              <div className="rounded-3xl p-6" style={{
                background: isProfitable
                  ? 'linear-gradient(135deg,#f0fdf4,#dcfce7)'
                  : 'linear-gradient(135deg,#fff7ed,#fef3c7)',
                border: `1.5px solid ${isProfitable ? 'rgba(34,197,94,0.35)' : 'rgba(251,191,36,0.4)'}`,
              }}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-1">Total Portfolio Value</p>
                    <p className="text-4xl font-black text-stone-800">₹{totalCurrentValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                    <p className="text-sm text-stone-500 mt-0.5">Cost basis: ₹{totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                  </div>
                  <div className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xl ${
                    isProfitable ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {isProfitable ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
                    <span>{isProfitable ? '+' : ''}₹{Math.abs(totalPnL).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    <span className="text-base font-bold opacity-80">({totalPnLPct >= 0 ? '+' : ''}{totalPnLPct.toFixed(2)}%)</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Holding Cards ────────────────────────────────────────────── */}
            {holdings.length === 0 ? (
              <div className="text-center py-20 rounded-3xl border border-amber-100 dark:border-gray-800 bg-white/70 dark:bg-gray-900">
                <Coins size={46} className="text-amber-200 dark:text-yellow-800 mx-auto mb-4" />
                <p className="text-amber-700 dark:text-gray-400 font-semibold text-lg">No holdings yet</p>
                <p className="text-amber-500/70 dark:text-gray-500 text-sm mt-1 mb-5">Buy gold or silver to see your portfolio here.</p>
                <a href="#/" className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl text-sm transition-colors">
                  <ShoppingCart size={15} /> Buy Now
                </a>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {holdings.map(h => {
                  const profit = h.pnlAmount >= 0;
                  return (
                    <div key={`${h.metal}_${h.purity}`} className="rounded-3xl p-5 shadow-sm border bg-white/80 dark:bg-gray-900 border-amber-100 dark:border-gray-800 space-y-4">
                      {/* Metal title */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                            style={{ background: h.metal === 'GOLD' ? 'linear-gradient(135deg,#fde68a,#f59e0b)' : 'linear-gradient(135deg,#e2e8f0,#94a3b8)' }}>
                            {h.metal === 'GOLD' ? '🥇' : '🥈'}
                          </div>
                          <div>
                            <p className="font-black text-stone-800 dark:text-white">{h.metal} {h.purity}K</p>
                            <p className="text-xs text-stone-400 dark:text-gray-500">Net holding</p>
                          </div>
                        </div>
                        <div className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-bold ${
                          profit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                        }`}>
                          {profit ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          {profit ? '+' : ''}{h.pnlPct.toFixed(2)}%
                        </div>
                      </div>

                      {/* Grams + P&L */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl px-4 py-3" style={{ background:'rgba(253,243,212,0.6)', border:'1px solid rgba(251,191,36,0.2)' }}>
                          <p className="text-xs text-amber-600 font-semibold mb-0.5">Holdings</p>
                          <p className="text-2xl font-black text-amber-900">{h.netGrams.toFixed(3)}<span className="text-sm font-medium ml-1">g</span></p>
                        </div>
                        <div className={`rounded-2xl px-4 py-3 ${profit ? 'bg-green-50' : 'bg-red-50'}`}
                          style={{ border:`1px solid ${profit ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                          <p className={`text-xs font-semibold mb-0.5 ${profit ? 'text-green-600' : 'text-red-500'}`}>P&amp;L</p>
                          <p className={`text-2xl font-black ${profit ? 'text-green-700' : 'text-red-600'}`}>
                            {profit ? '+' : ''}₹{Math.abs(h.pnlAmount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                      </div>

                      {/* Avg buy price vs current */}
                      <div className="rounded-2xl px-4 py-3 space-y-2" style={{ background:'rgba(248,250,252,0.8)', border:'1px solid rgba(226,232,240,0.8)' }}>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-stone-500">Avg Buy Price</span>
                          <span className="font-bold text-stone-700">₹{h.avgBuyPrice.toFixed(2)}<span className="text-xs font-normal text-stone-400">/g</span></span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-stone-500">Current Price</span>
                          <span className="font-bold text-stone-700">
                            {h.currentPrice > 0
                              ? <>₹{h.currentPrice.toFixed(2)}<span className="text-xs font-normal text-stone-400">/g</span></>
                              : <span className="text-stone-400 text-xs">Loading…</span>}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-t border-stone-100 pt-2">
                          <span className="text-stone-500">Current Value</span>
                          <span className="font-black text-stone-800">₹{h.currentValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        </div>
                      </div>

                      <a href="#/" className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl text-sm font-bold transition-all"
                        style={{ background:'linear-gradient(135deg,#fde68a,#f59e0b)', color:'#451a03' }}>
                        <ShoppingCart size={14} /> Buy More
                      </a>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Quick link to Orders ─────────────────────────────────────── */}
            {orders.length > 0 && (
              <div className="rounded-2xl px-5 py-4 flex items-center justify-between bg-white/70 dark:bg-gray-900 border border-amber-100 dark:border-gray-800">
                <p className="text-sm text-stone-600 dark:text-gray-400">
                  <span className="font-semibold text-stone-800 dark:text-white">{orders.length}</span> transaction{orders.length !== 1 ? 's' : ''} in total
                </p>
                <a href="#/orders" className="flex items-center gap-1.5 text-amber-600 hover:text-amber-800 dark:text-yellow-500 dark:hover:text-yellow-400 text-sm font-bold transition-colors">
                  View all orders →
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
