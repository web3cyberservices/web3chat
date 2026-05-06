import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('[Migration] Starting...');
    
    // Таблица логов аудита
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        domain VARCHAR(255) NOT NULL,
        status_code INTEGER,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Таблица найденных нарушений
    await client.query(`
      CREATE TABLE IF NOT EXISTS scan_issues (
        id SERIAL PRIMARY KEY,
        domain VARCHAR(255) NOT NULL,
        issue_type VARCHAR(100) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Таблица системных событий
    await client.query(`
      CREATE TABLE IF NOT EXISTS bot_events (
        id SERIAL PRIMARY KEY,
        type VARCHAR(20) NOT NULL,
        message TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Таблица настроек бота
    await client.query(`
      CREATE TABLE IF NOT EXISTS bot_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        is_active BOOLEAN DEFAULT true,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT one_row CHECK (id = 1)
      );
    `);

    // Таблица очереди сканирования
    await client.query(`
      CREATE TABLE IF NOT EXISTS scan_queue (
        id SERIAL PRIMARY KEY,
        url TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Инициализация настроек
    await client.query(`
      INSERT INTO bot_settings (id, is_active)
      VALUES (1, true)
      ON CONFLICT (id) DO NOTHING;
    `);

    // Начальный посев очереди для демонстрации
    await client.query(`
      INSERT INTO scan_queue (url)
      VALUES 
        ('https://google.com'),
        ('https://github.com'),
        ('https://microsoft.com')
      ON CONFLICT (url) DO NOTHING;
    `);
    
    console.log('[Migration] All tables and initial data created successfully.');
  } catch (err) {
    console.error('[Migration] Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
