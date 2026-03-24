/**
 * Home Landing Page
 *
 * Golden/cream theme in light mode | Golden/black theme in dark mode
 * Features: Live gold & silver rates, Buy, Sell, GOLD SIP, daily tracking
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp, TrendingDown, ShoppingCart, ArrowUpRight,
  RefreshCw, Shield, Bell, Zap, Star, ChevronRight,
  Coins, CreditCard, Repeat, CheckCircle, AlertCircle,
  X, Loader2, Sparkles, Phone, Mail, User, Timer,
} from 'lucide-react';
import { fetchLiveMetalRates, fetchWorkerData, type MetalRate } from '../lib/goldPrices';
import { buyGold, buyCoins, setupGoldAutoPay, RAZORPAY_KEY_ID } from '../lib/razorpay';
import { useAuth } from '../context/AuthContext';
import { collection, addDoc, updateDoc, doc, increment, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { fetchCustomerOrders, normalizeGoldPurity } from '../lib/customerOrders';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────
interface ModalState {
  type: 'buy' | 'sell' | 'autopay' | 'coin-request' | null;
}

interface BuyFormData {
  grams: string;
}

interface AutoPayFormData {
  amount: string;
  metal: 'GOLD' | 'SILVER';
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
}

interface SellFormData {
  grams: string;
  amountInr: string;
  bank: string;
  account: string;
  ifsc: string;
}

// ────────────────────────────────────────────────────────────────────────────

type CoinMetal = 'GOLD' | 'SILVER';

const COIN_OPTIONS: Record<CoinMetal, number[]> = {
  GOLD: [0.5, 1, 2, 10, 20, 50],
  SILVER: [10, 20, 50, 100, 250, 500, 1000],
};
const COIN_MAKING_CHARGE_PER_UNIT = 300;

// Component
// ────────────────────────────────────────────────────────────────────────────
export const HomeLanding: React.FC = () => {
  const REDEEM_GST_FACTOR = 0.97;
  const REDEEM_DEDUCTION_PER_GRAM = 50;
  const GOLD_COMMISSION_PER_GRAM = 20;   // Rs 200 per 10g
  const SILVER_COMMISSION_PER_GRAM = 2;  // Rs 2000 per 1kg
  // Detailed live price breakdown state
  const [priceFeed, setPriceFeed] = useState<any>(null);
  const fetchDetailedFeed = useCallback(async () => {
    try {
      const d = await fetchWorkerData();
      if (d?.xauUsd) {
        setPriceFeed({
          xauInr:    d.xauInr,
          xagInr:    d.xagInr,
          xauUsd:    d.xauUsd,
          xagUsd:    d.xagUsd,
          usdInr:    d.usdToInr,
          source:    d.source,
          fetchedAt: new Date(d.fetchedAt).toLocaleTimeString('en-IN'),
        });
        return;
      }
      setPriceFeed(null);
    } catch {
      setPriceFeed(null);
    }
  }, []);

  useEffect(() => {
    fetchDetailedFeed();
    const interval = setInterval(fetchDetailedFeed, 5 * 60 * 1000); // refresh every 5 min (match worker cron)
    return () => clearInterval(interval);
  }, [fetchDetailedFeed]);
  const { currentUser, userProfile } = useAuth();
  const ownerVerificationStatus = ((userProfile as any)?.shopVerificationStatus ?? '').toUpperCase();
  const ownerIsUnverified = (userProfile?.role === 'OWNER' || userProfile?.role === 'STAFF')
    && ownerVerificationStatus !== 'APPROVED';
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
  const [autoPayForm, setAutoPayForm] = useState<AutoPayFormData>({ amount: '500', metal: 'GOLD', frequency: 'MONTHLY' });
  const [sellForm, setSellForm] = useState<SellFormData>({
    grams: '', amountInr: '', bank: '', account: '', ifsc: '',
  });
  const [sellInputMode, setSellInputMode] = useState<'GRAMS' | 'AMOUNT'>('GRAMS');
  const [redeemMode, setRedeemMode] = useState<'REDEEM' | 'SELL_TO_JEWELLER'>('REDEEM');
  const [paying, setPaying] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [buyMetal, setBuyMetal] = useState<'GOLD' | 'SILVER'>('GOLD');
  const [slideValue, setSlideValue] = useState(0);
  const [paymentDebugLines, setPaymentDebugLines] = useState<string[]>([]);
  const [coinMetal, setCoinMetal] = useState<CoinMetal>('GOLD');
  const [coinWeightGrams, setCoinWeightGrams] = useState<number>(0.5);
  const [coinQuantity, setCoinQuantity] = useState<number>(1);
  const [coinDeliveryCity, setCoinDeliveryCity] = useState('');
  const [coinNote, setCoinNote] = useState('');
  const [coinSubmitting, setCoinSubmitting] = useState(false);
  const [coinSuccessOverlay, setCoinSuccessOverlay] = useState(false);
  const [customerSummary, setCustomerSummary] = useState({ totalOrders: 0, totalGoldGrams: 0, totalSilverGrams: 0 });
  const [customerPortfolioStats, setCustomerPortfolioStats] = useState({
    totalValueInr: 0,
    totalGainInr: 0,
    totalGainPct: 0,
    maxRedeemableGoldGrams: 0,
  });
  const [ownerSummary, setOwnerSummary] = useState({
    totalOrders: 0,
    totalGoldSoldGrams: 0,
    totalSilverSoldGrams: 0,
    totalRevenueInr: 0,
    totalCommissionInr: 0,
  });
  // ── Price-lock countdown ──────────────────────────────────────────
  const LOCK_DURATION = 120; // seconds
  const [lockSecondsLeft, setLockSecondsLeft] = useState(0);
  const [lockExpiresAtMs, setLockExpiresAtMs] = useState<number | null>(null);
  const lockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startLockTimer = (expiresAtMs: number) => {
    if (lockIntervalRef.current) clearInterval(lockIntervalRef.current);
    setLockExpiresAtMs(expiresAtMs);
    
    // Calculate initial remaining time based on server timestamp
    const nowMs = Date.now();
    const secondsLeft = Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000));
    setLockSecondsLeft(secondsLeft);
    
    lockIntervalRef.current = setInterval(() => {
      const currentMs = Date.now();
      const remainingMs = expiresAtMs - currentMs;
      const secondsRemaining = Math.max(0, Math.ceil(remainingMs / 1000));
      
      if (remainingMs <= 0) {
        clearInterval(lockIntervalRef.current!);
        lockIntervalRef.current = null;
        setLockSecondsLeft(0);
        return;
      }
      
      setLockSecondsLeft(secondsRemaining);
    }, 1000);
  };

  const clearLockTimer = () => {
    if (lockIntervalRef.current) clearInterval(lockIntervalRef.current);
    lockIntervalRef.current = null;
    setLockSecondsLeft(0);
    setLockExpiresAtMs(null);
  };

  const pushPaymentDebug = (line: string) => {
    const stamp = new Date().toLocaleTimeString('en-IN', { hour12: false });
    setPaymentDebugLines((prev) => {
      const next = [...prev, `${stamp}  ${line}`];
      return next.slice(-8);
    });
  };

  // Cleanup on unmount
  useEffect(() => () => clearLockTimer(), []);

  // Auto-start timer whenever a rate is locked and we have expiry time
  useEffect(() => {
    if (lockedRate && lockExpiresAtMs) {
      startLockTimer(lockExpiresAtMs);
    } else {
      clearLockTimer();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedRate, lockExpiresAtMs]);
  // Show 999 rates to users, but execute gold buy/sell on 995 operational rate.
  const gold24 = rates.find((r) => r.metalType === 'GOLD' && r.purity === 999);
  const gold995 = rates.find((r) => r.metalType === 'GOLD' && r.purity === 995);
  const silver24 = rates.find((r) => r.metalType === 'SILVER' && r.purity === 999);
  const goldOperationalRatePerGram = gold995?.ratePerGram ?? gold24?.ratePerGram ?? 0;
  // Customer buy prices include bullion-trader commission component.
  const goldBuyPrice = goldOperationalRatePerGram
    ? Math.round((goldOperationalRatePerGram + GOLD_COMMISSION_PER_GRAM) * 100) / 100
    : 0;
  const silverBuyPrice = silver24 ? Math.round((silver24.ratePerGram + SILVER_COMMISSION_PER_GRAM) * 100) / 100 : 0;
  // Live rates table: show 999 grade only
  const filteredRates = rates.filter((r) => (r.metalType === 'GOLD' && r.purity === 999) || (r.metalType === 'SILVER' && r.purity === 999));

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

  useEffect(() => {
    const loadCustomerSummary = async () => {
      if (!currentUser || userProfile?.role !== 'CUSTOMER') return;
      const all = await fetchCustomerOrders({
        uid: currentUser.uid,
        email: currentUser.email ?? userProfile?.email ?? '',
        phone: userProfile?.phone ?? '',
      });
      const totalGoldGrams = all
        .filter((o: any) => o.type === 'BUY' && o.status === 'SUCCESS' && o.metal === 'GOLD')
        .reduce((sum: number, o: any) => sum + (Number(o.grams) || 0), 0);
      const totalSilverGrams = all
        .filter((o: any) => o.type === 'BUY' && o.status === 'SUCCESS' && o.metal === 'SILVER')
        .reduce((sum: number, o: any) => sum + (Number(o.grams) || 0), 0);

      setCustomerSummary({
        totalOrders: all.length,
        totalGoldGrams,
        totalSilverGrams,
      });

      const holdings: Record<string, { buyGrams: number; sellGrams: number; totalInvested: number }> = {};
      for (const o of all as any[]) {
        const metal = String(o.metal ?? '').toUpperCase();
        if (!['GOLD', 'SILVER'].includes(metal)) continue;
        const purityRaw = Number(o.purity) || 0;
        const purity = metal === 'GOLD' ? normalizeGoldPurity(purityRaw) : purityRaw;
        const key = `${metal}_${purity}`;
        if (!holdings[key]) holdings[key] = { buyGrams: 0, sellGrams: 0, totalInvested: 0 };
        const grams = Number(o.grams) || 0;
        const amount = Number(o.totalAmountInr) || 0;
        const type = (o.type ?? '').toUpperCase();
        const status = (o.status ?? '').toUpperCase();
        if (type === 'BUY' && status === 'SUCCESS') {
          holdings[key].buyGrams += grams;
          holdings[key].totalInvested += amount;
        }
        if (type === 'SELL' && status !== 'REJECTED') {
          holdings[key].sellGrams += grams;
        }
      }

      let totalCurrentValue = 0;
      let costBasisTotal = 0;
      for (const [key, h] of Object.entries(holdings)) {
        const netGrams = h.buyGrams - h.sellGrams;
        if (netGrams <= 0.0001) continue;
        const avgBuyPrice = h.buyGrams > 0 ? h.totalInvested / h.buyGrams : 0;
        const [metal, purityStr] = key.split('_');
        const purity = Number(purityStr);
        const liveRate = rates.find((r) => r.metalType === metal && r.purity === purity)?.ratePerGram ?? 0;
        const currentValue = netGrams * liveRate;
        const costBasis = netGrams * avgBuyPrice;
        totalCurrentValue += currentValue;
        costBasisTotal += costBasis;
      }

      let maxRedeemableGoldGrams = 0;
      for (const [key, h] of Object.entries(holdings)) {
        if (key.startsWith('GOLD_')) {
          maxRedeemableGoldGrams += (h.buyGrams - h.sellGrams);
        }
      }

      const gain = totalCurrentValue - costBasisTotal;
      const gainPct = costBasisTotal > 0 ? (gain / costBasisTotal) * 100 : 0;
      setCustomerPortfolioStats({
        totalValueInr: totalCurrentValue,
        totalGainInr: gain,
        totalGainPct: gainPct,
        maxRedeemableGoldGrams: Math.max(0, maxRedeemableGoldGrams),
      });
    };

    loadCustomerSummary().catch(() => {
      // Non-blocking summary panel.
    });
  }, [currentUser, userProfile, rates]);

  useEffect(() => {
    const loadOwnerSummary = async () => {
      const role = (userProfile?.role ?? '').toUpperCase();
      if (!currentUser || !['OWNER', 'STAFF'].includes(role)) return;
      const shopName = (userProfile?.shopName ?? '').trim();
      if (!shopName) return;

      const variants = Array.from(new Set([shopName, shopName.toLowerCase(), shopName.toUpperCase()]));
      const found: Record<string, any> = {};

      for (const s of variants) {
        try {
          const snap = await getDocs(query(collection(db, 'goldOnlineOrders'), where('shopName', '==', s)));
          snap.docs.forEach((d) => { found[d.id] = { id: d.id, ...(d.data() as any) }; });
        } catch {
          // Non-blocking owner summary fallback.
        }
      }

      const list = Object.values(found);
      const successBuys = list.filter((o: any) => (o.type ?? '').toUpperCase() === 'BUY' && (o.status ?? '').toUpperCase() === 'SUCCESS');

      const totalGoldSoldGrams = successBuys
        .filter((o: any) => (o.metal ?? '').toUpperCase() === 'GOLD')
        .reduce((s: number, o: any) => s + (Number(o.grams) || 0), 0);
      const totalSilverSoldGrams = successBuys
        .filter((o: any) => (o.metal ?? '').toUpperCase() === 'SILVER')
        .reduce((s: number, o: any) => s + (Number(o.grams) || 0), 0);
      const totalRevenueInr = successBuys.reduce((s: number, o: any) => s + (Number(o.totalAmountInr) || 0), 0);
      const totalCommissionInr = successBuys.reduce((s: number, o: any) => s + (Number(o.shopCommissionInr) || 0), 0);

      setOwnerSummary({
        totalOrders: list.length,
        totalGoldSoldGrams,
        totalSilverSoldGrams,
        totalRevenueInr,
        totalCommissionInr,
      });
    };

    loadOwnerSummary().catch(() => {
      // Non-blocking owner summary panel.
    });
  }, [currentUser, userProfile]);

  const fetchCustomerLedgerOrders = useCallback(async () => {
    if (!currentUser) return [] as any[];
    return fetchCustomerOrders({
      uid: currentUser.uid,
      email: currentUser.email ?? userProfile?.email ?? '',
      phone: userProfile?.phone ?? '',
    });
  }, [currentUser, userProfile]);

  // ── Buy Gold or Silver ───────────────────────────────────────────────────
  const handleBuy = () => {
    if (!buyForm.grams) return;
    const liveMarketRate = buyMetal === 'GOLD' ? goldOperationalRatePerGram : (silver24?.ratePerGram ?? 0);
    const commissionPerGram = buyMetal === 'GOLD' ? GOLD_COMMISSION_PER_GRAM : SILVER_COMMISSION_PER_GRAM;
    const customerRate = buyMetal === 'GOLD'
      ? (lockedRate ?? (liveMarketRate + commissionPerGram))
      : (liveMarketRate + commissionPerGram);
    if (!customerRate || !liveMarketRate) return;
    const grams       = parseFloat(buyForm.grams);
    const ratePerGram = customerRate;
    const baseAmountInr = grams * liveMarketRate;
    const shopCommissionInr = grams * commissionPerGram;
    const totalAmount = grams * customerRate;
    const custName    = userProfile?.name  ?? currentUser?.displayName ?? '';
    const custEmail   = userProfile?.email ?? currentUser?.email ?? '';
    const custPhone   = userProfile?.phone ?? '';
    const customerShopName = (userProfile as any)?.shopName ?? '';
    const customerShopId = (userProfile as any)?.shopId ?? '';

    setPaying(true);
    setPaymentDebugLines([]);
    buyGold({
      grams, ratePerGram,
      customerName:  custName,
      customerEmail: custEmail,
      customerPhone: custPhone,
      customerUid: currentUser?.uid ?? '',
      metal: buyMetal,
      onLockCreated: (lockData) => {
        pushPaymentDebug(`Price lock created. Lock ID: ${lockData.lockId.slice(0, 10)}... Expires in ~2 min.`);
        // Only NOW (after backend confirms) do we set the locked rate and start timer
        if (buyMetal === 'GOLD') {
          setLockedRate(ratePerGram);
          setLockExpiresAtMs(lockData.expiresAtMs);
        }
      },
      onFailure: (err) => {
        setPaying(false);
        setLockedRate(null);
        setLockExpiresAtMs(null);
        setSlideValue(0);
        setError(`Payment failed: ${err.message}. Please try again. If issue continues, share payment debug details from this screen.`);
        setTimeout(() => setError(''), 8000);
      },
      onDebug: (details) => pushPaymentDebug(details),
      onSuccess: async (id) => {
        pushPaymentDebug(`Payment captured successfully. Payment ID: ${id}`);
        setPaying(false);
        setModal({ type: null });
        setLockedRate(null);
        setLockExpiresAtMs(null);
        setSlideValue(0);
        setSuccessMsg(`${buyMetal === 'GOLD' ? 'Gold' : 'Silver'} purchased! Payment ID: ${id}`);
        setBuyForm({ grams: '' });
        setTimeout(() => setSuccessMsg(''), 8000);

        // ── Write order to Firestore ────────────────────────────────────
        try {
          await addDoc(collection(db, 'goldOnlineOrders'), {
            userId:            currentUser?.uid ?? 'anonymous',
            customerUid:       currentUser?.uid ?? 'anonymous',
            type:              'BUY',
            metal:             buyMetal,
            purity:            buyMetal === 'GOLD' ? 995 : 999,
            grams,
            ratePerGram,
            marketRatePerGram: liveMarketRate,
            commissionPerGram,
            shopCommissionInr,
            bullionBaseAmountInr: baseAmountInr,
            bullionSettlementAmountInr: totalAmount,
            bullionPayoutStatus: 'UNSETTLED',
            totalAmountInr:    totalAmount,
            razorpayPaymentId: id,
            status:            'SUCCESS',
            customerName:      custName,
            customerPhone:     custPhone,
            customerEmail:     custEmail,
            shopName:          customerShopName,
            shopId:            customerShopId,
            createdAt:         serverTimestamp(),
            updatedAt:         serverTimestamp(),
          });
          // Update aggregate counters on the user document (customer)
          if (currentUser) {
            const updateData: any = {
              totalInvestedInr: increment(totalAmount),
              updatedAt:        serverTimestamp(),
            };
            if (buyMetal === 'GOLD') updateData.totalGoldPurchasedGrams   = increment(grams);
            else                     updateData.totalSilverPurchasedGrams = increment(grams);
            await updateDoc(doc(db, 'users', currentUser.uid), updateData);
          }
          
          // Credit commission explicitly to the Shop Owner's account
          if (customerShopId) {
            try {
              // 1. Update the shop document
              await updateDoc(doc(db, 'shops', customerShopId), {
                totalCommissionEarned: increment(shopCommissionInr),
                updatedAt: serverTimestamp()
              });
              
              // 2. Fetch the owner's UID from the shop document and update their user account
              const { getDoc } = await import('firebase/firestore');
              const shopSnap = await getDoc(doc(db, 'shops', customerShopId));
              if (shopSnap.exists() && shopSnap.data().ownerUid) {
                const ownerUid = shopSnap.data().ownerUid;
                await updateDoc(doc(db, 'users', ownerUid), {
                  totalCommissionEarned: increment(shopCommissionInr),
                  updatedAt: serverTimestamp()
                });
              }
            } catch (err) {
              // console.error('Failed to credit commission to shop owner account:', err);
            }
          }
        } catch { /* non-blocking */ }
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
      metal:        autoPayForm.metal,
      frequency:    autoPayForm.frequency,
      customerName:  custName,
      customerEmail: custEmail,
      customerPhone: custPhone,
      onDebug: (msg) => console.log('[AutoPay Debug]:', msg),
      onSuccess: async (id) => {
        setPaying(false);
        setModal({ type: null });
        const freqLabel = autoPayForm.frequency === 'DAILY' ? 'day' : autoPayForm.frequency === 'WEEKLY' ? 'week' : 'month';
        setSuccessMsg(`GOLD SIP activated! ID: ${id}. ${autoPayForm.metal === 'GOLD' ? 'Gold' : 'Silver'} SIP of ₹${Number(autoPayForm.amount).toLocaleString('en-IN')}/${freqLabel} is set up.`);
        setAutoPayForm({ amount: '500', metal: 'GOLD', frequency: 'MONTHLY' });
        setTimeout(() => setSuccessMsg(''), 10000);

        // ── Write subscription to Firestore ───────────────────────────────
        try {
          const frequencyDays = autoPayForm.frequency === 'DAILY' ? 1 : autoPayForm.frequency === 'WEEKLY' ? 7 : 30;
          await addDoc(collection(db, 'autoPaySubscriptions'), {
            userId:                 currentUser?.uid ?? 'anonymous',
            metal:                  autoPayForm.metal,
            amountInr:              planAmount,
            frequency:              autoPayForm.frequency,
            frequencyDays,
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

  // ── Redeem / Sell-to-jeweller request ────────────────────────────────────
  const handleSell = async () => {

    const purityNum = 995;
    const sellRate = rates.find((r) => r.metalType === 'GOLD' && r.purity === 995)
      ?? rates.find((r) => r.metalType === 'GOLD' && r.purity === 999);
    const marketRatePerGram = sellRate?.ratePerGram ?? 0;
    const postGstRatePerGram = marketRatePerGram * REDEEM_GST_FACTOR;
    const effectiveSellRatePerGram = Math.max(0, Math.round((postGstRatePerGram - REDEEM_DEDUCTION_PER_GRAM) * 100) / 100);

    const gramsInput = parseFloat(sellForm.grams) || 0;
    const amountInput = parseFloat(sellForm.amountInr) || 0;
    let grams = gramsInput;
    if (grams <= 0 && amountInput > 0 && effectiveSellRatePerGram > 0) {
      grams = amountInput / effectiveSellRatePerGram;
    }
    if (grams <= 0 || !isFinite(grams)) {
      setSuccessMsg('Enter a valid redeem quantity or amount.');
      setTimeout(() => setSuccessMsg(''), 7000);
      return;
    }

    const orders = await fetchCustomerLedgerOrders();
    const heldGrams = orders.reduce((sum: number, o: any) => {
      if ((o.metal ?? '').toUpperCase() !== 'GOLD') return sum;
      const normalized = normalizeGoldPurity(Number(o.purity) || 0);
      if (![995, 999].includes(normalized)) return sum;
      const orderGrams = Number(o.grams) || 0;
      if ((o.type ?? '').toUpperCase() === 'BUY' && (o.status ?? '').toUpperCase() === 'SUCCESS') return sum + orderGrams;
      if ((o.type ?? '').toUpperCase() === 'SELL' && (o.status ?? '').toUpperCase() !== 'REJECTED') return sum - orderGrams;
      return sum;
    }, 0);
    if (redeemMode === 'REDEEM' && grams > heldGrams) {
      setSuccessMsg(`Insufficient redeemable balance. Available: ${heldGrams.toFixed(4)}g, requested: ${grams.toFixed(4)}g.`);
      setTimeout(() => setSuccessMsg(''), 9000);
      return;
    }
    const totalAmount = amountInput > 0 ? amountInput : (grams * effectiveSellRatePerGram);
    const custName    = userProfile?.name  ?? currentUser?.displayName ?? '';
    const custPhone   = userProfile?.phone ?? '';

    setModal({ type: null });
    setSuccessMsg(`${redeemMode === 'REDEEM' ? 'Redeem' : 'Sell-to-jeweller'} request submitted for ${grams.toFixed(4)}g of 24K (995) gold.`);
    setSellForm({ grams: '', amountInr: '', bank: '', account: '', ifsc: '' });
    setTimeout(() => setSuccessMsg(''), 12000);

    // ── Write jeweller-visible request to Firestore ───────────────────────
    try {
      await addDoc(collection(db, 'redemptionRequests'), {
        customerUid:    currentUser?.uid ?? 'anonymous',
        customerName:   custName,
        customerEmail:  userProfile?.email ?? currentUser?.email ?? '',
        customerPhone:  custPhone,
        shopName:       (userProfile as any)?.shopName ?? '',
        shopId:         (userProfile as any)?.shopId ?? '',
        requestType:    redeemMode,
        requestChannel: 'HOME',
        metal:          'GOLD',
        purity:         purityNum,
        grams,
        marketRatePerGram,
        redeemRatePerGram: effectiveSellRatePerGram,
        estimatedInr:   totalAmount,
        customerRequestedInr: amountInput > 0 ? amountInput : totalAmount,
        availableBalanceAtRequestGrams: heldGrams,
        bankName:       sellForm.bank,
        accountNumber:  sellForm.account,
        ifscCode:       sellForm.ifsc,
        status:         'PENDING',
        createdAt:      serverTimestamp(),
        updatedAt:      serverTimestamp(),
      });

      if (redeemMode === 'REDEEM') {
        await addDoc(collection(db, 'goldOnlineOrders'), {
          userId:         currentUser?.uid ?? 'anonymous',
          customerUid:    currentUser?.uid ?? 'anonymous',
          type:           'SELL',
          metal:          'GOLD',
          purity:         purityNum,
          grams,
          ratePerGram:    effectiveSellRatePerGram,
          marketRatePerGram,
          postGstRatePerGram,
          redeemGstReductionPercent: 3,
          redeemFlatDeductionPerGram: REDEEM_DEDUCTION_PER_GRAM,
          availableBalanceAtRequestGrams: heldGrams,
          totalAmountInr: totalAmount,
          customerRequestedInr: amountInput > 0 ? amountInput : totalAmount,
          status:         'PENDING',
          customerName:   custName,
          customerPhone:  custPhone,
          customerEmail:  userProfile?.email ?? currentUser?.email ?? '',
          shopName:       (userProfile as any)?.shopName ?? '',
          shopId:         (userProfile as any)?.shopId ?? '',
          bankName:       sellForm.bank,
          accountNumber:  sellForm.account,
          ifscCode:       sellForm.ifsc,
          createdAt:      serverTimestamp(),
          updatedAt:      serverTimestamp(),
        });
      }
    } catch { /* non-blocking */ }
  };

  const activeRate = buyMetal === 'GOLD'
    ? (lockedRate ?? goldBuyPrice)
    : silverBuyPrice;
  const buyTotal = buyForm.grams && activeRate
    ? (parseFloat(buyForm.grams) * activeRate).toFixed(4)
    : null;

  const sellLiveRate = rates.find((r) => r.metalType === 'GOLD' && r.purity === 995)
    ?? rates.find((r) => r.metalType === 'GOLD' && r.purity === 999);
  const sellRedeemRate = Math.max(0, ((sellLiveRate?.ratePerGram ?? 0) * REDEEM_GST_FACTOR) - REDEEM_DEDUCTION_PER_GRAM);
  const sellGramsInput = parseFloat(sellForm.grams) || 0;
  const sellAmountInput = parseFloat(sellForm.amountInr) || 0;
  const sellDerivedGrams = sellGramsInput > 0
    ? sellGramsInput
    : (sellAmountInput > 0 && sellRedeemRate > 0 ? sellAmountInput / sellRedeemRate : 0);
  const sellEst = sellDerivedGrams > 0 && sellRedeemRate > 0
    ? (sellDerivedGrams * sellRedeemRate).toFixed(4)
    : null;

  const activeCoinRate = coinMetal === 'GOLD' ? goldBuyPrice : silverBuyPrice;
  const estimatedCoinAmount = Math.max(0, (activeCoinRate * coinWeightGrams * coinQuantity) + (COIN_MAKING_CHARGE_PER_UNIT * coinQuantity));

  const submitCoinRequest = async () => {
    if (!currentUser || !userProfile) {
      setError('Please sign in again and retry coin request.');
      return;
    }
    if (!coinDeliveryCity.trim()) {
      setError('Please enter delivery city for coin request.');
      return;
    }
    if (!coinWeightGrams || coinQuantity <= 0 || !activeCoinRate) {
      setError('Please select a valid coin size and quantity.');
      return;
    }

    setCoinSubmitting(true);
    const customerShopName = (userProfile as any)?.shopName ?? '';
    const customerShopId = (userProfile as any)?.shopId ?? '';
    const customerName = userProfile.name ?? currentUser.displayName ?? '';
    const customerEmail = userProfile.email ?? currentUser.email ?? '';
    const customerPhone = userProfile.phone ?? '';

    buyCoins({
      metal: coinMetal,
      gramsPerCoin: coinWeightGrams,
      quantity: coinQuantity,
      ratePerGram: activeCoinRate,
      makingChargesPerCoinInr: COIN_MAKING_CHARGE_PER_UNIT,
      customerName,
      customerEmail,
      customerPhone,
      customerUid: currentUser.uid,
      onSuccess: async (paymentId, paymentDetails) => {
        try {
          await addDoc(collection(db, 'coinPurchaseOrders'), {
            source: 'HOME_SCREEN',
            status: 'ACCEPTED',
            orderStatusTimeline: [{ status: 'ACCEPTED', at: new Date().toISOString(), by: 'SYSTEM_PAYMENT_SUCCESS' }],
            paymentStatus: 'PAID',
            paymentLockId: paymentDetails.lockId,
            razorpayPaymentId: paymentId,
            metal: coinMetal,
            weightGrams: coinWeightGrams,
            quantity: coinQuantity,
            estimatedRatePerGram: activeCoinRate,
            makingChargesPerUnitInr: COIN_MAKING_CHARGE_PER_UNIT,
            makingChargesTotalInr: COIN_MAKING_CHARGE_PER_UNIT * coinQuantity,
            totalAmountInr: Math.round(paymentDetails.totalAmountInr * 100) / 100,
            customerUid: currentUser.uid,
            customerName,
            customerEmail,
            customerPhone,
            deliveryCity: coinDeliveryCity.trim(),
            customerNote: coinNote.trim(),
            shopName: customerShopName,
            shopId: customerShopId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          setCoinSuccessOverlay(true);
          setTimeout(() => setCoinSuccessOverlay(false), 1800);
          setSuccessMsg(`Coin order placed and paid successfully. Track it in Orders under Coin Purchase Orders.`);
          setTimeout(() => setSuccessMsg(''), 8000);
          setModal({ type: null });
          setCoinNote('');
          setCoinDeliveryCity('');
          setCoinQuantity(1);
          setCoinWeightGrams(coinMetal === 'GOLD' ? 0.5 : 10);
        } catch (err: any) {
          setError(`Payment succeeded but order save failed: ${err?.message || 'Unknown error'}`);
          setTimeout(() => setError(''), 9000);
        } finally {
          setCoinSubmitting(false);
        }
      },
      onFailure: (err: any) => {
        setCoinSubmitting(false);
        setError(`Coin payment failed: ${err?.message || 'Unknown error'}`);
        setTimeout(() => setError(''), 8000);
      },
    });
  };

  const noKey = !RAZORPAY_KEY_ID;

  // ────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-black text-gray-900 dark:text-white">

      {ownerIsUnverified && (
        <div className="px-4 sm:px-6 lg:px-8 pt-4">
          <div className="max-w-7xl mx-auto rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
            <p className="text-sm font-bold text-red-700 dark:text-red-300">Shop verification pending</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              Your jeweller account is currently unverified. Please email Aadhaar, PAN, Hallmark, and GST documents to contact@bizmation.in with your owner code.
              Access will be fully enabled after super-admin approval.
            </p>
          </div>
        </div>
      )}

      {(userProfile?.role === 'OWNER' || userProfile?.role === 'STAFF') && (
        <div className="px-4 sm:px-6 lg:px-8 pt-4">
          <div className="max-w-[1400px] mx-auto flex justify-end">
            <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200 dark:border-yellow-800 bg-white/85 dark:bg-gray-900 px-3.5 py-2 shadow-sm">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Owner Code:</span>
              <span className="text-xs font-black text-amber-900 dark:text-yellow-300">{(userProfile as any)?.ownerCode || '—'}</span>
              {!!(userProfile as any)?.ownerCode && (
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText((userProfile as any)?.ownerCode || '')}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-gray-800 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-gray-700"
                >
                  Copy
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {userProfile?.role === 'CUSTOMER' && (
        <div className="px-4 sm:px-6 lg:px-8 pt-4">
          <div className="max-w-[1400px] mx-auto grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="rounded-2xl px-4 py-3 bg-white/85 dark:bg-gray-900 border border-amber-100 dark:border-gray-800">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-gray-400">Total Orders</p>
              <p className="text-2xl font-black text-stone-800 dark:text-white mt-0.5">{customerSummary.totalOrders}</p>
            </div>
            <div className="rounded-2xl px-4 py-3 bg-white/85 dark:bg-gray-900 border border-amber-100 dark:border-gray-800">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-yellow-400">Gold Till Date</p>
              <p className="text-2xl font-black text-amber-900 dark:text-yellow-300 mt-0.5">{customerSummary.totalGoldGrams.toFixed(4)}<span className="text-sm font-semibold ml-1">g</span></p>
            </div>
            <div className="rounded-2xl px-4 py-3 bg-white/85 dark:bg-gray-900 border border-amber-100 dark:border-gray-800">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-gray-400">Silver Till Date</p>
              <p className="text-2xl font-black text-slate-700 dark:text-gray-200 mt-0.5">{customerSummary.totalSilverGrams.toFixed(4)}<span className="text-sm font-semibold ml-1">g</span></p>
            </div>
            <div className="rounded-2xl px-4 py-3 bg-white/85 dark:bg-gray-900 border border-amber-100 dark:border-gray-800">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-gray-400">Portfolio Value</p>
              <p className="text-xl font-black text-stone-800 dark:text-white mt-0.5">₹{customerPortfolioStats.totalValueInr.toLocaleString('en-IN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</p>
            </div>
            <div className="rounded-2xl px-4 py-3 bg-white/85 dark:bg-gray-900 border border-amber-100 dark:border-gray-800">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-gray-400">Total Gain %</p>
              <p className={`text-xl font-black mt-0.5 ${customerPortfolioStats.totalGainPct >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                {customerPortfolioStats.totalGainPct >= 0 ? '+' : ''}{customerPortfolioStats.totalGainPct.toFixed(4)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {(userProfile?.role === 'OWNER' || userProfile?.role === 'STAFF') && (
        <div className="px-4 sm:px-6 lg:px-8 pt-4">
          <div className="max-w-[1400px] mx-auto grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="rounded-2xl px-4 py-3 bg-white/85 dark:bg-gray-900 border border-amber-100 dark:border-gray-800">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-gray-400">Total Orders</p>
              <p className="text-2xl font-black text-stone-800 dark:text-white mt-0.5">{ownerSummary.totalOrders}</p>
            </div>
            <div className="rounded-2xl px-4 py-3 bg-white/85 dark:bg-gray-900 border border-amber-100 dark:border-gray-800">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-yellow-400">Gold Sold</p>
              <p className="text-2xl font-black text-amber-900 dark:text-yellow-300 mt-0.5">{ownerSummary.totalGoldSoldGrams.toFixed(4)}<span className="text-sm font-semibold ml-1">g</span></p>
            </div>
            <div className="rounded-2xl px-4 py-3 bg-white/85 dark:bg-gray-900 border border-amber-100 dark:border-gray-800">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-gray-400">Silver Sold</p>
              <p className="text-2xl font-black text-slate-700 dark:text-gray-200 mt-0.5">{ownerSummary.totalSilverSoldGrams.toFixed(4)}<span className="text-sm font-semibold ml-1">g</span></p>
            </div>
            <div className="rounded-2xl px-4 py-3 bg-white/85 dark:bg-gray-900 border border-amber-100 dark:border-gray-800">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-gray-400">Total Revenue</p>
              <p className="text-xl font-black text-stone-800 dark:text-white mt-0.5">₹{ownerSummary.totalRevenueInr.toLocaleString('en-IN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</p>
            </div>
            <div className="rounded-2xl px-4 py-3 bg-white/85 dark:bg-gray-900 border border-amber-100 dark:border-gray-800">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-gray-400">Total Commission</p>
              <p className="text-xl font-black text-green-700 dark:text-green-400 mt-0.5">₹{ownerSummary.totalCommissionInr.toLocaleString('en-IN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</p>
            </div>
          </div>
        </div>
      )}

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

      {coinSuccessOverlay && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl px-8 py-7 flex flex-col items-center gap-3 animate-fade-up-soft">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle size={34} className="text-green-600" />
            </div>
            <p className="text-sm font-bold text-stone-800">Request Submitted Successfully</p>
            <p className="text-xs text-stone-500">Payment received. Order is now in Accepted stage.</p>
          </div>
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
          <section className="relative overflow-hidden bg-gradient-to-br from-stone-50 via-amber-50 to-yellow-50 dark:from-black dark:via-gray-950 dark:to-black border-b border-amber-100 dark:border-yellow-900/30 animate-hero-pan">
            <div className="absolute inset-0 pointer-events-none opacity-60" style={{ backgroundImage: 'radial-gradient(circle at 20% 15%, rgba(251,191,36,0.14) 0%, transparent 35%), radial-gradient(circle at 78% 25%, rgba(245,158,11,0.12) 0%, transparent 30%), radial-gradient(circle at 50% 80%, rgba(234,179,8,0.1) 0%, transparent 40%)' }} />
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

        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-amber-400/20 dark:bg-yellow-500/10 border border-amber-400/50 dark:border-yellow-500/30 text-amber-700 dark:text-yellow-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
                <Zap size={13} className="text-amber-500 dark:text-yellow-400" />
                LIVE PRICES • BUY & SELL ONLINE
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight text-amber-900 dark:text-white mb-3">
                Gold & Silver
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 dark:from-yellow-400 dark:via-amber-300 dark:to-yellow-500">
                  At Live Prices
                </span>
              </h1>
              <p className="text-base text-amber-800/80 dark:text-gray-300 mb-6 leading-relaxed max-w-lg">
                Buy & sell pure gold and silver online at real-time international market prices. Set up GOLD SIP to invest in gold or silver automatically on your schedule.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white/90 dark:bg-gray-900 border border-amber-200 dark:border-amber-700 rounded-xl p-4 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 animate-fade-up-soft" style={{ animationDelay: '0.05s' }}>
                  <p className="text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wide mb-1">Gold 24K (999) / 10g</p>
                  <p className="text-2xl font-black text-amber-900 dark:text-amber-300">₹{gold24 ? gold24.displayRate.toLocaleString('en-IN', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : '—'}</p>
                  <p className="text-xs text-amber-700/70 dark:text-amber-400">₹{gold24 ? gold24.ratePerGram.toFixed(4) : '—'} / gram</p>
                </div>
                <div className="bg-white/90 dark:bg-gray-900 border border-amber-200 dark:border-amber-700 rounded-xl p-4 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 animate-fade-up-soft" style={{ animationDelay: '0.13s' }}>
                  <p className="text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wide mb-1">Gold 24K (995) / 10g</p>
                  <p className="text-2xl font-black text-amber-900 dark:text-amber-300">₹{gold995 ? gold995.displayRate.toLocaleString('en-IN', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : '—'}</p>
                  <p className="text-xs text-amber-700/70 dark:text-amber-400">₹{gold995 ? gold995.ratePerGram.toFixed(4) : '—'} / gram</p>
                </div>
                <div className="bg-white/90 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 animate-fade-up-soft" style={{ animationDelay: '0.2s' }}>
                  <p className="text-gray-600 dark:text-gray-400 text-xs font-bold uppercase tracking-wide mb-1">Silver 999 / 1kg</p>
                  <p className="text-2xl font-black text-gray-800 dark:text-gray-200">₹{silver24 ? silver24.displayRate.toLocaleString('en-IN', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : '—'}</p>
                  <p className="text-xs text-gray-600/70 dark:text-gray-400">₹{silver24 ? silver24.ratePerGram.toFixed(4) : '—'} / gram</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-1 animate-fade-up-soft" style={{ animationDelay: '0.28s' }}>
                  <button
                    onClick={() => { setBuyMetal('GOLD'); setLockedRate(null); setLockExpiresAtMs(null); setModal({ type: 'buy' }); }}
                    className="flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold rounded-xl shadow-lg hover:shadow-amber-400/40 dark:hover:shadow-yellow-400/30 transition-all hover:-translate-y-0.5 text-base animate-gold-breathe"
                  >
                    <ShoppingCart size={18} />
                    Buy Gold Now
                  </button>
                  <button
                    onClick={() => { setBuyMetal('SILVER'); setLockedRate(null); setLockExpiresAtMs(null); setModal({ type: 'buy' }); }}
                    className="flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-gray-400 to-slate-500 hover:from-gray-500 hover:to-slate-600 text-white font-bold rounded-xl shadow-lg hover:shadow-slate-400/40 transition-all hover:-translate-y-0.5 text-base"
                  >
                    <ShoppingCart size={18} />
                    Buy Silver Now
                  </button>
                  <button
                    onClick={() => setModal({ type: 'sell' })}
                    className="flex items-center justify-center gap-2 px-4 py-3.5 bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 text-amber-800 dark:text-yellow-300 font-bold rounded-xl border border-amber-300 dark:border-yellow-600/40 shadow-md transition-all hover:-translate-y-0.5 text-base"
                  >
                    <ArrowUpRight size={18} />
                    Redeem
                  </button>
                  <button
                    onClick={() => setModal({ type: 'autopay' })}
                    className="flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-amber-950 font-bold rounded-xl border border-amber-300/60 shadow-md transition-all hover:-translate-y-0.5 text-base"
                  >
                    <Repeat size={18} />
                    Setup GOLD SIP
                  </button>
                  <button
                    onClick={() => {
                      setCoinMetal('GOLD');
                      setCoinWeightGrams(0.5);
                      setCoinQuantity(1);
                      setCoinDeliveryCity((userProfile?.city ?? '').trim());
                      setCoinNote('');
                      setModal({ type: 'coin-request' });
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-stone-900 to-stone-700 hover:from-black hover:to-stone-900 text-amber-200 font-bold rounded-xl shadow-lg hover:shadow-stone-500/40 transition-all hover:-translate-y-0.5 text-base"
                  >
                    <Coins size={18} />
                    Buy Coins
                  </button>
              </div>

              <div className="flex items-center justify-between text-sm pt-1">
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

              {/* Price debug mini-panel — shows raw market data from worker */}
              {priceFeed && (
                <div className="bg-black/5 dark:bg-white/5 border border-amber-200/50 dark:border-yellow-900/30 rounded-xl px-4 py-3 text-xs font-mono space-y-1 animate-fade-up-soft" style={{ animationDelay: '0.32s' }}>
                  <div className="flex justify-between text-amber-800/70 dark:text-gray-400">
                    <span>XAU/USD</span>
                    <span className="font-bold text-amber-900 dark:text-yellow-300">${priceFeed.xauUsd ? priceFeed.xauUsd.toFixed(2) : '—'}</span>
                  </div>
                  <div className="flex justify-between text-gray-600/70 dark:text-gray-500">
                    <span>XAG/USD</span>
                    <span className="font-bold text-gray-700 dark:text-gray-300">${priceFeed.xagUsd ? priceFeed.xagUsd.toFixed(4) : '—'}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700/70 dark:text-emerald-400/70">
                    <span>USD/INR</span>
                    <span className="font-bold text-emerald-800 dark:text-emerald-300">₹{priceFeed.usdInr ? Number(priceFeed.usdInr).toFixed(2) : '—'}</span>
                  </div>
                  <div className="border-t border-amber-200/40 dark:border-gray-700 pt-1 text-amber-700/50 dark:text-gray-600 text-[10px]">
                    Source: {priceFeed.source} · {priceFeed.fetchedAt}
                  </div>
                </div>
              )}
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
              'GOLD SIP / Recurring',
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
                  ₹{gold24.ratePerGram.toFixed(4)}/g
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
                  ₹{silver24.ratePerGram.toFixed(4)}/g
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
              title: 'Buy or Redeem Online',
              desc: 'Enter the quantity you want, pay securely via Razorpay (UPI, cards, net banking), or submit a redeem request.',
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
                    Redeem
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
                      No live rates available. Click Refresh.
                    </td>
                  </tr>
                ) : (
                  filteredRates.map((r) => (
                    <tr key={`${r.metalType}-${r.purity}`} className="border-b border-amber-50 dark:border-gray-800/60 hover:bg-amber-50/40 dark:hover:bg-gray-900/50 transition-colors">
                      <td className="py-3.5 px-4 text-sm text-stone-600 dark:text-gray-300">{r.metalType}</td>
                      <td className="py-3.5 px-4 text-sm text-stone-600 dark:text-gray-300">{r.purity}K</td>
                      <td className="py-3.5 px-4 text-right text-sm font-medium text-stone-800 dark:text-white">₹{r.ratePerGram.toFixed(4)}</td>
                      <td className="py-3.5 px-4 text-right text-sm font-black text-stone-800 dark:text-white">₹{r.displayRate.toLocaleString('en-IN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setBuyMetal(r.metalType);
                            setLockedRate(null);
                            setLockExpiresAtMs(null);
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
            {['500', '1000', '2000', '5000', 'Manual'].map((amt) => (
              <button
                key={amt}
                onClick={() => {
                  setAutoPayForm((f) => ({ ...f, amount: amt === 'Manual' ? '' : amt }));
                  setModal({ type: 'autopay' });
                }}
                className="px-6 py-2.5 bg-white/30 dark:bg-black/20 hover:bg-white/50 dark:hover:bg-black/30 text-amber-950 dark:text-black font-bold rounded-xl border border-white/50 dark:border-black/30 transition-colors shadow-sm"
              >
                {amt === 'Manual' ? 'Manual' : `₹${Number(amt).toLocaleString('en-IN')}/mo`}
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
        <BottomSheet title={`Buy ${buyMetal === 'GOLD' ? 'Gold' : 'Silver'}`} onClose={() => { setModal({ type: null }); setSlideValue(0); setLockedRate(null); clearLockTimer(); }}>
          <div className="space-y-5">
            {noKey && <div className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 p-3 rounded-xl border border-amber-200 dark:border-amber-700 flex items-center gap-2">
              <AlertCircle size={13} className="flex-shrink-0" />
              Razorpay key not set — payments disabled.
            </div>}

            {/* Metal toggle ─ SVG icons, no emojis */}
            <div className="flex gap-2 p-1 rounded-2xl bg-amber-50 dark:bg-gray-800 border border-amber-200 dark:border-gray-700">
              {(['GOLD', 'SILVER'] as const).map(m => (
                <button key={m} type="button"
                  onClick={() => { setBuyMetal(m); setBuyForm({ grams: '' }); setSlideValue(0); setLockedRate(null); setLockExpiresAtMs(null); }}
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
              <p className="text-3xl font-black text-amber-900 dark:text-amber-800">₹{activeRate.toFixed(4)}<span className="text-sm font-medium text-amber-600">/g</span></p>
              {buyMetal === 'GOLD' && (
                <p className="text-xs text-amber-700 mt-1.5">Price lock starts when you slide to pay. Timer is shown for guidance while checkout is open.</p>
              )}
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
                  <span className="text-xs text-red-600 font-bold">UI timer finished. Price remains locked for this checkout.</span>
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
                  <p className="text-lg font-black text-amber-900 dark:text-yellow-300 leading-tight">₹{Number(buyTotal).toLocaleString('en-IN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</p>
                </div>
              )}
            </div>

            {/* Email verification disabled - customers can buy without verification */}

            {buyForm.grams && buyTotal && (
              buyMetal === 'GOLD' ? (
                <div className="space-y-2">
                  <SlideToConfirm
                    label={paying ? 'Creating price lock...' : `Slide to Pay ₹${Number(buyTotal).toLocaleString('en-IN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`}
                    value={slideValue}
                    disabled={paying}
                    onChange={setSlideValue}
                    onConfirm={handleBuy}
                  />
                  {lockedRate && lockSecondsLeft > 0 ? (
                    <div className="mt-4 p-3 rounded-xl border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-300 text-sm shadow-sm animate-pulse flex items-start gap-3">
                      <Timer size={20} className="flex-shrink-0 mt-0.5 text-red-600" />
                      <div>
                        <p className="font-bold">⚠️ Please complete the payment in 2 mins or it will get cancelled</p>
                        <p className="tabular-nums font-black text-red-700 dark:text-red-400 mt-0.5 text-base">Time remaining: {Math.floor(lockSecondsLeft / 60)}:{String(lockSecondsLeft % 60).padStart(2, '0')}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-amber-700 dark:text-amber-500 text-center mt-1">White-gold secure checkout: once locked, pay within 2:00.</p>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleBuy}
                  disabled={paying}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 disabled:from-gray-300 disabled:to-gray-400 text-amber-950 font-black rounded-xl transition-all flex items-center justify-center gap-2 text-base"
                >
                  {paying ? <Loader2 size={18} className="animate-spin" /> : <ShoppingCart size={18} />}
                  {paying ? 'Opening payment…' : `Pay ₹${Number(buyTotal).toLocaleString('en-IN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`}
                </button>
              )
            )}

          </div>
        </BottomSheet>
      )}

      {/* Coin Purchase Request Modal */}
      {modal.type === 'coin-request' && (
        <BottomSheet title="Buy Gold / Silver Coins" onClose={() => setModal({ type: null })}>
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-800">
              After payment, order starts as ACCEPTED. Super Admin may move it through APPROVED, PREPARING, READY_TO_DISPATCH and DEPARTED stages.
            </div>

            <div className="flex gap-2 p-1 rounded-2xl bg-amber-50 border border-amber-200">
              {(['GOLD', 'SILVER'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setCoinMetal(m);
                    setCoinWeightGrams(COIN_OPTIONS[m][0]);
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${coinMetal === m ? 'bg-amber-500 text-black' : 'text-amber-700 hover:bg-amber-100'}`}
                >
                  {m === 'GOLD' ? 'Gold Coins' : 'Silver Coins'}
                </button>
              ))}
            </div>

            <div>
              <p className="text-xs text-amber-700 font-semibold mb-2">Select Coin Weight</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {COIN_OPTIONS[coinMetal].map((weight) => {
                  const selected = coinWeightGrams === weight;
                  return (
                    <button
                      type="button"
                      key={`${coinMetal}-${weight}`}
                      onClick={() => setCoinWeightGrams(weight)}
                      className={`rounded-xl border p-2 text-left transition-all ${selected ? 'border-amber-500 bg-amber-50 shadow' : 'border-amber-200 bg-white hover:border-amber-400'}`}
                    >
                      <img
                        src={coinMetal === 'GOLD' ? '/coins/gold-coin.svg' : '/coins/silver-coin.svg'}
                        alt={`${coinMetal} coin`}
                        className="w-full h-16 object-contain"
                      />
                      <p className="mt-1 text-sm font-black text-amber-900">{weight}g</p>
                      <p className="text-[11px] text-amber-700">{coinMetal}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="fieldLabel">Quantity</label>
              <input
                type="number"
                min="1"
                max="50"
                value={coinQuantity}
                onChange={(e) => setCoinQuantity(Math.max(1, Number(e.target.value || 1)))}
                className="fieldInput"
              />
            </div>

            <div>
              <label className="fieldLabel">Delivery City</label>
              <input
                type="text"
                value={coinDeliveryCity}
                onChange={(e) => setCoinDeliveryCity(e.target.value)}
                placeholder="e.g. Mumbai"
                className="fieldInput"
              />
            </div>

            <div>
              <label className="fieldLabel">Additional Note (optional)</label>
              <textarea
                value={coinNote}
                onChange={(e) => setCoinNote(e.target.value)}
                rows={3}
                placeholder="Any preferred delivery timing or branch pickup note"
                className="w-full rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm flex items-center justify-between">
              <div>
                <p className="text-green-800 font-semibold">Estimated Request Value</p>
                <p className="text-[11px] text-green-700">{coinQuantity} × {coinWeightGrams}g @ ₹{activeCoinRate.toFixed(4)}/g + ₹{COIN_MAKING_CHARGE_PER_UNIT} making/coin</p>
              </div>
              <p className="text-lg font-black text-green-900">₹{estimatedCoinAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>

            <button
              onClick={submitCoinRequest}
              disabled={coinSubmitting || !coinDeliveryCity.trim()}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 disabled:from-gray-300 disabled:to-gray-400 text-black font-black rounded-xl transition-all flex items-center justify-center gap-2 text-base"
            >
              {coinSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Coins size={18} />}
              {coinSubmitting ? 'Opening Payment...' : `Pay ₹${estimatedCoinAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} & Submit Order`}
            </button>
          </div>
        </BottomSheet>
      )}

      {/* Redeem / Sell-to-jeweller Modal */}
      {modal.type === 'sell' && (
        <BottomSheet title="Redeem / Sell To Jeweller" onClose={() => setModal({ type: null })}>
          <div className="space-y-4">
            <div className="flex gap-2 p-1 rounded-xl bg-amber-50 dark:bg-gray-800 border border-amber-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setRedeemMode('REDEEM')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${redeemMode === 'REDEEM' ? 'bg-amber-500 text-black' : 'text-amber-700 dark:text-gray-300'}`}
              >
                Redeem Digital Gold
              </button>
              <button
                type="button"
                onClick={() => setRedeemMode('SELL_TO_JEWELLER')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${redeemMode === 'SELL_TO_JEWELLER' ? 'bg-amber-500 text-black' : 'text-amber-700 dark:text-gray-300'}`}
              >
                Sell To Jeweller
              </button>
            </div>
            <div className="rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-gray-900/40 p-3 text-sm">
              <p className="text-amber-800 dark:text-amber-300 font-semibold">Operational Purity</p>
              <p className="text-amber-700 dark:text-amber-400 text-xs mt-0.5">All gold redeem/sell requests are processed as 24K (995).</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="fieldLabel mb-0">Redeem Input Type</label>
                <div className="text-[11px] bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded-md font-bold text-right pt-2 pb-2 mt-4 inline-flex items-center">
                  <span className="font-semibold mr-1">Max Available:</span>
                  {customerPortfolioStats.maxRedeemableGoldGrams.toFixed(4)}g 
                  <span className="opacity-70 mx-1">/</span> 
                  ₹{(customerPortfolioStats.maxRedeemableGoldGrams * sellRedeemRate).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="flex gap-2 p-1 rounded-xl bg-amber-50 dark:bg-gray-800 border border-amber-200 dark:border-gray-700 mb-2 mt-2">
                <button
                  type="button"
                  onClick={() => setSellInputMode('GRAMS')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${sellInputMode === 'GRAMS' ? 'bg-amber-500 text-black shadow' : 'text-amber-700 dark:text-gray-300 hover:bg-amber-100/50'}`}
                >
                  Enter Grams
                </button>
                <button
                  type="button"
                  onClick={() => setSellInputMode('AMOUNT')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${sellInputMode === 'AMOUNT' ? 'bg-amber-500 text-black shadow' : 'text-amber-700 dark:text-gray-300 hover:bg-amber-100/50'}`}
                >
                  Enter Amount
                </button>
              </div>
            </div>
            <div>
              <label className="fieldLabel">Weight (grams)</label>
              <input type="number" min="0.0001" step="0.0001" placeholder="e.g. 0.0013"
                value={sellForm.grams}
                readOnly={sellInputMode === 'AMOUNT'}
                onChange={(e) => {
                  setSellInputMode('GRAMS');
                  const gramsValue = e.target.value;
                  const gramsNum = parseFloat(gramsValue);
                  setSellForm((f) => ({
                    ...f,
                    grams: gramsValue,
                    amountInr: Number.isFinite(gramsNum) && gramsNum > 0 && sellRedeemRate > 0
                      ? (gramsNum * sellRedeemRate).toFixed(4)
                      : (gramsValue ? f.amountInr : ''),
                  }));
                }}
                className="fieldInput"
              />
            </div>
            <div>
              <label className="fieldLabel">Amount (INR)</label>
              <input type="number" min="0" step="0.01" placeholder="e.g. 5000"
                value={sellForm.amountInr}
                readOnly={sellInputMode === 'GRAMS'}
                onChange={(e) => {
                  setSellInputMode('AMOUNT');
                  const amountValue = e.target.value;
                  const amountNum = parseFloat(amountValue);
                  setSellForm((f) => ({
                    ...f,
                    amountInr: amountValue,
                    grams: Number.isFinite(amountNum) && amountNum > 0 && sellRedeemRate > 0
                      ? (amountNum / sellRedeemRate).toFixed(4)
                      : (amountValue ? f.grams : ''),
                  }));
                }} className="fieldInput" />
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">Only one field is editable at a time. The other value is auto-calculated using live redeem rate.</p>
            </div>
            {sellEst && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-sm">
                <div className="flex justify-between text-green-800 dark:text-green-300">
                  <span>Estimated value (live rate - 3% GST, then minus ₹50/g)</span>
                  <span className="font-black text-lg text-green-900 dark:text-green-300">₹{Number(sellEst).toLocaleString('en-IN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</span>
                </div>
              </div>
            )}
            {redeemMode === 'SELL_TO_JEWELLER' && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3 text-xs text-amber-800 dark:text-amber-300">
                This request does not require existing digital holdings. Your jeweller will see it under redemption requests.
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
            {/* Email verification disabled - shop owners can sell without verification */}
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
              disabled={Boolean(!sellForm.grams && !sellForm.amountInr)}
              className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 text-base"
            >
              <ArrowUpRight size={18} />
              {redeemMode === 'REDEEM' ? 'Submit Redeem Request' : 'Submit Sell To Jeweller Request'}
            </button>
            <p className="text-xs text-amber-600/70 dark:text-gray-500 text-center">Your jeweller can review this request from Redemption Requests tab.</p>
          </div>
        </BottomSheet>
      )}

      {/* GOLD SIP (AutoPay) Modal */}
      {modal.type === 'autopay' && (
        <BottomSheet title="Setup GOLD SIP" onClose={() => setModal({ type: null })}>
          <div className="space-y-4">
            {noKey && <div className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 p-3 rounded-lg border border-amber-200 dark:border-amber-700 flex items-center gap-2">
              <AlertCircle size={13} className="flex-shrink-0" />
              Razorpay key not set. Add <code>VITE_RAZORPAY_KEY_ID</code> to <code>apps/web-app/.env</code> to enable payments.
            </div>}

            <div>
              <label className="fieldLabel">SIP Amount (₹)</label>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {['500', '1000', '2000', '5000'].map((a) => (
                  <button key={a} onClick={() => setAutoPayForm((f) => ({ ...f, amount: a }))}
                    className={`py-2 text-sm font-bold rounded-lg border transition-all ${autoPayForm.amount === a
                      ? 'bg-amber-500 border-amber-500 text-black shadow-sm'
                      : 'bg-white dark:bg-gray-800 border-amber-200 dark:border-gray-600 text-amber-800 dark:text-amber-300 hover:border-amber-400'}`}>
                    ₹{Number(a).toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
              <input type="number" min="1" step="1" placeholder="Manual (Enter any custom amount)"
                value={autoPayForm.amount}
                onChange={(e) => setAutoPayForm((f) => ({ ...f, amount: e.target.value }))}
                className="w-full rounded-xl border border-amber-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800 px-4 py-3 text-sm font-medium text-stone-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-amber-400 dark:placeholder-gray-500"
              />
              {autoPayForm.amount && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
                  {autoPayForm.metal === 'GOLD' && goldOperationalRatePerGram > 0 && (
                    <>
                      ≈ {(parseFloat(autoPayForm.amount) / goldOperationalRatePerGram).toFixed(4)}g of 24K (995) gold per {autoPayForm.frequency === 'DAILY' ? 'day' : autoPayForm.frequency === 'WEEKLY' ? 'week' : 'month'} at today's rate
                    </>
                  )}
                  {autoPayForm.metal === 'SILVER' && silver24?.ratePerGram && silver24.ratePerGram > 0 && (
                    <>
                      ≈ {(parseFloat(autoPayForm.amount) / silver24.ratePerGram).toFixed(4)}g of 999 silver per {autoPayForm.frequency === 'DAILY' ? 'day' : autoPayForm.frequency === 'WEEKLY' ? 'week' : 'month'} at today's rate
                    </>
                  )}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="fieldLabel">Metal</label>
                <div className="flex gap-2">
                  {(['GOLD', 'SILVER'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setAutoPayForm((f) => ({ ...f, metal: m }))}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg border transition-colors ${autoPayForm.metal === m
                        ? 'bg-amber-500 border-amber-500 text-black'
                        : 'bg-white dark:bg-gray-800 border-amber-200 dark:border-gray-600 text-amber-800 dark:text-amber-300 hover:border-amber-400'}`}
                    >
                      {m === 'GOLD' ? 'Gold' : 'Silver'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="fieldLabel">Frequency</label>
                <div className="flex gap-2">
                  {([
                    { key: 'DAILY', label: 'Daily' },
                    { key: 'WEEKLY', label: 'Weekly' },
                    { key: 'MONTHLY', label: 'Monthly' },
                  ] as const).map((fOpt) => (
                    <button
                      key={fOpt.key}
                      type="button"
                      onClick={() => setAutoPayForm((f) => ({ ...f, frequency: fOpt.key }))}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${autoPayForm.frequency === fOpt.key
                        ? 'bg-amber-500 border-amber-500 text-black'
                        : 'bg-white dark:bg-gray-800 border-amber-200 dark:border-gray-600 text-amber-800 dark:text-amber-300 hover:border-amber-400'}`}
                    >
                      {fOpt.label}
                    </button>
                  ))}
                </div>
              </div>
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
            {/* Email verification disabled - users can setup AutoPay without verification */}

            <button
              onClick={handleAutoPay}
              disabled={Boolean(paying || !autoPayForm.amount)}
              className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 disabled:from-gray-300 disabled:to-gray-400 text-amber-950 font-black rounded-xl transition-all flex items-center justify-center gap-2 text-base dark:text-amber-950"
            >
              {paying ? <Loader2 size={18} className="animate-spin" /> : <Repeat size={18} />}
              {paying
                ? 'Setting up...'
                : `Activate ₹${Number(autoPayForm.amount || 0).toLocaleString('en-IN')}/${autoPayForm.frequency === 'DAILY' ? 'day' : autoPayForm.frequency === 'WEEKLY' ? 'week' : 'month'} GOLD SIP`}
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
        className={`relative h-16 rounded-2xl overflow-hidden transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{
          background: disabled
            ? 'linear-gradient(135deg,#9ca3af 0%,#a1a5aa 100%)'
            : confirmed
            ? 'linear-gradient(90deg,#16a34a,#22c55e)'
            : 'linear-gradient(135deg,#1c1c1c 0%,#2a2a2a 100%)',
          border: disabled
            ? '1.5px solid rgba(156,163,175,0.5)'
            : confirmed
            ? '1.5px solid #22c55e'
            : '1.5px solid rgba(251,191,36,0.5)',
          boxShadow: disabled
            ? '0 0 10px rgba(156,163,175,0.1), inset 0 1px 0 rgba(255,255,255,0.05)'
            : confirmed
            ? '0 0 20px rgba(34,197,94,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
            : '0 0 20px rgba(251,191,36,0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
          transition: 'background 0.4s ease, box-shadow 0.4s ease',
        }}
      >
        {/* Gold fill as user drags */}
        <div
          className="absolute inset-y-0 left-0 rounded-2xl transition-colors"
          style={{
            width: `${value}%`,
            background: disabled
              ? 'rgba(156,163,175,0.2)'
              : confirmed
              ? 'rgba(34,197,94,0.3)'
              : 'linear-gradient(90deg,rgba(251,191,36,0.25),rgba(245,158,11,0.12))',
            transition: 'width 0.05s linear',
          }}
        />

        {/* "Slide to pay →→→" hint arrows (hidden once dragging starts or disabled) */}
        {value < 10 && !confirmed && !disabled && (
          <div className="absolute inset-0 flex items-center justify-center gap-8 pointer-events-none">
            <div className="flex gap-1 text-amber-400/40">
              <ArrowHint />
            </div>
          </div>
        )}

        {/* Centre label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none pl-14">
          <span className={`text-sm font-bold tracking-wide transition-colors ${
            disabled ? 'text-gray-600' : confirmed ? 'text-white' : 'text-amber-300 dark:text-yellow-400'
          }`}>
            {disabled ? 'Slide unavailable' : confirmed ? 'Confirmed — opening payment...' : label}
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
            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-xl transition-all"
            style={{
              background: disabled
                ? 'linear-gradient(135deg,#d1d5db,#bfdbfe)'
                : confirmed
                ? 'linear-gradient(135deg,#22c55e,#16a34a)'
                : 'linear-gradient(135deg,#fde68a 0%,#f59e0b 60%,#d97706 100%)',
              border: '2px solid rgba(255,255,255,0.25)',
              boxShadow: disabled
                ? '0 4px 12px rgba(156,163,175,0.3)'
                : confirmed
                ? '0 4px 16px rgba(34,197,94,0.5)'
                : '0 4px 16px rgba(245,158,11,0.6), 0 0 0 3px rgba(251,191,36,0.2)',
              color: disabled ? '#6b7280' : confirmed ? '#fff' : '#451a03',
              transform: disabled ? 'scale(1)' : 'scale(1.05)',
            }}
          >
            {disabled ? <svg viewBox="0 0 24 24" fill="currentColor" strokeWidth={2} className="w-5 h-5"><rect x="6" y="4" width="12" height="14" rx="2"/><path d="M9 14h6" stroke="currentColor" fill="none" strokeLinecap="round"/></svg> : confirmed ? <CheckSVG /> : <ChevronSVG />}
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
      <p className={`text-center text-xs mt-1.5 flex items-center justify-center gap-1 transition-colors ${
        disabled ? 'text-gray-400 dark:text-gray-600' : 'text-amber-500/70 dark:text-amber-400/70'
      }`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 opacity-60"><path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        {disabled ? 'Price lock expired' : 'Slide right to confirm purchase'}
      </p>
    </div>
  );
};

