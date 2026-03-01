/**
 * Database Service
 *
 * Manages PostgreSQL database connections and queries.
 * Uses Supabase as the database provider — Supabase is fully
 * PostgreSQL-compatible so the standard `pg` Pool works unchanged.
 * SSL is always enforced because Supabase requires it.
 */

import { Pool, QueryResult } from 'pg';

export class DatabaseService {
  private pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL is not set. ' +
        'Copy .env.example to .env and fill in your Supabase connection string.'
      );
    }

    this.pool = new Pool({
      connectionString,
      // Supabase requires SSL — disable cert verification only for local dev
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: true }
        : { rejectUnauthorized: false },
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    this.pool.on('error', (err) => {
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
      await this.query('SELECT NOW()');
      return true;
    } catch {
      return false;
    }
  }
}
