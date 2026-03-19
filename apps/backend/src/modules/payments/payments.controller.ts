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

export function paymentsRouter(): Router {
  const router = Router();

  router.post('/create-buy-order', async (req: Request, res: Response) => {
    try {
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
          expiresAt: new Date(expiresAtMs).toISOString(),
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to create payment order' });
    }
  });

  router.post('/verify-buy-payment', async (req: Request, res: Response) => {
    try {
      const lockId = String(req.body?.lockId || '').trim();
      const razorpayOrderId = String(req.body?.razorpay_order_id || '').trim();
      const razorpayPaymentId = String(req.body?.razorpay_payment_id || '').trim();
      const razorpaySignature = String(req.body?.razorpay_signature || '').trim();

      if (!lockId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return res.status(400).json({ success: false, error: 'Missing payment verification payload' });
      }

      const { keySecret, keyId } = getRazorpayConfig();
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

      const lock = lockSnap.data() as any;
      const nowMs = Date.now();
      const expiresAtMs = lock?.expiresAt?.toDate ? lock.expiresAt.toDate().getTime() : Number(lock?.expiresAtMs || 0);
      const isExpired = !expiresAtMs || nowMs > expiresAtMs;

      if (isExpired) {
        let refundId = '';
        let refundError = '';
        try {
          const refundResp = await axios.post(
            `https://api.razorpay.com/v1/payments/${razorpayPaymentId}/refund`,
            {
              amount: Number(lock?.amountPaise || 0),
              notes: {
                reason: 'price_lock_expired',
                lockId,
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
          refundId = String(refundResp.data?.id || '');
        } catch (e: any) {
          refundError = e?.response?.data?.error?.description || e?.message || 'Refund failed';
        }

        await lockRef.update({
          status: refundId ? 'REFUNDED_AFTER_EXPIRY' : 'EXPIRED_PAYMENT_NO_REFUND',
          verifiedAt: new Date(),
          razorpayOrderId,
          razorpayPaymentId,
          refundId,
          refundError,
          updatedAt: new Date(),
        });

        return res.status(409).json({
          success: true,
          data: {
            expired: true,
            refunded: !!refundId,
            refundId: refundId || null,
            refundError: refundError || null,
          },
        });
      }

      await lockRef.update({
        status: 'PAID_IN_TIME',
        verifiedAt: new Date(),
        razorpayOrderId,
        razorpayPaymentId,
        updatedAt: new Date(),
      });

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
  });

  return router;
}
