/**
 * Home Landing Page
 *
 * Golden/cream theme in light mode | Golden/black theme in dark mode
 * Features: Live gold & silver rates, Buy, Sell, AutoPay, daily tracking
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp, TrendingDown, ShoppingCart, ArrowUpRight,
  RefreshCw, Shield, Bell, Zap, Star, ChevronRight,
  Coins, CreditCard, Repeat, CheckCircle, AlertCircle,
  X, Loader2, Phone, Mail, User, Timer,
} from 'lucide-react';
import { fetchLiveMetalRates, type MetalRate } from '../lib/goldPrices';
import { buyGold, setupGoldAutoPay, RAZORPAY_KEY_ID } from '../lib/razorpay';
import { useAuth } from '../context/AuthContext';
import { collection, addDoc, updateDoc, doc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────
interface ModalState {
  type: 'buy' | 'sell' | 'autopay' | null;
}

interface BuyFormData {
  grams: string;
}

interface AutoPayFormData {
  amount: string;
}

interface SellFormData {
  grams: string;
  purity: string;
  bank: string;
  account: string;
  ifsc: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────
export const HomeLanding: React.FC = () => {
    // Detailed live price breakdown state
    const [priceFeed, setPriceFeed] = useState<any>(null);
    const fetchDetailedFeed = useCallback(async () => {
      try {
        // Fetch CDN rates with cache-bust to avoid stale CDN/browser cache
        const bust = `?_=${Date.now()}`;
        const [xauData, xagData, usdData] = await Promise.all([
          fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json' + bust, { cache: 'no-store' }).then(r => r.json()),
          fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xag.json' + bust, { cache: 'no-store' }).then(r => r.json()),
          fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json' + bust, { cache: 'no-store' }).then(r => r.json()),
        ]);
        const xauInr = xauData?.xau?.inr;
        const xagInr = xagData?.xag?.inr;
        const usdInr = usdData?.usd?.inr;
        // Fallback: fetch Swissquote XAU/USD, XAG/USD
        let xauUsd = null, xagUsd = null;
        const parseSQ = (data: any) => {
          for (const platform of data as any[]) {
            const profiles: any[] = platform.spreadProfilePrices || [];
            const standard = profiles.find((p: any) => p.spreadProfile === 'standard');
            if (standard?.bid != null && standard?.ask != null) return (standard.bid + standard.ask) / 2;
          }
          const first = (data as any[])[0]?.spreadProfilePrices?.[0];
          if (first?.bid != null && first?.ask != null) return (first.bid + first.ask) / 2;
          return null;
        };
        try {
          const sqXau = await fetch('https://corsproxy.io/?url=' + encodeURIComponent('https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD') + `&_=${Date.now()}`, { cache: 'no-store' }).then(r => r.json());
          const sqXag = await fetch('https://corsproxy.io/?url=' + encodeURIComponent('https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAG/USD') + `&_=${Date.now()}`, { cache: 'no-store' }).then(r => r.json());
          xauUsd = parseSQ(sqXau);
          xagUsd = parseSQ(sqXag);
        } catch (e) {}
        setPriceFeed({ xauInr, xagInr, usdInr, xauUsd, xagUsd, fetchedAt: new Date().toLocaleTimeString('en-IN') });
      } catch (e) {
        setPriceFeed(null);
      }
    }, []);

    useEffect(() => {
      fetchDetailedFeed();
      const interval = setInterval(fetchDetailedFeed, 5000);
      return () => clearInterval(interval);
    }, [fetchDetailedFeed]);
  const { currentUser, userProfile } = useAuth();
  // Email verification resend state
  const [resending, setResending] = useState(false);
  const [resentMsg, setResentMsg] = useState('');
  const handleResendVerification = async () => {
    if (!currentUser) return;
    setResending(true);
    try {
      // Use Firebase's sendEmailVerification
      // @ts-ignore
      await import('firebase/auth').then(({ sendEmailVerification }) => sendEmailVerification(currentUser));
      setResentMsg('Verification email sent!');
      setTimeout(() => setResentMsg(''), 6000);
    } catch {
      setResentMsg('Failed to send verification email.');
    }
    setResending(false);
  };
  const [rates, setRates] = useState<MetalRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [error, setError] = useState('');
  const [modal, setModal] = useState<ModalState>({ type: null });
  const [lockedRate, setLockedRate] = useState<number | null>(null);
  const [buyForm, setBuyForm] = useState<BuyFormData>({ grams: '' });
  const [autoPayForm, setAutoPayForm] = useState<AutoPayFormData>({ amount: '500' });
  const [sellForm, setSellForm] = useState<SellFormData>({
    grams: '', purity: '24', bank: '', account: '', ifsc: '',
  });
  const [paying, setPaying] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [buyMetal, setBuyMetal] = useState<'GOLD' | 'SILVER'>('GOLD');
  const [slideValue, setSlideValue] = useState(0);
  // ── Price-lock countdown ──────────────────────────────────────────
  const LOCK_DURATION = 120; // seconds
  const [lockSecondsLeft, setLockSecondsLeft] = useState(0);
  const lockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startLockTimer = () => {
    if (lockIntervalRef.current) clearInterval(lockIntervalRef.current);
    setLockSecondsLeft(LOCK_DURATION);
    lockIntervalRef.current = setInterval(() => {
      setLockSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(lockIntervalRef.current!);
          lockIntervalRef.current = null;
          setLockedRate(null); // price expired
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const clearLockTimer = () => {
    if (lockIntervalRef.current) clearInterval(lockIntervalRef.current);
    lockIntervalRef.current = null;
    setLockSecondsLeft(0);
  };

  // Cleanup on unmount
  useEffect(() => () => clearLockTimer(), []);

  // Auto-start timer whenever a rate is locked
  useEffect(() => {
    if (lockedRate) {
      startLockTimer();
    } else {
      clearLockTimer();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedRate]);
  const gold24 = rates.find((r) => r.metalType === 'GOLD' && r.purity === 24);
  const silver24 = rates.find((r) => r.metalType === 'SILVER' && r.purity === 24);
  // Buy prices: 24K rate minus 1.75% — displayed as the effective buy price (not shown in UI)
  const goldBuyPrice = gold24 ? Math.round(gold24.ratePerGram * 0.9825 * 100) / 100 : 0;
  const silverBuyPrice = silver24 ? Math.round(silver24.ratePerGram * 0.9825 * 100) / 100 : 0;
  // Only show 24K categories (backend uses custom categories). Filtered view for potential lists.
  const filteredRates = rates.filter((r) => (r.metalType === 'GOLD' && r.purity === 24) || (r.metalType === 'SILVER' && r.purity === 24));

  const loadRates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchLiveMetalRates();
      setRates(data);
      setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    } catch (e: any) {
      setError('Unable to fetch live rates. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRates();
    // Auto-refresh every 5 seconds
    const interval = setInterval(loadRates, 5000);
    return () => clearInterval(interval);
  }, [loadRates]);

  // ── Buy Gold or Silver ───────────────────────────────────────────────────
  const handleBuy = () => {
    if (!buyForm.grams) return;
    const metalRate = buyMetal === 'GOLD'
      ? (lockedRate ?? gold24?.ratePerGram)
      : silver24?.ratePerGram;
    if (!metalRate) return;
    const grams       = parseFloat(buyForm.grams);
    const ratePerGram = metalRate;
    const totalAmount = grams * ratePerGram;
    const custName    = userProfile?.name  ?? currentUser?.displayName ?? '';
    const custEmail   = userProfile?.email ?? currentUser?.email ?? '';
    const custPhone   = userProfile?.phone ?? '';
    setPaying(true);
    buyGold({
      grams, ratePerGram,
      customerName:  custName,
      customerEmail: custEmail,
      customerPhone: custPhone,
      onSuccess: async (id) => {
        setPaying(false);
        setModal({ type: null });
        setLockedRate(null);
        setSuccessMsg(`${buyMetal === 'GOLD' ? 'Gold' : 'Silver'} purchased! Payment ID: ${id}`);
        setBuyForm({ grams: '' });
        setTimeout(() => setSuccessMsg(''), 8000);

        // ── Write order to Firestore ────────────────────────────────────
        try {
          await addDoc(collection(db, 'goldOnlineOrders'), {
            userId:            currentUser?.uid ?? 'anonymous',
            type:              'BUY',
            metal:             buyMetal,
            purity:            24,
            grams,
            ratePerGram,
            totalAmountInr:    totalAmount,
            razorpayPaymentId: id,
            status:            'SUCCESS',
            customerName:      custName,
            customerPhone:     custPhone,
            customerEmail:     custEmail,
            createdAt:         serverTimestamp(),
            updatedAt:         serverTimestamp(),
          });
          // Update aggregate counters on the user document
          if (currentUser) {
            const updateData: any = {
              totalInvestedInr: increment(totalAmount),
              updatedAt:        serverTimestamp(),
            };
            if (buyMetal === 'GOLD') updateData.totalGoldPurchasedGrams   = increment(grams);
            else                     updateData.totalSilverPurchasedGrams = increment(grams);
            await updateDoc(doc(db, 'users', currentUser.uid), updateData);
          }
        } catch { /* non-blocking */ }
      },
      onFailure: (err) => {
        setPaying(false);
        if (err.message !== 'Payment cancelled') {
          alert(err.message);
        }
      },
    });
  };

  // ── AutoPay ───────────────────────────────────────────────────────────────
  const handleAutoPay = () => {
    if (!autoPayForm.amount) return;
    const planAmount   = parseFloat(autoPayForm.amount);
    const custName     = userProfile?.name  ?? currentUser?.displayName ?? '';
    const custEmail    = userProfile?.email ?? currentUser?.email ?? '';
    const custPhone    = userProfile?.phone ?? '';
    setPaying(true);
    setupGoldAutoPay({
      planAmount,
      customerName:  custName,
      customerEmail: custEmail,
      customerPhone: custPhone,
      onSuccess: async (id) => {
        setPaying(false);
        setModal({ type: null });
        setSuccessMsg(`AutoPay activated! ID: ${id}. Gold SIP of ₹${Number(autoPayForm.amount).toLocaleString('en-IN')}/month is set up.`);
        setAutoPayForm({ amount: '500' });
        setTimeout(() => setSuccessMsg(''), 10000);

        // ── Write subscription to Firestore ───────────────────────────────
        try {
          await addDoc(collection(db, 'autoPaySubscriptions'), {
            userId:                 currentUser?.uid ?? 'anonymous',
            metal:                  'GOLD',
            amountInr:              planAmount,
            frequencyDays:          30,
            razorpaySubscriptionId: id,
            status:                 'ACTIVE',
            customerName:           custName,
            customerPhone:          custPhone,
            customerEmail:          custEmail,
            createdAt:              serverTimestamp(),
            updatedAt:              serverTimestamp(),
          });
        } catch { /* non-blocking */ }
      },
      onFailure: (err) => {
        setPaying(false);
        if (err.message !== 'AutoPay setup cancelled') {
          alert(err.message);
        }
      },
    });
  };

  // ── Sell Gold (form submit, no direct payout from frontend) ──────────────
  const handleSell = async () => {
    if (!sellForm.grams) return;
    if (!currentUser?.emailVerified) {
      setSuccessMsg('Please verify your email before you can sell gold or silver.');
      setTimeout(() => setSuccessMsg(''), 8000);
      return;
    }
    const grams       = parseFloat(sellForm.grams);
    const purityNum   = Number(sellForm.purity);
    const sellRate    = rates.find((r) => r.metalType === 'GOLD' && r.purity === purityNum);
    const totalAmount = sellRate ? grams * sellRate.ratePerGram * 0.95 : 0;
    const custName    = userProfile?.name  ?? currentUser?.displayName ?? '';
    const custPhone   = userProfile?.phone ?? '';

    setModal({ type: null });
    setSuccessMsg(`Sell request submitted for ${sellForm.grams}g of ${sellForm.purity}K gold. Our team will contact you on ${custPhone || 'your registered number'} within 24 hours.`);
    setSellForm({ grams: '', purity: '24', bank: '', account: '', ifsc: '' });
    setTimeout(() => setSuccessMsg(''), 12000);

    // ── Write sell request to Firestore ──────────────────────────────────
    try {
      await addDoc(collection(db, 'goldOnlineOrders'), {
        userId:         currentUser?.uid ?? 'anonymous',
        type:           'SELL',
        metal:          'GOLD',
        purity:         purityNum,
        grams,
        ratePerGram:    sellRate?.ratePerGram ?? 0,
        totalAmountInr: totalAmount,
        status:         'PENDING',
        customerName:   custName,
        customerPhone:  custPhone,
        bankName:       sellForm.bank,
        accountNumber:  sellForm.account,
        ifscCode:       sellForm.ifsc,
        createdAt:      serverTimestamp(),
        updatedAt:      serverTimestamp(),
      });
    } catch { /* non-blocking */ }
  };

  const activeRate = buyMetal === 'GOLD'
    ? (lockedRate ?? goldBuyPrice)
    : silverBuyPrice;
  const buyTotal = buyForm.grams && activeRate
    ? (parseFloat(buyForm.grams) * activeRate).toFixed(2)
    : null;

  const sellEst = sellForm.grams && rates.find((r) => r.metalType === 'GOLD' && r.purity === Number(sellForm.purity))
    ? (parseFloat(sellForm.grams) * rates.find((r) => r.metalType === 'GOLD' && r.purity === Number(sellForm.purity))!.ratePerGram * 0.95).toFixed(2)
    : null;

  const noKey = !RAZORPAY_KEY_ID;

  // ────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-black text-gray-900 dark:text-white">

      {/* ── Success Toast ────────────────────────────────────────────────── */}
      {successMsg && (
        <div className="fixed top-4 right-4 z-50 max-w-sm bg-green-600 text-white px-5 py-4 rounded-xl shadow-2xl flex items-start gap-3 animate-pulse">
          <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed">{successMsg}</p>
          <button onClick={() => setSuccessMsg('')} className="ml-auto">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Razorpay Key Warning ─────────────────────────────────────────── */}
            {/* ── Detailed Price Calculation ───────────────────────────────────── */}
      {noKey && (
        <div className="bg-amber-400 dark:bg-amber-600 text-black dark:text-black px-4 py-2 text-center text-sm font-medium">
          <AlertCircle className="inline mr-1" size={16} />
          Razorpay key not configured. Add <code className="bg-black/10 px-1 rounded">VITE_RAZORPAY_KEY_ID=rzp_live_...</code> to{' '}
          <code className="bg-black/10 px-1 rounded">apps/web-app/.env</code> to enable payments.
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════════════════ */}
          <section className="relative overflow-hidden bg-gradient-to-br from-stone-50 via-amber-50 to-yellow-50 dark:from-black dark:via-gray-950 dark:to-black border-b border-amber-100 dark:border-yellow-900/30">
        {/* Decorative blur circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-yellow-300/30 dark:bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-amber-300/30 dark:bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
        {/* Floating sparkle particles */}
        {[
          { top:'8%',  left:'6%',  size:14, delay:'0s'   },
          { top:'15%', left:'88%', size:10, delay:'0.7s'  },
          { top:'42%', left:'92%', size:18, delay:'1.3s'  },
          { top:'70%', left:'4%',  size:12, delay:'0.4s'  },
          { top:'85%', left:'80%', size:16, delay:'1.9s'  },
          { top:'30%', left:'2%',  size:9,  delay:'2.2s'  },
          { top:'55%', left:'95%', size:20, delay:'0.9s'  },
          { top:'20%', left:'50%', size:8,  delay:'1.6s'  },
        ].map(({ top, left, size, delay }, i) => (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill="none"
            className="absolute pointer-events-none animate-sparkle"
            style={{ top, left, animationDelay: delay, opacity: 0 }}>
            <path d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z"
              fill="url(#hsg)" />
            <defs>
              <linearGradient id="hsg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fcd34d"/>
                <stop offset="100%" stopColor="#f59e0b"/>
              </linearGradient>
            </defs>
          </svg>
        ))}

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: copy */}
            <div>
              <div className="inline-flex items-center gap-2 bg-amber-400/20 dark:bg-yellow-500/10 border border-amber-400/50 dark:border-yellow-500/30 text-amber-700 dark:text-yellow-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
                <Zap size={13} className="text-amber-500 dark:text-yellow-400" />
                LIVE PRICES • BUY & SELL ONLINE
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight text-amber-900 dark:text-white mb-4">
                Gold & Silver
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 dark:from-yellow-400 dark:via-amber-300 dark:to-yellow-500">
                  At Live Prices
                </span>
              </h1>
              <p className="text-lg text-amber-800/80 dark:text-gray-300 mb-8 leading-relaxed max-w-lg">
                Buy & sell pure gold and silver online at real-time international market prices. Set up AutoPay to invest in gold every month automatically.
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => { setBuyMetal('GOLD'); if (goldBuyPrice) setLockedRate(goldBuyPrice); setModal({ type: 'buy' }); }}
                  className="flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold rounded-xl shadow-lg hover:shadow-amber-400/40 dark:hover:shadow-yellow-400/30 transition-all hover:-translate-y-0.5 text-base"
                >
                  <ShoppingCart size={18} />
                  Buy Gold Now
                </button>
                <button
                  onClick={() => { setBuyMetal('SILVER'); setLockedRate(null); setModal({ type: 'buy' }); }}
                  className="flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-gray-400 to-slate-500 hover:from-gray-500 hover:to-slate-600 text-white font-bold rounded-xl shadow-lg hover:shadow-slate-400/40 transition-all hover:-translate-y-0.5 text-base"
                >
                  <ShoppingCart size={18} />
                  Buy Silver Now
                </button>
                <button
                  onClick={() => setModal({ type: 'sell' })}
                  className="flex items-center gap-2 px-7 py-3.5 bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 text-amber-800 dark:text-yellow-300 font-bold rounded-xl border border-amber-300 dark:border-yellow-600/40 shadow-md transition-all hover:-translate-y-0.5 text-base"
                >
                  <ArrowUpRight size={18} />
                  Sell Gold
                </button>
                <button
                  onClick={() => setModal({ type: 'autopay' })}
                  className="flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-amber-950 font-bold rounded-xl border border-amber-300/60 shadow-md transition-all hover:-translate-y-0.5 text-base"
                >
                  <Repeat size={18} />
                  Setup AutoPay
                </button>
              </div>
            </div>

            {/* Right: live price cards */}
            <div className="space-y-4">
                {/* Gold 24K */}
              <div className="relative bg-gradient-to-br from-amber-400 to-yellow-600 dark:from-yellow-600/90 dark:to-amber-800 rounded-2xl p-6 shadow-2xl shadow-amber-400/30 dark:shadow-yellow-500/20 overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-yellow-100">
                        <Coins size={20} />
                        <span className="font-bold tracking-wide text-sm uppercase">Gold 24K</span>
                      </div>
                    <span className="text-yellow-100 text-xs font-medium bg-white/20 px-2.5 py-1 rounded-full">per 10g</span>
                  </div>
                  {loading ? (
                    <div className="flex items-center gap-2 text-white/80">
                      <Loader2 size={20} className="animate-spin" />
                      <span>Fetching live rate...</span>
                    </div>
                  ) : error ? (
                    <p className="text-yellow-100 text-sm">Rate unavailable</p>
                  ) : (
                    <>
                      <div className="text-4xl sm:text-5xl font-black text-white mb-1">
                        ₹{gold24 ? gold24.displayRate.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—'}
                      </div>
                      <div className="text-yellow-100 text-sm">
                        ₹{gold24 ? gold24.ratePerGram.toFixed(2) : '—'} / gram
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Silver */}
              <div className="bg-white/70 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wide">Silver 24K / 1kg</p>
                  <button
                    onClick={() => { setBuyMetal('SILVER'); setLockedRate(null); setModal({ type: 'buy' }); }}
                    className="flex items-center gap-1 px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-full text-xs font-bold transition-colors"
                  >
                    <ShoppingCart size={12} />
                    Buy Silver
                  </button>
                </div>
                {loading ? (
                  <Loader2 size={16} className="animate-spin text-gray-400" />
                ) : (
                  <p className="text-2xl font-black text-gray-800 dark:text-gray-200">
                    ₹{silver24 ? silver24.displayRate.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—'}
                  </p>
                )}
              </div>

              {/* Last updated + refresh */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-amber-700/70 dark:text-gray-500">
                  {lastUpdated ? `Updated at ${lastUpdated}` : 'Prices from international market'}
                </span>
                <button
                  onClick={loadRates}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-amber-700 dark:text-yellow-500 hover:text-amber-900 dark:hover:text-yellow-400 font-medium transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          FEATURES STRIP
      ════════════════════════════════════════════════════════════════════ */}
      <section className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400 dark:bg-yellow-500 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-6 md:gap-12 text-amber-950 dark:text-black text-sm font-semibold">
            {[
              '100% Pure Gold',
              'Live Market Prices',
              'Secure Payments via Razorpay',
              'AutoPay / Monthly SIP',
              'Sell Anytime',
            ].map((f) => (
              <span key={f} className="flex items-center gap-1.5">
                <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 flex-shrink-0" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M3 8l3.5 3.5L13 4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {f}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          LIVE CHARTS (TradingView)
      ════════════════════════════════════════════════════════════════════ */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-black text-stone-800 dark:text-white mb-1">
            Live <span className="text-amber-500 dark:text-yellow-400">Market Charts</span>
          </h2>
          <p className="text-amber-700/70 dark:text-gray-400 text-sm">Real-time XAU/USD and XAG/USD from TradingView</p>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <div className="rounded-2xl overflow-hidden border border-amber-200 dark:border-gray-700 shadow-md bg-white dark:bg-gray-900">
            <div className="px-4 py-2.5 bg-amber-50 dark:bg-gray-800 border-b border-amber-100 dark:border-gray-700 flex items-center gap-2">
              <Coins size={15} className="text-amber-500 dark:text-yellow-400" />
              <span className="font-bold text-amber-800 dark:text-yellow-400 text-sm">Gold (XAU/USD)</span>
              {gold24 && !loading && (
                <span className="ml-auto font-mono text-amber-700 dark:text-yellow-300 text-sm font-bold">
                  ₹{gold24.ratePerGram.toFixed(2)}/g
                </span>
              )}
            </div>
            <TradingViewMini symbol="OANDA:XAUUSD" theme="light" />
          </div>
          <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-md bg-white dark:bg-gray-900">
            <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
              <Coins size={15} className="text-gray-400 dark:text-gray-400" />
              <span className="font-bold text-gray-700 dark:text-gray-300 text-sm">Silver (XAG/USD)</span>
              {silver24 && !loading && (
                <span className="ml-auto font-mono text-gray-600 dark:text-gray-300 text-sm font-bold">
                  ₹{silver24.ratePerGram.toFixed(2)}/g
                </span>
              )}
            </div>
            <TradingViewMini symbol="OANDA:XAGUSD" theme="light" />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════════════════════════════ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-stone-800 dark:text-white mb-3">
            How It <span className="text-amber-500 dark:text-yellow-400">Works</span>
          </h2>
          <p className="text-amber-700/80 dark:text-gray-400 max-w-lg mx-auto">
            Buy, sell or invest in gold in 3 simple steps. No hidden charges.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: <TrendingUp size={32} className="text-amber-500 dark:text-yellow-400" />,
              step: '01',
              title: 'Check Live Prices',
              desc: 'View real-time gold & silver prices updated from international markets every few minutes.',
              cta: null,
            },
            {
              icon: <CreditCard size={32} className="text-amber-500 dark:text-yellow-400" />,
              step: '02',
              title: 'Buy or Sell Online',
              desc: 'Enter the quantity you want, pay securely via Razorpay (UPI, cards, net banking), or submit a sell request.',
              cta: (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setModal({ type: 'buy' })}
                    className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-black text-sm font-bold rounded-lg transition-colors"
                  >
                    Buy
                  </button>
                  <button
                    onClick={() => setModal({ type: 'sell' })}
                    className="flex-1 py-2 bg-amber-100 dark:bg-gray-800 hover:bg-amber-200 dark:hover:bg-gray-700 text-amber-800 dark:text-amber-300 text-sm font-bold rounded-lg transition-colors"
                  >
                    Sell
                  </button>
                </div>
              ),
            },
            {
              icon: <Repeat size={32} className="text-amber-500 dark:text-yellow-400" />,
              step: '03',
              title: 'Setup AutoPay (SIP)',
              desc: 'Set up a monthly recurring payment to automatically buy gold every month — your digital gold SIP.',
              cta: (
                <button
                  onClick={() => setModal({ type: 'autopay' })}
                  className="mt-4 w-full py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-lg transition-colors"
                >
                  Setup AutoPay
                </button>
              ),
            },
          ].map(({ icon, step, title, desc, cta }) => (
            <div
              key={step}
              className="relative bg-white dark:bg-gray-900 border border-amber-100 dark:border-yellow-900/30 rounded-2xl p-7 shadow-md hover:shadow-xl hover:border-amber-300 dark:hover:border-yellow-700/50 transition-all"
            >
              <div className="absolute top-4 right-5 text-5xl font-black text-amber-100 dark:text-yellow-900/40 select-none">{step}</div>
              <div className="mb-4">{icon}</div>
              <h3 className="text-xl font-bold text-amber-900 dark:text-white mb-2">{title}</h3>
              <p className="text-amber-700/80 dark:text-gray-400 text-sm leading-relaxed">{desc}</p>
              {cta}
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          LIVE RATES TABLE (only 24K shown)
      ════════════════════════════════════════════════════════════════════ */}
      <section className="py-12 bg-white/70 dark:bg-gray-950 border-y border-amber-100/80 dark:border-yellow-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-amber-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="text-amber-500 dark:text-yellow-400" size={26} />
              Today's Rates
            </h2>
            <button
              onClick={loadRates}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Updating...' : 'Refresh'}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-5 py-4 mb-6">
              <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-amber-200 dark:border-yellow-900/30">
                  <th className="text-left py-3 px-4 text-amber-700 dark:text-gray-400 text-sm font-semibold">Metal</th>
                  <th className="text-left py-3 px-4 text-amber-700 dark:text-gray-400 text-sm font-semibold">Purity</th>
                  <th className="text-right py-3 px-4 text-amber-700 dark:text-gray-400 text-sm font-semibold">Rate / gram</th>
                  <th className="text-right py-3 px-4 text-amber-700 dark:text-gray-400 text-sm font-semibold">Display Rate</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center">
                      <Loader2 size={24} className="animate-spin text-amber-500 mx-auto" />
                      <p className="text-amber-700/60 dark:text-gray-500 mt-2 text-sm">Fetching live rates...</p>
                    </td>
                  </tr>
                ) : filteredRates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-amber-700/60 dark:text-gray-500 text-sm">
                      No 24K rates available. Click Refresh.
                    </td>
                  </tr>
                ) : (
                  filteredRates.map((r) => (
                    <tr key={`${r.metalType}-${r.purity}`} className="border-b border-amber-50 dark:border-gray-800/60 hover:bg-amber-50/40 dark:hover:bg-gray-900/50 transition-colors">
                      <td className="py-3.5 px-4 text-sm text-stone-600 dark:text-gray-300">{r.metalType}</td>
                      <td className="py-3.5 px-4 text-sm text-stone-600 dark:text-gray-300">{r.purity}K</td>
                      <td className="py-3.5 px-4 text-right text-sm font-medium text-stone-800 dark:text-white">₹{r.ratePerGram.toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-right text-sm font-black text-stone-800 dark:text-white">₹{r.displayRate.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setBuyMetal(r.metalType);
                            if (r.metalType === 'GOLD') setLockedRate(r.ratePerGram);
                            else setLockedRate(null);
                            setModal({ type: 'buy' });
                          }}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-black rounded-full text-sm font-semibold">
                          Buy
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          WHY US
      ════════════════════════════════════════════════════════════════════ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <h2 className="text-3xl font-black text-center text-amber-900 dark:text-white mb-10">
          Why Buy Gold With <span className="text-amber-500 dark:text-yellow-400">Us?</span>
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: <Shield size={28} className="text-amber-500 dark:text-yellow-400" />, title: 'Secure Payments', desc: 'All payments powered by Razorpay — India\'s most trusted payment gateway.' },
            { icon: <Bell size={28} className="text-amber-500 dark:text-yellow-400" />, title: 'Daily Price Alerts', desc: 'Get notified when gold prices hit your target. Never miss the right moment.' },
            { icon: <Star size={28} className="text-amber-500 dark:text-yellow-400" />, title: '100% Purity', desc: 'Certified 24K, 22K, and 18K gold with hallmark guarantee.' },
            { icon: <TrendingDown size={28} className="text-amber-500 dark:text-yellow-400" />, title: 'Best Market Rates', desc: 'Live international XAU/USD prices converted at real exchange rates.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-white dark:bg-gray-900 border border-amber-100 dark:border-yellow-900/20 rounded-xl p-6 text-center shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-yellow-700/40 transition-all">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-50 dark:bg-yellow-900/20 rounded-xl mb-4">
                {icon}
              </div>
              <h3 className="font-bold text-amber-900 dark:text-white mb-2">{title}</h3>
              <p className="text-amber-700/70 dark:text-gray-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          AUTOPAY BANNER
      ════════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 dark:from-yellow-600 dark:via-amber-500 dark:to-yellow-600 py-14 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-10 dark:opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '30px 30px' }}
        />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 text-amber-950 dark:text-black text-xs font-bold px-3 py-1.5 rounded-full mb-4">
            <Repeat size={13} />
            GOLD AUTOPAY / SIP
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-amber-950 dark:text-black mb-4">
            Invest in Gold Every Month, Automatically
          </h2>
          <p className="text-amber-900 dark:text-black/80 text-lg mb-8 max-w-xl mx-auto">
            Starting from just ₹500/month. Build your gold portfolio systematically with AutoPay — your digital gold SIP.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {['₹500', '₹1,000', '₹2,000', '₹5,000'].map((amt) => (
              <button
                key={amt}
                onClick={() => {
                  setAutoPayForm((f) => ({ ...f, amount: amt.replace(/[₹,]/g, '') }));
                  setModal({ type: 'autopay' });
                }}
                className="px-6 py-2.5 bg-white/30 dark:bg-black/20 hover:bg-white/50 dark:hover:bg-black/30 text-amber-950 dark:text-black font-bold rounded-xl border border-white/50 dark:border-black/30 transition-colors"
              >
                {amt}/mo
              </button>
            ))}
          </div>
          <button
            onClick={() => setModal({ type: 'autopay' })}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white dark:bg-black text-amber-900 dark:text-yellow-400 font-black rounded-xl shadow-xl shadow-amber-200/40 hover:bg-amber-50 dark:hover:bg-gray-900 transition-all hover:-translate-y-1 text-base"
          >
            <Repeat size={20} />
            Setup AutoPay Now
            <ChevronRight size={18} />
          </button>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          MODALS
      ════════════════════════════════════════════════════════════════════ */}

      {/* Buy Metal Bottom Sheet */}
      {modal.type === 'buy' && (
        <BottomSheet title={`Buy ${buyMetal === 'GOLD' ? 'Gold' : 'Silver'}`} onClose={() => { setModal({ type: null }); setSlideValue(0); clearLockTimer(); }}>
          <div className="space-y-5">
            {noKey && <div className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 p-3 rounded-xl border border-amber-200 dark:border-amber-700 flex items-center gap-2">
              <AlertCircle size={13} className="flex-shrink-0" />
              Razorpay key not set — payments disabled.
            </div>}

            {/* Metal toggle ─ SVG icons, no emojis */}
            <div className="flex gap-2 p-1 rounded-2xl bg-amber-50 dark:bg-gray-800 border border-amber-200 dark:border-gray-700">
              {(['GOLD', 'SILVER'] as const).map(m => (
                <button key={m} type="button"
                  onClick={() => { setBuyMetal(m); setBuyForm({ grams: '' }); setSlideValue(0); if (m === 'GOLD' && goldBuyPrice) setLockedRate(goldBuyPrice); else setLockedRate(null); }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                    buyMetal === m
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-md scale-[1.01]'
                      : 'text-amber-700 dark:text-gray-400 hover:bg-amber-100 dark:hover:bg-gray-700'}`}>
                  {m === 'GOLD'
                    ? <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><circle cx="12" cy="12" r="10" opacity="0.3"/><path d="M12 2a10 10 0 1 1 0 20A10 10 0 0 1 12 2zm0 3a7 7 0 1 0 0 14A7 7 0 0 0 12 5zm0 2a5 5 0 1 1 0 10A5 5 0 0 1 12 7z"/></svg>
                    : <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" opacity="0.7"><circle cx="12" cy="12" r="10" opacity="0.3"/><path d="M12 2a10 10 0 1 1 0 20A10 10 0 0 1 12 2zm0 3a7 7 0 1 0 0 14A7 7 0 0 0 12 5zm0 2a5 5 0 1 1 0 10A5 5 0 0 1 12 7z"/></svg>
                  }
                  {m === 'GOLD' ? 'Gold' : 'Silver'}
                </button>
              ))}
            </div>

            {/* Live price display + lock timer */}
            <div className="rounded-2xl px-5 py-4 text-center" style={{ background:'linear-gradient(135deg,rgba(253,243,212,0.9),rgba(254,243,199,0.5))', border:'1px solid rgba(251,191,36,0.3)' }}>
              <p className="text-xs text-amber-600 font-semibold uppercase tracking-widest mb-0.5">Live {buyMetal === 'GOLD' ? 'Gold' : 'Silver'} Price</p>
              <p className="text-3xl font-black text-amber-900 dark:text-amber-800">₹{activeRate.toFixed(2)}<span className="text-sm font-medium text-amber-600">/g</span></p>
              {lockedRate && buyMetal === 'GOLD' && lockSecondsLeft > 0 && (
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <Timer size={13} className={lockSecondsLeft <= 30 ? 'text-red-500 animate-pulse' : 'text-green-600'} />
                  <span className={`text-xs font-bold tabular-nums ${lockSecondsLeft <= 30 ? 'text-red-600' : 'text-green-700'}`}>
                    Price locked &bull; {Math.floor(lockSecondsLeft / 60)}:{String(lockSecondsLeft % 60).padStart(2, '0')}
                  </span>
                </div>
              )}
              {lockedRate && lockSecondsLeft === 0 && (
                <div className="mt-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-red-600 font-bold">Price expired — refresh to lock again</span>
                  <button onClick={() => { if (goldBuyPrice) setLockedRate(goldBuyPrice); }} className="text-[10px] font-semibold text-amber-700 underline">
                    Refresh price
                  </button>
                </div>
              )}
              {!lockedRate && buyMetal === 'GOLD' && <p className="text-xs text-amber-500 mt-0.5">Price updates live every 5s</p>}
            </div>

            {/* Quick-select grams */}
            <div>
              <p className="text-xs text-amber-700 font-semibold mb-2">Quick Select</p>
              <div className="grid grid-cols-4 gap-2">
                {['0.5', '1', '2', '5'].map(g => (
                  <button key={g} type="button"
                    onClick={() => { setBuyForm({ grams: g }); setSlideValue(0); }}
                    className={`py-2.5 rounded-xl text-sm font-bold transition-all border ${
                      buyForm.grams === g
                        ? 'bg-amber-500 border-amber-500 text-black shadow'
                        : 'bg-white/80 dark:bg-gray-800 border-amber-200 dark:border-gray-700 text-amber-800 dark:text-amber-300 hover:border-amber-400'}`}>
                    {g}g
                  </button>
                ))}
              </div>
            </div>

            {/* Manual gram input */}
            <div className="relative">
              <input type="number" min="0.1" step="0.1" placeholder="Custom grams (e.g. 3.5)"
                value={buyForm.grams}
                onChange={e => { setBuyForm(f => ({ ...f, grams: e.target.value })); setSlideValue(0); }}
                className="w-full rounded-2xl border border-amber-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800 px-4 py-3 text-sm font-medium text-stone-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-amber-300 dark:placeholder-gray-600"
              />
              {buyTotal && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-right pointer-events-none">
                  <p className="text-lg font-black text-amber-900 dark:text-yellow-300 leading-tight">₹{Number(buyTotal).toLocaleString('en-IN')}</p>
                </div>
              )}
            </div>

            {/* Email verification gating */}
            {currentUser && !currentUser.emailVerified && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-300 flex flex-col gap-2">
                <span>Verify your email to buy. Check your inbox.</span>
                <button onClick={handleResendVerification} disabled={resending}
                  className="w-fit px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-semibold text-xs">
                  {resending ? 'Sending...' : 'Resend verification email'}
                </button>
                {resentMsg && <span className="text-green-600 text-xs">{resentMsg}</span>}
              </div>
            )}

            {/* Slide to Buy */}
            {buyForm.grams && buyTotal && !(currentUser && !currentUser.emailVerified) && (
              <SlideToConfirm
                label={paying ? 'Opening payment…' : `Slide to Pay ₹${Number(buyTotal).toLocaleString('en-IN')}`}
                value={slideValue}
                disabled={paying}
                onChange={setSlideValue}
                onConfirm={handleBuy}
              />
            )}
          </div>
        </BottomSheet>
      )}

      {/* Sell Gold Modal */}
      {modal.type === 'sell' && (
        <BottomSheet title="Sell Gold" onClose={() => setModal({ type: null })}>
          <div className="space-y-4">
            <div>
              <label className="fieldLabel">Gold Purity</label>
              <select value={sellForm.purity} onChange={(e) => setSellForm((f) => ({ ...f, purity: e.target.value }))} className="fieldInput">
                <option value="24">24K (999)</option>
                <option value="22">22K (916)</option>
                <option value="18">18K (750)</option>
              </select>
            </div>
            <div>
              <label className="fieldLabel">Weight (grams)</label>
              <input type="number" min="0.1" step="0.1" placeholder="e.g. 10"
                value={sellForm.grams}
                onChange={(e) => setSellForm((f) => ({ ...f, grams: e.target.value }))}
                className="fieldInput"
              />
            </div>
            {sellEst && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-sm">
                <div className="flex justify-between text-green-800 dark:text-green-300">
                  <span>Estimated value (after 5% deduction)</span>
                  <span className="font-black text-lg text-green-900 dark:text-green-300">₹{Number(sellEst).toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
            {userProfile && (
              <div className="flex items-center gap-3 bg-amber-50 dark:bg-gray-900 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-sm">
                <User size={16} className="text-amber-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-900 dark:text-white">{userProfile.name}</p>
                  {userProfile.phone && <p className="text-xs text-amber-600 dark:text-amber-400">{userProfile.phone}</p>}
                </div>
              </div>
            )}
            {/* Email verification gating */}
            {currentUser && !currentUser.emailVerified && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-300 mb-2 flex flex-col gap-2">
                <span>
                  Please verify your email to sell gold or silver. Check your inbox for a verification link.
                </span>
                <button
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="w-fit px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-semibold text-xs"
                >
                  {resending ? 'Sending...' : 'Resend verification email'}
                </button>
                {resentMsg && <span className="text-green-600 text-xs">{resentMsg}</span>}
              </div>
            )}
            <div>
              <label className="fieldLabel">Bank Name</label>
              <input type="text" placeholder="e.g. State Bank of India" value={sellForm.bank}
                onChange={(e) => setSellForm((f) => ({ ...f, bank: e.target.value }))} className="fieldInput" />
            </div>
            <div>
              <label className="fieldLabel">Account Number</label>
              <input type="text" placeholder="Bank account number" value={sellForm.account}
                onChange={(e) => setSellForm((f) => ({ ...f, account: e.target.value }))} className="fieldInput" />
            </div>
            <div>
              <label className="fieldLabel">IFSC Code</label>
              <input type="text" placeholder="e.g. SBIN0001234" value={sellForm.ifsc}
                onChange={(e) => setSellForm((f) => ({ ...f, ifsc: e.target.value }))} className="fieldInput" />
            </div>
            <button
              onClick={handleSell}
              disabled={Boolean(!sellForm.grams || (currentUser && currentUser.emailVerified === false))}
              className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 text-base"
            >
              <ArrowUpRight size={18} />
              Submit Sell Request
            </button>
            <p className="text-xs text-amber-600/70 dark:text-gray-500 text-center">Our team will review and contact you within 24 hours.</p>
          </div>
        </BottomSheet>
      )}

      {/* AutoPay Modal */}
      {modal.type === 'autopay' && (
        <BottomSheet title="Setup Gold AutoPay (SIP)" onClose={() => setModal({ type: null })}>
          <div className="space-y-4">
            {noKey && <div className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 p-3 rounded-lg border border-amber-200 dark:border-amber-700 flex items-center gap-2">
              <AlertCircle size={13} className="flex-shrink-0" />
              Razorpay key not set. Add <code>VITE_RAZORPAY_KEY_ID</code> to <code>apps/web-app/.env</code> to enable payments.
            </div>}

            <div>
              <label className="fieldLabel">Monthly Amount (₹)</label>
              <div className="flex gap-2 mb-2">
                {['500', '1000', '2000', '5000'].map((a) => (
                  <button key={a} onClick={() => setAutoPayForm((f) => ({ ...f, amount: a }))}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg border transition-colors ${autoPayForm.amount === a
                      ? 'bg-amber-500 border-amber-500 text-black'
                      : 'bg-white dark:bg-gray-800 border-amber-200 dark:border-gray-600 text-amber-800 dark:text-amber-300 hover:border-amber-400'}`}>
                    ₹{Number(a).toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
              <input type="number" min="100" step="100" placeholder="Custom amount"
                value={autoPayForm.amount}
                onChange={(e) => setAutoPayForm((f) => ({ ...f, amount: e.target.value }))}
                className="fieldInput"
              />
              {autoPayForm.amount && gold24 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
                  ≈ {(parseFloat(autoPayForm.amount) / gold24.ratePerGram).toFixed(3)}g of 24K gold per month at today's rate
                </p>
              )}
            </div>

            {userProfile && (
              <div className="flex items-center gap-3 bg-amber-50 dark:bg-gray-900 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-sm mb-1">
                <User size={16} className="text-amber-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-900 dark:text-white">{userProfile.name}</p>
                  {userProfile.email && <p className="text-xs text-amber-600 dark:text-amber-400">{userProfile.email}</p>}
                </div>
              </div>
            )}
            {/* Email verification gating */}
            {currentUser && !currentUser.emailVerified && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-300 mb-2 flex flex-col gap-2">
                <span>
                  Please verify your email to setup AutoPay. Check your inbox for a verification link.
                </span>
                <button
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="w-fit px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-semibold text-xs"
                >
                  {resending ? 'Sending...' : 'Resend verification email'}
                </button>
                {resentMsg && <span className="text-green-600 text-xs">{resentMsg}</span>}
              </div>
            )}

            <button
              onClick={handleAutoPay}
              disabled={Boolean(paying || !autoPayForm.amount || (currentUser && currentUser.emailVerified === false))}
              className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 disabled:from-gray-300 disabled:to-gray-400 text-amber-950 font-black rounded-xl transition-all flex items-center justify-center gap-2 text-base dark:text-amber-950"
            >
              {paying ? <Loader2 size={18} className="animate-spin" /> : <Repeat size={18} />}
              {paying ? 'Setting up...' : `Activate ₹${Number(autoPayForm.amount || 0).toLocaleString('en-IN')}/month AutoPay`}
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// TradingView Mini Chart Widget
// ────────────────────────────────────────────────────────────────────────────
const TradingViewMini: React.FC<{ symbol: string; theme?: string }> = ({ symbol, theme = 'light' }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
    script.async = true;
    script.type = 'text/javascript';
    script.innerHTML = JSON.stringify({
      symbol,
      width: '100%',
      height: 220,
      locale: 'en',
      dateRange: '1D',
      colorTheme: theme,
      trendLineColor: 'rgba(245, 158, 11, 1)',
      underLineColor: 'rgba(245, 158, 11, 0.15)',
      underLineBottomColor: 'rgba(245, 158, 11, 0)',
      isTransparent: false,
      autosize: true,
      largeChartUrl: '',
      noTimeScale: false,
    });
    container.appendChild(script);

    return () => { if (container) container.innerHTML = ''; };
  }, [symbol, theme]);

  return (
    <div className="tradingview-widget-container" ref={containerRef} style={{ minHeight: 220 }}>
      <div className="tradingview-widget-container__widget" />
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Bottom Sheet Component (slides up from bottom)
// ────────────────────────────────────────────────────────────────────────────
const BottomSheet: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title, onClose, children,
}) => {
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
  const close = () => { setVisible(false); setTimeout(onClose, 320); };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={close}
      />
      <div
        className="relative bg-white dark:bg-gray-950 border border-amber-100 dark:border-yellow-900/30 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col transition-transform duration-300 ease-out"
        style={{ transform: visible ? 'translateY(0)' : 'translateY(100%)' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-amber-200 dark:bg-gray-700" />
        </div>
        <div className="flex items-center justify-between px-6 py-3 border-b border-amber-100 dark:border-gray-800">
          <h3 className="text-lg font-black text-amber-900 dark:text-white">{title}</h3>
          <button onClick={close} className="text-amber-400 dark:text-gray-500 hover:text-amber-700 dark:hover:text-gray-300 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-amber-50 dark:hover:bg-gray-800">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 space-y-1">{children}</div>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Slide to Confirm — cinematic gold slider with SVG arrow
// ────────────────────────────────────────────────────────────────────────────
const SlideToConfirm: React.FC<{
  label: string; value: number; disabled: boolean;
  onChange: (v: number) => void; onConfirm: () => void;
}> = ({ label, value, disabled, onChange, onConfirm }) => {
  const confirmed = value >= 95;
  const trackRef = useRef<HTMLDivElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    onChange(v);
    if (v >= 95 && !disabled) {
      setTimeout(() => { onChange(100); onConfirm(); }, 150);
    }
  };

  // SVG check mark icon
  const CheckSVG = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M4 12l5 5L20 7" />
    </svg>
  );
  // SVG right-chevron arrow for the thumb
  const ChevronSVG = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
  // Double chevron arrows shown on the track as a hint
  const ArrowHint = () => (
    <svg viewBox="0 0 40 20" fill="none" className="w-10 h-5 opacity-30">
      <path d="M2 10 l7 -7 l7 7 l-7 7 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" transform="translate(0,0)" />
      <path d="M2 10 l7 -7 l7 7 l-7 7 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" transform="translate(14,0)" />
      <path d="M2 10 l7 -7 l7 7 l-7 7 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" transform="translate(24,0)" />
    </svg>
  );

  return (
    <div className="relative select-none" ref={trackRef}>
      {/* Track */}
      <div
        className="relative h-16 rounded-2xl overflow-hidden"
        style={{
          background: confirmed
            ? 'linear-gradient(90deg,#16a34a,#22c55e)'
            : 'linear-gradient(135deg,#1c1c1c 0%,#2a2a2a 100%)',
          border: confirmed ? '1.5px solid #22c55e' : '1.5px solid rgba(251,191,36,0.5)',
          boxShadow: confirmed
            ? '0 0 20px rgba(34,197,94,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
            : '0 0 20px rgba(251,191,36,0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
          transition: 'background 0.4s ease, box-shadow 0.4s ease',
        }}
      >
        {/* Gold fill as user drags */}
        <div
          className="absolute inset-y-0 left-0 rounded-2xl"
          style={{
            width: `${value}%`,
            background: confirmed
              ? 'rgba(34,197,94,0.3)'
              : 'linear-gradient(90deg,rgba(251,191,36,0.25),rgba(245,158,11,0.12))',
            transition: 'width 0.05s linear',
          }}
        />

        {/* "Slide to pay →→→" hint arrows (hidden once dragging starts) */}
        {value < 10 && !confirmed && (
          <div className="absolute inset-0 flex items-center justify-center gap-8 pointer-events-none">
            <div className="flex gap-1 text-amber-400/40">
              <ArrowHint />
            </div>
          </div>
        )}

        {/* Centre label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none pl-14">
          <span className={`text-sm font-bold tracking-wide ${confirmed ? 'text-white' : 'text-amber-300'}`}>
            {confirmed ? 'Confirmed — opening payment...' : label}
          </span>
        </div>

        {/* Thumb — gold pill with arrow icon */}
        <div
          className="absolute inset-y-0 flex items-center pointer-events-none"
          style={{
            left: `calc(${Math.min(value, 94)}% - 2px)`,
            transition: confirmed ? 'none' : 'left 0.05s linear',
          }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-xl"
            style={{
              background: confirmed
                ? 'linear-gradient(135deg,#22c55e,#16a34a)'
                : 'linear-gradient(135deg,#fde68a 0%,#f59e0b 60%,#d97706 100%)',
              border: '2px solid rgba(255,255,255,0.25)',
              boxShadow: confirmed
                ? '0 4px 16px rgba(34,197,94,0.5)'
                : '0 4px 16px rgba(245,158,11,0.6), 0 0 0 3px rgba(251,191,36,0.2)',
              color: confirmed ? '#fff' : '#451a03',
              transform: 'scale(1.05)',
            }}
          >
            {confirmed ? <CheckSVG /> : <ChevronSVG />}
          </div>
        </div>

        {/* Invisible range input */}
        <input
          type="range" min={0} max={100} value={value}
          disabled={disabled || confirmed}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-grab active:cursor-grabbing disabled:cursor-not-allowed"
          style={{ WebkitAppearance: 'none' }}
        />
      </div>
      <p className="text-center text-xs text-amber-500/70 dark:text-amber-600/60 mt-1.5 flex items-center justify-center gap-1">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 opacity-60"><path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Slide right to confirm purchase
      </p>
    </div>
  );
};

