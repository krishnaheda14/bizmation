/**
 * SyncManager - Offline-First Synchronization Engine
 * 
 * Handles bidirectional sync between local SQLite and remote PostgreSQL
 * with conflict resolution and queue management.
 */

import axios, { AxiosInstance } from 'axios';
import {
  SyncOperation,
  SyncStatus,
  SyncConflict,
  SyncResponse,
  SyncEntity,
} from '@jewelry-platform/shared-types';

export interface SyncConfig {
  apiUrl: string;
  authToken: string;
  shopId: string;
  syncInterval?: number; // milliseconds
  maxRetries?: number;
  batchSize?: number;
  onSyncStart?: () => void;
  onSyncComplete?: (response: SyncResponse) => void;
  onSyncError?: (error: Error) => void;
  onConflict?: (conflict: SyncConflict) => Promise<'local' | 'remote' | 'merge'>;
}

export interface LocalStorage {
  // Queue operations
  addToQueue(operation: SyncOperation): Promise<void>;
  getQueuedOperations(limit: number): Promise<SyncOperation[]>;
  removeFromQueue(operationId: string): Promise<void>;
  updateQueueStatus(operationId: string, status: SyncStatus, error?: string): Promise<void>;
  
  // Entity operations
  getEntity(entity: string, entityId: string): Promise<SyncEntity | null>;
  updateEntity(entity: string, entityId: string, data: Partial<SyncEntity>): Promise<void>;
  
  // Sync metadata
  getLastSyncTimestamp(): Promise<Date | null>;
  setLastSyncTimestamp(timestamp: Date): Promise<void>;
  
  // Conflict management
  saveConflict(conflict: SyncConflict): Promise<void>;
  getPendingConflicts(): Promise<SyncConflict[]>;
  resolveConflict(conflictId: string): Promise<void>;
}

export class SyncManager {
  private config: Required<SyncConfig>;
  private localStorage: LocalStorage;
  private apiClient: AxiosInstance;
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  constructor(config: SyncConfig, localStorage: LocalStorage) {
    this.config = {
      syncInterval: 5 * 60 * 1000, // 5 minutes default
      maxRetries: 3,
      batchSize: 50,
      onSyncStart: () => {},
      onSyncComplete: () => {},
      onSyncError: () => {},
      onConflict: async () => 'remote' as const, // Default to remote version
      ...config,
    };
    this.localStorage = localStorage;
    
    this.apiClient = axios.create({
      baseURL: config.apiUrl,
      headers: {
        Authorization: `Bearer ${config.authToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Listen to online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  /**
   * Start automatic synchronization
   */
  public startAutoSync(): void {
    console.log('[SyncManager] Starting auto-sync...');
    
    // Initial sync
    this.sync();
    
    // Schedule periodic syncs
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.sync();
      }
    }, this.config.syncInterval);
  }

  /**
   * Stop automatic synchronization
   */
  public stopAutoSync(): void {
    console.log('[SyncManager] Stopping auto-sync...');
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Manual sync trigger
   */
  public async sync(): Promise<SyncResponse> {
    if (!this.isOnline) {
      console.log('[SyncManager] Offline - sync skipped');
      return {
        success: false,
        synced: 0,
        failed: 0,
        conflicts: [],
        lastSyncTimestamp: new Date(),
      };
    }

    if (this.isSyncing) {
      console.log('[SyncManager] Sync already in progress');
      return {
        success: false,
        synced: 0,
        failed: 0,
        conflicts: [],
        lastSyncTimestamp: new Date(),
      };
    }

    this.isSyncing = true;
    this.config.onSyncStart();

    try {
      // Phase 1: Push local changes to server
      const pushResult = await this.pushLocalChanges();
      
      // Phase 2: Pull remote changes to local
      const pullResult = await this.pullRemoteChanges();
      
      // Phase 3: Handle conflicts
      const conflicts = await this.handleConflicts();
      
      // Update last sync timestamp
      await this.localStorage.setLastSyncTimestamp(new Date());
      
      const response: SyncResponse = {
        success: true,
        synced: pushResult.synced + pullResult.synced,
        failed: pushResult.failed + pullResult.failed,
        conflicts,
        lastSyncTimestamp: new Date(),
      };

      this.config.onSyncComplete(response);
      console.log('[SyncManager] Sync completed:', response);
      
      return response;
    } catch (error) {
      console.error('[SyncManager] Sync failed:', error);
      this.config.onSyncError(error as Error);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Push local changes to server
   */
  private async pushLocalChanges(): Promise<{ synced: number; failed: number }> {
    console.log('[SyncManager] Pushing local changes...');
    
    const operations = await this.localStorage.getQueuedOperations(
      this.config.batchSize
    );

    if (operations.length === 0) {
      console.log('[SyncManager] No local changes to push');
      return { synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;

    for (const operation of operations) {
      try {
        await this.pushOperation(operation);
        await this.localStorage.removeFromQueue(operation.id);
        synced++;
      } catch (error) {
        console.error(`[SyncManager] Failed to push operation ${operation.id}:`, error);
        
        // Update retry count
        const newRetryCount = operation.retryCount + 1;
        
        if (newRetryCount >= this.config.maxRetries) {
          await this.localStorage.updateQueueStatus(
            operation.id,
            SyncStatus.FAILED,
            (error as Error).message
          );
          failed++;
        } else {
          await this.localStorage.updateQueueStatus(
            operation.id,
            SyncStatus.PENDING
          );
        }
      }
    }

    console.log(`[SyncManager] Push complete: ${synced} synced, ${failed} failed`);
    return { synced, failed };
  }

  /**
   * Push a single operation to server
   */
  private async pushOperation(operation: SyncOperation): Promise<void> {
    const endpoint = this.getEndpoint(operation.entity, operation.operation);
    
    switch (operation.operation) {
      case 'CREATE':
        await this.apiClient.post(endpoint, operation.data);
        break;
      case 'UPDATE':
        await this.apiClient.put(`${endpoint}/${operation.entityId}`, operation.data);
        break;
      case 'DELETE':
        await this.apiClient.delete(`${endpoint}/${operation.entityId}`);
        break;
    }
  }

  /**
   * Pull remote changes from server
   */
  private async pullRemoteChanges(): Promise<{ synced: number; failed: number }> {
    console.log('[SyncManager] Pulling remote changes...');
    
    const lastSync = await this.localStorage.getLastSyncTimestamp();
    
    try {
      const response = await this.apiClient.get('/sync/changes', {
        params: {
          shopId: this.config.shopId,
          since: lastSync?.toISOString(),
        },
      });

      const changes: SyncEntity[] = response.data.data || [];
      let synced = 0;
      let failed = 0;

      for (const change of changes) {
        try {
          await this.applyRemoteChange(change);
          synced++;
        } catch (error) {
          console.error('[SyncManager] Failed to apply remote change:', error);
          failed++;
        }
      }

      console.log(`[SyncManager] Pull complete: ${synced} synced, ${failed} failed`);
      return { synced, failed };
    } catch (error) {
      console.error('[SyncManager] Failed to pull remote changes:', error);
      return { synced: 0, failed: 0 };
    }
  }

  /**
   * Apply a remote change to local storage
   */
  private async applyRemoteChange(remoteEntity: SyncEntity): Promise<void> {
    const entityType = this.getEntityType(remoteEntity);
    const localEntity = await this.localStorage.getEntity(entityType, remoteEntity.id);

    if (!localEntity) {
      // New entity from server - just save it
      await this.localStorage.updateEntity(entityType, remoteEntity.id, remoteEntity);
      return;
    }

    // Check for conflicts
    if (localEntity.version > remoteEntity.version) {
      // Local is newer - potential conflict
      await this.localStorage.saveConflict({
        id: `${entityType}-${remoteEntity.id}-${Date.now()}`,
        entity: entityType,
        entityId: remoteEntity.id,
        localVersion: localEntity,
        remoteVersion: remoteEntity,
        timestamp: new Date(),
        resolved: false,
      });
    } else {
      // Remote is newer or same - update local
      await this.localStorage.updateEntity(entityType, remoteEntity.id, remoteEntity);
    }
  }

  /**
   * Handle pending conflicts
   */
  private async handleConflicts(): Promise<SyncConflict[]> {
    const conflicts = await this.localStorage.getPendingConflicts();
    
    if (conflicts.length === 0) {
      return [];
    }

    console.log(`[SyncManager] Handling ${conflicts.length} conflicts...`);
    const unresolvedConflicts: SyncConflict[] = [];

    for (const conflict of conflicts) {
      try {
        const resolution = await this.config.onConflict(conflict);
        
        let resolvedData: any;
        
        switch (resolution) {
          case 'local':
            resolvedData = conflict.localVersion;
            break;
          case 'remote':
            resolvedData = conflict.remoteVersion;
            break;
          case 'merge':
            resolvedData = this.mergeVersions(conflict.localVersion, conflict.remoteVersion);
            break;
        }

        // Apply resolved version
        await this.localStorage.updateEntity(conflict.entity, conflict.entityId, resolvedData);
        
        // Push resolved version to server
        await this.apiClient.put(
          `${this.getEndpoint(conflict.entity, 'UPDATE')}/${conflict.entityId}`,
          resolvedData
        );
        
        // Mark conflict as resolved
        await this.localStorage.resolveConflict(conflict.id);
      } catch (error) {
        console.error(`[SyncManager] Failed to resolve conflict ${conflict.id}:`, error);
        unresolvedConflicts.push(conflict);
      }
    }

    return unresolvedConflicts;
  }

  /**
   * Merge local and remote versions (Last-Write-Wins strategy)
   */
  private mergeVersions(local: SyncEntity, remote: SyncEntity): SyncEntity {
    // Use the most recently updated version as base
    const base = local.updatedAt > remote.updatedAt ? local : remote;
    
    // Merge non-conflicting fields
    return {
      ...base,
      version: Math.max(local.version, remote.version) + 1,
      syncStatus: SyncStatus.SYNCED,
      lastSyncedAt: new Date(),
    };
  }

  /**
   * Queue an operation for sync
   */
  public async queueOperation(
    entity: SyncOperation['entity'],
    entityId: string,
    operation: SyncOperation['operation'],
    data: any
  ): Promise<void> {
    const syncOperation: SyncOperation = {
      id: `${entity}-${entityId}-${Date.now()}`,
      entity,
      entityId,
      operation,
      data,
      timestamp: new Date(),
      status: SyncStatus.PENDING,
      retryCount: 0,
    };

    await this.localStorage.addToQueue(syncOperation);
    console.log(`[SyncManager] Queued operation: ${operation} ${entity} ${entityId}`);
    
    // Trigger immediate sync if online
    if (this.isOnline && !this.isSyncing) {
      this.sync();
    }
  }

  /**
   * Get API endpoint for entity and operation
   */
  private getEndpoint(entity: string, operation: string): string {
    const entityMap: Record<string, string> = {
      PRODUCT: '/products',
      TRANSACTION: '/transactions',
      CUSTOMER: '/customers',
      INVOICE: '/invoices',
      METAL_LOT: '/metal-lots',
    };

    return entityMap[entity] || `/${entity.toLowerCase()}s`;
  }

  /**
   * Get entity type from sync entity
   */
  private getEntityType(entity: SyncEntity): string {
    // This would be determined by entity structure or type field
    // For now, return a placeholder
    return 'PRODUCT';
  }

  /**
   * Handle online event
   */
  private handleOnline = (): void => {
    console.log('[SyncManager] Network online');
    this.isOnline = true;
    
    // Trigger sync when coming back online
    if (!this.isSyncing) {
      this.sync();
    }
  };

  /**
   * Handle offline event
   */
  private handleOffline = (): void => {
    console.log('[SyncManager] Network offline');
    this.isOnline = false;
  };

  /**
   * Check if currently syncing
   */
  public getIsSyncing(): boolean {
    return this.isSyncing;
  }

  /**
   * Check if online
   */
  public getIsOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.stopAutoSync();
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
  }
}
