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
import { CronJob } from 'cron';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Initialize services
const db = new DatabaseService();
const goldRateService = new GoldRateService(db);
const inventoryService = new InventoryService(db, goldRateService);

// Health check
app.get('/health', async (req, res) => {
  const dbHealthy = await db.healthCheck();
  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    service: 'jewelry-backend',
  });
});

// Routes
app.use('/api/inventory', inventoryRouter(inventoryService));
app.use('/api/gold-rates', goldRateRouter(goldRateService));
app.use('/api/catalog', catalogRouter(db));
app.use('/api/parties', partiesRouter());

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Cron job: Update gold rates daily at 9 AM
const goldRateUpdateJob = new CronJob('0 9 * * *', async () => {
  console.log('Running daily gold rate update...');
  try {
    await goldRateService.autoUpdateRates();
    console.log('Gold rates updated successfully');
  } catch (error) {
    console.error('Failed to update gold rates:', error);
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Start cron jobs
  goldRateUpdateJob.start();
  console.log('⏰ Gold rate update cron job started');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  goldRateUpdateJob.stop();
  server.close(async () => {
    await db.close();
    console.log('Server closed');
    process.exit(0);
  });
});

export { app, db, inventoryService, goldRateService };
