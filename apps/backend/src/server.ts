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

// Environment
dotenv.config();

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('[startup] Bizmation Backend starting up');
console.log(`[startup] NODE_ENV      : ${process.env.NODE_ENV || 'development'}`);
console.log(`[startup] PORT          : ${process.env.PORT || 3000}`);
console.log(`[startup] DATABASE_URL  : ${process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:([^@]+)@/, ':***@') : 'NOT SET ⚠'}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const app = express();
const PORT = process.env.PORT || 3000;

// instantiate services
const db = new DatabaseService();
const goldRateService = new GoldRateService(db);
const inventoryService = new InventoryService(db, goldRateService);

// Middleware
console.log('[startup] Registering middleware...');
app.use(express.json());
app.use(cors());
app.use(helmet());

// Health endpoint
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
  if (verbose) payload.dbInfo = { hostProvided: !!process.env.DATABASE_URL };
  res.status(dbHealthyNow ? 200 : 503).json(payload);
});

// Routes
console.log('[startup] Registering routes...');
app.use('/api/auth', authRouter);
app.use('/api/inventory', inventoryRouter(inventoryService));
app.use('/api/gold-rates', goldRateRouter(goldRateService));
app.use('/api/catalog', catalogRouter(db));
app.use('/api/parties', partiesRouter(db));

// 404
app.use((req, res) => res.status(404).json({ success: false, error: 'Route not found', path: req.path }));

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[error] Unhandled error on', req.method, req.path, ':', err?.message || err);
  res.status(err?.status || 500).json({ success: false, error: err?.message || 'Internal server error' });
});

// Cron job
const goldRateUpdateJob = new CronJob('*/5 * * * *', async () => {
  console.log('[cron] Running gold rate auto-update...');
  try { await goldRateService.autoUpdateRates(); console.log('[cron] Gold rates updated successfully'); }
  catch (error: any) { console.error('[cron] ❌ Failed to update gold rates:', error?.message || error); }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`[startup] ✅ Server listening on port ${PORT}`);
  console.log(`[startup] 🌐 Health check: http://localhost:${PORT}/health`);
  db.healthCheck().then(ok => ok ? console.log('[startup] ✅ Database connection verified') : console.warn('[startup] ⚠ Database health check failed — check DATABASE_URL and SSL settings'));
  goldRateUpdateJob.start();
  console.log('[startup] ⏰ Gold rate update cron started (every 5 min)');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[shutdown] SIGTERM received, shutting down gracefully...');
  goldRateUpdateJob.stop();
  server.close(async () => { await db.close(); console.log('[shutdown] ✅ Server closed cleanly'); process.exit(0); });
});

process.on('unhandledRejection', (reason) => console.error('[process] ❌ Unhandled promise rejection:', reason));
process.on('uncaughtException', (err) => { console.error('[process] ❌ Uncaught exception:', err.message, err.stack); process.exit(1); });

export { app, db, inventoryService, goldRateService };
