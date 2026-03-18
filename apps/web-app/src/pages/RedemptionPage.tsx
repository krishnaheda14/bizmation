/**
 * Redemption Page – Customer
 *
 * - Uses live rates from shared pricing utility
 * - Applies redeem formula only for redemption:
 *     redeemRate = (liveMarketRate * 0.97) - 50
 * - Allows submit only if customer has enough net holdings
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TrendingDown, ArrowDownCircle, Clock, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { fetchLiveMetalRates, type MetalRate } from '../lib/goldPrices';
import { fetchCustomerOrders, normalizeGoldPurity } from '../lib/customerOrders';

interface PortfolioEntry {
  metal: 'GOLD' | 'SILVER';
  purity: number;
  grams: number;
  avgRatePerGram: number;
}

interface GoldOrder {
  id: string;
  metal: string;
  purity: number;
  grams: number;
  ratePerGram: number;
  type: 'BUY' | 'SELL';
  status?: string;
}

interface RedemptionRequest {
  id: string;
  metal: 'GOLD' | 'SILVER';
  purity: number;
  grams: number;
  marketRatePerGram: number;
  redeemRatePerGram: number;
  estimatedInr: number;
  status: string;
  createdAt?: Timestamp;
  notes?: string;
}

const REDEEM_GST_FACTOR = 0.97;
const REDEEM_DEDUCTION_PER_GRAM = 50;

const METAL_PURITIES: Record<'GOLD' | 'SILVER', number[]> = {
  GOLD: [995],
  SILVER: [999],
};

const fmtInr = (v: number) => '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const fmtG = (v: number) => (v || 0).toFixed(4) + 'g';

const purityLabel = (metal: 'GOLD' | 'SILVER', purity: number) => {
  if (metal === 'SILVER') return String(purity);
  if (purity === 995) return '24K (995)';
  if (purity === 999) return '24K (999)';
  if (purity === 916) return '22K (916)';
  if (purity === 750) return '18K (750)';
  return `${purity}`;
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; icon: React.ReactNode; style: string }> = {
    PENDING: { label: 'Pending', icon: <Clock size={12} />, style: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
    APPROVED: { label: 'Approved', icon: <CheckCircle size={12} />, style: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
    SETTLED: { label: 'Settled', icon: <CheckCircle size={12} />, style: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300' },
    REJECTED: { label: 'Rejected', icon: <XCircle size={12} />, style: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  };
  const cfg = map[status] ?? map.PENDING;
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.style}`}>{cfg.icon}{cfg.label}</span>;
}

export const RedemptionPage: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const shopName = ((userProfile as any)?.shopName ?? '') as string;
  const shopId = ((userProfile as any)?.shopId ?? '') as string;

  const [portfolio, setPortfolio] = useState<PortfolioEntry[]>([]);
  const [requests, setRequests] = useState<RedemptionRequest[]>([]);
  const [rates, setRates] = useState<MetalRate[]>([]);
  const [loadingPortfolio, setLoadingPf] = useState(true);
  const [loadingReqs, setLoadingReqs] = useState(true);
  const [loadingRates, setLoadingRates] = useState(true);

  const [metal, setMetal] = useState<'GOLD' | 'SILVER'>('GOLD');
  const [purity, setPurity] = useState<number>(995);
  const [gramsStr, setGramsStr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadRates = async () => {
      setLoadingRates(true);
      try {
        const liveRates = await fetchLiveMetalRates();
        if (mounted) setRates(liveRates);
      } finally {
        if (mounted) setLoadingRates(false);
      }
    };

    loadRates();
    const id = setInterval(loadRates, 10000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setLoadingPf(false);
      return;
    }

    const run = async () => {
      setLoadingPf(true);
      const orders = await fetchCustomerOrders({
        uid: currentUser.uid,
        email: currentUser.email ?? userProfile?.email ?? '',
        phone: userProfile?.phone ?? '',
      });

      const ledger: Record<string, { grams: number; totalInr: number }> = {};
      Object.values(orders).forEach((o) => {
        const m = (o.metal ?? '').toUpperCase();
        if (m !== 'GOLD' && m !== 'SILVER') return;
        const pRaw = Number(o.purity) || 0;
        const p = m === 'GOLD' ? normalizeGoldPurity(pRaw) : pRaw;
        if (!p) return;
        const key = `${m}|${p}`;
        if (!ledger[key]) ledger[key] = { grams: 0, totalInr: 0 };

        const g = Number(o.grams) || 0;
        const inr = g * (Number(o.ratePerGram) || 0);
        const t = (o.type ?? '').toUpperCase();
        const s = (o.status ?? '').toUpperCase();

        if (t === 'BUY' && s === 'SUCCESS') {
          ledger[key].grams += g;
          ledger[key].totalInr += inr;
        }
        if (t === 'SELL' && s !== 'REJECTED') {
          ledger[key].grams -= g;
          ledger[key].totalInr -= inr;
        }
      });

      const entries: PortfolioEntry[] = Object.entries(ledger)
        .filter(([, v]) => v.grams > 0.0001)
        .map(([k, v]) => {
          const [m, p] = k.split('|');
          const grams = Number(v.grams) || 0;
          return {
            metal: m as 'GOLD' | 'SILVER',
            purity: Number(p),
            grams,
            avgRatePerGram: grams > 0 ? v.totalInr / grams : 0,
          };
        });

      setPortfolio(entries);
      setLoadingPf(false);
    };

    run().catch(() => setLoadingPf(false));
  }, [currentUser, userProfile]);

  useEffect(() => {
    if (!currentUser) {
      setLoadingReqs(false);
      return;
    }
    const q = query(
      collection(db, 'redemptionRequests'),
      where('customerUid', '==', currentUser.uid),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RedemptionRequest)));
        setLoadingReqs(false);
      },
      () => setLoadingReqs(false),
    );
    return () => unsub();
  }, [currentUser]);

  const grams = parseFloat(gramsStr) || 0;

  const heldEntry = useMemo(
    () => portfolio.find((p) => p.metal === metal && p.purity === purity),
    [portfolio, metal, purity],
  );

  const liveRate = useMemo(
    () => {
      if (metal === 'GOLD') {
        return rates.find((r) => r.metalType === 'GOLD' && Number(r.purity) === 995)?.ratePerGram
          ?? rates.find((r) => r.metalType === 'GOLD' && Number(r.purity) === 999)?.ratePerGram
          ?? 0;
      }
      return rates.find((r) => r.metalType === 'SILVER' && Number(r.purity) === 999)?.ratePerGram ?? 0;
    },
    [rates, metal, purity],
  );

  const redeemRatePerGram = useMemo(
    () => Math.max(0, Math.round(((liveRate * REDEEM_GST_FACTOR) - REDEEM_DEDUCTION_PER_GRAM) * 100) / 100),
    [liveRate],
  );

  const estimatedInr = grams * redeemRatePerGram;
  const heldGrams = heldEntry?.grams ?? 0;
  const gramsError = grams > 0 && grams > heldGrams;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitMsg(null);
    if (!currentUser || !userProfile) return;

    if (grams <= 0) {
      setSubmitMsg({ type: 'err', text: 'Enter valid grams to redeem.' });
      return;
    }
    if (gramsError) {
      setSubmitMsg({ type: 'err', text: `You only hold ${fmtG(heldGrams)} of ${metal} ${purityLabel(metal, purity)}.` });
      return;
    }
    if (!liveRate || !redeemRatePerGram) {
      setSubmitMsg({ type: 'err', text: 'Live rate unavailable. Please retry in a moment.' });
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'redemptionRequests'), {
        customerUid: currentUser.uid,
        customerName: (userProfile as any)?.name ?? currentUser.email ?? '',
        customerEmail: currentUser.email,
        customerPhone: (userProfile as any)?.phone ?? '',
        shopName,
        shopId,
        metal,
        purity,
        grams,
        marketRatePerGram: liveRate,
        redeemRatePerGram,
        redeemGstReductionPercent: 3,
        redeemFlatDeductionPerGram: REDEEM_DEDUCTION_PER_GRAM,
        estimatedInr,
        availableBalanceAtRequestGrams: heldGrams,
        status: 'PENDING',
        createdAt: serverTimestamp(),
      });

      setSubmitMsg({
        type: 'ok',
        text: `Request submitted. ${fmtG(grams)} at ${fmtInr(redeemRatePerGram)}/g. Estimated ${fmtInr(estimatedInr)}.`,
      });
      setGramsStr('');
    } catch (err: any) {
      setSubmitMsg({ type: 'err', text: err?.message ?? 'Failed to submit. Try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-gray-950 pb-16">
      <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 dark:from-gray-900 dark:to-gray-900 border-b border-amber-200 dark:border-yellow-900/30 px-4 sm:px-8 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-black text-amber-900 dark:text-white flex items-center gap-3">
            <ArrowDownCircle className="text-amber-500" size={28} />
            Sell / Redeem
          </h1>
          <p className="text-amber-700/70 dark:text-gray-400 text-sm mt-1">
            Live redeem formula: live market rate - 3% GST, then minus ₹50/g.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-8 pt-8 space-y-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-amber-100 dark:border-gray-800 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-amber-50 dark:border-gray-800 flex items-center gap-2">
            <TrendingDown size={16} className="text-amber-500" />
            <h3 className="font-black text-amber-900 dark:text-white text-sm">Your Holdings</h3>
          </div>
          {loadingPortfolio ? (
            <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-amber-500" /></div>
          ) : portfolio.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-stone-400 text-sm">No holdings yet. Buy digital metal first.</p>
            </div>
          ) : (
            <div className="divide-y divide-amber-50 dark:divide-gray-800">
              {portfolio.map((p) => (
                <div key={`${p.metal}-${p.purity}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-amber-50/40 dark:hover:bg-gray-800/50 transition-colors">
                  <div>
                    <p className="font-bold text-stone-800 dark:text-white text-sm">{p.metal} - {purityLabel(p.metal, p.purity)}</p>
                    <p className="text-xs text-stone-400">Avg cost: {fmtInr(p.avgRatePerGram)}/g</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-amber-600 dark:text-amber-400">{fmtG(p.grams)}</p>
                    <p className="text-xs text-stone-400">{fmtInr(p.grams * p.avgRatePerGram)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-2xl border border-amber-100 dark:border-gray-800 p-6 shadow-sm space-y-4">
          <h3 className="font-black text-amber-900 dark:text-white flex items-center gap-2">
            <ArrowDownCircle size={16} className="text-amber-500" /> New Redemption Request
          </h3>

          <div className="flex gap-3">
            {(['GOLD', 'SILVER'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMetal(m); setPurity(METAL_PURITIES[m][0]); }}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all border ${
                  metal === m
                    ? 'border-amber-400 text-amber-900 dark:text-amber-200'
                    : 'border-stone-200 dark:border-gray-700 text-stone-500 dark:text-gray-400 hover:border-amber-300'
                }`}
                style={metal === m ? { background: 'linear-gradient(135deg,#fef9ee,#fde68a)' } : undefined}
              >
                {m === 'GOLD' ? 'Gold' : 'Silver'}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Purity</label>
            <div className="flex gap-2 flex-wrap">
              {METAL_PURITIES[metal].map((pu) => (
                <button
                  key={pu}
                  type="button"
                  onClick={() => setPurity(pu)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                    purity === pu
                      ? 'border-amber-400 text-amber-900 dark:text-amber-200'
                      : 'border-stone-200 dark:border-gray-700 text-stone-500 dark:text-gray-400 hover:border-amber-300'
                  }`}
                  style={purity === pu ? { background: 'linear-gradient(135deg,#fef9ee,#fde68a)' } : undefined}
                >
                  {purityLabel(metal, pu)}
                </button>
              ))}
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1.5">You hold: <strong>{fmtG(heldGrams)}</strong></p>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Grams to Redeem</label>
            <input
              type="number"
              value={gramsStr}
              onChange={(e) => setGramsStr(e.target.value)}
              placeholder="e.g. 2.500"
              min="0"
              step="0.001"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 bg-stone-50 dark:bg-gray-800 text-stone-800 dark:text-white transition-colors ${
                gramsError ? 'border-red-400' : 'border-stone-200 dark:border-gray-700'
              }`}
            />
            {gramsError && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle size={11} />Max redeemable: {fmtG(heldGrams)}</p>}
          </div>

          <div className="rounded-xl px-4 py-3" style={{ background: 'linear-gradient(135deg,#fef9ee,#fde68a)', border: '1px solid rgba(251,191,36,0.4)' }}>
            {loadingRates ? (
              <p className="text-sm text-amber-700">Loading live rate…</p>
            ) : (
              <>
                <p className="text-xs text-amber-700">Live market: {fmtInr(liveRate)}/g</p>
                <p className="text-xs text-amber-700">Redeem rate: {fmtInr(redeemRatePerGram)}/g</p>
                {grams > 0 && !gramsError && (
                  <p className="text-2xl font-black text-amber-900 mt-1">Estimated: {fmtInr(estimatedInr)}</p>
                )}
              </>
            )}
          </div>

          {submitMsg && (
            <div className={`rounded-xl px-4 py-3 text-sm ${
              submitMsg.type === 'ok'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}>
              {submitMsg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || gramsError || grams <= 0 || !liveRate}
            className="w-full py-3 rounded-xl font-black text-amber-900 text-sm transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg,#fde68a,#f59e0b)', boxShadow: '0 4px 16px rgba(245,158,11,0.3)' }}
          >
            {submitting ? 'Submitting…' : 'Submit Redemption Request'}
          </button>
        </form>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-amber-100 dark:border-gray-800 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-amber-50 dark:border-gray-800">
            <h3 className="font-black text-amber-900 dark:text-white text-sm">My Requests</h3>
          </div>
          {loadingReqs ? (
            <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-amber-500" /></div>
          ) : requests.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-stone-400 text-sm">No requests yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-amber-50 dark:divide-gray-800">
              {requests.map((r) => {
                const ts = r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000) : null;
                return (
                  <div key={r.id} className="px-5 py-4 hover:bg-amber-50/40 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-stone-800 dark:text-white text-sm">{r.metal} {purityLabel(r.metal, Number(r.purity))} - {fmtG(r.grams)}</p>
                        <p className="text-xs text-stone-400 mt-0.5">{fmtInr(r.redeemRatePerGram)}/g {'->'} <strong>{fmtInr(r.estimatedInr)}</strong></p>
                        {r.notes && <p className="text-xs text-stone-400 mt-0.5 italic">{r.notes}</p>}
                        {ts && <p className="text-xs text-stone-300 mt-0.5">{ts.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</p>}
                      </div>
                      <StatusBadge status={r.status} />
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
