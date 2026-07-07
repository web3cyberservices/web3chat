import { NextResponse } from 'next/server';
import { Pool } from 'pg';

/**
 * @fileOverview HTTP Stealth Relay с персистентным хранилищем PostgreSQL.
 * Реализует Immutable Audit Log для зашифрованных сообщений.
 */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

let isInitialized = false;

/**
 * Инициализация таблицы сообщений
 */
async function ensureTableExists() {
  if (isInitialized) return;
  
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        timestamp BIGINT NOT NULL,
        payload TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
    `);
    isInitialized = true;
  } catch (error) {
    console.error('[Relay DB] Initialization error:', error);
  } finally {
    client.release();
  }
}

export async function POST(req: Request) {
  try {
    await ensureTableExists();
    const body = await req.json();
    
    if (!body.payload) {
      return NextResponse.json({ error: 'No payload' }, { status: 400 });
    }

    const timestamp = Date.now();
    
    // Сохраняем пакет в Immutable Audit Log
    await pool.query(
      'INSERT INTO messages (timestamp, payload) VALUES ($1, $2)',
      [timestamp, body.payload]
    );

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[Relay DB] POST failure:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    await ensureTableExists();
    const { searchParams } = new URL(req.url);
    const since = Number(searchParams.get('since') || 0);

    // Выбираем только новые сообщения
    const { rows } = await pool.query(
      'SELECT timestamp, payload FROM messages WHERE timestamp > $1 ORDER BY timestamp ASC LIMIT 100',
      [since]
    );
    
    return NextResponse.json({ messages: rows });
  } catch (e) {
    console.error('[Relay DB] GET failure:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
