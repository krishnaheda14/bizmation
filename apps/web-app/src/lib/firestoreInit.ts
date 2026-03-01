/**
 * firestoreInit.ts
 *
 * Seeds every Firestore collection with one starter document so that
 * all collections appear in the Firebase Console immediately.
 *
 * Usage — call once from a browser console or an admin route:
 *
 *   import { initializeCollections } from '../lib/firestoreInit';
 *   await initializeCollections();
 *
 * Safe to run multiple times — uses `setDoc` with `merge: true`
 * so existing data is preserved.
 */

import {
  doc, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';

// ─── Seed data for every collection ──────────────────────────────────────────

const SEED_DOCUMENTS: Record<string, object> = {
  // ── Users ─────────────────────────────────────────────────────────────────
  'users/_seed_': {
    uid: '_seed_',
    name: 'System Seed',
    email: 'seed@example.com',
    phone: '+910000000000',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    dateOfBirth: '1990-01-01',
    panNumber: '',
    aadhaarLast4: '',
    kycStatus: 'PENDING',
    role: 'CUSTOMER',
    totalGoldPurchasedGrams: 0,
    totalSilverPurchasedGrams: 0,
    totalInvestedInr: 0,
    _isSeed: true,
  },

  // ── Online Buy / Sell Orders ─────────────────────────────────────────────
  'goldOnlineOrders/_seed_': {
    orderId: '_seed_',
    userId: '_seed_',
    type: 'BUY',             // 'BUY' | 'SELL'
    metal: 'GOLD',           // 'GOLD' | 'SILVER'
    grams: 0,
    ratePerGram: 0,
    totalAmountInr: 0,
    razorpayOrderId: '',
    razorpayPaymentId: '',
    status: 'PENDING',       // PENDING | SUCCESS | FAILED | REFUNDED
    bankAccountDetails: null,
    deliveryType: 'VAULT',   // VAULT | DELIVERY
    deliveryAddress: '',
    notes: '',
    _isSeed: true,
  },

  // ── AutoPay Subscriptions ────────────────────────────────────────────────
  'autoPaySubscriptions/_seed_': {
    subscriptionId: '_seed_',
    userId: '_seed_',
    metal: 'GOLD',
    amountInr: 0,
    frequencyDays: 30,        // e.g. 30 = monthly
    nextDebitDate: '',
    razorpaySubscriptionId: '',
    status: 'ACTIVE',         // ACTIVE | PAUSED | CANCELLED
    _isSeed: true,
  },

  // ── Gold / Silver Price History ──────────────────────────────────────────
  'metalPriceHistory/_seed_': {
    date: '2024-01-01',
    goldPer10gInr: 0,
    silverPer10gInr: 0,
    goldPerOzUsd: 0,
    silverPerOzUsd: 0,
    usdToInrRate: 0,
    sourceApi: 'swissquote',
    _isSeed: true,
  },

  // ── Inventory items (physical shop) ──────────────────────────────────────
  'inventory/_seed_': {
    itemId: '_seed_',
    name: 'Sample Necklace',
    sku: 'SKU-000',
    category: 'NECKLACE',
    purity: '22KT',
    weightGrams: 0,
    makingChargesPct: 12,
    stockQty: 0,
    hsnCode: '7113',
    photos: [],
    _isSeed: true,
  },

  // ── Billing / Invoices ────────────────────────────────────────────────────
  'invoices/_seed_': {
    invoiceId: '_seed_',
    customerId: '_seed_',
    items: [],
    subtotalInr: 0,
    gstInr: 0,
    totalInr: 0,
    paymentMode: 'CASH',
    status: 'DRAFT',
    _isSeed: true,
  },

  // ── Parties / Customers ────────────────────────────────────────────────────
  'parties/_seed_': {
    partyId: '_seed_',
    name: 'Sample Customer',
    phone: '+910000000000',
    email: '',
    type: 'CUSTOMER',        // CUSTOMER | SUPPLIER | VENDOR
    gstNumber: '',
    city: 'Mumbai',
    _isSeed: true,
  },

  // ── Repairs ───────────────────────────────────────────────────────────────
  'repairs/_seed_': {
    repairId: '_seed_',
    customerId: '_seed_',
    description: 'Sample ring sizing',
    estimatedCostInr: 0,
    status: 'RECEIVED',      // RECEIVED | IN_PROGRESS | READY | DELIVERED
    receivedAt: '',
    deliveredAt: null,
    _isSeed: true,
  },

  // ── Schemes ───────────────────────────────────────────────────────────────
  'schemes/_seed_': {
    schemeId: '_seed_',
    schemeName: 'Gold Accumulation Plan',
    totalMonths: 12,
    monthlyInstallmentInr: 1000,
    bonusMonthsCount: 1,
    enrolledCustomers: 0,
    _isSeed: true,
  },

  // ── Purchase Orders ───────────────────────────────────────────────────────
  'purchaseOrders/_seed_': {
    poId: '_seed_',
    supplierId: '_seed_',
    items: [],
    status: 'DRAFT',
    totalInr: 0,
    _isSeed: true,
  },

  // ── Hallmarking ───────────────────────────────────────────────────────────
  'hallmarking/_seed_': {
    batchId: '_seed_',
    items: [],
    sentToHallmarkDate: '',
    receivedDate: null,
    status: 'SENT',
    _isSeed: true,
  },
};

// ─── Main initializer ─────────────────────────────────────────────────────────

/**
 * Creates all seed documents in Firestore using batched writes.
 * Batches are limited to 500 ops each.
 */
export async function initializeCollections(): Promise<void> {
  const entries = Object.entries(SEED_DOCUMENTS);
  const BATCH_SIZE = 499;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = entries.slice(i, i + BATCH_SIZE);

    for (const [path, data] of chunk) {
      const [collection, docId] = path.split('/');
      const ref = doc(db, collection, docId);
      batch.set(ref, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }

    await batch.commit();
    console.log(`✅ Committed batch ${Math.floor(i / BATCH_SIZE) + 1}: ${chunk.length} docs`);
  }

  console.log('🎉 All Firestore collections initialised!');
}

// ─── One-liner you can run from the browser console ──────────────────────────
// Copy-paste this into Chrome DevTools console:
//
//   const { initializeCollections } = await import('/src/lib/firestoreInit.ts');
//   await initializeCollections();
