/**
 * Gold Rate Controller
 * 
 * Handles gold rate API endpoints
 */

import { Router, Request, Response } from 'express';
import { GoldRateService } from '../../services/gold-rate/GoldRateService';
import { MetalType } from '@jewelry-platform/shared-types';

export function goldRateRouter(goldRateService: GoldRateService): Router {
  const router = Router();

  /**
   * GET /api/gold-rates/current
   * Fetch current gold rate for specified metal and purity
   */
  router.get('/current', async (req: Request, res: Response) => {
    try {
      const { metalType = 'GOLD', purity = 24 } = req.query;
      
      const rate = await goldRateService.getCurrentRate(
        metalType as MetalType,
        Number(purity)
      );
      
      res.json({
        success: true,
        data: rate,
      });
    } catch (error: any) {
      console.error('[Gold Rate API] Error fetching current rate:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch gold rate',
      });
    }
  });

  /**
   * GET /api/gold-rates/fetch-live
   * Force fetch from live source (manual refresh)
   */
  router.get('/fetch-live', async (req: Request, res: Response) => {
    try {
      const { metalType = 'GOLD', purity = 24 } = req.query;
      
      // Force a fresh fetch from upstream and save to database
      const rate = await goldRateService.fetchLiveRate(
        metalType as MetalType,
        Number(purity)
      );
      
      res.json({
        success: true,
        data: rate,
        message: 'Live gold rate fetched successfully',
      });
    } catch (error: any) {
      console.error('[Gold Rate API] Error fetching live rate:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch live gold rate from upstream source',
      });
    }
  });

  /**
   * GET /api/gold-rates/fetch-live-all
   * Force fetch and save for common metals/purities
   */
  router.get('/fetch-live-all', async (req: Request, res: Response) => {
    try {
      await goldRateService.autoUpdateRates();
      res.json({ success: true, message: 'Live gold rates fetched for all common purities' });
    } catch (error: any) {
      console.error('[Gold Rate API] Error fetching live rates for all:', error);
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch live rates' });
    }
  });

  /**
   * POST /api/gold-rates/reconcile
   * Compare upstream API values with DB and update when diff >= thresholdPercent (body or query)
   */
  router.post('/reconcile', async (req: Request, res: Response) => {
    try {
      const threshold = Number(req.body.thresholdPercent ?? req.query.thresholdPercent ?? 0.5);
      const result = await goldRateService.reconcileAndUpdateAll(threshold);
      res.json({ success: true, data: result, message: 'Reconcile complete' });
    } catch (error: any) {
      console.error('[Gold Rate API] Error reconciling rates:', error);
      res.status(500).json({ success: false, error: error?.message || 'Failed to reconcile rates' });
    }
  });

  /**
   * GET /api/gold-rates/history
   * Get historical gold rates
   */
  router.get('/history', async (req: Request, res: Response) => {
    try {
      const { metalType = 'GOLD', purity = 24, days = 30 } = req.query;
      
      const history = await goldRateService.getRateHistory(
        metalType as MetalType,
        Number(purity),
        Number(days)
      );
      
      res.json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      console.error('[Gold Rate API] Error fetching rate history:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch gold rate history',
      });
    }
  });

  /**
   * POST /api/gold-rates/manual-update
   * Manually update gold rate (admin only in production)
   */
  router.post('/manual-update', async (req: Request, res: Response) => {
    try {
      const { metalType, purity, ratePerGram } = req.body;
      
      if (!metalType || !purity || !ratePerGram) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: metalType, purity, ratePerGram',
        });
      }
      
      const rate = await goldRateService.updateRate(
        metalType as MetalType,
        Number(purity),
        Number(ratePerGram)
      );
      
      res.json({
        success: true,
        data: rate,
        message: 'Gold rate updated manually',
      });
    } catch (error: any) {
      console.error('[Gold Rate API] Error updating rate manually:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update gold rate',
      });
    }
  });

  return router;
}
