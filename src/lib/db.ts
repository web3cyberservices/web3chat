
import { Pool } from 'pg';
import { Violation, ScanType } from '@/types';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing in environment variables!');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

function sanitize(text: string | null | undefined, fallback: string = ''): string {
  if (!text) return fallback;
  return String(text).trim().replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
}

export function normalizeUrl(url: string, base?: string): string {
  try {
    let target = url.trim();
    if (base) {
      const baseUrl = base.startsWith('http') ? base : `https://${base}`;
      return new URL(target, baseUrl).href.toLowerCase();
    }
    if (!target.startsWith('http')) target = `https://${target}`;
    const u = new URL(target);
    u.hash = ''; u.search = '';
    return u.href.toLowerCase();
  } catch (e) {
    return 'invalid-target';
  }
}

export async function queueTask(url: string, email: string, priority: number = 0) {
  const cleanUrl = normalizeUrl(url);
  await pool.query(
    `INSERT INTO public.scan_queue (url, status, priority, user_email, created_at) VALUES ($1, 'pending', $2, $3, NOW()) ON CONFLICT (url) DO UPDATE SET status = 'pending', priority = $2, user_email = $3;`,
    [cleanUrl, priority, email]
  );
  return cleanUrl;
}

export async function getTaskStatus(url: string) {
  const res = await pool.query('SELECT status FROM public.scan_queue WHERE url = $1', [normalizeUrl(url)]);
  return res.rows[0] || null;
}

export async function saveAuditResults(domain: string, url: string, violations: Violation[], scanType: ScanType = 'basic') {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const v of violations) {
      await client.query(`
        INSERT INTO site_violations (domain, url, page_url, category, issue_type, severity, evidence_html, description, law_name, recommendation, scan_type, report_type, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
        [sanitize(domain), sanitize(url), sanitize(url), v.category, v.issue_type, v.severity, sanitize(url), sanitize(v.description), sanitize(v.law_name), sanitize(v.recommendation), scanType, v.report_type]
      );
    }
    await client.query('COMMIT');
    return { success: true };
  } catch (e) {
    await client.query('ROLLBACK');
    return { success: false };
  } finally {
    client.release();
  }
}

export async function saveBotEvent(type: string, message: string) {
  await pool.query('INSERT INTO bot_events (type, message, timestamp) VALUES ($1, $2, NOW())', [type, sanitize(message)]);
}

export async function getBotStatus(): Promise<boolean> {
  const res = await pool.query('SELECT is_active FROM bot_settings WHERE id = 1');
  return res.rows[0]?.is_active ?? true;
}

export async function getNextQueueItem() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query("SELECT id, url, user_email FROM scan_queue WHERE status = 'pending' ORDER BY priority DESC, id ASC LIMIT 1 FOR UPDATE SKIP LOCKED");
    const task = res.rows[0];
    if (task) await client.query("UPDATE scan_queue SET status = 'processing' WHERE id = $1", [task.id]);
    await client.query('COMMIT');
    return task || null;
  } catch (e) {
    await client.query('ROLLBACK');
    return null;
  } finally {
    client.release();
  }
}

export async function updateQueueStatus(id: number, status: string) {
  await pool.query('UPDATE scan_queue SET status = $1 WHERE id = $2', [status, id]);
}

export async function testConnection() {
  const client = await pool.connect();
  try { await client.query('SELECT 1'); return true; } finally { client.release(); }
}
