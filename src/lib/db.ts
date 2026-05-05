import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

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
    return { success: false, error };
  }
}

export async function saveScanIssueToDb(domain: string, issue: any) {
  const query = `
    INSERT INTO scan_issues (domain, issue_type, severity, description, created_at)
    VALUES ($1, $2, $3, $4, NOW())
  `;
  const values = [domain, issue.type, issue.severity, issue.description];

  try {
    const client = await pool.connect();
    try {
      await client.query(query, values);
      return { success: true };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[DB Error] Failed to save scan issue:', error);
    return { success: false, error };
  }
}