/**
 * Database Service
 *
 * Manages PostgreSQL database connections and queries using the standard
 * `pg` Pool. Works with any PostgreSQL provider (Railway Postgres,
 * Neon, Turso-pg, self-hosted, etc.).
 * SSL is enforced in production.
 */
export declare class DatabaseService {
    private pool;
    constructor();
    /**
     * Execute a query
     */
    query(text: string, params?: any[]): Promise<QueryResult>;
    /**
     * Get a client from the pool for transactions
     */
    getClient(): Promise<any>;
    /**
     * Close all connections
     */
    close(): Promise<void>;
    /**
     * Check database connection
     */
    healthCheck(): Promise<boolean>;
}
//# sourceMappingURL=DatabaseService.d.ts.map