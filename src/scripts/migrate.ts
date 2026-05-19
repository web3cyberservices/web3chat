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
    console.log('[Migration] Starting Lead Triage database update...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.scan_queue (
        id SERIAL PRIMARY KEY, 
        url text UNIQUE, 
        status varchar(50) DEFAULT 'pending', 
        priority int DEFAULT 0, 
        user_email varchar(255),
        assigned_to int,
        manager_name varchar(255),
        assigned_at timestamp,
        created_at timestamp DEFAULT NOW(),
        crm_status varchar(50) DEFAULT 'ready_for_sales',
        violations_count int DEFAULT 0,
        audit_findings jsonb DEFAULT '[]'::jsonb,
        extracted_emails jsonb DEFAULT '[]'::jsonb,
        extracted_phones jsonb DEFAULT '[]'::jsonb,
        closing_price decimal(12,2),
        pdf_report_path varchar(500),
        analyst_notes text,
        auto_message_sent boolean DEFAULT false,
        auto_message_sent_at timestamp
      );
    `);

    const columns = [
      { name: 'audit_findings', type: 'jsonb DEFAULT \'[]\'::jsonb' },
      { name: 'extracted_emails', type: 'jsonb DEFAULT \'[]\'::jsonb' },
      { name: 'extracted_phones', type: 'jsonb DEFAULT \'[]\'::jsonb' },
      { name: 'closing_price', type: 'decimal(12,2)' },
      { name: 'crm_status', type: 'varchar(50) DEFAULT \'ready_for_sales\'' },
      { name: 'analyst_notes', type: 'text' }
    ];

    for (const col of columns) {
      await client.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='scan_queue' AND column_name='${col.name}') THEN
            ALTER TABLE public.scan_queue ADD COLUMN ${col.name} ${col.type};
          END IF;
        END $$;
      `);
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.site_violations (
        id SERIAL PRIMARY KEY,
        domain varchar(255),
        page_url text,
        issue_type varchar(255),
        severity varchar(50),
        description text,
        law_name text,
        recommendation text,
        business_impact text,
        potential_fine text,
        country varchar(10),
        explanation text,
        created_at timestamp DEFAULT NOW()
      );
    `);

    const violationCols = [
      { name: 'potential_fine', type: 'text' },
      { name: 'country', type: 'varchar(10)' },
      { name: 'business_impact', type: 'text' }
    ];

    for (const col of violationCols) {
      await client.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_violations' AND column_name='${col.name}') THEN
            ALTER TABLE public.site_violations ADD COLUMN ${col.name} ${col.type};
          END IF;
        END $$;
      `);
    }

    await client.query(`CREATE TABLE IF NOT EXISTS public.bot_settings (id int PRIMARY KEY DEFAULT 1, is_active boolean DEFAULT true, updated_at timestamp DEFAULT NOW());`);
    await client.query(`CREATE TABLE IF NOT EXISTS public.bot_events (id SERIAL PRIMARY KEY, type varchar(50), message text, timestamp timestamp DEFAULT NOW());`);
    await client.query(`INSERT INTO public.bot_settings (id, is_active) VALUES (1, true) ON CONFLICT DO NOTHING;`);

    console.log('[Migration] SUCCESS: Database is up to date.');
  } catch (err: any) { 
    console.error('[Migration] ERROR:', err.message); 
  } finally { 
    client.release(); 
    await pool.end(); 
  }
}

migrate();
