<p align="center">
  <img src="logo.png" alt="Bizmation Gold" width="120" />
</p>

<h1 align="center">Bizmation Gold</h1>

<p align="center">
  <strong>Full-stack jewellery platform — live gold/silver rates, buy/sell, AutoPay SIP, KYC, customer portfolios, shop management, AI-powered catalog, and a super-admin console.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" />
  <img src="https://img.shields.io/badge/Node.js-18+-339933?logo=node.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript" />
  <img src="https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-FFCA28?logo=firebase" />
  <img src="https://img.shields.io/badge/Razorpay-Payments-0A2540?logo=razorpay" />
  <img src="https://img.shields.io/badge/Python-AI%20Services-3776AB?logo=python" />
</p>

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Folder Structure — What Each Folder Does](#folder-structure--what-each-folder-does)
4. [End-to-End Flows](#end-to-end-flows)
5. [Gold Rate Calculation Engine](#gold-rate-calculation-engine)
6. [Payment Processing (Price-Lock Mechanism)](#payment-processing-price-lock-mechanism)
7. [AI Services — Image Processing Pipeline](#ai-services--image-processing-pipeline)
8. [Authentication & Authorization](#authentication--authorization)
9. [Firestore Security Rules](#firestore-security-rules)
10. [Firebase Collections Schema](#firebase-collections-schema)
11. [API Endpoints](#api-endpoints)
12. [Unique ID System](#unique-id-system)
13. [Tech Stack](#tech-stack)
14. [Environment Variables](#environment-variables)
15. [Running Locally](#running-locally)
16. [Deployment](#deployment)
17. [Docker](#docker)

---

## Overview

**Bizmation Gold** is a multi-tenant jewellery business platform built for Indian jewellers. It connects **shop owners** with their **customers** through a shared platform where:

- **Customers** can buy/sell gold & silver at live international market prices, set up monthly AutoPay SIP plans, track their portfolio with P&L, manage KYC, and redeem accumulated gold.
- **Shop Owners** get a full business suite — dashboard, inventory management, billing, repair tracking, gold savings schemes, customer management, analytics, and AI-powered catalog management.
- **Super Admins** have a bird's-eye view of all shops, customers, KYC statuses, and platform-wide statistics.

Every shop is **fully isolated** — customers registered under one shop cannot see or interact with any other shop's data.

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
│  ┌────────────────────┐   ┌──────────────────┐   ┌────────────────┐ │
│  │  React Web App     │   │  Mobile App      │   │  Super Admin   │ │
│  │  (Cloudflare Pages)│   │  (React Native)  │   │  Console       │ │
│  │  Hash-based routing│   │                  │   │  /#/super-admin│ │
│  └────────┬───────────┘   └────────┬─────────┘   └───────┬────────┘ │
└───────────┼────────────────────────┼─────────────────────┼──────────┘
            │ REST API               │                     │
            ▼                        ▼                     ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         API LAYER                                    │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Express Backend (Docker)                             │ │
│  │  ┌──────────┬──────────┬───────────┬──────────┬──────────────┐ │ │
│  │  │ /auth    │ /gold-   │ /inventory│ /catalog │ /payments    │ │ │
│  │  │ (Twilio) │  rates   │           │          │ (Razorpay)   │ │ │
│  │  └──────────┴────┬─────┴───────────┴──────────┴──────────────┘ │ │
│  │                  │  ⏰ Cron: every 5 min → autoUpdateRates()   │ │
│  └──────────────────┼─────────────────────────────────────────────┘ │
└─────────────────────┼───────────────────────────────────────────────┘
                      │
     ┌────────────────┼────────────────────┐
     ▼                ▼                    ▼
┌─────────┐   ┌──────────────┐   ┌──────────────────┐
│PostgreSQL│   │  Firebase    │   │ Cloudflare Workers│
│(Cloudflare) │   │  Auth +      │   │ ┌──────────────┐ │
│          │   │  Firestore   │   │ │ gold-rates-  │ │
│ gold_rates│  │              │   │ │ worker       │ │
│ products │   │ users        │   │ │ (KV cached)  │ │
│ metal_lots│  │ shops        │   │ └──────────────┘ │
│          │   │ goldOnline   │   │ ┌──────────────┐ │
│          │   │  Orders      │   │ │ twilio-worker│ │
│          │   │ redemption   │   │ └──────────────┘ │
│          │   │  Requests    │   └──────────────────┘
└─────────┘   │ autoPaySubs  │
              └──────────────┘
                      │
     ┌────────────────┼────────────────┐
     ▼                ▼                ▼
┌──────────┐  ┌────────────┐  ┌────────────────┐
│ Swissquote│  │ Razorpay   │  │ AI Services    │
│ (XAU/XAG │  │ Checkout + │  │ (FastAPI/Python)│
│  spot)    │  │ Subscription│ │ YOLO + ResNet  │
│           │  │            │  │ + rembg        │
│ Currency  │  │            │  │                │
│  APIs     │  │            │  │                │
└──────────┘  └────────────┘  └────────────────┘
```

### Data Flow Summary

| Data | Source | How It Arrives |
|------|--------|----------------|
| XAU/USD, XAG/USD spot prices | Swissquote public feed | Backend `GoldRateService` fetches every 5 min via cron |
| USD → INR exchange rate | exchangerate.fun (primary), fawazahmed0 CDN (fallback) | Fetched alongside spot prices |
| Gold/Silver per-gram INR | Calculated: `(spotUSD × USD/INR ÷ 31.1035) × 1.09` | Backend computes, stores in PostgreSQL |
| Frontend live rates | Cloudflare Worker `/gold-rates` | Worker fetches from Swissquote + currency API, caches in KV |
| Charts | TradingView mini-widget embed | Embedded directly in frontend |
| Payments | Razorpay checkout + subscription API | Backend creates order, frontend opens Razorpay modal |

---

## Folder Structure — What Each Folder Does

```
bizmation/
├── apps/                          # All runnable applications
│   ├── backend/                   # 🟢 Express.js API Server
│   │   └── src/
│   │       ├── server.ts          # Entry point — registers middleware, routes, cron
│   │       ├── modules/           # Feature-based API modules
│   │       │   ├── auth/          # 🔐 Phone OTP via Twilio Verify (send-otp, verify-otp)
│   │       │   ├── catalog/       # 📦 Product catalog CRUD
│   │       │   ├── gold-rate/     # 📊 Gold rate endpoints (current, history, reconcile)
│   │       │   ├── inventory/     # 📋 Metal lots, products, stock, valuation
│   │       │   ├── parties/       # 👥 Customer/supplier management
│   │       │   └── payments/      # 💳 Razorpay price-lock + payment verification
│   │       ├── services/
│   │       │   ├── database/      # 🗄️ PostgreSQL connection pool (pg)
│   │       │   └── gold-rate/     # 🏆 GoldRateService — rate fetching, calculation, caching
│   │       └── lib/
│   │           └── firebaseAdmin.ts  # Firebase Admin SDK for server-side Firestore
│   │
│   ├── web-app/                   # 🌐 React Frontend (Cloudflare Pages)
│   │   └── src/
│   │       ├── main.tsx           # App entry — hash routing, role-based page rendering
│   │       ├── index.css          # Global styles (Tailwind CSS)
│   │       ├── context/
│   │       │   ├── AuthContext.tsx # 🔑 Firebase auth + Twilio OTP + user profile management
│   │       │   └── ThemeContext.tsx# 🎨 Dark/light mode toggle
│   │       ├── components/
│   │       │   ├── Layout.tsx     # 📐 Shell navigation (sidebar + header)
│   │       │   └── NewSchemeModal.tsx # Gold savings scheme creation modal
│   │       ├── pages/             # 📄 30+ page components (see full list below)
│   │       ├── lib/
│   │       │   ├── firebase.ts    # Firebase SDK initialization
│   │       │   ├── goldPrices.ts  # 📈 Rate fetching from Cloudflare Worker
│   │       │   ├── razorpay.ts    # 💰 Buy gold + AutoPay SIP integration
│   │       │   ├── firestoreInit.ts # 🌱 Seed data for all collections
│   │       │   └── customerOrders.ts # Order query helpers
│   │       ├── utils/
│   │       │   ├── bizId.ts       # 🆔 Human-readable ID generators (BIZ-SHOP-xxx etc.)
│   │       │   └── format.ts      # 💱 Currency, date, weight formatters (en-IN locale)
│   │       ├── modules/
│   │       │   ├── billing/       # Invoice creation sub-module
│   │       │   └── catalog/       # Catalog management sub-module
│   │       └── types/             # Frontend-specific TypeScript interfaces
│   │
│   └── mobile-app/                # 📱 React Native Mobile App (planned/in-progress)
│       └── src/
│
├── packages/                      # 📦 Shared NPM Workspace Packages
│   ├── shared-types/              # TypeScript interfaces shared between frontend & backend
│   │   └── src/                   #   (GoldRate, MetalType, Product, etc.)
│   └── sync-engine/               # 🔄 Offline-first sync utilities (planned)
│       └── src/
│
├── ai-services/                   # 🤖 Python AI Microservice
│   └── image-processing/
│       ├── main.py                # FastAPI app — 6 endpoints for image AI
│       ├── jewelry_recognition.py # YOLO + OpenCV jewelry type/metal detection
│       ├── Dockerfile             # Container build for AI service
│       └── requirements.txt       # Python dependencies (torch, ultralytics, rembg, etc.)
│
├── infra/                         # ☁️ Cloudflare Infrastructure
│   └── cloudflare/
│       ├── gold-rates-worker/     # ⚡ Cloudflare Worker for live gold rates (KV cached)
│       └── twilio-worker/         # 📞 Cloudflare Worker for Twilio OTP proxy
│
├── infrastructure/                # 🏗️ DevOps & Security Configs
│   ├── docker/                    # 🐳 Per-service Dockerfiles
│   │   ├── backend.Dockerfile
│   │   ├── web-app.Dockerfile
│   │   ├── ai-services.Dockerfile
│   │   └── nginx.conf             # Nginx reverse proxy config
│   └── firestore/
│       └── firestore.rules        # 🛡️ Firestore security rules (shop-isolated RBAC)
│
├── docs/                          # 📚 Documentation
│   ├── API.md                     # Full API endpoint documentation
│   ├── DEPLOYMENT.md              # Deployment guide
│   ├── QUICK_START_GUIDE.md       # Getting started guide
│   ├── RATES_SETUP.md             # Gold rates configuration
│   └── CLOUDFLARE_GOLD_WORKER.md  # Cloudflare Worker setup
│
├── Dockerfile                     # 🐳 Root multi-stage Docker build
├── docker-compose.yml             # Local dev: PostgreSQL + backend
├── package.json                   # NPM workspace root
├── tsconfig.json                  # Root TypeScript config
├── FEATURES.md                    # Feature comparison & roadmap
├── ARCHITECTURE.md                # Detailed architecture document
└── FUTURE_PROSPECTS.md            # Target audience, improvements, future features
```

### All Frontend Pages

| Page | File | Role | What It Does |
|------|------|------|-------------|
| **Home / Buy-Sell** | `HomeLanding.tsx` | All | Live rates, buy/sell gold bottom-sheet with slide-to-confirm |
| **Auth** | `AuthPage.tsx` | Public | 3-step signup + 3-mode login (password, magic link, OTP) |
| **Portfolio** | `CustomerPortfolio.tsx` | Customer | Holdings cards, avg buy price, current value, P&L % |
| **Orders** | `Orders.tsx` | Customer | Transaction log, BUY/SELL filter, invoice PDF download |
| **Profile** | `Profile.tsx` | All | User profile editing, KYC document upload |
| **Nominee** | `Nominee.tsx` | Customer | Nominee management for gold holdings |
| **Redemption** | `RedemptionPage.tsx` | Customer | Redeem accumulated gold, track request status |
| **Referral** | `Referral.tsx` | Customer | Referral link, commission tracking |
| **Dashboard** | `Dashboard.tsx` | Owner/Staff | Overview stats — revenue, orders, customers |
| **Parties** | `Parties.tsx` | Owner/Staff | Customer/supplier contact management |
| **Billing** | `BillingEnhanced.tsx` | Owner/Staff | Create GST-compliant invoices |
| **Inventory** | `Inventory.tsx` | Owner/Staff | Stock tracking, metal lots |
| **Catalog** | `Catalog.tsx` | Owner/Staff | Product listing with AI auto-fill |
| **Gold Rates** | `GoldRates.tsx` | Owner/Staff | Live rate display with TradingView charts |
| **Repairs** | `Repairs.tsx` | Owner/Staff | Repair job tracking (Received → In Progress → Ready → Delivered) |
| **Schemes** | `Schemes.tsx` | Owner/Staff | Gold savings scheme management |
| **Suppliers** | `Suppliers.tsx` | Owner/Staff | Vendor contact database |
| **Purchase Orders** | `PurchaseOrders.tsx` | Owner/Staff | Purchase order creation and tracking |
| **Stock on Hand** | `StockOnHand.tsx` | Owner/Staff | Current stock availability with filters |
| **Stock Movement** | `StockMovement.tsx` | Owner/Staff | Track transfers between locations |
| **Shop Customers** | `ShopCustomers.tsx` | Owner/Staff | View customers registered under the shop |
| **Analytics** | `Analytics.tsx` | Owner/Staff | Sales and revenue charts |
| **Redemption Requests** | `RedemptionRequests.tsx` | Owner/Staff | View/approve customer gold redemptions |
| **AI Insights** | `AIInsights.tsx` | Owner/Staff | AI-generated business insights |
| **Old Gold Exchange** | `OldGoldExchange.tsx` | Owner/Staff | Old gold exchange calculator |
| **Hallmarking** | `HallmarkingTracker.tsx` | Owner/Staff | BIS hallmark certificate tracking |
| **Custom Orders** | `CustomOrderTracking.tsx` | Owner/Staff | Custom order design-to-delivery tracking |
| **Warranty** | `WarrantyManagement.tsx` | Owner/Staff | Digital warranty card management |
| **Super Admin** | `SuperAdmin.tsx` | Super Admin | Platform-wide shops, customers, stats |

---

## End-to-End Flows

### 1. Customer Buys Gold — Complete Flow

```
Customer opens app → HomeLanding.tsx
         │
         ▼
fetchLiveMetalRates() → Cloudflare Worker /gold-rates
         │                    │
         │        Worker fetches from Swissquote (XAU/USD)
         │        + Currency API (USD/INR)
         │        Computes purity rates (999, 995, 916, 750)
         │        Caches in Cloudflare KV for 60s
         │                    │
         ▼                    ▼
Live rates displayed (auto-refresh every 5s)
Gold: ₹X,XXX/g │ Silver: ₹XXX/g
         │
Customer selects grams (0.5 / 1 / 2 / 5 or custom)
         │
Slide-to-confirm gesture
         │
         ▼
Frontend calls razorpay.ts → buyGold()
         │
POST /api/payments/create-buy-order
  Body: { grams, ratePerGram, customerName, customerEmail, ... }
         │
         ▼ (Backend: payments.controller.ts)
  1. Validate inputs
  2. Calculate: amountPaise = Math.round(grams × ratePerGram × 100)
  3. Create price lock in Firestore (paymentPriceLocks collection)
     ├── Status: LOCKED
     ├── Lock window: 120 seconds (2 minutes)
     └── Stores: grams, ratePerGram, amountPaise, expiresAt
  4. Create Razorpay Order via API (amount, currency, receipt)
  5. Return { lockId, razorpayOrderId, amountPaise } to frontend
         │
         ▼
Razorpay checkout modal opens (in browser)
Customer completes payment (UPI / card / netbanking)
         │
         ▼
Razorpay SDK invokes handler callback with:
  { razorpay_order_id, razorpay_payment_id, razorpay_signature }
         │
POST /api/payments/verify-buy-payment
         │
         ▼ (Backend verifies)
  1. HMAC-SHA256 signature verification:
     expected = HMAC(keySecret, orderId + "|" + paymentId)
     Compare with razorpay_signature
  2. Check if price lock has expired (> 2 min):
     ├── If EXPIRED → auto-refund via Razorpay API → status: REFUNDED_AFTER_EXPIRY
     └── If VALID   → status: PAID_IN_TIME → return success
         │
         ▼
Frontend writes order to Firestore: goldOnlineOrders/{orderId}
  { userId, type: "BUY", metal: "GOLD", grams, ratePerGram, totalAmountInr, status: "SUCCESS" }
         │
Portfolio updated → accumulated grams increased
```

### 2. Shop Owner Onboarding Flow

```
Owner visits app → AuthPage.tsx
         │
Step 1: Select role → SHOP_OWNER
Step 2: Enter name, email, phone, shop name, city
         │ Phone uniqueness check against Firestore
Step 3: Set password, agree to terms
         │
         ▼
Firebase Auth creates user account
         │
         ▼
Firestore documents created:
  users/{uid}  → { role: "OWNER", shopName, bizShopId: "BIZ-SHOP-XXXXXXXX" }
  shops/{uid}  → { name, ownerUid, bizShopId, city }
         │
         ▼
Owner redirected to → /#/dashboard
Full shop management suite available
```

### 3. Customer Registration (Linked to Shop)

```
Customer visits app → AuthPage.tsx
         │
Step 1: Select CUSTOMER
Step 2: Enter details + SHOP NAME
         │
         ▼ (Firestore query)
Validate shop exists: shops collection where name == shopName
         │
├── Shop NOT found → Error: "Shop not found. Ask your shop owner for the exact name."
└── Shop FOUND → Continue
         │
Step 3: Set password
         │
         ▼
users/{uid} → { role: "CUSTOMER", shopId, shopName, bizCustomerId: "BIZ-CUST-XXXXXXXX" }
shops/{shopId}/customers/{uid} → linked customer record
         │
Customer redirected to → /#/home (buy/sell interface)
```

### 4. AI Catalog Upload Flow

```
Shop owner opens Catalog page
         │
Uploads jewelry photo
         │
         ▼ (ai-services/image-processing/main.py)
POST /catalog/upload-with-recognition
         │
Step 1: Jewelry Recognition (jewelry_recognition.py)
  ├── YOLO v8 object detection → bounding boxes
  ├── Shape analysis (contours, aspect ratio, circularity):
  │   ├── Circular + aspect ~1.0 → Ring
  │   ├── Vertical elongated   → Earring
  │   ├── Horizontal elongated → Necklace/Bracelet
  │   └── Default              → Jewelry
  └── Metal detection via HSV color analysis:
      ├── Yellow hue (H:15-35) → Gold
      ├── Red/pink hue (H:0-15) → Rose Gold
      └── High brightness (V>150, S<50) → Silver

Step 2: Background Removal (rembg / U²-Net)
  └── Transparent PNG output

Step 3: Auto-tag Generation (ResNet-50)
  ├── Color analysis → metal type tag
  ├── Aspect ratio → shape tag
  └── Generic tags: "handcrafted", "elegant", "premium"

Step 4: Auto-fill Suggestions Returned:
  { name, description, hsn_code, category, metal_type, tags }
         │
         ▼
Owner reviews auto-filled form → adjusts if needed → saves to catalog
```

---

## Gold Rate Calculation Engine

The backend `GoldRateService` computes live gold/silver prices through a multi-step pipeline:

### Step 1: Fetch Spot Price
```
Source: Swissquote public feed
URL:    forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/{XAU|XAG}/USD

Returns bid/ask → mid-price = (bid + ask) / 2
Example: XAU/USD mid = $3,050.25
```

### Step 2: Fetch Currency Rate
```
Primary:  exchangerate.fun/latest?base=USD → rates.INR
Fallback: fawazahmed0 CDN → usd.json → usd.inr
Example: USD/INR = 84.35
```

### Step 3: Calculate Per-Gram INR Price
```
Formula:
  pricePerGramINR = (spotUSD × usdToInr ÷ TROY_OZ_GRAMS) × IMPORT_DUTY

Where:
  TROY_OZ_GRAMS = 31.1035
  IMPORT_DUTY   = 1.09 (9% Indian import duty)

Example:
  = ($3,050.25 × ₹84.35 ÷ 31.1035) × 1.09
  = (₹257,288.59 ÷ 31.1035) × 1.09
  = ₹8,271.34 × 1.09
  = ₹9,015.76 per gram (24K)
```

### Step 4: Purity-Based Pricing
```
Formula: purityRate = pricePerGram24K × (purity ÷ 24)

24K (999): ₹9,015.76 / gram → ₹90,157.60 / 10g
22K (916): ₹8,264.45 / gram → ₹82,644.47 / 10g
21K:       ₹7,888.79 / gram
20K:       ₹7,513.13 / gram
18K (750): ₹6,761.82 / gram → ₹67,618.20 / 10g
16K:       ₹6,010.51 / gram
14K:       ₹5,259.19 / gram

Silver 999: same formula but using XAG/USD spot
```

### Cron Job
- Backend runs `autoUpdateRates()` every 5 minutes via `node-cron`
- Updates all combinations: `[GOLD, SILVER, PLATINUM] × [24K, 22K, 18K]`
- New rate only persisted if discrepancy > 0.5% from current DB value (reconciliation)

### Frontend Rate Fetching
- Cloudflare Worker at `/gold-rates` serves KV-cached rates (60s TTL)
- Frontend `fetchLiveMetalRates()` calls worker → fallback to `/gold-rates/live` for fresh computation
- Display rates: Gold per 10g, Silver per 1kg

---

## Payment Processing (Price-Lock Mechanism)

Bizmation uses a **2-minute price-lock** to protect customers from rate fluctuations during payment:

```
┌─────────────────────────────────────────────────────────┐
│  PRICE LOCK LIFECYCLE (120 seconds)                      │
│                                                          │
│  T+0s    → LOCKED (rate frozen in Firestore)            │
│  T+0-120s → Customer pays via Razorpay                  │
│  T+≤120s  → Payment verified → PAID_IN_TIME ✅          │
│  T+>120s  → Lock expired → auto REFUND ⚠️               │
│            → Status: REFUNDED_AFTER_EXPIRY              │
└─────────────────────────────────────────────────────────┘
```

### Calculations
```
Amount in Paise = Math.round(grams × ratePerGram × 100)
  Example: 2g × ₹9,015.76/g = ₹18,031.52 → 1,803,152 paise
```

### Signature Verification
```
HMAC-SHA256(razorpay_key_secret, razorpay_order_id + "|" + razorpay_payment_id)
Must match razorpay_signature — prevents payment tampering
```

---

## AI Services — Image Processing Pipeline

The Python-based AI microservice (`ai-services/image-processing/`) provides 6 REST endpoints:

| Endpoint | Method | What It Does |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/process-image` | POST | Combined: background removal + auto-tag + description |
| `/remove-background` | POST | Background removal using U²-Net (rembg) → transparent PNG |
| `/auto-tag` | POST | Auto-generate tags via ResNet-50 + color/shape analysis |
| `/analyze-quality` | POST | Image quality metrics (sharpness, brightness, contrast) |
| `/recognize-jewelry` | POST | YOLO v8 object detection + jewelry type classification |
| `/catalog/upload-with-recognition` | POST | Full pipeline: recognize → remove bg → auto-fill catalog fields |

### Quality Score Calculation
```python
sharpness = Laplacian variance of grayscale image
brightness = mean pixel value of grayscale image
contrast = standard deviation of grayscale image

quality_score = min(100, (sharpness/100 + brightness/2.55 + contrast/2.55) / 3)
```

### HSN Code Mapping (Auto-detected)
| Jewelry Type | HSN Code |
|-------------|----------|
| Ring | 71131910 |
| Necklace | 71131920 |
| Earring | 71131930 |
| Bracelet | 71131940 |
| Anklet | 71131950 |

---

## Authentication & Authorization

### Login Modes
1. **Password** — email + password via Firebase Auth
2. **Magic Link** — passwordless email link (`sendSignInLinkToEmail`)
3. **Phone OTP** — Twilio Verify SMS → 6-digit code → Firebase sign-in

### OTP Flow
```
User → POST /api/auth/send-otp { phone: "+91..." }
  → Backend → Twilio Verify service.verifications.create()
  → SMS delivered to phone

User → POST /api/auth/verify-otp { phone, code: "123456" }
  → Backend → Twilio verificationChecks.create()
  → { valid: true } → Frontend creates Firebase session
```

### Role-Based Access Control
| Role | Default Route | Access Level |
|------|--------------|-------------|
| `CUSTOMER` | `/#/home` | Buy/sell, portfolio, orders, redemption, referral |
| `OWNER` | `/#/dashboard` | Full shop management suite |
| `STAFF` | `/#/dashboard` | Same as owner (scoped to their shop) |
| `SUPER_ADMIN` | `/#/super-admin` | Platform-wide admin console |

### Shop Isolation
- All customer queries include `shopId` or `shopName` filter
- Shop owners only see their own shop's data
- Firestore rules enforce: customer can only read their own data + their shop owner's data
- Only `SUPER_ADMIN` can query across all shops

---

## Firestore Security Rules

The rules file at `infrastructure/firestore/firestore.rules` implements:

| Collection | Read | Write | Special Rules |
|-----------|------|-------|--------------|
| `users/{uid}` | Own doc + shop owner + super admin | Self + super admin | No delete allowed |
| `shops/{shopId}` | **Public** (needed for signup validation) | Owner of shop | No delete |
| `shops/{shopId}/customers/{id}` | Customer + shop owner + super admin | Self + shop owner + super admin | — |
| `goldOnlineOrders/{id}` | Own orders + shop owner (if same shop) + super admin | Own orders + super admin | — |
| `autoPaySubscriptions/{id}` | Same as orders | Self + super admin | — |
| `redemptionRequests/{id}` | Customer + shop owner + super admin | Same | — |
| `razorpayOrders/{id}` | Own + super admin | Self | — |
| `phoneIndex/{phone}` | **Public** (phone → email lookup) | Self only | Validated fields |
| Everything else | ❌ Denied | ❌ Denied | Catch-all deny |

---

## Firebase Collections Schema

### `users/{uid}`
```json
{
  "uid": "firebase-uid",
  "name": "Customer Name",
  "email": "customer@example.com",
  "phone": "+919876543210",
  "role": "CUSTOMER | OWNER | STAFF | SUPER_ADMIN",
  "shopName": "Jewels Palace",
  "shopId": "firestore-shop-doc-id",
  "bizCustomerId": "BIZ-CUST-A3F7B2C1",
  "bizShopId": "BIZ-SHOP-9D4E2A87",
  "kycStatus": "PENDING | VERIFIED | REJECTED",
  "totalGoldPurchasedGrams": 0,
  "totalSilverPurchasedGrams": 0,
  "totalInvestedInr": 0,
  "createdAt": "serverTimestamp"
}
```

### `goldOnlineOrders/{orderId}`
```json
{
  "orderId": "BIZ-ORD-...",
  "userId": "firebase-uid",
  "type": "BUY | SELL",
  "metal": "GOLD | SILVER",
  "grams": 2.5,
  "ratePerGram": 9015.76,
  "totalAmountInr": 22539.40,
  "razorpayPaymentId": "pay_...",
  "razorpayOrderId": "order_...",
  "status": "SUCCESS | PENDING | FAILED | REFUNDED",
  "deliveryType": "VAULT | DELIVERY",
  "createdAt": "serverTimestamp"
}
```

### `autoPaySubscriptions/{id}`
```json
{
  "userId": "firebase-uid",
  "metal": "GOLD",
  "amountInr": 5000,
  "frequencyDays": 30,
  "nextDebitDate": "ISO date",
  "razorpaySubscriptionId": "sub_...",
  "status": "ACTIVE | PAUSED | CANCELLED"
}
```

---

## API Endpoints

**Backend Base URL**: `https://your-backend.example.com/api`

| Method | Path | Module | Description |
|--------|------|--------|-------------|
| `GET` | `/health` | Core | Health check with DB status |
| `POST` | `/auth/send-otp` | Auth | Send Twilio phone OTP |
| `POST` | `/auth/verify-otp` | Auth | Verify phone OTP code |
| `GET` | `/gold-rates/current` | Gold Rate | Current rate for metal/purity |
| `GET` | `/gold-rates/history` | Gold Rate | Rate history (last N days) |
| `POST` | `/gold-rates/reconcile` | Gold Rate | Reconcile DB vs upstream rates |
| `GET/POST` | `/inventory/metal-lots` | Inventory | Metal lot management |
| `GET/POST/PUT/DELETE` | `/inventory/products` | Inventory | Product CRUD |
| `POST` | `/inventory/update-prices` | Inventory | Bulk update product prices |
| `POST` | `/inventory/products/calculate-valuation` | Inventory | Calculate product value |
| `GET` | `/inventory/reports/stock-valuation` | Inventory | Stock valuation report |
| `GET/POST` | `/catalog` | Catalog | Product catalog |
| `GET/POST` | `/parties` | Parties | Customer/supplier management |
| `POST` | `/payments/create-buy-order` | Payments | Create price-locked Razorpay order |
| `POST` | `/payments/verify-buy-payment` | Payments | Verify payment + handle expiry/refund |

**AI Services Base URL**: `http://localhost:8000`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/process-image` | Combined AI pipeline |
| `POST` | `/remove-background` | Background removal → transparent PNG |
| `POST` | `/auto-tag` | Auto-tag jewelry image |
| `POST` | `/analyze-quality` | Image quality metrics |
| `POST` | `/recognize-jewelry` | Jewelry type + metal detection |
| `POST` | `/catalog/upload-with-recognition` | Full catalog auto-fill pipeline |

---

## Unique ID System

Generated by `apps/web-app/src/utils/bizId.ts` using base-36 encoding with `crypto.getRandomValues`:

| Entity | Format | Example | Generation |
|--------|--------|---------|-----------|
| Shop | `BIZ-SHOP-XXXXXXXX` | `BIZ-SHOP-9D4E2A87` | 8 random base-36 chars |
| Customer | `BIZ-CUST-XXXXXXXX` | `BIZ-CUST-A3F7B2C1` | 8 random base-36 chars |
| Order | `BIZ-ORD-XXXXXXXXXXXXXXXXX` | timestamped | 9-char timestamp + 6 random (sortable) |
| Product | `BIZ-PROD-XXXXXXXX` | — | 8 random base-36 chars |
| Session | `BIZ-SES-XXXXXXXXXXXXX` | — | 9-char timestamp + 4 random |
| Owner Code | `FIRSTXXXXXX` | `RAVI7K2Q` | First 4 letters of name + 4 random |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS | Web application UI |
| **Routing** | Hash-based (`window.location.hash`) | SPA routing on Cloudflare Pages |
| **Backend** | Node.js 18+, Express, TypeScript | REST API server |
| **Relational DB** | PostgreSQL via `pg` Pool | Gold rates, products, inventory |
| **Document DB** | Firebase Firestore | User profiles, orders, shops, subscriptions |
| **Auth** | Firebase Auth + Twilio Verify | Email/password, Google, magic link, phone OTP |
| **Payments** | Razorpay (one-time + subscription) | Gold purchase + AutoPay SIP |
| **AI/ML** | Python, FastAPI, PyTorch, YOLOv8, rembg | Jewelry recognition, background removal |
| **Edge Workers** | Cloudflare Workers + KV | Rate caching, Twilio proxy |
| **Frontend CDN** | Cloudflare Pages | Static site hosting |
| **Backend Hosting** | Cloudflare Workers / Docker | Container hosting |
| **Containerization** | Docker (multi-stage) | Dev + production builds |

---

## Environment Variables

### Backend (`apps/backend/.env`)
```env
# PostgreSQL
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<dbname>
DB_POOL_MAX=10

# JWT
JWT_SECRET=your_jwt_secret_here

# Twilio Verify (Phone OTP)
TWILIO_ACCOUNT_SID=AC<your-account-sid>
TWILIO_API_KEY_SID=SK<your-api-key-sid>
TWILIO_API_KEY_SECRET=<your-api-key-secret>
TWILIO_VERIFY_SERVICE_SID=VA<your-verify-service-sid>

# Razorpay
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=<your-key-secret>

# Gold Rate
GOLD_RATE_TTL_SECONDS=60

# Server
PORT=3001
NODE_ENV=production
```

### Frontend (`apps/web-app/.env`)
```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_RAZORPAY_KEY_ID=rzp_live_...
VITE_API_URL=https://api.yourdomain.com
VITE_GOLD_WORKER_URL=https://gold-rates-worker.xxx.workers.dev
```

> **Security:** Never commit `.env` files. Set all secrets via Cloudflare dashboards.

---

## Running Locally

### Prerequisites
- Node.js 18+ and npm 9+
- PostgreSQL (or use Docker)
- Python 3.9+ (for AI services)

### Install all packages
```bash
npm install
```

### Backend
```bash
cp apps/backend/.env.example apps/backend/.env
# Edit .env with your DATABASE_URL, Twilio, and Razorpay credentials
npm run dev:backend
# → http://localhost:3001
```

### Frontend
```bash
cp apps/web-app/.env.example apps/web-app/.env
# Edit .env with Firebase config + VITE_API_URL=http://localhost:3001
npm run dev:web
# → http://localhost:5173
```

### AI Services
```bash
cd ai-services/image-processing
pip install -r requirements.txt
python main.py
# → http://localhost:8000
```

### Run both (frontend + backend)
```bash
npm run dev
# Uses concurrently to run both
```

---

## Deployment

### Deployment

#### Cloudflare Pages (Frontend)
```bash
# Frontend build
cd apps/web-app
npm run build
# Deploy via Cloudflare Pages dashboard or CLI
```

#### Cloudflare Workers (Backend)
```bash
# Deploy backend as Workers (if using Workers) or Docker container on your preferred host
# Example using Wrangler for Workers:
wrangler deploy --env production
```

The root **Dockerfile** has 4 stages:
1. `deps` — install all workspace packages
2. `build-shared` — compile `packages/shared-types`
3. `builder` — compile `apps/backend` (TypeScript → CommonJS)
4. `production` — minimal Node image, runs `node dist/server.js`

### Cloudflare Pages (Frontend)
| Setting | Value |
|---------|-------|
| Framework | Vite |
| Build command | `cd apps/web-app && npm run build` |
| Output directory | `apps/web-app/dist` |
| Root | Project root |

Set all `VITE_*` environment variables in Pages → Settings → Environment Variables.

---

## Docker

### Local development (backend + PostgreSQL)
```bash
docker compose up -d
```

### Production build
```bash
docker build -t bizmation-backend .
docker run -p 3001:3001 --env-file apps/backend/.env bizmation-backend
```

---

*Built for Indian jewellery businesses. Contact: contact@bizmation.in*
