/**
 * Express Server Entry Point
 */
import { DatabaseService } from './services/database/DatabaseService';
import { GoldRateService } from './services/gold-rate/GoldRateService';
import { InventoryService } from './modules/inventory/inventory.service';
declare const app: import("express-serve-static-core").Express;
declare const db: DatabaseService;
declare const goldRateService: GoldRateService;
declare const inventoryService: InventoryService;
export { app, db, inventoryService, goldRateService };
//# sourceMappingURL=server.d.ts.map