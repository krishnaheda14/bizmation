/**
 * Redemption Requests – Owner View
 *
 * • Real-time Firestore listener on `redemptionRequests` for the owner's shop
 * • Filter by status tabs: All / Pending / Approved / Settled / Rejected
 * • Approve / Settle / Reject with optional note
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  collection, query, where, onSnapshot, doc, updateDoc,
  serverTimestamp, orderBy, Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CheckCircle, XCircle, Clock, ArrowDownCircle, SlidersHorizontal } from 'lucide-react';

interface RedemptionRequest {
  id: string;
  customerName: string;
  customerEmail: string;
  customerUid: string;
  shopName: string;
  metal: string;
  purity: string;
  grams: number;
  ratePerGram: number;
  estimatedInr: number;
  status: 'PENDING' | 'APPROVED' | 'SETTLED' | 'REJECTED';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  adminNote?: string;
}

type FilterStatus = 'ALL' | 'PENDING' | 'APPROVED' | 'SETTLED' | 'REJECTED';

const fmtInr = (v: number) => '₹' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtG   = (v: number) => (v || 0).toFixed(3) + 'g';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING:  'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    SETTLED:  'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
    REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${map[status] ?? ''}`}>
      {status}
    </span>
  );
}

export const RedemptionRequests: React.FC = () => {
  const { userProfile } = useAuth();
  const shopName = (userProfile as any)?.shopName ?? '';

  const [requests, setRequests]     = useState<RedemptionRequest[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState<FilterStatus>('PENDING');
  const [actionMap, setActionMap]   = useState<Record<string, boolean>>({});  // requestId → loading
  const [noteMap, setNoteMap]       = useState<Record<string, string>>({});   // requestId → note text
  const [expandId, setExpandId]     = useState<string | null>(null);

  useEffect(() => {
    if (!shopName) { setLoading(false); return; }
    const q = query(
      collection(db, 'redemptionRequests'),
      where('shopName', '==', shopName),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, snap => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as RedemptionRequest)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [shopName]);

  const setStatus = async (id: string, status: RedemptionRequest['status']) => {
    setActionMap(m => ({ ...m, [id]: true }));
    try {
      await updateDoc(doc(db, 'redemptionRequests', id), {
        status,
        adminNote: noteMap[id] ?? '',
        updatedAt: serverTimestamp(),
      });
      setExpandId(null);
    } finally {
      setActionMap(m => ({ ...m, [id]: false }));
    }
  };

  const filtered = filter === 'ALL' ? requests : requests.filter(r => r.status === filter);

  const counts = {
    ALL:      requests.length,
    PENDING:  requests.filter(r => r.status === 'PENDING').length,
    APPROVED: requests.filter(r => r.status === 'APPROVED').length,
    SETTLED:  requests.filter(r => r.status === 'SETTLED').length,
    REJECTED: requests.filter(r => r.status === 'REJECTED').length,
  };

  const totalPendingInr = requests.filter(r => r.status === 'PENDING').reduce((s, r) => s + r.estimatedInr, 0);

  const TABS: { key: FilterStatus; label: string }[] = [
    { key: 'PENDING',  label: 'Pending' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'SETTLED',  label: 'Settled' },
    { key: 'REJECTED', label: 'Rejected' },
    { key: 'ALL',      label: 'All' },
  ];

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-gray-950 pb-16">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 dark:from-gray-900 dark:to-gray-900 border-b border-amber-200 dark:border-yellow-900/30 px-4 sm:px-8 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-black text-amber-900 dark:text-white flex items-center gap-3">
            <ArrowDownCircle className="text-amber-500" size={28} />
            Redemption Requests
          </h1>
          <p className="text-amber-700/70 dark:text-gray-400 text-sm mt-1">
            Review and process customer sell / redeem requests for your shop.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-8 space-y-6">

        {/* Summary strip */}
        {counts.PENDING > 0 && (
          <div className="rounded-2xl px-6 py-4 flex items-center gap-4"
            style={{ background: 'linear-gradient(135deg,#fef9ee,#fde68a)', border: '1px solid rgba(251,191,36,0.4)' }}>
            <Clock size={22} className="text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-black text-amber-900">
                {counts.PENDING} pending request{counts.PENDING > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-amber-700">Total estimated value pending: <strong>{fmtInr(totalPendingInr)}</strong></p>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap items-center">
          <SlidersHorizontal size={14} className="text-stone-400" />
          {TABS.map(t => (
            <button key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                filter === t.key
                  ? 'border-amber-400 text-amber-900 dark:text-amber-200 shadow-sm'
                  : 'border-stone-200 dark:border-gray-700 text-stone-500 dark:text-gray-400 hover:border-amber-300'
              }`}
              style={filter === t.key ? { background: 'linear-gradient(135deg,#fef9ee,#fde68a)' } : undefined}>
              {t.label}
              {counts[t.key] > 0 && (
                <span className="ml-1.5 bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded-full px-1.5 py-0.5 text-[10px]">
                  {counts[t.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-stone-400">No {filter !== 'ALL' ? filter.toLowerCase() : ''} requests.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(r => {
              const isExpanded = expandId === r.id;
              const ts = r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000) : null;
              const loading = actionMap[r.id] ?? false;

              return (
                <div key={r.id}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-amber-100 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {/* Main row */}
                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Customer */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-white font-black text-xs flex-shrink-0">
                            {(r.customerName || r.customerEmail || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-stone-800 dark:text-white text-sm">{r.customerName || 'Customer'}</p>
                            <p className="text-xs text-stone-400">{r.customerEmail}</p>
                          </div>
                        </div>
                        {/* Details */}
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-stone-500 dark:text-gray-400 mt-1">
                          <span>{r.metal} {r.purity}</span>
                          <span className="font-bold text-stone-700 dark:text-gray-200">{fmtG(r.grams)}</span>
                          <span>@ {fmtInr(r.ratePerGram)}/g</span>
                          <span className="font-bold text-amber-700 dark:text-amber-400">{fmtInr(r.estimatedInr)}</span>
                          {ts && <span>{ts.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                        </div>
                        {r.adminNote && (
                          <p className="text-xs text-stone-400 mt-1 italic">Note: {r.adminNote}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <StatusBadge status={r.status} />
                        {r.status === 'PENDING' && (
                          <button
                            onClick={() => setExpandId(isExpanded ? null : r.id)}
                            className="text-xs text-amber-600 hover:text-amber-800 font-bold underline transition-colors">
                            {isExpanded ? 'Close' : 'Take Action'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action panel (expand for PENDING) */}
                  {isExpanded && r.status === 'PENDING' && (
                    <div className="border-t border-amber-100 dark:border-gray-800 px-5 py-4 bg-amber-50/40 dark:bg-gray-800/40 space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-stone-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                          Note for Customer (optional)
                        </label>
                        <input type="text"
                          value={noteMap[r.id] ?? ''}
                          onChange={e => setNoteMap(m => ({ ...m, [r.id]: e.target.value }))}
                          placeholder="e.g. Please visit the shop tomorrow at 11 AM"
                          className="w-full px-3.5 py-2 rounded-xl border border-stone-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 text-stone-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition-colors" />
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          disabled={loading}
                          onClick={() => setStatus(r.id, 'APPROVED')}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
                          style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 2px 8px rgba(34,197,94,0.3)' }}>
                          <CheckCircle size={14} /> Approve
                        </button>
                        <button
                          disabled={loading}
                          onClick={() => setStatus(r.id, 'SETTLED')}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
                          style={{ background: 'linear-gradient(135deg,#0d9488,#0f766e)', boxShadow: '0 2px 8px rgba(13,148,136,0.3)' }}>
                          <CheckCircle size={14} /> Mark Settled
                        </button>
                        <button
                          disabled={loading}
                          onClick={() => setStatus(r.id, 'REJECTED')}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
                          style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 2px 8px rgba(239,68,68,0.3)' }}>
                          <XCircle size={14} /> Reject
                        </button>
                      </div>
                      <p className="text-xs text-stone-400 text-center">
                        Settlement can be done online or offline at your discretion.
                      </p>
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
