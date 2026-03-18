# Bizmation Gold

> Full-stack jewellery platform — live gold/silver rates, buy/sell, AutoPay SIP, KYC, customer portfolios, shop management, and a super-admin console.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Tech Stack](#tech-stack)
5. [Project Structure](#project-structure)
6. [Environment Variables](#environment-variables)
7. [Firebase Collections Schema](#firebase-collections-schema)
8. [API Endpoints (Backend)](#api-endpoints)
9. [Unique ID System](#unique-id-system)
10. [Authentication](#authentication)
11. [Phone OTP (Twilio)](#phone-otp-twilio)
12. [Super Admin](#super-admin)
13. [Railway Deployment (Backend)](#railway-deployment)
14. [Cloudflare Pages (Frontend)](#cloudflare-pages)
15. [Running Locally](#running-locally)
16. [Docker](#docker)

---

## Overview

Bizmation Gold lets jewellery shop owners onboard customers who can then buy and sell 24K gold and silver at live international market prices (XAU/USD x USD/INR). Shops are fully isolated — customers registered under one shop cannot see or interact with any other shop.

---

## Architecture

```
+-------------------------------------+
|         Cloudflare Pages            |
|   React + Vite  (hash routing)      |
|   apps/web-app/                     |
+----------------+--------------------+
                 | REST
+----------------v--------------------+
|         Railway  (Node.js)          |
|   Express + TypeScript              |
|   apps/backend/                     |
|   PostgreSQL  (Railway plugin)      |
+----------------+--------------------+
                 |
+----------------v--------------------+
|         Firebase                    |
|   Auth  (email/Google/magic link)   |
|   Firestore  (real-time data)       |
+-------------------------------------+
                 |
+----------------v--------------------+
|         Twilio Verify               |
|   Phone OTP authentication          |
+-------------------------------------+
```

**Data Sources**
| Data | Source |
|------|--------|
| XAU/USD, XAG/USD spot | Swissquote public feed (via CORS proxy) |
| USD/INR | `@fawazahmed0/currency-api` CDN |
| Fallback rates | Same CDN (xau.json / xag.json) |
| Charts | TradingView mini-widget embed |

---

## Features

### Customer App
- **Live gold & silver rates** — auto-refresh every 5 s, TradingView charts
- **Buy gold/silver** — bottom-sheet UI with quick-select (0.5/1/2/5g) + slide-to-confirm
- **Sell gold** — submit sell request with bank details
- **AutoPay / SIP** — monthly recurring gold purchases via Razorpay subscription
- **Portfolio page** — holdings cards, avg buy price, current market value, P&L %
- **Orders / Transaction log** — filterable by BUY/SELL, search, invoice PDF download
- **KYC** — document upload, status tracking
- **Redemption** — redeem accumulated gold, track request status
- **Referral** — referral link, commission tracking

### Shop Owner App
- **Dashboard** — overview stats
- **Parties** — manage customers / suppliers
- **Billing** — create invoices
- **Inventory** — stock tracking
- **Catalog** — product listing
- **Schemes** — gold savings schemes
- **Repairs** — repair job tracking
- **Gold Rates** — live rate display for shop
- **Redemption Requests** — view/approve customer redemptions
- **Analytics** — sales and revenue charts

### Super Admin Console (`/super-admin`)
- View all registered shops with Biz IDs
- View all customers across all shops with KYC status
- Platform-level stats (total shops, customers, verified KYC, avg customers/shop)
- Credentials: set `role: 'SUPER_ADMIN'` on Firebase user document

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| Routing | Hash-based (`window.location.hash`) |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (Railway plugin) via raw `pg` Pool |
| Real-time DB | Firebase Firestore |
| Auth | Firebase Auth (email/password, Google OAuth, magic link) + Twilio Verify (phone OTP) |
| Payments | Razorpay (one-time + subscription AutoPay) |
| CDN / Hosting | Cloudflare Pages (frontend), Railway (backend) |
| Containerisation | Docker (multi-stage), `railway.toml` |

---

## Project Structure

```
.
├── Dockerfile               # Root multi-stage Docker build for Railway
├── railway.toml             # Railway deployment config
├── docker-compose.yml       # Local PostgreSQL + backend
├── package.json             # Workspace root
│
├── apps/
│   ├── backend/             # Express API server
│   │   └── src/
│   │       ├── server.ts
│   │       ├── modules/
│   │       │   ├── auth/
│   │       │   │   ├── auth.service.ts      # Twilio Verify OTP
│   │       │   │   └── auth.controller.ts   # POST /api/auth/send-otp|verify-otp
│   │       │   ├── catalog/
│   │       │   ├── gold-rate/
│   │       │   ├── inventory/
│   │       │   └── parties/
│   │       └── services/
│   │           └── database/DatabaseService.ts   # pg Pool
│   │
│   └── web-app/             # React frontend (Cloudflare Pages)
│       └── src/
│           ├── context/
│           │   ├── AuthContext.tsx    # Firebase auth + Twilio OTP helpers
│           │   └── ThemeContext.tsx
│           ├── components/
│           │   └── Layout.tsx         # Shell nav
│           ├── lib/
│           │   ├── firebase.ts
│           │   ├── goldPrices.ts      # fetchLiveMetalRates()
│           │   └── razorpay.ts        # buyGold() / setupGoldAutoPay()
│           ├── pages/
│           │   ├── HomeLanding.tsx    # Buy/sell bottom-sheet + slide-to-confirm
│           │   ├── CustomerPortfolio.tsx  # Holdings + avg price + P&L
│           │   ├── Orders.tsx         # Transaction log + filter + invoice PDF
│           │   ├── AuthPage.tsx       # 3-step signup + 3-mode login
│           │   ├── SuperAdmin.tsx     # Super admin console
│           │   └── ...
│           └── utils/
│               └── bizId.ts           # Unique ID generators
│
├── packages/
│   ├── shared-types/        # Shared TypeScript types
│   └── sync-engine/         # Offline sync utilities
│
└── docs/
    ├── API.md
    ├── DEPLOYMENT.md
    └── QUICK_START_GUIDE.md
```

---

## Environment Variables

### Backend (`apps/backend/.env`)

```env
# PostgreSQL (Railway Postgres plugin inserts this automatically)
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<dbname>
DB_POOL_MAX=10

# JWT
JWT_SECRET=your_jwt_secret_here

# Twilio Verify (Phone OTP)
TWILIO_ACCOUNT_SID=AC<your-account-sid>
TWILIO_API_KEY_SID=SK<your-api-key-sid>
TWILIO_API_KEY_SECRET=<your-api-key-secret>
TWILIO_VERIFY_SERVICE_SID=VA<your-verify-service-sid>

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
VITE_API_URL=https://your-railway-backend.up.railway.app
```

> **Security:** Never commit `.env` files. Set all secrets via Railway's Environment Variables dashboard and Cloudflare Pages environment settings.

---

## Firebase Collections Schema

### `users/{uid}`
```json
{
  "uid": "firebase-uid",
  "name": "Customer Name",
  "email": "customer@example.com",
  "phone": "+919876543210",
  "role": "CUSTOMER | SHOP_OWNER | SHOP_STAFF | SUPER_ADMIN",
  "shopName": "Jewels Palace",
  "shopId": "firestore-shop-doc-id",
  "bizCustomerId": "BIZ-CUST-A3F7B2C1",
  "bizShopId": "BIZ-SHOP-9D4E2A87",
  "kycStatus": "PENDING | VERIFIED | REJECTED",
  "createdAt": "serverTimestamp"
}
```

### `shops/{shopId}`
```json
{
  "name": "Jewels Palace",
  "ownerUid": "firebase-uid",
  "bizShopId": "BIZ-SHOP-9D4E2A87",
  "city": "Mumbai",
  "phone": "+9122...",
  "createdAt": "serverTimestamp"
}
```

### `goldOnlineOrders/{orderId}`
```json
{
  "userId": "firebase-uid",
  "type": "BUY | SELL",
  "metal": "GOLD | SILVER",
  "purity": 24,
  "grams": 2.5,
  "ratePerGram": 6200.50,
  "totalAmountInr": 15501.25,
  "razorpayPaymentId": "pay_...",
  "status": "SUCCESS | PENDING | FAILED",
  "createdAt": "serverTimestamp"
}
```

### `redemptionRequests/{id}`
```json
{
  "userId": "firebase-uid",
  "shopId": "...",
  "grams": 5,
  "status": "PENDING | APPROVED | DISPATCHED | COMPLETED",
  "requestedAt": "serverTimestamp"
}
```

---

## API Endpoints

Base URL: `https://your-backend.up.railway.app/api`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/auth/send-otp` | Send Twilio phone OTP — body: `{ phone }` |
| `POST` | `/auth/verify-otp` | Verify phone OTP — body: `{ phone, code }` |
| `GET` | `/gold-rate` | Live gold rate from backend cache |
| `GET/POST` | `/catalog` | Product catalog |
| `GET/POST` | `/inventory` | Inventory management |
| `GET/POST` | `/parties` | Parties (customers/suppliers) |

---

## Unique ID System

All entities get a human-readable Biz ID generated by `apps/web-app/src/utils/bizId.ts`:

| Entity | Format | Example |
|--------|--------|---------|
| Shop | `BIZ-SHOP-XXXXXXXX` | `BIZ-SHOP-9D4E2A87` |
| Customer | `BIZ-CUST-XXXXXXXX` | `BIZ-CUST-A3F7B2C1` |
| Order | `BIZ-ORD-XXXXXXXXXXXXXXXXXXX` | timestamp + random suffix |
| Product | `BIZ-PROD-XXXXXXXX` | |
| Session | `BIZ-SES-XXXXXXXXXXXXX` | |

IDs are generated client-side on document creation and stored in Firestore alongside Firebase UIDs.

---

## Authentication

### Login Modes (AuthPage)
1. **Password** — email + password via Firebase Auth
2. **Magic Link** — passwordless email link (Firebase `sendSignInLinkToEmail`)
3. **Phone OTP** — Twilio Verify SMS → verify code → Firebase sign-in

### Sign-Up Flow (3 steps)
1. **Role** — select CUSTOMER or SHOP_OWNER
2. **Details** — name, email, phone, shop name
   - If CUSTOMER: Firestore validates the shop name exists before proceeding. If not found, the user is shown: _"Shop not found. Please ask your shop owner for the exact shop name."_
   - Phone uniqueness is checked against existing Firestore users before account creation
3. **Password** — set password, agree to terms

### Role-based routing
| Role | Default route |
|------|--------------|
| `CUSTOMER` | `#/home` |
| `SHOP_OWNER` | `#/dashboard` |
| `SHOP_STAFF` | `#/dashboard` |
| `SUPER_ADMIN` | `#/super-admin` |

### Shop isolation
- Customer queries always include `shopId` / `ownerUid` filter
- Shop owners only see their own `shops/{shopId}` document
- Only `SUPER_ADMIN` can query across all shops

---

## Phone OTP (Twilio)

### One-time setup
1. Create a Twilio account at https://console.twilio.com
2. Go to **Verify → Services → Create new service** — copy `VA...` SID
3. Go to **Account → API Keys → Create API Key** — copy `SK...` SID and secret
4. Add to Railway environment variables (see below)

### Environment variables needed
```
TWILIO_ACCOUNT_SID         AC... (from Twilio dashboard homepage)
TWILIO_API_KEY_SID         SK...
TWILIO_API_KEY_SECRET      ...
TWILIO_VERIFY_SERVICE_SID  VA...
```

### OTP flow
```
User enters phone
      |
POST /api/auth/send-otp { phone }
      |
Backend calls Twilio Verify → SMS sent to user
      |
User enters 6-digit code
      |
POST /api/auth/verify-otp { phone, code }
      |
Backend calls Twilio verificationChecks.create()
      |
{ valid: true } → frontend completes sign-in
```

---

## Super Admin

### Setup (one-time, manual)
1. In Firebase Auth console, create a user: `admin@bizmation.com`
2. In Firestore, create document `users/<uid>`:
   ```json
   {
     "uid": "<firebase-uid>",
     "name": "Super Admin",
     "email": "admin@bizmation.com",
     "role": "SUPER_ADMIN"
   }
   ```
3. Use a strong password — e.g., `BizAdmin@2026!Gold`
4. On login, the app auto-redirects to `/#/super-admin`

### What Super Admin can view
- All registered shops — name, Biz ID, city, owner UID
- All customers — name, Biz ID, shop name, KYC status badge
- Platform stats — total shops, customers, verified KYC count, avg customers per shop

---

## Railway Deployment

### First deploy
```bash
npm install -g @railway/cli
railway login
railway link        # link to your Railway project
railway up          # deploy using root Dockerfile
```

Railway auto-detects `railway.toml` and uses the root `Dockerfile`.

### Dockerfile stages
1. `deps` — install all workspace packages
2. `build-shared` — compile `packages/shared-types`
3. `builder` — compile `apps/backend` (TypeScript → CommonJS)
4. `production` — minimal Node image, runs `node dist/server.js`

### Required Railway env vars
```
DATABASE_URL              (auto-set by Railway Postgres plugin)
TWILIO_ACCOUNT_SID
TWILIO_API_KEY_SID
TWILIO_API_KEY_SECRET
TWILIO_VERIFY_SERVICE_SID
JWT_SECRET                (generate: openssl rand -base64 64)
PORT=3001
NODE_ENV=production
```

---

## Cloudflare Pages

### Pages dashboard build settings
| Setting | Value |
|---------|-------|
| Framework preset | Vite |
| Build command | `cd apps/web-app && npm run build` |
| Build output directory | `apps/web-app/dist` |
| Root directory | _(project root)_ |

### Environment variables (Pages → Settings → Environment Variables)
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_RAZORPAY_KEY_ID
VITE_API_URL    (your Railway backend URL)
```

---

## Running Locally

### Prerequisites
- Node.js 18+
- npm (workspaces)

### Install all packages
```bash
npm install
```

### Backend
```bash
cp apps/backend/.env.example apps/backend/.env
# Edit apps/backend/.env with your DATABASE_URL and Twilio vars
npm run dev --workspace=apps/backend
```

### Frontend
```bash
cp apps/web-app/.env.example apps/web-app/.env
# Edit apps/web-app/.env with Firebase config and VITE_API_URL=http://localhost:3001
npm run dev --workspace=apps/web-app
```

Frontend: http://localhost:5173

---

## Docker

### Local development (backend + PostgreSQL)
```bash
docker compose up -d
```

### Build production image
```bash
docker build -t bizmation-backend .
docker run -p 3001:3001 --env-file apps/backend/.env bizmation-backend
```

---

*Built for Indian jewellery businesses. For support: contact@bizmation.in*
