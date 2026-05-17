
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * @fileOverview Website Extractor V1.0
 * Pulls real business domain names from European catalogs and inserts them into the bot's scan queue.
 */

if (!process.env.DATABASE_URL) {
  console.error('[Extractor] ERROR: DATABASE_URL is missing in .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Target sections to extract business websites from
const TARGET_CATALOGS = [
  'https://www.europages.co.uk/companies/Germany/construction.html',
  'https://www.europages.co.uk/companies/Germany/manufacturing.html',
  'https://www.europages.co.uk/companies/Germany/technology.html'
];

async function extract() {
  console.log('==================================================');
  console.log('   HUMANGO WEBSITE EXTRACTOR V1.0                 ');
  console.log('==================================================');
  
  const client = await pool.connect();
  
  try {
    for (const catalogUrl of TARGET_CATALOGS) {
      console.log(`[Extractor] Fetching catalog: ${catalogUrl}`);
      
      const { data } = await axios.get(catalogUrl, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 15000
      });
      
      const $ = cheerio.load(data);
      const foundWebsites: Set<string> = new Set();

      // Look for external links that look like company websites
      $('a').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          try {
            const url = new URL(href);
            // Basic heuristic: exclude social media and the catalog domain itself
            const isInternal = url.hostname.includes('europages') || url.hostname.includes('kompass') || url.hostname.includes('google');
            const isSocial = ['facebook.com', 'twitter.com', 'linkedin.com', 'instagram.com'].some(s => url.hostname.includes(s));
            
            if (!isInternal && !isSocial && (url.protocol === 'http:' || url.protocol === 'https:')) {
              // Normalize to domain only for the queue
              foundWebsites.add(`${url.protocol}//${url.hostname}`);
            }
          } catch (e) {
            // Not a valid absolute URL
          }
        }
      });

      console.log(`[Extractor] Discovered ${foundWebsites.size} potential targets on this page.`);

      let insertedCount = 0;
      for (const site of foundWebsites) {
        try {
          const res = await client.query(
            `INSERT INTO public.scan_queue (url, status, priority) 
             VALUES ($1, 'pending', 1) 
             ON CONFLICT (url) DO NOTHING;`,
            [site]
          );
          if (res.rowCount && res.rowCount > 0) insertedCount++;
        } catch (dbErr) {
          // Skip individual errors
        }
      }
      
      console.log(`[Extractor] Successfully queued ${insertedCount} new targets.`);
    }
    
    console.log('==================================================');
    console.log('[Extractor] Operation complete.');
  } catch (err: any) {
    console.error('[Extractor] Critical failure:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

extract();
