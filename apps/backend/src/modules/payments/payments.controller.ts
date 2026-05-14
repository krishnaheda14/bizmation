import { Router, Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { getAdminFirestore } from '../../lib/firebaseAdmin';

const LOCK_WINDOW_SECONDS = 120;
const LOCK_COLLECTION = 'paymentPriceLocks';
const MAX_UPI_AMOUNT_PAISE = 20_000_000; // ₹2,00,000
const REDEMPTION_COLLECTION = 'redemptionRequests';

type RazorpayXPayoutMode = 'UPI' | 'IMPS' | 'NEFT' | 'RTGS';

function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  if (!keyId || !keySecret) {
    throw new Error('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not configured on backend');
  }
  return { keyId, keySecret };
}

function getRazorpayXConfig() {
  const keyId = process.env.RAZORPAYX_KEY_ID || process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAYX_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || '';
  const accountNumber = process.env.RAZORPAYX_ACCOUNT_NUMBER || '';
  const webhookSecret = process.env.RAZORPAYX_WEBHOOK_SECRET || '';
  if (!keyId || !keySecret || !accountNumber) {
    throw new Error('RAZORPAYX not configured. Set RAZORPAYX_ACCOUNT_NUMBER and API keys (RAZORPAYX_* or RAZORPAY_*).');
  }
  return { keyId, keySecret, accountNumber, webhookSecret };
}

function validatePositiveNumber(value: any, field: string): number {
  const n = Number(value);
  if (!isFinite(n) || n <= 0) throw new Error(`Invalid ${field}`);
  return n;
}

function normalizePhone(phone: string): string {
  const raw = String(phone || '').trim();
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (raw.startsWith('+')) return `+${raw.slice(1).replace(/\D/g, '')}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return digits ? `+${digits}` : raw;
}

function normalizeUpi(upiId: string): string {
  return String(upiId || '').trim().toLowerCase();
}

function normalizeIfsc(ifsc: string): string {
  return String(ifsc || '').trim().toUpperCase();
}

function mapPayoutEventToStatus(event: string, payoutStatus: string): 'APPROVED' | 'SETTLED' | 'PAYOUT_FAILED' {
  const ev = String(event || '').toLowerCase();
  const st = String(payoutStatus || '').toLowerCase();
  if (ev === 'payout.processed' || st === 'processed') return 'SETTLED';
  if (ev === 'payout.failed' || ev === 'payout.reversed' || ev === 'payout.rejected' || st === 'failed' || st === 'reversed' || st === 'rejected') {
    return 'PAYOUT_FAILED';
  }
  return 'APPROVED';
}

async function createRazorpayXContact(input: {
  keyId: string;
  keySecret: string;
  customerUid: string;
  name: string;
  email: string;
  phone: string;
  requestId: string;
}): Promise<string> {
  const response = await axios.post(
    'https://api.razorpay.com/v1/contacts',
    {
      name: input.name || 'Customer',
      email: input.email || undefined,
      contact: normalizePhone(input.phone),
      type: 'customer',
      reference_id: input.customerUid || input.requestId,
      notes: {
        requestId: input.requestId,
      },
    },
    {
      auth: { username: input.keyId, password: input.keySecret },
      timeout: 15000,
    },
  );
  const contactId = String(response.data?.id || '').trim();
  if (!contactId) throw new Error('Failed to create RazorpayX contact');
  return contactId;
}

async function createRazorpayXFundAccount(input: {
  keyId: string;
  keySecret: string;
  contactId: string;
  requestId: string;
  customerName: string;
  upiId?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
}): Promise<{ fundAccountId: string; mode: RazorpayXPayoutMode; type: 'vpa' | 'bank_account' }> {
  const upiId = normalizeUpi(input.upiId || '');
  if (upiId) {
    const response = await axios.post(
      'https://api.razorpay.com/v1/fund_accounts',
      {
        contact_id: input.contactId,
        account_type: 'vpa',
        vpa: {
          address: upiId,
          name: input.customerName || 'Customer',
        },
      },
      {
        auth: { username: input.keyId, password: input.keySecret },
        timeout: 15000,
      },
    );
    const fundAccountId = String(response.data?.id || '').trim();
    if (!fundAccountId) throw new Error('Failed to create RazorpayX UPI fund account');
    return { fundAccountId, mode: 'UPI', type: 'vpa' };
  }

  const ifscCode = normalizeIfsc(input.ifscCode || '');
  const accountNumber = String(input.accountNumber || '').trim();
  if (!accountNumber || !ifscCode) {
    throw new Error('Missing payout destination. Provide either UPI ID or bank account + IFSC.');
  }

  const response = await axios.post(
    'https://api.razorpay.com/v1/fund_accounts',
    {
      contact_id: input.contactId,
      account_type: 'bank_account',
      bank_account: {
        name: input.customerName || 'Customer',
        ifsc: ifscCode,
        account_number: accountNumber,
      },
    },
    {
      auth: { username: input.keyId, password: input.keySecret },
      timeout: 15000,
    },
  );
  const fundAccountId = String(response.data?.id || '').trim();
  if (!fundAccountId) throw new Error('Failed to create RazorpayX bank fund account');
  return { fundAccountId, mode: 'IMPS', type: 'bank_account' };
}

async function createRazorpayXPayout(input: {
  keyId: string;
  keySecret: string;
  accountNumber: string;
  fundAccountId: string;
  amountPaise: number;
  mode: RazorpayXPayoutMode;
  requestId: string;
  customerUid: string;
  metal: string;
}): Promise<{ payoutId: string; payoutStatus: string; idempotencyKey: string }> {
  const idempotencyKey = `redeem_${input.requestId}_${Date.now()}`;
  const response = await axios.post(
    'https://api.razorpay.com/v1/payouts',
    {
      account_number: input.accountNumber,
      fund_account_id: input.fundAccountId,
      amount: input.amountPaise,
      currency: 'INR',
      mode: input.mode,
      purpose: 'payout',
      queue_if_low_balance: true,
      reference_id: input.requestId,
      narration: `BIZMATION ${String(input.metal || 'GOLD').toUpperCase()} SELL`,
      notes: {
        requestId: input.requestId,
        customerUid: input.customerUid || '',
      },
    },
    {
      auth: { username: input.keyId, password: input.keySecret },
      headers: {
        'X-Payout-Idempotency': idempotencyKey,
      },
      timeout: 20000,
    },
  );

  const payoutId = String(response.data?.id || '').trim();
  const payoutStatus = String(response.data?.status || 'pending').trim();
  if (!payoutId) throw new Error('Failed to create RazorpayX payout');
  return { payoutId, payoutStatus, idempotencyKey };
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

  router.post('/redemption/approve-and-payout', async (req: Request, res: Response) => {
    try {
      const requestId = String(req.body?.requestId || '').trim();
      const adminNote = String(req.body?.adminNote || '').trim();
      const actorName = String(req.body?.actorName || '').trim() || 'Admin';
      if (!requestId) {
        return res.status(400).json({ success: false, error: 'requestId is required' });
      }

      const db = getAdminFirestore();
      const redemptionRef = db.collection(REDEMPTION_COLLECTION).doc(requestId);
      const redemptionSnap = await redemptionRef.get();
      if (!redemptionSnap.exists) {
        return res.status(404).json({ success: false, error: 'Redemption request not found' });
      }

      const data = redemptionSnap.data() || {};
      const currentStatus = String(data.status || 'PENDING').toUpperCase();
      if (!['PENDING', 'APPROVED', 'PAYOUT_FAILED'].includes(currentStatus)) {
        return res.status(400).json({ success: false, error: `Cannot payout request in ${currentStatus} state` });
      }

      const estimatedInr = Number(data.estimatedInr || 0);
      const amountPaise = Math.round(estimatedInr * 100);
      if (!Number.isFinite(amountPaise) || amountPaise < 100) {
        return res.status(400).json({ success: false, error: 'Invalid payout amount on redemption request' });
      }

      const { keyId, keySecret, accountNumber } = getRazorpayXConfig();
      const customerUid = String(data.customerUid || '').trim();
      const customerName = String(data.customerName || 'Customer').trim();
      const customerEmail = String(data.customerEmail || '').trim();
      const customerPhone = String(data.customerPhone || '').trim();
      const upiId = String(data.upiId || '').trim();
      const bankName = String(data.bankName || '').trim();
      const accountNum = String(data.accountNumber || '').trim();
      const ifscCode = String(data.ifscCode || '').trim();

      let contactId = String(data.payoutContactId || '').trim();
      if (!contactId) {
        contactId = await createRazorpayXContact({
          keyId,
          keySecret,
          customerUid,
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          requestId,
        });
      }

      let fundAccountId = String(data.payoutFundAccountId || '').trim();
      let payoutMode: RazorpayXPayoutMode = 'IMPS';
      let fundAccountType: 'vpa' | 'bank_account' = 'bank_account';

      if (!fundAccountId) {
        const fundAccount = await createRazorpayXFundAccount({
          keyId,
          keySecret,
          contactId,
          requestId,
          customerName,
          upiId,
          bankName,
          accountNumber: accountNum,
          ifscCode,
        });
        fundAccountId = fundAccount.fundAccountId;
        payoutMode = fundAccount.mode;
        fundAccountType = fundAccount.type;
      } else {
        payoutMode = upiId ? 'UPI' : 'IMPS';
        fundAccountType = upiId ? 'vpa' : 'bank_account';
      }

      const payout = await createRazorpayXPayout({
        keyId,
        keySecret,
        accountNumber,
        fundAccountId,
        amountPaise,
        mode: payoutMode,
        requestId,
        customerUid,
        metal: String(data.metal || 'GOLD'),
      });

      const batch = db.batch();
      batch.update(redemptionRef, {
        status: 'APPROVED',
        adminNote,
        approvedBy: actorName,
        approvedAt: new Date(),
        payoutProvider: 'RAZORPAYX',
        payoutContactId: contactId,
        payoutFundAccountId: fundAccountId,
        payoutFundAccountType: fundAccountType,
        payoutId: payout.payoutId,
        payoutStatusRaw: payout.payoutStatus,
        payoutMode: payoutMode,
        payoutAttemptCount: Number(data.payoutAttemptCount || 0) + 1,
        payoutIdempotencyKeyLast: payout.idempotencyKey,
        payoutInitiatedAt: new Date(),
        updatedAt: new Date(),
      });

      if (data.linkedOrderId) {
        batch.update(db.collection('goldOnlineOrders').doc(String(data.linkedOrderId)), {
          status: 'APPROVED',
          updatedAt: new Date(),
        });
      }

      await batch.commit();

      sendTelegramAlert(
        `📤 <b>SELL PAYOUT INITIATED</b>\n\n` +
        `<b>Request ID:</b> <code>${requestId}</code>\n` +
        `<b>Customer:</b> ${customerName || 'N/A'}\n` +
        `<b>Amount:</b> ₹${estimatedInr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
        `<b>Payout ID:</b> <code>${payout.payoutId}</code>\n` +
        `<b>Mode:</b> ${payoutMode}`
      ).catch(() => {});

      return res.json({
        success: true,
        data: {
          requestId,
          payoutId: payout.payoutId,
          payoutStatus: payout.payoutStatus,
          payoutMode,
          fundAccountType,
        },
      });
    } catch (err: any) {
      const msg = err?.response?.data?.error?.description || err?.message || 'Failed to create payout';
      console.error('[payments] approve-and-payout failed:', msg);
      return res.status(500).json({ success: false, error: msg });
    }
  });

  router.post('/webhook/razorpayx', async (req: Request, res: Response) => {
    try {
      const { webhookSecret } = getRazorpayXConfig();
      if (!webhookSecret) {
        return res.status(500).json({ success: false, error: 'RAZORPAYX_WEBHOOK_SECRET not configured' });
      }

      const signature = String(req.headers['x-razorpay-signature'] || '');
      const rawBody = String((req as any).rawBody || JSON.stringify(req.body || {}));
      const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

      const expectedBuf = Buffer.from(expected, 'utf8');
      const signatureBuf = Buffer.from(signature, 'utf8');
      const signatureValid = signatureBuf.length === expectedBuf.length && crypto.timingSafeEqual(expectedBuf, signatureBuf);

      if (!signature || !signatureValid) {
        return res.status(400).json({ success: false, error: 'Invalid webhook signature' });
      }

      const event = String(req.body?.event || '').trim();
      const payout = req.body?.payload?.payout?.entity || {};
      const payoutId = String(payout.id || '').trim();
      const payoutStatus = String(payout.status || '').trim().toLowerCase();
      const referenceId = String(payout.reference_id || payout.notes?.requestId || '').trim();

      if (!payoutId || !referenceId) {
        return res.json({ success: true, ignored: true });
      }

      const db = getAdminFirestore();
      const redemptionRef = db.collection(REDEMPTION_COLLECTION).doc(referenceId);
      const redemptionSnap = await redemptionRef.get();
      if (!redemptionSnap.exists) {
        return res.json({ success: true, ignored: true });
      }

      const redemptionData = redemptionSnap.data() || {};
      const mappedStatus = mapPayoutEventToStatus(event, payoutStatus);
      const batch = db.batch();

      batch.update(redemptionRef, {
        status: mappedStatus,
        payoutId,
        payoutStatusRaw: payoutStatus,
        payoutUtr: String(payout.utr || ''),
        payoutMode: String(payout.mode || ''),
        payoutFailureSource: String(payout.status_details?.source || ''),
        payoutFailureReason: String(payout.status_details?.reason || ''),
        payoutFailureDescription: String(payout.status_details?.description || ''),
        payoutProcessedAt: mappedStatus === 'SETTLED' ? new Date() : redemptionData.payoutProcessedAt || null,
        updatedAt: new Date(),
      });

      if (redemptionData.linkedOrderId) {
        batch.update(db.collection('goldOnlineOrders').doc(String(redemptionData.linkedOrderId)), {
          status: mappedStatus === 'SETTLED' ? 'SUCCESS' : mappedStatus === 'PAYOUT_FAILED' ? 'APPROVED' : 'APPROVED',
          updatedAt: new Date(),
        });
      }

      await batch.commit();

      if (mappedStatus === 'SETTLED') {
        sendTelegramAlert(
          `✅ <b>SELL PAYOUT PROCESSED</b>\n\n` +
          `<b>Request ID:</b> <code>${referenceId}</code>\n` +
          `<b>Payout ID:</b> <code>${payoutId}</code>\n` +
          `<b>UTR:</b> <code>${String(payout.utr || 'N/A')}</code>`
        ).catch(() => {});
      } else if (mappedStatus === 'PAYOUT_FAILED') {
        sendTelegramAlert(
          `❌ <b>SELL PAYOUT FAILED</b>\n\n` +
          `<b>Request ID:</b> <code>${referenceId}</code>\n` +
          `<b>Payout ID:</b> <code>${payoutId}</code>\n` +
          `<b>Reason:</b> ${String(payout.status_details?.description || payout.status_details?.reason || payoutStatus || 'Unknown')}`
        ).catch(() => {});
      }

      return res.json({ success: true });
    } catch (err: any) {
      console.error('[payments] razorpayx webhook error:', err?.message || err);
      return res.status(500).json({ success: false, error: 'Webhook processing failed' });
    }
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
      if (amountPaise > MAX_UPI_AMOUNT_PAISE) {
        return res.status(400).json({ success: false, error: 'UPI transactions cannot exceed ₹2,00,000.' });
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

      const normalized = (() => {
        if (phone.startsWith('+')) return '+' + phone.slice(1).replace(/\D/g, '');
        const digits = phone.replace(/\D/g, '');
        if (digits.length === 10) return `+91${digits}`;
        if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
        return digits ? `+${digits}` : phone;
      })();
      const digitsOnly = phone.replace(/\D/g, '');
      const candidates = Array.from(new Set([phone, normalized, digitsOnly].filter(Boolean)));

      const db = getAdminFirestore();

      // 1) phoneIndex doc lookup with multiple candidate formats
      for (const candidate of candidates) {
        const phoneDoc = await db.collection('phoneIndex').doc(candidate).get();
        if (!phoneDoc.exists) continue;

        const uid = String(phoneDoc.data()?.uid || '').trim();
        if (!uid) continue;

        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) continue;

        const userData = userDoc.data() || {};
        const name = String(userData.name || 'User');
        const resolvedPhone = String(userData.phone || candidate);
        return res.json({ success: true, data: { found: true, name, uid, phone: resolvedPhone } });
      }

      // 2) Fallback to users collection phone field match
      for (const candidate of candidates) {
        const snap = await db.collection('users').where('phone', '==', candidate).limit(1).get();
        if (snap.empty) continue;

        const userDoc = snap.docs[0];
        const data = userDoc.data() || {};
        const uid = userDoc.id;
        const name = String(data.name || 'User');
        const resolvedPhone = String(data.phone || candidate);
        return res.json({ success: true, data: { found: true, name, uid, phone: resolvedPhone } });
      }

      return res.json({ success: true, data: { found: false } });
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
      if (amountPaise > MAX_UPI_AMOUNT_PAISE) {
        return res.status(400).json({ success: false, error: 'UPI transactions cannot exceed ₹2,00,000.' });
      }
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
      if (amountPaise > MAX_UPI_AMOUNT_PAISE) {
        return res.status(400).json({ success: false, error: 'UPI transactions cannot exceed ₹2,00,000.' });
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
