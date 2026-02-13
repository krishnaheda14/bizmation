# Jewelry Retail Platform

A comprehensive, offline-first jewelry retail management system with AI-powered features, GST compliance, and mobile monitoring capabilities.

## 🎯 Features

- **Offline-First POS**: Works without internet, syncs when online
- **GST Compliance**: Auto-calculation, e-invoicing, HSN codes
- **AI-Powered Catalog**: Auto background removal, smart tagging
- **AR Try-On**: Virtual jewelry try-on using device camera
- **Mobile Dashboard**: Real-time monitoring for owners
- **Gold Rate Integration**: Auto-updates from multiple sources
- **Predictive Analytics**: Sales forecasting, dead stock identification

## 🏗️ Architecture

```
jewelry-retail-platform/
├── apps/
│   ├── web-app/          # React PWA (POS System)
│   ├── mobile-app/       # React Native (Owner Dashboard)
│   └── backend/          # Node.js + Express API
├── packages/
│   ├── shared-types/     # TypeScript interfaces
│   ├── sync-engine/      # Offline-first sync logic
│   └── ai-models/        # TensorFlow.js models
├── ai-services/          # Python FastAPI microservices
└── infrastructure/       # Docker, K8s, monitoring configs
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker & Docker Compose
- Python 3.10+ (for AI services)

### Installation

1. **Clone and Install Dependencies**
   ```bash
   git clone <repository-url>
   cd jewelry-retail-platform
   npm install
   ```

2. **Setup Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start Services with Docker**
   ```bash
   npm run docker:up
   ```

4. **Run Development Servers**
   ```bash
   # Start all services
   npm run dev

   # Or start individually
   npm run dev:web      # Web app on http://localhost:5173
   npm run dev:backend  # API on http://localhost:3000
   npm run dev:mobile   # Mobile app (Expo)
   ```

## 📦 Package Structure

### Apps

- **web-app**: React + TypeScript + Vite PWA for POS
- **mobile-app**: React Native + Expo for owner dashboard
- **backend**: Node.js + Express REST API

### Packages (Shared)

- **shared-types**: Common TypeScript interfaces
- **sync-engine**: Offline-first synchronization
- **ai-models**: Client-side AI models

### AI Services

- **image-processing**: Background removal, auto-tagging
- **ar-tryon**: Virtual try-on models
- **predictive-analytics**: Sales forecasting

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend (Web) | React, TypeScript, Vite, TailwindCSS |
| Frontend (Mobile) | React Native, Expo |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL, SQLite (offline) |
| AI/ML | Python, FastAPI, TensorFlow.js, OpenCV |
| Sync | WebSocket + REST with conflict resolution |
| Cloud | AWS (free tier) / Docker |
| Monitoring | ELK Stack, Prometheus, Grafana |
| CI/CD | GitHub Actions, Docker |

## 📱 Key Modules

### Web App (POS)
- Auth & User Management
- Inventory Management (weight-based tracking)
- GST-Compliant Billing
- Customer Management
- Reports & Analytics
- Offline-First Data Storage

### Mobile App (Dashboard)
- Real-time Sales Monitoring
- Stock Value & Alerts
- Pending Payments
- Gold Rate Updates
- Push Notifications

### Backend Services
- Authentication & Authorization
- Inventory CRUD
- Billing & Invoicing
- Sync Management
- GST Validation
- Gold Rate Fetching
- AI Integration

## 🤖 AI Features

1. **Smart Catalog Management**
   - Automatic background removal
   - Product categorization and tagging
   - Auto-generated descriptions

2. **AR Virtual Try-On**
   - Real-time jewelry overlay
   - Works on mobile devices
   - Uses MediaPipe + TensorFlow.js

3. **Business Intelligence**
   - Dead stock identification
   - Sales forecasting
   - Customer preference analysis
   - Gold rate trend prediction

## 🔒 Security & Compliance

- Encrypted local storage (SQLite)
- JWT-based authentication
- Role-based access control
- GST validation and e-invoicing
- HSN code management
- Hallmarking compliance
- Audit logs

## 📊 Database Schema

Key entities:
- `metal_lots`: Track gold/silver purchases by weight
- `products`: Individual jewelry items
- `transactions`: Sales and purchases
- `customers`: Customer information
- `invoices`: GST-compliant invoices
- `sync_queue`: Offline operations queue

## 🔄 Offline-First Architecture

1. **Local Storage**: SQLite database on device
2. **Operation Queue**: All operations queued locally
3. **Conflict Resolution**: Timestamp-based merging
4. **Automatic Sync**: Syncs when connection available
5. **Data Export**: Always exportable (no vendor lock-in)

## 🧪 Testing

```bash
# Run all tests
npm run test

# Test specific workspace
npm run test --workspace=apps/backend

# E2E tests
npm run test:e2e
```

## 📦 Deployment

### 🎯 Quick Start (70 minutes to production!)

Follow this simple checklist: **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** ⭐

### 📚 Complete Production Guides

| Guide | Description | Time |
|-------|-------------|------|
| **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** | ✅ Step-by-step checklist | 70 min |
| **[PRODUCTION_DEPLOYMENT_COMPLETE.md](PRODUCTION_DEPLOYMENT_COMPLETE.md)** | 📖 Full architecture & setup  | Reference |
| **[CLOUDFLARE_DEPLOYMENT.md](CLOUDFLARE_DEPLOYMENT.md)** | 🌐 Frontend deployment | 10 min |
| **[BUILD_FIX_SUMMARY.md](BUILD_FIX_SUMMARY.md)** | 🔧 Build fixes applied | Reference |

### 🆓 Free Tier Services (No Credit Card!)

All services start **100% FREE** and scale as you grow:

| Service | Provider | Free Tier | Scalability |
|---------|----------|-----------|-------------|
| **Frontend** | Cloudflare Pages | Unlimited bandwidth! | ✅ Auto-scales globally |
| **Backend** | Railway | 500 hrs/month | ✅ $5/mo upgrade |
| **Database** | Neon.tech | 10 GB PostgreSQL | ✅ Seamless scaling |
| **Storage** | Cloudflare R2 | 10 GB, zero egress! | ✅ Pay per GB |
| **AI Services** | Render.com | 750 hrs/month | ✅ $7/mo upgrade |

**Total Cost:** $0/month → Scales to ~$30/mo for 500-2000 customers

### 🎯 Architecture Overview

```
User → Cloudflare Pages (Frontend)
         ↓ API
       Railway (Backend) → Neon.tech (PostgreSQL)
         ↓                 ↓
       Render (AI)      Cloudflare R2 (Storage)
```

### 🔧 Gold Rates (No API Keys Needed!)

We use **FREE public APIs**:
- `data-asg.goldprice.org` - XAU/USD rates (gold prices)
- `jsDelivr CDN` - USD to INR conversion

✅ No registration  
✅ No API keys  
✅ Works out of the box!

### 🤖 AI Recognition (All Open Source!)

Models run **locally** on Render (no external  API costs):
- **YOLOv8** - Object detection
- **rembg (U^2-Net)** - Background removal
- **ResNet50** - Classification
- **OpenCV** - Color-based metal detection

✅ No API keys  
✅ No per-request costs  
✅ Free on Render tier!

### ⚙️ Environment Variables

Example configuration files provided:
- `.env` - Local development
- `.env.cloudflare.example` - Frontend (Cloudflare Pages)
- `.env.production.example` - Backend (Railway)
- `.env.render.example` - AI Services

### Web App (Cloudflare Pages) - Recommended ⭐

```bash
# Validate build locally
./validate-deployment.ps1   # Windows
./validate-deployment.sh    # Linux/Mac
```

**Cloudflare Pages Settings:**
- Build command: `npm ci && npm run build:web`
- Build output: `apps/web-app/dist`
- Node version: `20`

📖 **[Complete Guide](CLOUDFLARE_DEPLOYMENT.md)**

### Backend & Full Stack

See **[PRODUCTION_DEPLOYMENT_COMPLETE.md](PRODUCTION_DEPLOYMENT_COMPLETE.md)** for:
- Backend API deployment (Railway)
- PostgreSQL setup (Neon.tech)
- File storage (Cloudflare R2)
- AI services (Render.com)
- Environment variable configuration
- Custom domain setup
- Security best practices
- Monitoring & scaling

### Local Development

```bash
# Install dependencies
npm ci

# Build workspace packages
npm run build:packages

# Start all services
npm run dev
```

## 🐛 Monitoring & Debugging

- **Error Tracking**: Sentry (free tier)
- **Logs**: ELK Stack
- **Metrics**: Prometheus + Grafana
- **APM**: Custom middleware

## 🤝 Contributing

This is a proprietary project. Contact the development team for contribution guidelines.

## 📄 License

Proprietary - All rights reserved

## 📞 Support

For issues or questions, contact: support@jewelryplatform.com

---

**Built with ❤️ for Indian Jewelry Retailers**
