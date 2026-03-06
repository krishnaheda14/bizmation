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
app.get('/health', async (req, res) => {
  const dbHealthyNow = await db.healthCheck();
  const verbose = (process.env.HEALTH_VERBOSE || 'false') === 'true';
  const payload: any = {
    status: dbHealthyNow ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    service: 'jewelry-backend',
    version: process.env.npm_package_version || 'unknown',
    env: process.env.NODE_ENV || 'development',
    dbHealthy: dbHealthyNow,
  };
  if (verbose) {
    // include a tiny diagnostic note (no secrets) in verbose mode
    payload.dbInfo = {
      hostProvided: !!process.env.DATABASE_URL,
      supabaseUrlProvided: !!process.env.SUPABASE_URL,
    };
  }
  res.status(dbHealthyNow ? 200 : 503).json(payload);
});

async function init() {
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

  // ── 5. Cron jobs ─────────────────────────────────────────────────────────
  const goldRateUpdateJob = new CronJob('*/5 * * * *', async () => {
    console.log('[cron] Running gold rate auto-update...');
    try {
      await goldRateService.autoUpdateRates();
      console.log('[cron] Gold rates updated successfully');
    } catch (error: any) {
      console.error('[cron] ❌ Failed to update gold rates:', error?.message || error);
    }
  });

  // ── 6. Listen ─────────────────────────────────────────────────────────────
  const server = app.listen(PORT, () => {
    console.log(`[startup] ✅ Server listening on port ${PORT}`);
    console.log(`[startup] 🌐 Health check: http://localhost:${PORT}/health`);
  });

  // start DB health probe
  try {
    const ok = await db.healthCheck();
    if (ok) console.log('[startup] ✅ Database connection verified');
    else console.warn('[startup] ⚠ Database health check failed — check DATABASE_URL and SSL settings');
  } catch (e: any) {
    console.error('[startup] DB health probe error:', e?.message || e, e?.stack || 'no-stack');
  }

  try {
    goldRateUpdateJob.start();
    console.log('[startup] ⏰ Gold rate update cron started (every 5 min)');
  } catch (e: any) {
    console.error('[startup] Failed to start cron job:', e?.message || e);
  }

  // expose server for graceful shutdown
  (global as any).__bizmation_server = server;
}

// start initialization and log uncaught startup errors
init().catch(err => {
  console.error('[startup] FATAL during init():', err?.message || err, err?.stack || 'no-stack');
  process.exit(1);
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
