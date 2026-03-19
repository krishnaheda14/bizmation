# Transaction Flows Documentation

## Overview
This document explains the complete lifecycle of **Buy Gold**, **Sell Gold**, and **Redeem Gold** transactions, including calculations, price locking, Razorpay integration, and payment flow.

---

## 1. BUY GOLD FLOW ✅ (FULLY IMPLEMENTED)

### 1.1 Flow Diagram
```
User Initiates Purchase
    ↓
[Frontend] HomeLanding.tsx opens "Buy" modal
    ↓
User selects metal (GOLD/SILVER), enters grams
    ↓
Frontend calculates: totalAmount = grams × (liveMarketRate + commission)
    ↓
User clicks "Slide to Pay" button (GOLD only)
    ↓
[CRITICAL: 2-MINUTE PRICE LOCK STARTS]
    ↓
Frontend calls: POST /api/payments/create-buy-order
    ↓
[Backend] Creates Firestore "paymentPriceLocks" record with 120s expiry
    ↓
[Backend] Calls Razorpay API to create order (amountPaise = grams × ratePerGram × 100)
    ↓
[Backend] Returns: { lockId, razorpayOrderId, expiresAt }
    ↓
Frontend opens Razorpay Checkout modal with order_id
    ↓
[⏱️ User has 120 SECONDS to complete payment]
    ↓
User completes payment on Razorpay
    ↓
Frontend calls: POST /api/payments/verify-buy-payment
    ↓
[Backend] Verifies HMAC signature (ensures payment authentic)
    ↓
IF payment timestamp > lock expiry:
    [Backend] Auto-refunds via Razorpay Refund API
    [Backend] Lock status = 'REFUNDED_AFTER_EXPIRY'
    [Frontend] Shows error "Payment too late, refunded"
ELSE:
    [Backend] Lock status = 'PAID_IN_TIME'
    ↓
[Frontend] Shows success message
    ↓
[Frontend] Writes order to Firestore "goldOnlineOrders" collection
    ↓
Order marked as type='BUY', status='SUCCESS'
```

### 1.2 Key Calculations

**For GOLD:**
```typescript
liveMarketRate = ratePerGram from worker (XAU/INR converted)
commissionPerGram = 20 (Rs 20 per gram for GOLD)
customerRate = liveMarketRate + commissionPerGram

baseAmountInr = grams × liveMarketRate
shopCommissionInr = grams × commissionPerGram
totalAmountInr = grams × customerRate
```

**For SILVER:**
```typescript
liveMarketRate = ratePerGram from worker (XAG/INR converted)
commissionPerGram = 2 (Rs 2 per gram for SILVER)
customerRate = liveMarketRate + commissionPerGram

baseAmountInr = grams × liveMarketRate
shopCommissionInr = grams × commissionPerGram
totalAmountInr = grams × customerRate
```

### 1.3 Database Records Created

**Firestore: `paymentPriceLocks/{lockId}`**
```json
{
  "status": "LOCKED|PAID_IN_TIME|REFUNDED_AFTER_EXPIRY",
  "lockWindowSeconds": 120,
  "createdAt": "2025-03-19T10:30:00Z",
  "expiresAt": "2025-03-19T10:32:00Z",
  "customerUid": "user-123",
  "customerName": "Aman Kumar",
  "customerEmail": "aman@email.com",
  "customerPhone": "+919876543210",
  "metal": "GOLD|SILVER",
  "grams": 2.5,
  "ratePerGram": 7420,
  "amountPaise": 1855000,
  "razorpayOrderId": "order_KJ8R3Z...",
  "razorpayPaymentId": "pay_K2J4R...",
  "refundId": "rfnd_XYZ...",
  "verifiedAt": "2025-03-19T10:30:45Z",
  "updatedAt": "2025-03-19T10:30:45Z"
}
```

**Firestore: `goldOnlineOrders/{orderId}`**
```json
{
  "userId": "user-123",
  "customerUid": "user-123",
  "type": "BUY",
  "metal": "GOLD",
  "purity": 995,
  "grams": 2.5,
  "ratePerGram": 7420,
  "marketRatePerGram": 7400,
  "commissionPerGram": 20,
  "shopCommissionInr": 50,
  "bullionBaseAmountInr": 18500,
  "bullionSettlementAmountInr": 18550,
  "bullionPayoutStatus": "UNSETTLED",
  "totalAmountInr": 18550,
  "razorpayPaymentId": "pay_K2J4R...",
  "status": "SUCCESS",
  "customerName": "Aman Kumar",
  "customerPhone": "+919876543210",
  "customerEmail": "aman@email.com",
  "shopName": "Gold Hub Shop",
  "shopId": "shop-456",
  "createdAt": "2025-03-19T10:30:00Z",
  "updatedAt": "2025-03-19T10:30:00Z"
}
```

### 1.4 Frontend Code Locations
- **Modal & Form**: `apps/web-app/src/pages/HomeLanding.tsx` (lines ~1100-1250)
- **Slide Button**: `apps/web-app/src/pages/HomeLanding.tsx:SlideToConfirm` (lines ~1554-1720)
- **Rate Display**: `apps/web-app/src/pages/HomeLanding.tsx` (price lock timer at ~1164-1173)
- **Razorpay Client**: `apps/web-app/src/lib/razorpay.ts:buyGold()` (calls backend lock endpoint)

### 1.5 Backend Code Locations
- **Payment Router**: `apps/backend/src/modules/payments/payments.controller.ts`
  - `POST /create-buy-order` (lines ~29-102)
  - `POST /verify-buy-payment` (lines ~104-185)
- **Router Registration**: `apps/backend/src/server.ts` (app.use('/api/payments', paymentsRouter()))

### 1.6 Critical Features Implemented
✅ **2-Minute Price Lock**: Server-side expiry via Firestore timestamp
✅ **HMAC Signature Verification**: Ensures payment authenticity
✅ **Auto-Refund**: If payment confirmed after lock expires, backend auto-refunds
✅ **Slide Button Disabled After Expiry**: UI greyed out, can't proceed
✅ **Dark Mode Support**: Slider works seamlessly in light/dark themes
✅ **Recovery Path**: "Refresh price" button allows re-locking if expired

---

## 2. SELL GOLD FLOW ⚠️ (INCOMPLETE - NEEDS IMPLEMENTATION)

### 2.1 Current State (Frontend Only)
Current implementation is **UI-only** with no backend lock/payout integration:
- Form collects grams/amount from user
- Writes to Firestore `redemptionRequests` collection with status='PENDING'
- Also writes to `goldOnlineOrders` with type='SELL', status='PENDING'
- No Razorpay involvement (no payment gets initiated)
- No 2-minute lock (unlike buy flow)
- Owner must manually process and pay user (offline)

**Current Locations**:
- **Modal & Form**: `apps/web-app/src/pages/HomeLanding.tsx` (lines ~1400-1500)
- **Sell Rate Calculation**: `apps/web-app/src/pages/HomeLanding.tsx:handleSell()` (lines ~360-600)

### 2.2 Proposed Sell Flow ✅ (DESIGN)

```
User Initiates SELL
    ↓
[Frontend] HomeLanding.tsx opens "Sell" modal
    ↓
User selects metal (GOLD only for now), enters grams or amount
    ↓
Frontend calculates:
    liveMarketRate = ratePerGram from worker
    postGstRate = liveMarketRate × 0.97 (GST deduction)
    effectiveSellRate = postGstRate - 50 (flat ₹50 deduction)
    totalInr = grams × effectiveSellRate
    ↓
Frontend validates user has enough redeemable balance
    ↓
User clicks "Sell Now" button or "Slide to Confirm Sell"
    ↓
[CRITICAL: 2-MINUTE PRICE LOCK STARTS (same as BUY)]
    ↓
Frontend calls: POST /api/payments/create-sell-order
    ↓
[Backend] Creates Firestore "paymentPriceLocks" record (sellType=true) with 120s expiry
    ↓
[Backend] Creates a Razorpay invoice OR prepares payout reversal
    ↓
[Backend] Returns: { lockId, razorpayOrderId, amountPaise, expiresAt }
    ↓
[⏱️ User has 120 SECONDS to confirm bank details & submit]
    ↓
Frontend shows:
    - Countdown timer (same as buy)
    - Bank account form with IFSC code verification
    - "Confirm Sell" button
    ↓
User confirms bank details & clicks "Confirm"
    ↓
Frontend calls: POST /api/payments/confirm-sell-payment
    ↓
[Backend] Verifies lock hasn't expired
    ↓
IF payment lock expired:
    [Backend] Cancels Razorpay invoice/payout
    [Backend] Lock status = 'SELL_EXPIRED'
    [Frontend] Shows error "Sell expired, please try again"
ELSE:
    [Backend] Creates Razorpay Payout with:
      - contactId: customer's bank details (from form)
      - amount: amountPaise (customer gets this)
      - notes: { sellId, customerId, grams, rate }
    [Backend] Lock status = 'SELL_CONFIRMED'
    ↓
Payout processes via Razorpay (usually 1-2 hours for bank transfer)
    ↓
[Webhook] Razorpay payout.successful webhook received
    ↓
[Backend] Updates lock status = 'SELL_PAID'
    ↓
[Backend] Updates goldOnlineOrders record:
    - status = 'SUCCESS'
    - razorpayPayoutId = payout ID
    ↓
[Optional: Send SMS/Email] Payout confirmation to customer
```

### 2.3 Key Differences from Buy Flow

| Aspect | BUY | SELL |
|--------|-----|------|
| **Money Direction** | Customer → Shop (via Razorpay charge) | Shop → Customer (via Razorpay payout) |
| **Price Lock** | ✅ 2 minutes | ✅ 2 minutes (same) |
| **Razorpay API** | `POST /orders` + verify payment | `POST /payouts` (future) |
| **User Input** | Just grams + slide | Grams + bank details + slide |
| **Rate** | Market + Commission | Market × 0.97 - ₹50 |
| **Firestore Records** | 1 lock + 1 order | 2+ records (lock, redemptionRequest, order) |
| **Completion Time** | Instant (after verify) | 1-2 hours (after payout processes) |

### 2.4 Sell Rate Calculations (To Implement)

```typescript
// Current (working in frontend)
const liveMarketRate = rates.find(r => r.metalType === 'GOLD' && r.purity === 995)?.ratePerGram ?? 0;
const postGstRatePerGram = liveMarketRate * 0.97;  // 3% GST deduction
const effectiveSellRatePerGram = Math.max(0, postGstRatePerGram - 50);  // Flat ₹50 deduction

// Customer receives:
totalAmountInr = grams × effectiveSellRatePerGram

// Example:
// liveMarketRate = ₹7400/g
// postGstRate = 7400 × 0.97 = ₹7178/g
// effectiveSellRate = 7178 - 50 = ₹7128/g
// If customer sells 10g: 10 × 7128 = ₹71,280
```

### 2.5 Validation Rules for Sell

```typescript
// Must validate:
1. Customer has sufficient redeemable balance
   - Only count BUY orders with status='SUCCESS'
   - Subtract any existing SELL orders (not REJECTED)
   
2. Grams entered must be valid
   - Min: 0.0001g (like buy)
   - Max: redeemableBalance
   - Step: 0.0001g
   
3. Bank details (for payout):
   - Account number: 9-18 digits
   - IFSC code: 11 chars (format: AAAA0AAAAAA)
   - Verify account exists via IFSC lookup (optional)
   
4. Price lock expiry:
   - Reject confirms after 120 seconds
   - Use server-side Firestore timestamp as source of truth
```

### 2.6 Database Records to Create

**New Firestore: `paymentPriceLocks/{lockId}` (for SELL)**
```json
{
  "status": "LOCKED|SELL_CONFIRMED|SELL_PAID|SELL_EXPIRED",
  "lockWindowSeconds": 120,
  "transactionType": "SELL",
  "createdAt": "2025-03-19T11:00:00Z",
  "expiresAt": "2025-03-19T11:02:00Z",
  "customerUid": "user-123",
  "customerName": "Aman Kumar",
  "customerEmail": "aman@email.com",
  "customerPhone": "+919876543210",
  "metal": "GOLD",
  "grams": 5.0,
  "ratePerGram": 7128,
  "amountPaise": 3564000,
  "bankAccountNumber": "123456789",
  "bankIfscCode": "HDFC0001234",
  "razorpayContactId": "cont_...",
  "razorpayPayoutId": "pout_...",
  "verifiedAt": "2025-03-19T11:00:30Z",
  "updatedAt": "2025-03-19T11:00:30Z"
}
```

**Existing Firestore: `goldOnlineOrders/{orderId}` (for SELL)**
```json
{
  "userId": "user-123",
  "customerUid": "user-123",
  "type": "SELL",
  "status": "PENDING|SUCCESS|REJECTED",
  "metal": "GOLD",
  "purity": 995,
  "grams": 5.0,
  "ratePerGram": 7128,
  "marketRatePerGram": 7400,
  "postGstRatePerGram": 7178,
  "redeemGstReductionPercent": 3,
  "redeemFlatDeductionPerGram": 50,
  "totalAmountInr": 35640,
  "razorpayPayoutId": "pout_...",
  "bankAccountNumber": "XXXXXX9999",  // masked
  "bankIfscCode": "HDFC0001234",
  "createdAt": "2025-03-19T11:00:00Z",
  "updatedAt": "2025-03-19T11:00:00Z"
}
```

---

## 3. REDEEM GOLD FLOW ⏳ (PLANNED)

### 3.1 Relationship to Sell Flow
- **Redeem** = Customer redeems gold with the jeweller (sends gold physically)
- **Sell** = Customer wants immediate digital payout (Razorpay transfer)
- Currently: Both use same backend records but different request types

### 3.2 Current Flow
- Similar to Sell but requires:
  - Physical gold verification at store
  - Manager approval before payout
  - Possible KYC re-verification
  - Higher commission/deductions

### 3.3 Future Work
- Separate approval workflow
- Integration with store manager portal
- QR code / batch tracking for physical gold received

---

## 4. RAZORPAY INTEGRATION DETAILS

### 4.1 Calculate Order ID & Amount

```typescript
// Backend function for both buy and sell
function calculateRazorpayAmount(grams: number, ratePerGram: number): {
  amountPaise: number;
  amountInr: number;
} {
  const amountInr = grams * ratePerGram;
  const amountPaise = Math.round(amountInr * 100);
  
  if (amountPaise < 100) throw new Error('Minimum ₹1 required');
  if (amountPaise > 500000000) throw new Error('Maximum ₹50 lakh exceeded');
  
  return { amountPaise, amountInr };
}

// Example:
// 2.5g × ₹7420/g = ₹18,550 = 1,855,000 paise
```

### 4.2 Create Payment Order (BUY)
```bash
POST https://api.razorpay.com/v1/orders
Authorization: Basic <base64(KEY_ID:KEY_SECRET)>
Content-Type: application/json

{
  "amount": 1855000,  # paise
  "currency": "INR",
  "receipt": "lock_abc123xyz",
  "notes": {
    "lockId": "lock_abc123xyz",
    "customerUid": "user-123",
    "metal": "GOLD",
    "grams": "2.5",
    "ratePerGram": "7420"
  }
}

Response:
{
  "id": "order_KJ8R3Z...",
  "entity": "order",
  "amount": 1855000,
  "currency": "INR",
  "status": "created",
  "receipt": "lock_abc123xyz"
}
```

### 4.3 Verify Payment Signature (BUY)
```typescript
function verifyRazorpaySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
  keySecret: string
): boolean {
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
  
  return expected === razorpaySignature;
}
```

### 4.4 Create Payout (SELL - Future)
```bash
POST https://api.razorpay.com/v1/payouts
Authorization: Basic <base64(KEY_ID:KEY_SECRET)>
Content-Type: application/json

{
  "account_number": "1112220061746137",  # Business account
  "fund_account_id": "fa_100000000000fa",  # Customer's bank details
  "amount": 3564000,  # paise
  "currency": "INR",
  "mode": "NEFT",
  "purpose": "salary",
  "receipt": "sell_abc123xyz",
  "notes": {
    "sellId": "sell_abc123xyz",
    "customerId": "user-123",
    "grams": "5.0",
    "rate": "7128"
  }
}

Response:
{
  "id": "pout_EK4x...",
  "entity": "payout",
  "fund_account_id": "fa_100000000000fa",
  "amount": 3564000,
  "currency": "INR",
  "status": "processed",
  "mode": "NEFT"
}
```

### 4.5 Handle Webhook Events (Future)
```typescript
// Backend webhook endpoint for Razorpay events
POST /api/webhooks/razorpay

Events to handle:
1. order.paid - BUY completed
2. payout.processed - SELL successful
3. payout.failed - SELL failed
4. payout.reversed - SELL refunded

// Verify webhook signature
function verifyWebhookSignature(
  body: string,
  signature: string,
  keySecret: string
): boolean {
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(body)
    .digest('hex');
  return expected === signature;
}
```

---

## 5. SYSTEM STATES & TRANSITIONS

### 5.1 Lock States (paymentPriceLocks)
```
LOCKED
  ↓ (payment confirmed in time)
  ├→ PAID_IN_TIME (buy) → Order SUCCESS
  ├→ SELL_CONFIRMED (sell) → Payout initiated
  │
  ↓ (payment confirmed after expiry)
  ├→ REFUNDED_AFTER_EXPIRY (buy) → Order REJECTED
  ├→ SELL_EXPIRED (sell) → Order REJECTED
  │
  ↓ (lock never verified)
  └→ LOCK_ABANDONED (timeout) → Order REJECTED
```

### 5.2 Order States (goldOnlineOrders)
```
BUY:
  SUCCESS → SETTLED → COMPLETED
  REJECTED → Refunded
  PENDING → Timeout

SELL:
  PENDING → APPROVED → PAID → COMPLETED
  REJECTED → Cancelled
```

---

## 6. ERROR SCENARIOS & RECOVERY

### 6.1 Buy Flow Errors
| Scenario | Error | Resolution |
|----------|-------|------------|
| Lock expires before payment | "Price expired" | Refresh price, start over |
| Payment signature invalid | "Payment verification failed" | Check frontend/backend logs |
| Razorpay order creation fails | "Failed to create order" | Retry, check Razorpay API status |
| Payment amount mismatch | "Amount changed" | Clear lock, start fresh |

### 6.2 Sell Flow Errors (Future)
| Scenario | Error | Resolution |
|----------|-------|------------|
| Lock expires before confirm | "Sell expired" | Refresh rate, try again |
| Invalid bank details | "Invalid IFSC code" | Verify IFSC format |
| Payout API error | "Transfer failed" | Retry, fallback to manual |
| Customer balance too low | "Insufficient balance" | Check holdings, reduce amount |

---

## 7. IMPLEMENTATION CHECKLIST FOR SELL FLOW

- [ ] **Backend Endpoints**
  - [ ] `POST /api/payments/create-sell-order` - Create Razorpay contact + initiate payout
  - [ ] `POST /api/payments/confirm-sell-payment` - Verify lock, process payout
  - [ ] `POST /api/webhooks/razorpay` - Handle payout.processed/failed events

- [ ] **Frontend Components**
  - [ ] Add bank details form to Sell modal
  - [ ] Add 2-minute countdown timer (reuse buy flow)
  - [ ] Add slide button for sell (or direct confirm)

- [ ] **Database**
  - [ ] Add `transactionType` to paymentPriceLocks
  - [ ] Add bank details fields to goldOnlineOrders
  - [ ] Add razorpayPayoutId tracking

- [ ] **Razorpay Setup**
  - [ ] Create contact API implementation
  - [ ] Create payout API implementation
  - [ ] Add webhook handler for payout events
  - [ ] Test sandbox environment

- [ ] **Testing**
  - [ ] Unit tests: Rate calculations
  - [ ] Integration tests: Lock creation/expiry
  - [ ] E2E tests: Full sell flow in sandbox
  - [ ] Edge cases: Expired locks, network failures

---

## 8. ENVIRONMENT VARIABLES

```bash
# Backend (.env)
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=xxxxxxx

# Optional: Business account for payouts
RAZORPAY_BUSINESS_ACCOUNT_NUMBER=1112220061746137

# Frontend (.env)
VITE_GOLD_WORKER_URL=https://gold-rates-worker.namanchandak750.workers.dev
VITE_RAZORPAY_KEY_ID=rzp_live_xxxxx
```

---

## 9. QUICK REFERENCE

### Frontend Buy Flow
- **File**: `apps/web-app/src/pages/HomeLanding.tsx`
- **Entry**: `handleBuy()` function (~line 340)
- **Calculations**: goldOperationalRatePerGram + GOLD_COMMISSION_PER_GRAM
- **Razorpay Call**: `buyGold({ grams, ratePerGram, ... })` from `razorpay.ts`

### Backend Buy Flow
- **File**: `apps/backend/src/modules/payments/payments.controller.ts`
- **Endpoints**: `POST /create-buy-order`, `POST /verify-buy-payment`
- **Lock Duration**: 120 seconds (LOCK_WINDOW_SECONDS constant)
- **Refund Logic**: Auto-refund if verified after expiry

### Frontend Sell Flow
- **File**: `apps/web-app/src/pages/HomeLanding.tsx`
- **Entry**: `handleSell()` function (~line 420)
- **Calculations**: REDEEM_FACTOR (0.97) × marketRate - REDEEM_DEDUCTION (50)
- **Status**: Currently writes PENDING only, no lock/payment

### Key Constants
```
LOCK_WINDOW_SECONDS = 120
REDEEM_GST_FACTOR = 0.97
REDEEM_DEDUCTION_PER_GRAM = 50
GOLD_COMMISSION_PER_GRAM = 20
SILVER_COMMISSION_PER_GRAM = 2
```

---

## 10. DEPLOYMENT NOTES

**For Production:**
1. Backend must have `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` configured
2. Firestore rules must allow reads/writes to `paymentPriceLocks` collection
3. Set up Razorpay webhook endpoint (for future payout handling)
4. Enable bank transfer in Razorpay account settings

**For Testing:**
1. Use Razorpay Sandbox: `https://api.razorpay.com/v1/`
2. Test webhook locally with `ngrok` or Postman
3. Verify lock expiry behavior in staging before production

---

**Last Updated**: March 19, 2025
**Status**: Buy flow ✅ Complete | Sell flow ⏳ Pending Implementation
