/**
 * Database Service
 *
 * Manages PostgreSQL database connections and queries using the standard
 * `pg` Pool. Works with any PostgreSQL provider (Railway Postgres,
 * Neon, Turso-pg, self-hosted, etc.).
 * SSL is enforced in production.
 */

import { Pool, QueryResult } from 'pg';

export class DatabaseService {
  private pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL is not set. ' +
        'Copy .env.example to .env and fill in a PostgreSQL connection string.'
      );
    }

    this.pool = new Pool({
      connectionString,
      // Enforce SSL in production; allow self-signed certs in local dev
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: true }
        : { rejectUnauthorized: false },
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    this.pool.on('error', (err: Error) => {
      console.error('Unexpected database error:', err);
    });
  }

  /**
   * Execute a query
   */
  async query(text: string, params?: any[]): Promise<QueryResult> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      console.error('Database query error:', { text, error });
      throw error;
    }
  }

  /**
   * Get a client from the pool for transactions
   */
  async getClient() {
    return this.pool.connect();
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Check database connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      const res = await this.query('SELECT NOW()');
      console.log('[DatabaseService][healthCheck] SELECT NOW result:', res?.rows?.[0]);
      return true;
    } catch (err: any) {
      console.error('[DatabaseService][healthCheck] FAILED:', err?.message || err, err?.stack || 'no-stack');
      try {
        // Attempt direct connection to provide more diagnostics
        const client = await this.pool.connect();
        try {
          const r = await client.query('SELECT version(), current_database()');
          console.log('[DatabaseService][healthCheck] direct client ok:', r.rows[0]);
        } finally {
          client.release();
        }
      } catch (connErr: any) {
        console.error('[DatabaseService][healthCheck] direct connect FAILED:', connErr?.message || connErr, connErr?.stack || 'no-stack');
      }
      return false;
    }
  }
}
