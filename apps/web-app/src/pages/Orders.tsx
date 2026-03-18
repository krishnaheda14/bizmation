/**
 * Orders Page — Customer View
 *
 * Shows all orders for the logged-in customer.
 * Supports invoice generation & PDF download per order.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart, ArrowUpRight, Loader2, AlertCircle,
  RefreshCw, Package, FileText, Download, Coins, TrendingUp,
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
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
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  createdAt: any;
}

// ── Invoice Generator ────────────────────────────────────────────────────────
function generateInvoiceHTML(order: GoldOrder, customerName: string, customerEmail: string): string {
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
      <h1>💰 Bizmation Gold</h1>
      <p>Gold & Silver Online Platform</p>
      <p>www.bizmation.com</p>
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
      <div><div class="label">Customer Name</div><div class="value">${customerName || '—'}</div></div>
      <div><div class="label">Email</div><div class="value">${customerEmail || '—'}</div></div>
      ${order.customerPhone ? `<div><div class="label">Phone</div><div class="value">${order.customerPhone}</div></div>` : ''}
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
          <td>${order.grams.toFixed(3)} g</td>
          <td>₹${order.ratePerGram.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
          <td>₹${order.totalAmountInr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
        </tr>
        <tr class="total-row">
          <td colspan="4" style="text-align:right">Total Amount</td>
          <td class="amount-highlight">₹${order.totalAmountInr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
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
    <p>Thank you for choosing Bizmation Gold. This is a computer-generated invoice.</p>
    <p style="margin-top:4px">For queries, contact support@bizmation.com</p>
  </div>
</body>
</html>`;
}

function downloadInvoice(order: GoldOrder, customerName: string, customerEmail: string) {
  const html = generateInvoiceHTML(order, customerName, customerEmail);
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 600);
}

// ── Component ────────────────────────────────────────────────────────────────
export const Orders: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [orders, setOrders]     = useState<GoldOrder[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [search, setSearch]     = useState('');

  const normalizePhone = (raw: string): string => {
    if (!raw) return '';
    const trimmed = String(raw).trim();
    if (trimmed.startsWith('+')) return '+' + trimmed.slice(1).replace(/\D/g, '');
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    return digits ? `+${digits}` : '';
  };

  const fetchOrders = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError('');
    try {
      const seen: Record<string, GoldOrder> = {};

      const q1 = query(collection(db, 'goldOnlineOrders'), where('userId', '==', currentUser.uid));
      const s1 = await getDocs(q1);
      s1.docs.forEach(d => { seen[d.id] = { id: d.id, ...(d.data() as any) } as GoldOrder; });

      const email = (currentUser.email ?? userProfile?.email ?? '').trim();
      const emailCandidates = Array.from(new Set([email, email.toLowerCase()].filter(Boolean)));
      for (const candidate of emailCandidates) {
        const q2 = query(collection(db, 'goldOnlineOrders'), where('customerEmail', '==', candidate));
        const s2 = await getDocs(q2);
        s2.docs.forEach(d => { seen[d.id] = { id: d.id, ...(d.data() as any) } as GoldOrder; });
      }

      const rawPhone = (userProfile?.phone ?? '').trim();
      const phoneCandidates = Array.from(new Set([rawPhone, normalizePhone(rawPhone)].filter(Boolean)));
      for (const candidate of phoneCandidates) {
        const q3 = query(collection(db, 'goldOnlineOrders'), where('customerPhone', '==', candidate));
        const s3 = await getDocs(q3);
        s3.docs.forEach(d => { seen[d.id] = { id: d.id, ...(d.data() as any) } as GoldOrder; });
      }

      const sorted = Object.values(seen).sort((a, b) => {
        const at = a.createdAt?.seconds ?? 0;
        const bt = b.createdAt?.seconds ?? 0;
        return bt - at;
      });
      setOrders(sorted);
    } catch {
      setError('Could not load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, userProfile]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const customerName  = userProfile?.name  ?? currentUser?.displayName ?? '';
  const customerEmail = userProfile?.email ?? currentUser?.email ?? '';

  const displayed = orders.filter(o => {
    const matchType   = typeFilter === 'ALL' || o.type === typeFilter;
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
              Every buy &amp; sell transaction — with invoice download
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
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  typeFilter === f
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
                      : '—';
                    return (
                      <tr key={order.id} className="border-b border-stone-50 dark:border-gray-800/60 hover:bg-stone-50 dark:hover:bg-gray-900/50 transition-colors">
                        <td className="py-3.5 px-4 text-sm text-stone-600 dark:text-gray-300 whitespace-nowrap">{date}</td>
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
                        <td className="py-3.5 px-4 text-sm font-semibold text-stone-700 dark:text-gray-300">
                          {order.metal} {order.purity}K
                        </td>
                        <td className="py-3.5 px-4 text-right text-sm font-black text-stone-800 dark:text-white">
                          {order.grams.toFixed(3)}g
                        </td>
                        <td className="py-3.5 px-4 text-right text-sm text-stone-600 dark:text-gray-300">
                          ₹{order.ratePerGram?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) ?? '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right text-sm font-black text-stone-800 dark:text-white">
                          ₹{order.totalAmountInr?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) ?? '—'}
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
                        <td className="py-3.5 px-4 text-center">
                          <button onClick={() => downloadInvoice(order, customerName, customerEmail)} title="Download Invoice"
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
      </div>
    </div>
  );
};
