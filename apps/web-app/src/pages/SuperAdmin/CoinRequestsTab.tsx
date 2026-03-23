import React, { useMemo, useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { CoinPurchaseRequestRow } from './types';
import { fmtDate, fmtInr } from './utils';

interface Props {
  requests: CoinPurchaseRequestRow[];
  setRequests: React.Dispatch<React.SetStateAction<CoinPurchaseRequestRow[]>>;
  search: string;
  currentUser: any;
  userProfile: any;
  handleActionMsg: (text: string, type: 'ok' | 'err') => void;
}

const STATUS_ORDER = ['ACCEPTED', 'APPROVED', 'PREPARING', 'READY_TO_DISPATCH', 'DEPARTED', 'REJECTED'] as const;

export function CoinRequestsTab({ requests, setRequests, search, currentUser, userProfile, handleActionMsg }: Props) {
  const [statusDraft, setStatusDraft] = useState<Record<string, string>>({});
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((r) =>
      String(r.customerName || '').toLowerCase().includes(q)
      || String(r.customerEmail || '').toLowerCase().includes(q)
      || String(r.customerPhone || '').toLowerCase().includes(q)
      || String(r.deliveryCity || '').toLowerCase().includes(q)
      || String(r.metal || '').toLowerCase().includes(q)
      || String(r.shopName || '').toLowerCase().includes(q)
      || String(r.id || '').toLowerCase().includes(q),
    );
  }, [requests, search]);

  const counts = useMemo(() => {
    return requests.reduce((acc, r) => {
      const key = String(r.status || 'ACCEPTED').toUpperCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [requests]);

  const saveStatus = async (req: CoinPurchaseRequestRow) => {
    const nextStatus = (statusDraft[req.id] || req.status || 'ACCEPTED').toUpperCase() as CoinPurchaseRequestRow['status'];
    const nextNote = (noteDraft[req.id] ?? req.adminNote ?? '').trim();

    try {
      setSavingId(req.id);
      await updateDoc(doc(db, 'coinPurchaseOrders', req.id), {
        status: nextStatus,
        adminNote: nextNote,
        reviewedByUid: currentUser?.uid || '',
        reviewedByName: userProfile?.name || userProfile?.email || 'Super Admin',
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setRequests((prev) => prev.map((r) => (
        r.id === req.id
          ? {
              ...r,
              status: nextStatus,
              adminNote: nextNote,
              reviewedByUid: currentUser?.uid || '',
              reviewedByName: userProfile?.name || userProfile?.email || 'Super Admin',
              reviewedAt: new Date().toISOString(),
              orderStatusTimeline: [
                ...((Array.isArray(r.orderStatusTimeline) ? r.orderStatusTimeline : [])),
                {
                  status: String(nextStatus),
                  at: new Date().toISOString(),
                  by: userProfile?.name || userProfile?.email || 'Super Admin',
                },
              ],
            }
          : r
      )));
      handleActionMsg(`Coin order ${req.id.slice(0, 8)} updated to ${nextStatus}.`, 'ok');
    } catch (err: any) {
      handleActionMsg(`Failed to update request: ${err?.message || 'Unknown error'}`, 'err');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STATUS_ORDER.map((s) => (
          <div key={s} className="bg-white border border-amber-100 rounded-2xl px-4 py-3 shadow-sm">
            <p className="text-[11px] uppercase tracking-wide text-stone-500 font-semibold">{s}</p>
            <p className="text-2xl font-black text-amber-900 mt-0.5">{counts[s] || 0}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-amber-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1240px] text-sm">
            <thead>
              <tr className="bg-amber-50/70 border-b border-amber-100">
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-amber-900/70">Created</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-amber-900/70">Customer</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-amber-900/70">Request</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-amber-900/70">Delivery</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-amber-900/70">Status</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-amber-900/70">Admin Note</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-amber-900/70">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-14 text-stone-400 font-medium">No coin orders found.</td>
                </tr>
              )}
              {filtered.map((r, idx) => {
                const selectedStatus = statusDraft[r.id] || String(r.status || 'ACCEPTED').toUpperCase();
                return (
                  <tr key={r.id} className={`border-b border-stone-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/40'}`}>
                    <td className="px-4 py-3 align-top">
                      <p className="font-semibold text-stone-700">{fmtDate(r.createdAt)}</p>
                      <p className="text-[10px] text-stone-400 font-mono mt-1">{r.id}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="font-bold text-stone-800">{r.customerName || '-'}</p>
                      <p className="text-xs text-stone-500">{r.customerEmail || '-'}</p>
                      <p className="text-xs text-stone-500">{r.customerPhone || '-'}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="font-semibold text-stone-800">{r.quantity || 0} × {r.weightGrams || 0}g {r.metal || '-'}</p>
                      <p className="text-xs text-stone-500">Order value: {fmtInr(Number(r.totalAmountInr || 0), false)}</p>
                      <p className="text-xs text-stone-500">Payment: {(r.paymentStatus || 'PAID')} {r.razorpayPaymentId ? `(${r.razorpayPaymentId})` : ''}</p>
                      <p className="text-[11px] text-stone-500 mt-1">Shop: {r.shopName || 'N/A'}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="font-semibold text-stone-700">{r.deliveryCity || '-'}</p>
                      <p className="text-xs text-stone-500 mt-1">{r.customerNote || 'No customer note'}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <select
                        value={selectedStatus}
                        onChange={(e) => setStatusDraft((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        className="rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-xs font-bold text-amber-900"
                      >
                        {STATUS_ORDER.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <textarea
                        value={noteDraft[r.id] ?? r.adminNote ?? ''}
                        onChange={(e) => setNoteDraft((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        rows={2}
                        className="w-full min-w-[220px] rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs text-stone-700"
                        placeholder="Add note shown to internal team"
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <button
                        onClick={() => saveStatus(r)}
                        disabled={savingId === r.id}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 text-black text-xs font-bold"
                      >
                        {savingId === r.id ? 'Saving...' : 'Save'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
