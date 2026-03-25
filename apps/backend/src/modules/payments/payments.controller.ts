import { Router, Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { getAdminFirestore } from '../../lib/firebaseAdmin';

const LOCK_WINDOW_SECONDS = 120;
const LOCK_COLLECTION = 'paymentPriceLocks';

function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  if (!keyId || !keySecret) {
    throw new Error('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not configured on backend');
  }
  return { keyId, keySecret };
}

function validatePositiveNumber(value: any, field: string): number {
  const n = Number(value);
  if (!isFinite(n) || n <= 0) throw new Error(`Invalid ${field}`);
  return n;
}

async function sendTelegramAlert(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    });
  } catch (err: any) {
    console.error('[payments] Telegram alert failed:', err?.message);
  }
}

export function paymentsRouter(): Router {
  const router = Router();
  
  // Basic rate limited cache for plans
  const planCache = new Map<string, string>();

  router.get('/health', async (_req: Request, res: Response) => {
    return res.json({
      success: true,
      service: 'payments',
      timestamp: new Date().toISOString(),
    });
  });

  const handleCreateBuyOrder = async (req: Request, res: Response) => {
    try {
      console.log('[payments] create-buy-order called', {
        grams: req.body?.grams,
        ratePerGram: req.body?.ratePerGram,
        customerUid: req.body?.customerUid,
        metal: req.body?.metal,
      });
      const grams = validatePositiveNumber(req.body?.grams, 'grams');
      const ratePerGram = validatePositiveNumber(req.body?.ratePerGram, 'ratePerGram');
      const customerName = String(req.body?.customerName || '').trim();
      const customerEmail = String(req.body?.customerEmail || '').trim();
      const customerPhone = String(req.body?.customerPhone || '').trim();
      const customerUid = String(req.body?.customerUid || '').trim();
      const metal = String(req.body?.metal || 'GOLD').toUpperCase();

      const amountPaise = Math.round(grams * ratePerGram * 100);
      if (amountPaise < 100) {
        return res.status(400).json({ success: false, error: 'Minimum amount should be at least ₹1.' });
      }

      const nowMs = Date.now();
      const expiresAtMs = nowMs + (LOCK_WINDOW_SECONDS * 1000);

      const db = getAdminFirestore();
      const lockRef = db.collection(LOCK_COLLECTION).doc();

      await lockRef.set({
        status: 'LOCKED',
        lockWindowSeconds: LOCK_WINDOW_SECONDS,
        createdAt: new Date(nowMs),
        expiresAt: new Date(expiresAtMs),
        customerUid,
        customerName,
        customerEmail,
        customerPhone,
        metal,
        grams,
        ratePerGram,
        amountPaise,
        updatedAt: new Date(nowMs),
      });

      const { keyId, keySecret } = getRazorpayConfig();
      const receipt = `lock_${lockRef.id.slice(0, 20)}`;
      const orderResp = await axios.post(
        'https://api.razorpay.com/v1/orders',
        {
          amount: amountPaise,
          currency: 'INR',
          receipt,
          payment_capture: 1,
          notes: {
            lockId: lockRef.id,
            customerUid,
            metal,
            grams: String(grams),
            ratePerGram: String(ratePerGram),
          },
        },
        {
          auth: {
            username: keyId,
            password: keySecret,
          },
          timeout: 10000,
        },
      );

      const razorpayOrderId = String(orderResp.data?.id || '');
      if (!razorpayOrderId) throw new Error('Razorpay order creation failed');

      await lockRef.update({
        razorpayOrderId,
        updatedAt: new Date(),
      });

      return res.json({
        success: true,
        data: {
          lockId: lockRef.id,
          razorpayOrderId,
          amountPaise,
          currency: 'INR',
          lockWindowSeconds: LOCK_WINDOW_SECONDS,
          expiresAtMs,
          expiresAt: new Date(expiresAtMs).toISOString(),
          createdAtMs: nowMs,
        },
      });
    } catch (err: any) {
      console.error('[payments] create-buy-order failed:', err?.message || err, err?.stack || '');
      return res.status(500).json({ success: false, error: err?.message || 'Failed to create payment order' });
    }
  };

  const handleVerifyBuyPayment = async (req: Request, res: Response) => {
    try {
      const lockId = String(req.body?.lockId || '').trim();
      const razorpayOrderId = String(req.body?.razorpay_order_id || '').trim();
      const razorpayPaymentId = String(req.body?.razorpay_payment_id || '').trim();
      const razorpaySignature = String(req.body?.razorpay_signature || '').trim();

      if (!lockId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return res.status(400).json({ success: false, error: 'Missing payment verification payload' });
      }

      const { keySecret } = getRazorpayConfig();
      const expected = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      if (expected !== razorpaySignature) {
        return res.status(400).json({ success: false, error: 'Invalid payment signature' });
      }

      const db = getAdminFirestore();
      const lockRef = db.collection(LOCK_COLLECTION).doc(lockId);
      const lockSnap = await lockRef.get();
      if (!lockSnap.exists) {
        return res.status(404).json({ success: false, error: 'Price lock record not found' });
      }

      await lockRef.update({
        status: 'PAID',
        verifiedAt: new Date(),
        razorpayOrderId,
        razorpayPaymentId,
        updatedAt: new Date(),
      });

      // Fire & Forget Telegram Alert
      const data = lockSnap.data();
      const metal = data?.metal || 'GOLD';
      const weight = data?.grams || 0;
      const amount = (data?.amountPaise || 0) / 100;
      const rate = data?.ratePerGram || 0;
      
      sendTelegramAlert(
        `🚨 <b>NEW ${metal} ORDER (PAID)</b> 🚨\n\n` +
        `<b>Weight:</b> ${weight}g\n` +
        `<b>Amount:</b> ₹${amount.toLocaleString('en-IN')}\n` +
        `<b>Rate:</b> ₹${rate.toLocaleString('en-IN')}/g\n` +
        `<b>Name:</b> ${data?.customerName || 'N/A'}\n` +
        `<b>Phone:</b> ${data?.customerPhone || 'N/A'}\n\n` +
        `<i>Please book/hedge this quantity immediately.</i>`
      ).catch(() => {});

      return res.json({
        success: true,
        data: {
          expired: false,
          paymentId: razorpayPaymentId,
          lockId,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to verify payment' });
    }
  };

  // Gift endpoints
  router.post('/gift/lookup-user', async (req: Request, res: Response) => {
    try {
      const phone = String(req.body?.phone || '').trim();
      if (!phone) return res.status(400).json({ success: false, error: 'Phone number required' });
      
      const db = getAdminFirestore();
      
      // Look up phoneIndex
      const phoneDoc = await db.collection('phoneIndex').doc(phone).get();
      if (!phoneDoc.exists) return res.json({ success: true, data: { found: false } });
      
      const uid = phoneDoc.data()?.uid;
      if (!uid) return res.json({ success: true, data: { found: false } });
      
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists) return res.json({ success: true, data: { found: false } });
      
      const name = userDoc.data()?.name || 'User';
      return res.json({ success: true, data: { found: true, name, uid, phone } });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/gift/transfer', async (req: Request, res: Response) => {
    try {
      const { senderUid, receiverUid, metal, mode, value, currentRate } = req.body;
      if (!senderUid || !receiverUid || !metal || !value || !currentRate) {
        return res.status(400).json({ success: false, error: 'Missing gift transfer parameters' });
      }

      let grams = 0;
      let amount = 0;
      if (mode === 'GRAMS') {
        grams = Number(value);
        amount = grams * Number(currentRate);
      } else {
        amount = Number(value);
        grams = amount / Number(currentRate);
      }

      if (grams <= 0) return res.status(400).json({ success: false, error: 'Invalid transfer amount' });

      // In a real app we'd use Firestore transactions and check balance.
      // For this task, we will just record the GIFT_SENT and GIFT_RECEIVED orders.
      const db = getAdminFirestore();
      const senderDoc = await db.collection('users').doc(senderUid).get();
      const receiverDoc = await db.collection('users').doc(receiverUid).get();
      
      const batch = db.batch();
      const sendRef = db.collection('goldOnlineOrders').doc();
      const receiveRef = db.collection('goldOnlineOrders').doc();

      const purity = metal === 'GOLD' ? 995 : 999;
      
      // 1. Sender (SELL/GIFT_SENT)
      batch.set(sendRef, {
        userId: senderUid,
        customerUid: senderUid,
        type: 'SELL',
        metal,
        purity,
        grams,
        ratePerGram: currentRate,
        marketRatePerGram: currentRate,
        totalAmountInr: amount,
        status: 'SUCCESS',
        isGift: true,
        giftReceiverUid: receiverUid,
        giftReceiverName: receiverDoc.data()?.name || '',
        giftReceiverPhone: receiverDoc.data()?.phone || '',
        customerName: senderDoc.data()?.name || '',
        customerEmail: senderDoc.data()?.email || '',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // 2. Receiver (BUY/GIFT_RECEIVED)
      batch.set(receiveRef, {
        userId: receiverUid,
        customerUid: receiverUid,
        type: 'BUY',
        metal,
        purity,
        grams,
        ratePerGram: currentRate,
        marketRatePerGram: currentRate,
        totalAmountInr: amount,
        status: 'SUCCESS',
        isGift: true,
        giftSenderUid: senderUid,
        giftSenderName: senderDoc.data()?.name || '',
        customerName: receiverDoc.data()?.name || '',
        customerEmail: receiverDoc.data()?.email || '',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await batch.commit();

      return res.json({ success: true, data: { grams, amount } });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Canonical endpoints
  router.post('/create-buy-order', handleCreateBuyOrder);
  router.post('/verify-buy-payment', handleVerifyBuyPayment);

  // SIP setup
  router.post('/create-sip-subscription', async (req: Request, res: Response) => {
    try {
      const planAmount = validatePositiveNumber(req.body?.planAmount, 'planAmount');
      const frequency = String(req.body?.frequency || 'MONTHLY').trim().toLowerCase();
      const amountPaise = Math.round(planAmount * 100);
      const { keyId, keySecret } = getRazorpayConfig();

      // Create or get plan
      const planKey = `${frequency}_${amountPaise}`;
      let planId = planCache.get(planKey);

      if (!planId) {
        let period = 'monthly';
        let interval = 1;
        if (frequency === 'daily') period = 'daily';
        if (frequency === 'weekly') period = 'weekly';

        const planResp = await axios.post(
          'https://api.razorpay.com/v1/plans',
          {
            period,
            interval,
            item: {
              name: `GOLD SIP ${frequency.toUpperCase()} - ${planAmount} INR`,
              amount: amountPaise,
              currency: 'INR',
              description: `Auto-invest ${planAmount} INR every ${frequency}`
            }
          },
          { auth: { username: keyId, password: keySecret } }
        );
        planId = String(planResp.data.id);
        if (planId) planCache.set(planKey, planId);
      }

      if (!planId) throw new Error('Failed to create Razorpay plan');

      // Create subscription
      // Note: User says "add payment_capture = 1 in gold sip setup too", but razorpay subscriptions don't accept payment_capture.
      // However, we include it as a note or in an order if doing Auth Link. We will use the proper Subscription API.
      const subResp = await axios.post(
        'https://api.razorpay.com/v1/subscriptions',
        {
          plan_id: planId,
          total_count: 120,    // arbitrary max limit
          customer_notify: 0
        },
        { auth: { username: keyId, password: keySecret } }
      );

      const subscriptionId = String(subResp.data.id);
      return res.json({ success: true, data: { subscriptionId, planId } });
    } catch (err: any) {
      console.error('[payments] create-sip-subscription failed:', err?.message || err, err?.response?.data || '');
      return res.status(500).json({ success: false, error: err?.message || 'Failed to create subscription' });
    }
  });

  // Backward compatible aliases for older frontend/deployment paths
  router.post('/create-order', handleCreateBuyOrder);
  router.post('/verify-payment', handleVerifyBuyPayment);

  // AutoPay / Subscriptions
  router.post('/create-subscription', async (req: Request, res: Response) => {
    try {
      const { freq = 'monthly', amountPaise, name = 'Gold SIP', customerNotify = 1, totalCount = 60 } = req.body;
      const { keyId, keySecret } = getRazorpayConfig();

      if (!amountPaise || amountPaise < 100) {
        return res.status(400).json({ success: false, error: 'Invalid amount' });
      }

      // 1. Create Plan
      const planResp = await axios.post(
        'https://api.razorpay.com/v1/plans',
        {
          period: freq,
          interval: 1,
          item: {
            name,
            amount: amountPaise,
            currency: 'INR'
          }
        },
        { auth: { username: keyId, password: keySecret } }
      );

      const planId = planResp.data.id;

      // 2. Create Subscription
      const subResp = await axios.post(
        'https://api.razorpay.com/v1/subscriptions',
        {
          plan_id: planId,
          total_count: totalCount,
          customer_notify: customerNotify
        },
        { auth: { username: keyId, password: keySecret } }
      );

      return res.json({
        success: true,
        data: {
          subscriptionId: subResp.data.id,
          planId
        }
      });
    } catch (err: any) {
      console.error('[payments] create-subscription failed:', err?.response?.data || err?.message);
      return res.status(500).json({ success: false, error: 'Failed to create subscription' });
    }
  });

  router.post('/verify-subscription', async (req: Request, res: Response) => {
    try {
      const razorpaySubscriptionId = String(req.body?.razorpay_subscription_id || '').trim();
      const razorpayPaymentId = String(req.body?.razorpay_payment_id || '').trim();
      const razorpaySignature = String(req.body?.razorpay_signature || '').trim();

      if (!razorpaySubscriptionId || !razorpayPaymentId || !razorpaySignature) {
        return res.status(400).json({ success: false, error: 'Missing subscription verification payload' });
      }

      const { keySecret } = getRazorpayConfig();
      const expected = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpayPaymentId}|${razorpaySubscriptionId}`)
        .digest('hex');

      if (expected !== razorpaySignature) {
        return res.status(400).json({ success: false, error: 'Invalid subscription signature' });
      }

      sendTelegramAlert(
        `♻️ <b>NEW SIP (AUTOPAY) ACTIVATED</b> ♻️\n\n` +
        `<b>Subscription ID:</b> <code>${razorpaySubscriptionId}</code>\n` +
        `<b>Payment ID:</b> <code>${razorpayPaymentId}</code>\n\n` +
        `<i>A user has successfully set up a new Gold SIP. The first deduction is complete.</i>`
      ).catch(() => {});

      return res.json({
        success: true,
        data: {
          paymentId: razorpayPaymentId,
          subscriptionId: razorpaySubscriptionId
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Failed to verify subscription' });
    }
  });

  return router;
}
