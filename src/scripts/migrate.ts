
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('[Migration] ERROR: DATABASE_URL is not defined in .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('==================================================');
    console.log('   HUMANGO COMPLIANCE DATABASE MIGRATOR V32.2     ');
    console.log('   Target: PostgreSQL Remote/Local Cluster        ');
    console.log('==================================================');
    
    // 1. Core System Tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.bot_settings (
        id int DEFAULT 1 PRIMARY KEY, 
        is_active boolean DEFAULT true, 
        updated_at timestamp DEFAULT NOW()
      );
      
      INSERT INTO public.bot_settings (id, is_active) 
      VALUES (1, true) 
      ON CONFLICT (id) DO NOTHING;

      CREATE TABLE IF NOT EXISTS public.audit_logs (
        id SERIAL PRIMARY KEY, 
        domain varchar(255), 
        status_code int, 
        error_message text, 
        created_at timestamp DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.bot_events (
        id SERIAL PRIMARY KEY, 
        type varchar(20), 
        message text, 
        timestamp timestamp DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.scan_queue (
        id SERIAL PRIMARY KEY, 
        url text UNIQUE, 
        status varchar(20) DEFAULT 'pending', 
        priority int DEFAULT 0, 
        depth int DEFAULT 0, 
        created_at timestamp DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.validation_logs (
        id SERIAL PRIMARY KEY,
        domain character varying(255),
        url text,
        attempt int,
        status varchar(50),
        findings jsonb,
        confidence_score float DEFAULT 0.0,
        timestamp timestamp DEFAULT NOW()
      );
    `);

    // 2. Site Violations Table (The main storage for audit findings)
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.site_violations (
        id SERIAL PRIMARY KEY,
        domain character varying(255),
        url text,
        page_url text,
        category character varying(50),
        issue_type character varying(100),
        severity character varying(20),
        evidence_html text,
        evidence_quote text,
        confidence_score float DEFAULT 1.0,
        verification_status varchar(50) DEFAULT 'pending',
        snippet text,
        description text,
        explanation text,
        law_name text,
        fine_amount character varying(100),
        recommendation text,
        scan_type character varying(255),
        report_type character varying(20) DEFAULT 'SaaS',
        verification_method character varying(50) DEFAULT 'Static Analysis',
        business_impact text,
        created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. High-Integrity Column Checks (Ensuring schema matches V32.2 code)
    const columnsToEnsure = [
      { table: 'site_violations', name: 'evidence_quote', type: 'text', default: 'NULL' },
      { table: 'site_violations', name: 'confidence_score', type: 'float', default: '1.0' },
      { table: 'site_violations', name: 'verification_status', type: 'varchar(50)', default: "'pending'" },
      { table: 'site_violations', name: 'business_impact', type: 'text', default: 'NULL' },
      { table: 'site_violations', name: 'recommendation', type: 'text', default: 'NULL' },
      { table: 'site_violations', name: 'verification_method', type: 'varchar(50)', default: "'Static Analysis'" },
      { table: 'validation_logs', name: 'confidence_score', type: 'float', default: '0.0' }
    ];

    for (const col of columnsToEnsure) {
      await client.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='${col.table}' AND column_name='${col.name}'
          ) THEN
            EXECUTE 'ALTER TABLE public.${col.table} ADD COLUMN ${col.name} ${col.type} DEFAULT ${col.default}';
            RAISE NOTICE 'Added column % to %', '${col.name}', '${col.table}';
          END IF;
        END $$;
      `);
    }
    
    console.log('[Migration] SUCCESS: Database schema is V32.2 compliant.');
    console.log('[Migration] Ready for production audits.');
  } catch (err: any) {
    console.error('[Migration] CRITICAL ERROR:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
