import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// <-- ЗАПРЕЩАЕМ NEXT.JS ВЫПОЛНЯТЬ ЭТОТ КОД ПРИ СБОРКЕ DOCKER -->
export const dynamic = 'force-dynamic'; 

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
        target_id TEXT NOT NULL,
        payload TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
      CREATE INDEX IF NOT EXISTS idx_messages_target ON messages(target_id);
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
    
    if (!body.payload || !body.targetId) {
      return NextResponse.json({ error: 'Payload or targetId missing' }, { status: 400 });
    }

    const timestamp = body.timestamp || Date.now();
    
    // Сохраняем пакет в Immutable Audit Log
    await pool.query(
      'INSERT INTO messages (timestamp, target_id, payload) VALUES ($1, $2, $3)',
      [timestamp, body.targetId, body.payload]
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
    const targetId = searchParams.get('targetId');

    if (!targetId) {
      return NextResponse.json({ error: 'targetId required' }, { status: 400 });
    }

    // Выбираем только новые сообщения для конкретного пользователя
    const { rows } = await pool.query(
      'SELECT timestamp, payload FROM messages WHERE target_id = $1 AND timestamp > $2 ORDER BY timestamp ASC LIMIT 100',
      [targetId, since]
    );
    
    return NextResponse.json({ messages: rows });
  } catch (e) {
    console.error('[Relay DB] GET failure:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}