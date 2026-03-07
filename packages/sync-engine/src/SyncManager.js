/**
 * SyncManager - Offline-First Synchronization Engine
 *
 * Handles bidirectional sync between local SQLite and remote PostgreSQL
 * with conflict resolution and queue management.
 */
import axios from 'axios';
import { SyncStatus, } from '@jewelry-platform/shared-types';
export class SyncManager {
    constructor(config, localStorage) {
        this.syncInterval = null;
        this.isSyncing = false;
        this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
        /**
         * Handle online event
         */
        this.handleOnline = () => {
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
        this.handleOffline = () => {
            console.log('[SyncManager] Network offline');
            this.isOnline = false;
        };
        this.config = {
            syncInterval: 5 * 60 * 1000, // 5 minutes default
            maxRetries: 3,
            batchSize: 50,
            onSyncStart: () => { },
            onSyncComplete: () => { },
            onSyncError: () => { },
            onConflict: async () => 'remote', // Default to remote version
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
    startAutoSync() {
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
    stopAutoSync() {
        console.log('[SyncManager] Stopping auto-sync...');
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }
    /**
     * Manual sync trigger
     */
    async sync() {
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
            const response = {
                success: true,
                synced: pushResult.synced + pullResult.synced,
                failed: pushResult.failed + pullResult.failed,
                conflicts,
                lastSyncTimestamp: new Date(),
            };
            this.config.onSyncComplete(response);
            console.log('[SyncManager] Sync completed:', response);
            return response;
        }
        catch (error) {
            console.error('[SyncManager] Sync failed:', error);
            this.config.onSyncError(error);
            throw error;
        }
        finally {
            this.isSyncing = false;
        }
    }
    /**
     * Push local changes to server
     */
    async pushLocalChanges() {
        console.log('[SyncManager] Pushing local changes...');
        const operations = await this.localStorage.getQueuedOperations(this.config.batchSize);
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
            }
            catch (error) {
                console.error(`[SyncManager] Failed to push operation ${operation.id}:`, error);
                // Update retry count
                const newRetryCount = operation.retryCount + 1;
                if (newRetryCount >= this.config.maxRetries) {
                    await this.localStorage.updateQueueStatus(operation.id, SyncStatus.FAILED, error.message);
                    failed++;
                }
                else {
                    await this.localStorage.updateQueueStatus(operation.id, SyncStatus.PENDING);
                }
            }
        }
        console.log(`[SyncManager] Push complete: ${synced} synced, ${failed} failed`);
        return { synced, failed };
    }
    /**
     * Push a single operation to server
     */
    async pushOperation(operation) {
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
    async pullRemoteChanges() {
        console.log('[SyncManager] Pulling remote changes...');
        const lastSync = await this.localStorage.getLastSyncTimestamp();
        try {
            const response = await this.apiClient.get('/sync/changes', {
                params: {
                    shopId: this.config.shopId,
                    since: lastSync?.toISOString(),
                },
            });
            const changes = response.data.data || [];
            let synced = 0;
            let failed = 0;
            for (const change of changes) {
                try {
                    await this.applyRemoteChange(change);
                    synced++;
                }
                catch (error) {
                    console.error('[SyncManager] Failed to apply remote change:', error);
                    failed++;
                }
            }
            console.log(`[SyncManager] Pull complete: ${synced} synced, ${failed} failed`);
            return { synced, failed };
        }
        catch (error) {
            console.error('[SyncManager] Failed to pull remote changes:', error);
            return { synced: 0, failed: 0 };
        }
    }
    /**
     * Apply a remote change to local storage
     */
    async applyRemoteChange(remoteEntity) {
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
        }
        else {
            // Remote is newer or same - update local
            await this.localStorage.updateEntity(entityType, remoteEntity.id, remoteEntity);
        }
    }
    /**
     * Handle pending conflicts
     */
    async handleConflicts() {
        const conflicts = await this.localStorage.getPendingConflicts();
        if (conflicts.length === 0) {
            return [];
        }
        console.log(`[SyncManager] Handling ${conflicts.length} conflicts...`);
        const unresolvedConflicts = [];
        for (const conflict of conflicts) {
            try {
                const resolution = await this.config.onConflict(conflict);
                let resolvedData;
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
                await this.apiClient.put(`${this.getEndpoint(conflict.entity, 'UPDATE')}/${conflict.entityId}`, resolvedData);
                // Mark conflict as resolved
                await this.localStorage.resolveConflict(conflict.id);
            }
            catch (error) {
                console.error(`[SyncManager] Failed to resolve conflict ${conflict.id}:`, error);
                unresolvedConflicts.push(conflict);
            }
        }
        return unresolvedConflicts;
    }
    /**
     * Merge local and remote versions (Last-Write-Wins strategy)
     */
    mergeVersions(local, remote) {
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
    async queueOperation(entity, entityId, operation, data) {
        const syncOperation = {
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
    getEndpoint(entity, operation) {
        const entityMap = {
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
    getEntityType(entity) {
        // This would be determined by entity structure or type field
        // For now, return a placeholder
        return 'PRODUCT';
    }
    /**
     * Check if currently syncing
     */
    getIsSyncing() {
        return this.isSyncing;
    }
    /**
     * Check if online
     */
    getIsOnline() {
        return this.isOnline;
    }
    /**
     * Cleanup resources
     */
    destroy() {
        this.stopAutoSync();
        if (typeof window !== 'undefined') {
            window.removeEventListener('online', this.handleOnline);
            window.removeEventListener('offline', this.handleOffline);
        }
    }
}
//# sourceMappingURL=SyncManager.js.map