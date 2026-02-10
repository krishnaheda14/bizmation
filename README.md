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

### Development
```bash
docker-compose up -d
```

### Production (AWS ECS / Railway)
```bash
# Build production images
npm run build

# Deploy using GitHub Actions
git push origin main
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
