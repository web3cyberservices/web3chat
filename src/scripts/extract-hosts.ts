
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * @fileOverview Website Extractor V2.0
 * Собирает домены компаний из крупнейших европейских каталогов (Europages, Kompass).
 */

if (!process.env.DATABASE_URL) {
  console.error('[Extractor] ERROR: DATABASE_URL is missing in .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Расширенный список каталогов для парсинга (Германия, Италия, Великобритания)
const TARGET_CATALOGS = [
  // Europages (DE, IT, UK)
  'https://www.europages.co.uk/companies/Germany/manufacturing.html',
  'https://www.europages.co.uk/companies/Germany/services.html',
  'https://www.europages.co.uk/companies/Italy/manufacturing.html',
  'https://www.europages.co.uk/companies/Italy/construction.html',
  'https://www.europages.co.uk/companies/United-Kingdom/manufacturing.html',
  
  // Kompass (IT, DE)
  'https://it.kompass.com/en/b/manufacturing-and-industry/01/',
  'https://it.kompass.com/en/b/construction-and-civil-engineering/03/',
  'https://de.kompass.com/en/b/manufacturing-and-industry/01/'
];

const FORBIDDEN_DOMAINS = [
  'europages', 'kompass', 'google', 'facebook', 'linkedin', 
  'twitter', 'instagram', 'youtube', 'pinterest', 'apple',
  'microsoft', 'amazon', 'adobe', 'gstatic', 'doubleclick'
];

async function extract() {
  console.log('==================================================');
  console.log('   HUMANGO MULTI-CATALOG EXTRACTOR V2.0           ');
  console.log('   Target: Europages & Kompass Global Nodes       ');
  console.log('==================================================');
  
  const client = await pool.connect();
  
  try {
    for (const catalogUrl of TARGET_CATALOGS) {
      console.log(`[Extractor] Fetching: ${catalogUrl}`);
      
      try {
        const { data } = await axios.get(catalogUrl, {
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9'
          },
          timeout: 20000
        });
        
        const $ = cheerio.load(data);
        const foundWebsites: Set<string> = new Set();

        // Ищем все абсолютные ссылки, которые ведут на внешние сайты
        $('a').each((_, el) => {
          const href = $(el).attr('href');
          if (href) {
            try {
              const url = new URL(href);
              
              // Проверяем, что ссылка внешняя и не в списке запрещенных доменов
              const isInternal = FORBIDDEN_DOMAINS.some(d => url.hostname.includes(d));
              const isHttp = ['http:', 'https:'].includes(url.protocol);
              
              if (!isInternal && isHttp) {
                // Сохраняем только корень домена (протокол + хост)
                foundWebsites.add(`${url.protocol}//${url.hostname}`);
              }
            } catch (e) {
              // Невалидный URL или относительный путь
            }
          }
        });

        console.log(`[Extractor] Identified ${foundWebsites.size} unique candidate domains.`);

        let insertedCount = 0;
        for (const site of foundWebsites) {
          try {
            // Вставляем только уникальные URL, чтобы не спамить один и тот же сайт
            const res = await client.query(
              `INSERT INTO public.scan_queue (url, status, priority) 
               VALUES ($1, 'pending', 1) 
               ON CONFLICT (url) DO NOTHING;`,
              [site.toLowerCase()]
            );
            if (res.rowCount && res.rowCount > 0) insertedCount++;
          } catch (dbErr) {
            // Игнорируем ошибки дубликатов
          }
        }
        
        console.log(`[Extractor] Successfully queued ${insertedCount} new targets from this page.`);
      } catch (fetchErr: any) {
        console.warn(`[Extractor] Failed to fetch catalog ${catalogUrl}: ${fetchErr.message}`);
      }
    }
    
    console.log('==================================================');
    console.log('[Extractor] Multi-source operation complete.');
  } catch (err: any) {
    console.error('[Extractor] Critical failure:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

extract();
