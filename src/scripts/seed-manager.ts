
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('[Seed] ERROR: DATABASE_URL is not defined in .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function seed() {
  // Use environment variables for the initial admin account
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'InitialAdminPassword123!';
  const name = process.env.ADMIN_NAME || 'Compliance Manager';

  if (!process.env.ADMIN_PASSWORD) {
    console.warn('[Seed] WARNING: ADMIN_PASSWORD not found in .env. Using default insecure password.');
  }

  const maskedUrl = dbUrl!.replace(/:([^:@]+)@/, ':****@');
  console.log(`[Seed] Connecting to: ${maskedUrl}`);

  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.users (
        id SERIAL PRIMARY KEY,
        email varchar(255) UNIQUE NOT NULL,
        password varchar(255) NOT NULL,
        name varchar(255),
        created_at timestamp DEFAULT NOW()
      );
    `);

    const res = await client.query(
      `INSERT INTO public.users (email, password, name) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (email) DO UPDATE SET password = $2, name = $3
       RETURNING id;`,
      [email.toLowerCase().trim(), password, name]
    );

    console.log(`[Seed] SUCCESS: Admin account ${email} is ready in the database (ID: ${res.rows[0].id}).`);
  } catch (error: any) {
    console.error('[Seed] ERROR:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
