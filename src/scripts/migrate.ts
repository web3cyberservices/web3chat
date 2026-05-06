import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('[Migration] Starting database schema initialization...');
    
    // 1. Таблица логов аудита (технические результаты запросов)
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        domain VARCHAR(255) NOT NULL,
        status_code INTEGER,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 2. Таблица найденных нарушений (результаты парсинга)
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

    // 3. Таблица системных событий (логи работы движка)
    await client.query(`
      CREATE TABLE IF NOT EXISTS bot_events (
        id SERIAL PRIMARY KEY,
        type VARCHAR(20) NOT NULL,
        message TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Таблица настроек бота (контроль состояния)
    await client.query(`
      CREATE TABLE IF NOT EXISTS bot_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        is_active BOOLEAN DEFAULT true,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT one_row CHECK (id = 1)
      );
    `);

    // 5. Таблица очереди сканирования
    await client.query(`
      CREATE TABLE IF NOT EXISTS scan_queue (
        id SERIAL PRIMARY KEY,
        url TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Инициализация настроек (если еще не созданы)
    await client.query(`
      INSERT INTO bot_settings (id, is_active)
      VALUES (1, true)
      ON CONFLICT (id) DO NOTHING;
    `);

    // Начальный посев очереди для запуска процесса
    await client.query(`
      INSERT INTO scan_queue (url)
      VALUES 
        ('https://google.com'),
        ('https://github.com'),
        ('https://microsoft.com'),
        ('https://wikipedia.org')
      ON CONFLICT (url) DO NOTHING;
    `);
    
    console.log('[Migration] All tables and initial data created successfully.');
  } catch (err) {
    console.error('[Migration] Critical Error during migration:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
