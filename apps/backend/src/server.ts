/**
 * Express Server Entry Point
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { DatabaseService } from './services/database/DatabaseService';
import { GoldRateService } from './services/gold-rate/GoldRateService';
import { InventoryService } from './modules/inventory/inventory.service';
import { inventoryRouter } from './modules/inventory/inventory.controller';
import { goldRateRouter } from './modules/gold-rate/gold-rate.controller';
import { catalogRouter } from './modules/catalog/catalog.controller';
import { partiesRouter } from './modules/parties/parties.controller';
import { authRouter } from './modules/auth/auth.controller';
import { CronJob } from 'cron';

// ── 0. Environment ─────────────────────────────────────────────────────────
dotenv.config();

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('[startup] Bizmation Backend starting up');
console.log(`[startup] NODE_ENV      : ${process.env.NODE_ENV || 'development'}`);
console.log(`[startup] PORT          : ${process.env.PORT || 3000}`);
console.log(`[startup] DATABASE_URL  : ${process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:([^@]+)@/, ':***@') : 'NOT SET ⚠'}`);
console.log(`[startup] TWILIO_SID    : ${process.env.TWILIO_ACCOUNT_SID ? process.env.TWILIO_ACCOUNT_SID.slice(0, 6) + '...' : 'NOT SET'}`);
console.log(`[startup] TWILIO_TOKEN  : ${process.env.TWILIO_AUTH_TOKEN ? '***set***' : 'NOT SET'}`);
console.log(`[startup] TWILIO_VERIFY : ${process.env.TWILIO_VERIFY_SERVICE_SID ? process.env.TWILIO_VERIFY_SERVICE_SID.slice(0, 6) + '...' : 'NOT SET'}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const app = express();
const PORT = process.env.PORT || 3000;

// ── 1. Middleware ──────────────────────────────────────────────────────────
console.log('[startup] Registering middleware...');
app.use(helmet());
app.use(cors({
  // Allow Cloudflare Pages domains + localhost dev
  origin: [
    /\.pages\.dev$/,
    /\.cloudflare\.workers\.dev$/,
    /\.bizmation\.com$/,
    /^http:\/\/localhost/,
    /^http:\/\/127\.0\.0\.1/,
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
console.log('[startup] Middleware OK');

// ── 2. Services ────────────────────────────────────────────────────────────
console.log('[startup] Initialising DatabaseService...');
let db: DatabaseService;
try {
  db = new DatabaseService();
  console.log('[startup] DatabaseService initialised OK');
} catch (err: any) {
  console.error('[startup] ❌ DatabaseService init FAILED:', err.message);
  process.exit(1);
}

console.log('[startup] Initialising GoldRateService...');
const goldRateService = new GoldRateService(db);
console.log('[startup] GoldRateService OK');

console.log('[startup] Initialising InventoryService...');
const inventoryService = new InventoryService(db, goldRateService);
console.log('[startup] InventoryService OK');

// ── 3. Health check ────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  const dbHealthy = await db.healthCheck();
  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    service: 'jewelry-backend',
    version: process.env.npm_package_version || 'unknown',
    env: process.env.NODE_ENV || 'development',
  });
});

// ── 4. Routes ──────────────────────────────────────────────────────────────
console.log('[startup] Registering routes...');
app.use('/api/auth', authRouter);
app.use('/api/inventory', inventoryRouter(inventoryService));
app.use('/api/gold-rates', goldRateRouter(goldRateService));
app.use('/api/catalog', catalogRouter(db));
app.use('/api/parties', partiesRouter(db));
console.log('[startup] Routes registered: /api/auth, /api/inventory, /api/gold-rates, /api/catalog, /api/parties');

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[error] Unhandled error on', req.method, req.path, ':', err.message || err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// ── 5. Cron jobs ───────────────────────────────────────────────────────────
const goldRateUpdateJob = new CronJob('*/5 * * * *', async () => {
  console.log('[cron] Running gold rate auto-update...');
  try {
    await goldRateService.autoUpdateRates();
    console.log('[cron] Gold rates updated successfully');
  } catch (error: any) {
    console.error('[cron] ❌ Failed to update gold rates:', error?.message || error);
  }
});

// ── 6. Listen ──────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`[startup] ✅ Server listening on port ${PORT}`);
  console.log(`[startup] 🌐 Health check: http://localhost:${PORT}/health`);

  // start DB health probe
  db.healthCheck().then(ok => {
    if (ok) {
      console.log('[startup] ✅ Database connection verified');
    } else {
      console.warn('[startup] ⚠ Database health check failed — check DATABASE_URL and SSL settings');
    }
  });

  goldRateUpdateJob.start();
  console.log('[startup] ⏰ Gold rate update cron started (every 5 min)');
});

// ── 7. Graceful shutdown ───────────────────────────────────────────────────
process.on('SIGTERM', async () => {
  console.log('[shutdown] SIGTERM received, shutting down gracefully...');
  goldRateUpdateJob.stop();
  server.close(async () => {
    await db.close();
    console.log('[shutdown] ✅ Server closed cleanly');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason) => {
  console.error('[process] ❌ Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[process] ❌ Uncaught exception:', err.message, err.stack);
  process.exit(1);
});

export { app, db, inventoryService, goldRateService };
