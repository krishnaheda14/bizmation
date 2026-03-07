/**
 * SyncManager - Offline-First Synchronization Engine
 *
 * Handles bidirectional sync between local SQLite and remote PostgreSQL
 * with conflict resolution and queue management.
 */
export interface SyncConfig {
    apiUrl: string;
    authToken: string;
    shopId: string;
    syncInterval?: number;
    maxRetries?: number;
    batchSize?: number;
    onSyncStart?: () => void;
    onSyncComplete?: (response: SyncResponse) => void;
    onSyncError?: (error: Error) => void;
    onConflict?: (conflict: SyncConflict) => Promise<'local' | 'remote' | 'merge'>;
}
export interface LocalStorage {
    addToQueue(operation: SyncOperation): Promise<void>;
    getQueuedOperations(limit: number): Promise<SyncOperation[]>;
    removeFromQueue(operationId: string): Promise<void>;
    updateQueueStatus(operationId: string, status: SyncStatus, error?: string): Promise<void>;
    getEntity(entity: string, entityId: string): Promise<SyncEntity | null>;
    updateEntity(entity: string, entityId: string, data: Partial<SyncEntity>): Promise<void>;
    getLastSyncTimestamp(): Promise<Date | null>;
    setLastSyncTimestamp(timestamp: Date): Promise<void>;
    saveConflict(conflict: SyncConflict): Promise<void>;
    getPendingConflicts(): Promise<SyncConflict[]>;
    resolveConflict(conflictId: string): Promise<void>;
}
export declare class SyncManager {
    private config;
    private localStorage;
    private apiClient;
    private syncInterval;
    private isSyncing;
    private isOnline;
    constructor(config: SyncConfig, localStorage: LocalStorage);
    /**
     * Start automatic synchronization
     */
    startAutoSync(): void;
    /**
     * Stop automatic synchronization
     */
    stopAutoSync(): void;
    /**
     * Manual sync trigger
     */
    sync(): Promise<SyncResponse>;
    /**
     * Push local changes to server
     */
    private pushLocalChanges;
    /**
     * Push a single operation to server
     */
    private pushOperation;
    /**
     * Pull remote changes from server
     */
    private pullRemoteChanges;
    /**
     * Apply a remote change to local storage
     */
    private applyRemoteChange;
    /**
     * Handle pending conflicts
     */
    private handleConflicts;
    /**
     * Merge local and remote versions (Last-Write-Wins strategy)
     */
    private mergeVersions;
    /**
     * Queue an operation for sync
     */
    queueOperation(entity: SyncOperation['entity'], entityId: string, operation: SyncOperation['operation'], data: any): Promise<void>;
    /**
     * Get API endpoint for entity and operation
     */
    private getEndpoint;
    /**
     * Get entity type from sync entity
     */
    private getEntityType;
    /**
     * Handle online event
     */
    private handleOnline;
    /**
     * Handle offline event
     */
    private handleOffline;
    /**
     * Check if currently syncing
     */
    getIsSyncing(): boolean;
    /**
     * Check if online
     */
    getIsOnline(): boolean;
    /**
     * Cleanup resources
     */
    destroy(): void;
}
//# sourceMappingURL=SyncManager.d.ts.map