/**
 * Orders Page - Customer View
 *
 * Shows all orders for the logged-in customer.
 * Supports invoice generation & PDF download per order.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart, ArrowUpRight, Loader2, AlertCircle,
  RefreshCw, Package, FileText, Download, Coins, TrendingUp, Star, Gift
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchCustomerOrders } from '../lib/customerOrders';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
  isGift?: boolean;
  giftReceiverName?: string;
  giftSenderName?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  shopName?: string;
  shopId?: string;
  createdAt: any;
}

interface CoinRequest {
  id: string;
  metal?: 'GOLD' | 'SILVER';
  weightGrams?: number;
  quantity?: number;
  status?: 'ACCEPTED' | 'APPROVED' | 'PREPARING' | 'READY_TO_DISPATCH' | 'DEPARTED' | 'REJECTED';
  totalAmountInr?: number;
  paymentStatus?: 'PAID' | 'FAILED' | 'PENDING';
  razorpayPaymentId?: string;
  makingChargesTotalInr?: number;
  deliveryCity?: string;
  orderStatusTimeline?: Array<{ status: string; at: string; by: string }>;
  createdAt?: any;
}

interface AutoPaySubscription {
  id: string;
  metal: string;
  amountInr: number;
  frequency: string;
  razorpaySubscriptionId: string;
  status: string;
  createdAt?: any;
}

// ── Invoice Generator ────────────────────────────────────────────────────────
function generateInvoiceHTML(order: GoldOrder, customerName: string, customerEmail: string, registeredJeweller: string): string {
  const date = order.createdAt?.toDate
    ? order.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  const invoiceNo = `INV-${order.id.slice(-8).toUpperCase()}`;
  const metalLabel = `${order.metal} ${order.purity}K`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${invoiceNo}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a1a1a; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #d97706; padding-bottom: 20px; margin-bottom: 24px; }
    .brand h1 { font-size: 28px; font-weight: 900; color: #92400e; }
    .brand p { color: #b45309; font-size: 12px; margin-top: 2px; }
    .invoice-meta { text-align: right; }
    .invoice-meta h2 { font-size: 20px; color: #78350f; font-weight: 700; }
    .invoice-meta p { font-size: 12px; color: #555; margin-top: 2px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #92400e; font-weight: 700; margin-bottom: 8px; }
    .customer-grid, .order-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; }
    .label { font-size: 11px; color: #888; }
    .value { font-size: 13px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { background: #fef3c7; color: #78350f; font-size: 11px; text-transform: uppercase; padding: 8px 12px; text-align: left; }
    td { padding: 10px 12px; border-bottom: 1px solid #fde68a; font-size: 13px; }
    .total-row td { font-weight: 700; font-size: 15px; border-top: 2px solid #d97706; background: #fffbeb; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
    .badge-buy { background: #d1fae5; color: #065f46; }
    .badge-sell { background: #fed7aa; color: #9a3412; }
    .badge-success { background: #d1fae5; color: #065f46; }
    .badge-pending { background: #fef9c3; color: #713f12; }
    .footer { margin-top: 32px; border-top: 1px solid #fde68a; padding-top: 16px; font-size: 11px; color: #888; text-align: center; }
    .amount-highlight { font-size: 24px; font-weight: 900; color: #92400e; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <h1>💰 Devichand D Mirande</h1>
      <p>Digital Gold & Silver Investment Ledger</p>
      <p>Registered Jeweller Reference: ${registeredJeweller || 'Not linked'}</p>
    </div>
    <div class="invoice-meta">
      <h2>INVOICE</h2>
      <p>${invoiceNo}</p>
      <p>Date: ${date}</p>
      ${order.razorpayPaymentId ? `<p>Payment ID: ${order.razorpayPaymentId}</p>` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Bill To</div>
    <div class="customer-grid">
      <div><div class="label">Customer Name</div><div class="value">${customerName || '-'}</div></div>
      <div><div class="label">Email</div><div class="value">${customerEmail || '-'}</div></div>
      ${order.customerPhone ? `<div><div class="label">Phone</div><div class="value">${order.customerPhone}</div></div>` : ''}
      <div><div class="label">Registered Under Jeweller</div><div class="value">${registeredJeweller || 'Not linked'}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Order Details</div>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Type</th>
          <th>Weight</th>
          <th>Rate / Gram</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${metalLabel} ${order.type === 'BUY' ? 'Purchase' : 'Sale'}</td>
          <td><span class="badge ${order.type === 'BUY' ? 'badge-buy' : 'badge-sell'}">${order.type}</span></td>
          <td>${order.grams.toFixed(4)} g</td>
          <td>₹${order.ratePerGram.toLocaleString('en-IN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
          <td>₹${order.totalAmountInr.toLocaleString('en-IN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
        </tr>
        <tr class="total-row">
          <td colspan="4" style="text-align:right">Total Amount</td>
          <td class="amount-highlight">₹${order.totalAmountInr.toLocaleString('en-IN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section" style="margin-top:16px">
    <div style="display:inline-block">
      <div class="label">Status</div>
      <span class="badge ${order.status === 'SUCCESS' ? 'badge-success' : 'badge-pending'}">${order.status}</span>
    </div>
  </div>

  <div class="footer">
    <p>Thank you for choosing Devichand D Mirande. This is a computer-generated invoice.</p>
    <p style="margin-top:4px">For queries, contact contact@bizmation.in</p>
  </div>
</body>
</html>`;
}

function downloadInvoice(order: GoldOrder, customerName: string, customerEmail: string, registeredJeweller: string) {
  const html = generateInvoiceHTML(order, customerName, customerEmail, registeredJeweller);
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 600);
}

// ── Component ────────────────────────────────────────────────────────────────
export const Orders: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [orders, setOrders] = useState<GoldOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [search, setSearch] = useState('');
  const [coinRequests, setCoinRequests] = useState<CoinRequest[]>([]);
  const [sipSubscriptions, setSipSubscriptions] = useState<AutoPaySubscription[]>([]);

  const fetchOrders = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError('');
    try {
      const [result, coinSnap, sipSnap] = await Promise.all([
        fetchCustomerOrders({
          uid: currentUser.uid,
          email: currentUser.email ?? userProfile?.email ?? '',
          phone: userProfile?.phone ?? '',
        }),
        getDocs(query(collection(db, 'coinPurchaseOrders'), where('customerUid', '==', currentUser.uid))),
        getDocs(query(collection(db, 'autoPaySubscriptions'), where('userId', '==', currentUser.uid))),
      ]);
      setOrders(result as GoldOrder[]);
      const coinRows = coinSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as CoinRequest));
      coinRows.sort((a, b) => {
        const at = a.createdAt?.seconds ? a.createdAt.seconds : 0;
        const bt = b.createdAt?.seconds ? b.createdAt.seconds : 0;
        return bt - at;
      });
      setCoinRequests(coinRows);

      const sipRows = sipSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as AutoPaySubscription));
      sipRows.sort((a, b) => {
        const at = a.createdAt?.seconds ? a.createdAt.seconds : 0;
        const bt = b.createdAt?.seconds ? b.createdAt.seconds : 0;
        return bt - at;
      });
      setSipSubscriptions(sipRows);
    } catch (err: any) {
      // console.error('[Orders] fetch failed', err);
      const code = err?.code ? ` (${err.code})` : '';
      setError(`Could not load orders${code}. Check debug details below.`);
    } finally {
      setLoading(false);
    }
  }, [currentUser, userProfile]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const customerName = userProfile?.name ?? currentUser?.displayName ?? '';
  const customerEmail = userProfile?.email ?? currentUser?.email ?? '';

  const displayed = orders.filter(o => {
    const matchType = typeFilter === 'ALL' || o.type === typeFilter;
    const searchLower = search.toLowerCase();
    const matchSearch = !search ||
      o.metal?.toLowerCase().includes(searchLower) ||
      o.status?.toLowerCase().includes(searchLower) ||
      o.razorpayPaymentId?.toLowerCase().includes(searchLower);
    return matchType && matchSearch;
  });

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-black text-gray-900 dark:text-white">
      {/* Header */}
      <div className="bg-gradient-to-br from-stone-50 via-stone-100 to-amber-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 border-b border-stone-200 dark:border-gray-800 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black text-stone-800 dark:text-white mb-1 flex items-center gap-3">
              <FileText className="text-stone-500 dark:text-gray-400" size={30} />
              Transaction Log
            </h1>
            <p className="text-stone-500 dark:text-gray-400 text-sm">
              Every buy &amp; sell transaction - with invoice download
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <a href="#/portfolio" className="flex items-center gap-1.5 text-amber-600 hover:text-amber-800 dark:text-yellow-500 text-sm font-bold transition-colors">
              ← View Portfolio
            </a>
            <button onClick={fetchOrders} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-stone-700 hover:bg-stone-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* ── Filter bar ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 p-1 rounded-xl bg-stone-100 dark:bg-gray-800 border border-stone-200 dark:border-gray-700">
            {(['ALL', 'BUY', 'SELL'] as const).map(f => (
              <button key={f} onClick={() => setTypeFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${typeFilter === f
                    ? f === 'BUY'
                      ? 'bg-green-500 text-white shadow'
                      : f === 'SELL'
                        ? 'bg-orange-500 text-white shadow'
                        : 'bg-stone-700 text-white shadow'
                    : 'text-stone-500 dark:text-gray-400 hover:bg-stone-200 dark:hover:bg-gray-700'
                  }`}>{f}</button>
            ))}
          </div>
          <input type="search" placeholder="Search metal, status, payment ID…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[180px] max-w-xs rounded-xl border border-stone-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800 px-4 py-2 text-sm text-stone-700 dark:text-white placeholder-stone-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <span className="text-xs text-stone-400 dark:text-gray-500 ml-auto">
            {displayed.length} of {orders.length} transactions
          </span>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
            <AlertCircle className="text-red-500" size={18} />
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Orders Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-amber-500" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-900 border border-stone-100 dark:border-gray-800 rounded-2xl">
            <Package size={40} className="text-stone-300 dark:text-gray-700 mx-auto mb-4" />
            <p className="text-stone-500 dark:text-gray-400 font-semibold">{orders.length === 0 ? 'No orders yet' : 'No results for current filter'}</p>
            {orders.length === 0 && (
              <a href="#/" className="mt-5 inline-flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl text-sm transition-colors">
                <ShoppingCart size={15} /> Buy Gold
              </a>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-950 border border-stone-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stone-100 dark:border-gray-800 bg-stone-50 dark:bg-gray-900">
                    <th className="text-left py-3 px-4 text-stone-500 dark:text-gray-400 text-xs font-semibold uppercase">Date</th>
                    <th className="text-left py-3 px-4 text-stone-500 dark:text-gray-400 text-xs font-semibold uppercase">Type</th>
                    <th className="text-left py-3 px-4 text-stone-500 dark:text-gray-400 text-xs font-semibold uppercase">Metal</th>
                    <th className="text-right py-3 px-4 text-stone-500 dark:text-gray-400 text-xs font-semibold uppercase">Weight</th>
                    <th className="text-right py-3 px-4 text-stone-500 dark:text-gray-400 text-xs font-semibold uppercase">Rate/g</th>
                    <th className="text-right py-3 px-4 text-stone-500 dark:text-gray-400 text-xs font-semibold uppercase">Amount</th>
                    <th className="text-left py-3 px-4 text-stone-500 dark:text-gray-400 text-xs font-semibold uppercase">Status</th>
                    <th className="py-3 px-4 text-stone-500 dark:text-gray-400 text-xs font-semibold uppercase">Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map(order => {
                    const date = order.createdAt?.toDate
                      ? order.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '-';
                    return (
                      <tr key={order.id} className="border-b border-stone-50 dark:border-gray-800/60 hover:bg-stone-50 dark:hover:bg-gray-900/50 transition-colors">
                        <td className="py-3.5 px-4 text-sm text-stone-600 dark:text-gray-300 whitespace-nowrap">{date}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${order.isGift
                            ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400'
                            : order.type === 'BUY'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                            }`}>
                            {order.isGift ? <Star size={10} /> : (order.type === 'BUY' ? <ShoppingCart size={10} /> : <ArrowUpRight size={10} />)}
                            {order.isGift ? (order.type === 'SELL' ? 'GIFT SENT' : 'GIFT RECVD') : order.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-sm font-semibold text-stone-700 dark:text-gray-300">
                          {order.metal} {order.purity}K
                        </td>
                        <td className="py-3.5 px-4 text-right text-sm font-black text-stone-800 dark:text-white">
                          {order.grams.toFixed(4)}g
                        </td>
                        <td className="py-3.5 px-4 text-right text-sm text-stone-600 dark:text-gray-300">
                          ₹{order.ratePerGram?.toLocaleString('en-IN', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) ?? '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right text-sm font-black text-stone-800 dark:text-white">
                          ₹{order.totalAmountInr?.toLocaleString('en-IN', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) ?? '-'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${order.status === 'SUCCESS'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : order.status === 'PENDING'
                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                            }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => downloadInvoice(order, customerName, customerEmail, order.shopName || userProfile?.shopName || '')}
                            title="Download Invoice"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-stone-100 dark:bg-gray-800 hover:bg-stone-200 dark:hover:bg-gray-700 text-stone-700 dark:text-gray-300 rounded-lg text-xs font-bold transition-colors">
                            <Download size={12} />
                            PDF
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="text-xs text-center text-stone-400 dark:text-gray-600">
          Click <strong>PDF</strong> on any order to print or save as PDF invoice.
        </p>

        <div className="bg-white dark:bg-gray-950 border border-stone-100 dark:border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-black text-stone-800 dark:text-white flex items-center gap-2">
              <Coins size={16} className="text-amber-500" /> Coin Purchase Orders
            </h2>
            <span className="text-xs text-stone-500">{coinRequests.length} order(s)</span>
          </div>
          {coinRequests.length === 0 ? (
            <p className="text-sm text-stone-500">No coin orders yet. Place one from Home → Buy Coins.</p>
          ) : (
            <div className="space-y-2.5">
              {coinRequests.map((r) => {
                const dt = r.createdAt?.toDate
                  ? r.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '-';
                return (
                  <div key={r.id} className="rounded-xl border border-amber-100 bg-amber-50/40 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-bold text-amber-900">{r.quantity || 0} × {r.weightGrams || 0}g {r.metal || '-'} coin</p>
                      <p className="text-xs text-amber-700">{dt} · Delivery: {r.deliveryCity || '-'}</p>
                      <p className="text-[11px] text-stone-600 mt-1">Payment: {r.paymentStatus || 'PAID'}{r.razorpayPaymentId ? ` · ${r.razorpayPaymentId}` : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-stone-900">₹{Number(r.totalAmountInr || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p className="text-xs font-semibold text-stone-600">Status: {r.status || 'ACCEPTED'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SIP Subscriptions Table */}
        <div className="bg-white dark:bg-gray-950 border border-stone-100 dark:border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-black text-stone-800 dark:text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-amber-500" /> SIP (AutoPay) Subscriptions
            </h2>
            <span className="text-xs text-stone-500">{sipSubscriptions.length} active(s)</span>
          </div>
          {sipSubscriptions.length === 0 ? (
            <p className="text-sm text-stone-500">No SIP subscriptions yet. Setup from Home → Gold SIP.</p>
          ) : (
            <div className="space-y-2.5">
              {sipSubscriptions.map((s) => {
                const dt = s.createdAt?.toDate
                  ? s.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '-';
                return (
                  <div key={s.id} className="rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-900/10 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-bold text-blue-900 dark:text-blue-100">{s.metal} SIP - {s.frequency}</p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">Started: {dt} · ID: {s.razorpaySubscriptionId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-stone-900 dark:text-white">₹{Number(s.amountInr || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p className="text-xs font-semibold text-stone-600 dark:text-gray-300">Status: {s.status}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
