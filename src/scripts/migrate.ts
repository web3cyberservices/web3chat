
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
    console.log('[Migration] Starting database update...');
    
    // Core Tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.scan_queue (
        id SERIAL PRIMARY KEY, 
        url text UNIQUE, 
        status varchar(20) DEFAULT 'pending', 
        priority int DEFAULT 0, 
        user_email varchar(255),
        assigned_to int,
        manager_name varchar(255),
        assigned_at timestamp,
        created_at timestamp DEFAULT NOW(),
        crm_status varchar(20) DEFAULT 'free',
        violations_count int DEFAULT 0,
        audit_findings jsonb DEFAULT '[]'::jsonb,
        extracted_emails jsonb DEFAULT '[]'::jsonb,
        extracted_phones jsonb DEFAULT '[]'::jsonb,
        closing_price decimal(12,2)
      );
    `);

    // Ensure columns exist for older DBs
    const cols = [
      { name: 'audit_findings', type: 'jsonb DEFAULT \'[]\'::jsonb' },
      { name: 'extracted_emails', type: 'jsonb DEFAULT \'[]\'::jsonb' },
      { name: 'extracted_phones', type: 'jsonb DEFAULT \'[]\'::jsonb' },
      { name: 'closing_price', type: 'decimal(12,2)' },
      { name: 'priority', type: 'int DEFAULT 0' }
    ];

    for (const col of cols) {
      await client.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='scan_queue' AND column_name='${col.name}') THEN
            ALTER TABLE public.scan_queue ADD COLUMN ${col.name} ${col.type};
          END IF;
        END $$;
      `);
    }

    console.log('[Migration] SUCCESS.');
  } catch (err: any) { console.error('[Migration] ERROR:', err.message); } 
  finally { client.release(); await pool.end(); }
}

migrate();
