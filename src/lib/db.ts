import { Pool } from 'pg';

/**
 * @fileOverview Database connection and operations for audit logging.
 * Uses PostgreSQL via the 'pg' library.
 */

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Saves a crawl result to the audit_logs table.
 * 
 * @param domain - The scanned domain name.
 * @param statusCode - HTTP response status code.
 * @param errorMessage - Any error message encountered, or null.
 */
export async function saveAuditLog(domain: string, statusCode: number, errorMessage: string | null) {
  const query = `
    INSERT INTO audit_logs (domain, status_code, error_message, created_at)
    VALUES ($1, $2, $3, NOW())
  `;
  const values = [domain, statusCode, errorMessage];

  try {
    const client = await pool.connect();
    try {
      await client.query(query, values);
      return { success: true };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[DB Error] Failed to save audit log:', error);
    // We don't want database failures to crash the crawler, just log it.
    return { success: false, error };
  }
}