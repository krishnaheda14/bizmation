# Bizmation Gold — Architecture Deep-Dive

> This document provides a detailed technical breakdown of how every component in Bizmation Gold works, how data flows between services, and the exact calculations powering pricing, payments, and AI features.

---

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Monorepo Workspace Structure](#monorepo-workspace-structure)
3. [Backend Deep-Dive](#backend-deep-dive)
4. [Frontend Deep-Dive](#frontend-deep-dive)
5. [Gold & Silver Rate Pipeline](#gold--silver-rate-pipeline)
6. [Payment Architecture](#payment-architecture)
7. [AI Services Architecture](#ai-services-architecture)
8. [Data Layer — Dual Database Strategy](#data-layer--dual-database-strategy)
9. [Authentication Architecture](#authentication-architecture)
10. [Cloudflare Workers](#cloudflare-workers)
11. [Security Architecture](#security-architecture)
12. [Cron Jobs & Background Tasks](#cron-jobs--background-tasks)
13. [Deployment Pipeline](#deployment-pipeline)

---

## High-Level Architecture

Bizmation Gold uses a **distributed microservices architecture** with 5 independently deployable services:

```
┌──────────────────────────────────────────────────────────────┐
│              EDGE LAYER (Cloudflare)                          │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ Pages (React SPA)│  │ Workers (Edge fn)│                   │
│  │ CDN-distributed  │  │ KV-cached rates  │                   │
│  └────────┬────────┘  └────────┬────────┘                   │
└───────────┼─────────────────────┼────────────────────────────┘
            │                     │
            ▼                     ▼
┌──────────────────────────────────────────────────────────────┐
│              APPLICATION LAYER (Cloudflare Workers)                      │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  Express Backend (TypeScript)                            ││
│  │  ├── Auth Module (Twilio Verify)                         ││
│  │  ├── Gold Rate Module (Swissquote + Currency APIs)       ││
│  │  ├── Inventory Module (Metal lots, Products, Valuation)  ││
│  │  ├── Catalog Module (Product CRUD)                       ││
│  │  ├── Parties Module (Customer/Supplier management)       ││
│  │  └── Payments Module (Razorpay Price-Lock)               ││
│  └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
            │                     │
            ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ PostgreSQL (SQL)  │  │ Firebase          │  │ AI Services      │
│ Cloudflare Workers    │  │ Auth + Firestore  │  │ FastAPI (Python)  │
│                   │  │ (NoSQL)           │  │ Render/Docker     │
│ - gold_rates      │  │ - users           │  │ - YOLO v8         │
│ - products        │  │ - shops           │  │ - ResNet-50       │
│ - metal_lots      │  │ - orders          │  │ - U²-Net (rembg)  │
│                   │  │ - subscriptions   │  │                   │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

### Service Communication

| From → To | Protocol | Purpose |
|-----------|----------|---------|
| Frontend → Backend | REST (HTTPS) | API calls for auth, payments, rates, inventory |
| Frontend → Cloudflare Worker | REST (HTTPS) | Live gold rate fetching (KV cached) |
| Frontend → Firebase | SDK (WebSocket) | Real-time auth, Firestore reads/writes |
| Backend → PostgreSQL | TCP (pg Pool) | SQL queries for relational data |
| Backend → Firebase | Admin SDK | Server-side Firestore operations |
| Backend → Swissquote | HTTPS | Spot price feeds |
| Backend → Razorpay | HTTPS (API) | Order creation, signature verification, refunds |
| Backend → Twilio | HTTPS (API) | OTP send/verify |
| Frontend → AI Services | REST (HTTPS) | Image processing (optional) |

---

## Monorepo Workspace Structure

The project uses **npm workspaces** to manage multiple packages:

```json
// package.json (root)
{
  "workspaces": ["apps/*", "packages/*", "ai-services/*"]
}
```

### Dependency Graph

```
packages/shared-types  ←── apps/backend
       ↑                       ↑
       │                       │
packages/sync-engine  ←── apps/web-app
                              ↑
                              │
                       apps/mobile-app
```

### Build Order
1. `packages/shared-types` → TypeScript interfaces (GoldRate, MetalType, Product)
2. `packages/sync-engine` → Offline sync utilities
3. `apps/backend` → Express server (depends on shared-types)
4. `apps/web-app` → React frontend (depends on shared-types)

---

## Backend Deep-Dive

### Entry Point: `server.ts`

```
Express App
├── Middleware: json parser, CORS, Helmet (security headers)
├── Services instantiation:
│   ├── DatabaseService → PostgreSQL connection pool
│   ├── GoldRateService → Rate fetching + calculation
│   └── InventoryService → Stock management (uses DB + GoldRate)
├── Routes:
│   ├── /api/auth         → authRouter (Twilio OTP)
│   ├── /api/inventory    → inventoryRouter(inventoryService)
│   ├── /api/gold-rates   → goldRateRouter(goldRateService)
│   ├── /api/catalog      → catalogRouter(db)
│   ├── /api/parties      → partiesRouter(db)
│   └── /api/payments     → paymentsRouter()
├── 404 handler
├── Error handler (catches unhandled errors)
├── Cron: every 5 min → goldRateService.autoUpdateRates()
└── Graceful shutdown: SIGTERM → stop cron, close server, close DB pool
```

### Module Architecture Pattern

Each backend module follows the **controller + service** pattern:

```
modules/{feature}/
├── {feature}.controller.ts   → Express Router, request validation, response formatting
└── {feature}.service.ts      → Business logic, database queries, external API calls
```

### DatabaseService

- Uses `pg.Pool` for PostgreSQL connection pooling
- Default pool size: 10 connections (configurable via `DB_POOL_MAX`)
- Provides `query()`, `healthCheck()`, and `close()` methods
- SSL enabled for Railway-hosted databases

---

## Frontend Deep-Dive

### Application Bootstrap

```
index.html → main.tsx
  → React.StrictMode
    → AuthProvider (Firebase auth listener + user profile sync)
      → App component
        → Loading spinner (while Firebase resolves)
        → AuthPage (if not authenticated)
        → ThemeProvider + Layout (if authenticated)
          → Role-based page routing via hash
```

### Hash-Based Routing

The app uses simple hash routing (`window.location.hash`) instead of a router library:

```typescript
// Simplified routing logic in main.tsx
const hash = window.location.hash.slice(1) || '/';

// Customer routes: /portfolio, /orders, /nominee, /profile, /redemption, /referral
// Owner routes: /dashboard, /parties, /billing, /inventory, /catalog, /repairs, ...
// Super Admin: auto-redirect to /super-admin
```

**Why hash routing?** Cloudflare Pages serves static files — hash-based routing avoids the need for server-side URL rewrites.

### Context Providers

```
AuthContext
├── Firebase onAuthStateChanged listener
├── User profile sync with Firestore (users/{uid})
├── Twilio OTP helpers (sendOtp, verifyOtp)
├── Role detection (CUSTOMER, OWNER, STAFF, SUPER_ADMIN)
└── Shop verification status tracking

ThemeContext
├── Dark/light mode toggle
└── Persists preference in localStorage
```

### Rate Fetching Architecture

```
goldPrices.ts
├── getWorkerUrl() → VITE_GOLD_WORKER_URL or default worker URL
├── fetchLiveMetalRates()
│   ├── Try: GET /gold-rates (KV cached, 6s timeout)
│   ├── Catch: GET /gold-rates/live (fresh compute, 9s timeout)
│   └── Returns: MetalRate[] with purityLabel, ratePerGram, displayRate
└── fetchWorkerData()
    └── Returns full snapshot: xauInr, xagInr, xauUsd, xagUsd, usdToInr
```

---

## Gold & Silver Rate Pipeline

### Multi-Source Fetching Strategy

```
                    ┌─────────────────────────┐
                    │   Swissquote Feed        │
                    │   XAU/USD, XAG/USD       │
                    │   (bid + ask) / 2 = mid  │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Currency Conversion    │
                    │   Primary: exchangerate  │
                    │   Fallback: fawazahmed0  │
                    │   USD → INR rate         │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Calculation Engine     │
                    │                          │
                    │   1 troy oz = 31.1035g   │
                    │   Import duty = 9%       │
                    │                          │
                    │   pricePerGram =          │
                    │     (spot × USD/INR)     │
                    │     ÷ 31.1035            │
                    │     × 1.09               │
                    │                          │
                    │   Purity rate =           │
                    │     pricePerGram × P/24  │
                    └────────────┬────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
      ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
      │ PostgreSQL   │  │ Cloudflare   │  │ Frontend     │
      │ gold_rates   │  │ KV Cache     │  │ Display      │
      │ table        │  │ (60s TTL)    │  │ Gold: per 10g│
      │              │  │              │  │ Silver: per kg│
      └──────────────┘  └──────────────┘  └──────────────┘
```

### Rate Staleness Management

```
TTL-based refresh (configurable via GOLD_RATE_TTL_SECONDS, default: 60s):
  1. Frontend request → Backend getCurrentRate()
  2. Check PostgreSQL: is active rate older than TTL?
     ├── NO  → Return cached DB rate
     └── YES → Fetch from Swissquote + Currency API
               ├── SUCCESS → Save to DB, return new rate
               └── FAILURE → Return stale DB rate (graceful degradation)

Cron reconciliation (every 5 min):
  - Fetch upstream for all metal/purity combos
  - Only update DB if discrepancy > 0.5% (avoids unnecessary writes)
```

### Product Valuation Calculation

```
metalValue = netWeightGrams × currentGoldRate × (purity / 24)
wastageValue = metalValue × (wastagePercentage / 100)
makingChargesValue = makingCharges (fixed amount)
subtotal = metalValue + wastageValue + makingChargesValue
gstAmount = subtotal × 0.03 (3% GST on gold jewelry)
totalValue = subtotal + gstAmount

Example (22K gold ring, 5g net, ₹9,015/g 24K rate):
  metalValue = 5 × 9,015 × (22/24) = ₹41,318.75
  wastage (5%) = ₹2,065.94
  making charges = ₹2,000
  subtotal = ₹45,384.69
  GST (3%) = ₹1,361.54
  total = ₹46,746.23
```

---

## Payment Architecture

### Price-Lock Sequence Diagram

```
  Customer              Frontend           Backend            Razorpay         Firestore
     │                     │                  │                   │                │
     │ Select gold amount  │                  │                   │                │
     │────────────────────>│                  │                   │                │
     │                     │ POST /create-    │                   │                │
     │                     │  buy-order       │                   │                │
     │                     │─────────────────>│                   │                │
     │                     │                  │ Create price lock │                │
     │                     │                  │──────────────────────────────────> │
     │                     │                  │  {LOCKED, 120s,   │                │
     │                     │                  │   grams, rate}    │                │
     │                     │                  │                   │                │
     │                     │                  │ POST /v1/orders   │                │
     │                     │                  │──────────────────>│                │
     │                     │                  │<──────────────────│                │
     │                     │                  │  { order_id }     │                │
     │                     │<─────────────────│                   │                │
     │                     │  { lockId,       │                   │                │
     │                     │    orderId,      │                   │                │
     │                     │    amountPaise } │                   │                │
     │                     │                  │                   │                │
     │  Razorpay modal     │                  │                   │                │
     │<────────────────────│                  │                   │                │
     │  (UPI/card/bank)    │                  │                   │                │
     │────────────────────>│                  │                   │                │
     │                     │ POST /verify-    │                   │                │
     │                     │  buy-payment     │                   │                │
     │                     │─────────────────>│                   │                │
     │                     │                  │ HMAC verify       │                │
     │                     │                  │ Check lock expiry │                │
     │                     │                  │                   │                │
     │                     │                  │──────(if expired)─────────────────>│
     │                     │                  │ POST /v1/payments │ update lock    │
     │                     │                  │ /{id}/refund     │ REFUNDED       │
     │                     │                  │──────────────────>│                │
     │                     │                  │                   │                │
     │                     │                  │──────(if valid)──────────────────> │
     │                     │                  │                   │ PAID_IN_TIME   │
     │                     │<─────────────────│                   │                │
     │<────────────────────│ Order saved to   │                   │                │
     │ Success!            │ goldOnlineOrders │                   │                │
```

### AutoPay (SIP) Architecture

```
Customer sets up monthly plan:
  1. Frontend opens Razorpay with { recurring: 1 }
  2. Razorpay creates UPI/card mandate
  3. Subscription ID saved to autoPaySubscriptions/{id} in Firestore
  4. Every month: Razorpay auto-debits → webhook (future) or manual check
```

---

## AI Services Architecture

### Model Stack

```
┌──────────────────────────────────────────────┐
│  FastAPI Application (Python 3.9+)           │
│                                              │
│  ┌──────────────────┐  ┌─────────────────┐  │
│  │ YOLOv8 (nano)    │  │ ResNet-50       │  │
│  │ Object detection │  │ Classification  │  │
│  │ Bounding boxes   │  │ Top-5 predictions│ │
│  └────────┬─────────┘  └────────┬────────┘  │
│           │                     │             │
│  ┌────────▼─────────────────────▼────────┐   │
│  │ Custom Jewelry Classifier             │   │
│  │ ├── Shape analysis (contours)         │   │
│  │ │   ├── Circularity > 0.7 → Ring     │   │
│  │ │   ├── Aspect < 0.7 → Earring       │   │
│  │ │   └── Aspect > 1.5 → Necklace      │   │
│  │ └── HSV color analysis               │   │
│  │     ├── H:15-35, S:50+ → Gold        │   │
│  │     ├── H:0-15, S:30+ → Rose Gold    │   │
│  │     └── S<50, V>150   → Silver        │   │
│  └───────────────────────────────────────┘   │
│                                              │
│  ┌──────────────────┐                        │
│  │ U²-Net (rembg)   │                        │
│  │ Background       │                        │
│  │ removal          │                        │
│  │ → Transparent PNG│                        │
│  └──────────────────┘                        │
└──────────────────────────────────────────────┘
```

### Processing Pipeline for Catalog Upload

```
Input: JPEG/PNG jewelry photo
  │
  ├─── Step 1: YOLO Detection
  │    └── Detect jewelry objects → bounding boxes + confidence
  │
  ├─── Step 2: Jewelry Classification
  │    ├── If YOLO detects → classify detected region
  │    └── If no detection → analyze full image
  │
  ├─── Step 3: Metal Detection (HSV)
  │    └── Color analysis → gold / rose_gold / silver / unknown
  │
  ├─── Step 4: Background Removal (rembg)
  │    └── U²-Net model → alpha channel → transparent PNG
  │
  ├─── Step 5: Auto-Tag Generation
  │    ├── Color analysis → metal tag
  │    ├── Shape/aspect → category tag
  │    └── Generic: "handcrafted", "elegant", "premium"
  │
  └─── Step 6: Auto-Fill Response
       └── { name, description, hsn_code, category, metal_type, tags }
```

---

## Data Layer — Dual Database Strategy

### Why Two Databases?

| Concern | PostgreSQL (Railway) | Firebase Firestore |
|---------|---------------------|-------------------|
| **Use case** | Structured business data | Real-time user-facing data |
| **Gold rates** | ✅ Time-series with purity/metal indexing | — |
| **Products/Inventory** | ✅ Complex queries, joins, aggregations | — |
| **User profiles** | — | ✅ Real-time sync with auth state |
| **Orders** | — | ✅ Real-time updates, offline support |
| **Shop isolation** | — | ✅ Security rules enforce per-shop access |
| **Subscriptions** | — | ✅ Real-time status tracking |

### PostgreSQL Tables

```sql
gold_rates (id, metal_type, purity, rate_per_gram, source, effective_date, is_active)
products   (id, shop_id, sku, name, category, metal_type, purity, weight, price, ...)
metal_lots (id, shop_id, metal_type, purity, weight_grams, remaining_weight, purchase_rate, ...)
```

### Firestore Collections

```
users/{uid}                    → User profiles, roles, KYC status, holdings
shops/{shopId}                 → Shop details (name, owner, city)
shops/{shopId}/customers/{id}  → Customer sub-documents under shop
goldOnlineOrders/{orderId}     → Buy/sell transactions
autoPaySubscriptions/{id}      → Monthly SIP subscriptions
redemptionRequests/{id}        → Gold redemption requests
paymentPriceLocks/{lockId}     → 2-minute price lock records
razorpayOrders/{id}            → Payment order tracking
phoneIndex/{phone}             → Phone → email lookup for OTP login
metalPriceHistory/{id}         → Historical price snapshots
inventory/{id}                 → Physical shop inventory items
invoices/{id}                  → Billing invoices
parties/{id}                   → Customer/supplier contacts
repairs/{id}                   → Repair job tracking
schemes/{id}                   → Gold savings schemes
purchaseOrders/{id}            → Supplier purchase orders
hallmarking/{id}               → Hallmark batch tracking
```

---

## Authentication Architecture

### 3-Mode Login System

```
┌───────────────────────────────────────────────────────────────┐
│                    AuthPage.tsx                                 │
│                                                                │
│  Login Mode Selection:                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────────────┐ │
│  │  Password    │ │  Magic Link  │ │  Phone OTP             │ │
│  │              │ │              │ │                         │ │
│  │  Firebase    │ │  Firebase    │ │  Step 1: +91XXXXXXXXXX │ │
│  │  signInWith  │ │  sendSignIn  │ │  → POST /auth/send-otp │ │
│  │  EmailAnd    │ │  LinkToEmail │ │  → Twilio SMS sent     │ │
│  │  Password()  │ │  ()          │ │                         │ │
│  │              │ │              │ │  Step 2: Enter 6 digits │ │
│  │  → Auth done │ │  User clicks │ │  → POST /auth/verify-otp│ │
│  │              │ │  email link  │ │  → {valid: true}        │ │
│  │              │ │  → Auth done │ │  → Firebase custom token│ │
│  └──────────────┘ └──────────────┘ └────────────────────────┘ │
│                                                                │
│  3-Step Signup:                                                │
│  ┌─────────────┐ ┌────────────────┐ ┌──────────────────────┐  │
│  │ Step 1:     │ │ Step 2:        │ │ Step 3:              │  │
│  │ Role select │ │ Details        │ │ Password + Terms     │  │
│  │ CUSTOMER or │ │ Name, email,   │ │                      │  │
│  │ SHOP_OWNER  │ │ phone, shop    │ │ Firebase createUser  │  │
│  │             │ │                │ │ Firestore users/{uid}│  │
│  │             │ │ Validates:     │ │                      │  │
│  │             │ │ - Shop exists  │ │ If OWNER:            │  │
│  │             │ │ - Phone unique │ │   Create shops/{uid} │  │
│  └─────────────┘ └────────────────┘ └──────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

---

## Cloudflare Workers

### Gold Rates Worker (`infra/cloudflare/gold-rates-worker/`)

```
Cloudflare Edge Network
  │
  ├── GET /gold-rates
  │   ├── Check KV cache (key: "latest_rates")
  │   ├── If cached (< 60s) → return cached
  │   └── If stale → fetch from Swissquote + Currency API
  │       ├── Compute per-gram rates for all purities
  │       ├── Store in KV (TTL: 60s)
  │       └── Return fresh data
  │
  └── GET /gold-rates/live
      └── Always fetch fresh (bypass KV cache)
```

### Twilio Worker (`infra/cloudflare/twilio-worker/`)

Acts as a CORS proxy for the Twilio Verify API, allowing the frontend to trigger OTP flows without exposing backend endpoints for simple use cases.

---

## Security Architecture

### Defense in Depth

1. **Transport**: HTTPS everywhere (Cloudflare, Railway, Firebase)
2. **Auth**: Firebase Auth with multiple providers + Twilio OTP
3. **API**: Helmet middleware (security headers), CORS whitelist
4. **Data**: Firestore security rules enforce shop-isolated RBAC
5. **Payments**: HMAC-SHA256 signature verification, 2-min price locks
6. **Secrets**: Environment variables, never committed to git

### Multi-Tenant Isolation

```
Shop A (shopId: "abc")          Shop B (shopId: "xyz")
┌─────────────────────┐        ┌─────────────────────┐
│ Owner: Alice        │        │ Owner: Bob           │
│ Customers:          │        │ Customers:           │
│   ├── C1 (shopId=abc)│       │   ├── C3 (shopId=xyz)│
│   └── C2 (shopId=abc)│       │   └── C4 (shopId=xyz)│
│                     │        │                     │
│ C1 can see: own data│ ✗ ──── │ C3 cannot see C1    │
│ Alice sees: C1, C2  │ ✗ ──── │ Bob cannot see C1,C2│
└─────────────────────┘        └─────────────────────┘

Super Admin can see ALL shops, ALL customers
```

---

## Cron Jobs & Background Tasks

| Job | Schedule | Source | What It Does |
|-----|----------|--------|-------------|
| Gold Rate Update | Every 5 min | `server.ts` → `CronJob` | Fetches Swissquote + currency rates, updates PostgreSQL |
| Rate Reconciliation | On demand | `/gold-rates/reconcile` API | Compares DB vs upstream, updates if >0.5% difference |
| Cloudflare KV Refresh | On request (60s TTL) | Worker edge function | Refreshes cached rates when TTL expires |

---

## Deployment Pipeline

```
Developer pushes to GitHub
         │
         ├──── Railway (Backend)
         │     ├── Detects Dockerfile
         │     ├── Multi-stage build:
         │     │   1. Install all workspace deps
         │     │   2. Build shared-types
         │     │   3. Build backend TypeScript
         │     │   4. Production image (node:18-slim)
         │     └── Deploy → https://xxx.railway.app
         │
         ├──── Cloudflare Pages (Frontend)
         │     ├── Build: cd apps/web-app && npm run build
         │     ├── Output: apps/web-app/dist
         │     └── Deploy → https://xxx.pages.dev
         │
         └──── Render / Docker (AI Services)
               ├── Build: ai-services/image-processing/Dockerfile
               ├── pip install requirements.txt
               └── uvicorn main:app --host 0.0.0.0 --port 8000
```

---

*For feature documentation, see [FEATURES.md](./FEATURES.md). For future roadmap, see [FUTURE_PROSPECTS.md](./FUTURE_PROSPECTS.md).*
