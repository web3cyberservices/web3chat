
import { Pool } from 'pg';
import puppeteer from 'puppeteer';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * @fileOverview Lead Generation Engine v5.0
 * Feeds the queue using B2B Catalogs and Search Dorks.
 */

const EUROPEAN_B2B_CATALOGS = [
  { url: 'https://www.gelbeseiten.de/suche/software/seite-', pages: 20, weight: 10 },
  { url: 'https://clutch.co/de/agencies?page=', pages: 15, weight: 8 },
  { url: 'https://www.europages.de/unternehmen/Deutschland/software.html?page=', pages: 5, weight: 7 }
];

const SEARCH_DORKS = [
  'site:.de "powered by shopify" -inurl:impressum',
  'site:.at "powered by shopify" -inurl:impressum',
  'site:.it "partita iva" "checkout"',
  'site:.es "aviso legal" "contacto"',
  'site:.fr "mentions legales" "panier"'
];

export async function checkAndFeedQueue(pool: Pool) {
  console.log('[AutoSeeder] Validating queue depth...');
  const client = await pool.connect();
  
  try {
    const res = await client.query("SELECT COUNT(*) FROM public.scan_queue WHERE crm_status = 'pending'");
    const count = parseInt(res.rows[0].count);

    if (count < 5) {
      console.log(`[AutoSeeder] Queue low (${count}). Launching Discovery Mission...`);
      
      const browser = await puppeteer.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
      });
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

      // Strategy A: Catalog Crawling
      const randomCatalog = EUROPEAN_B2B_CATALOGS[Math.floor(Math.random() * EUROPEAN_B2B_CATALOGS.length)];
      const pageNum = Math.floor(Math.random() * randomCatalog.pages) + 1;
      const targetUrl = `${randomCatalog.url}${pageNum}`;

      console.log(`[AutoSeeder] Crawling Catalog: ${targetUrl}`);
      await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 45000 });
      
      const foundLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="http"]'));
        return links
          .map(a => (a as HTMLAnchorElement).href)
          .filter(href => !href.includes('google') && !href.includes('facebook') && !href.includes('linkedin'));
      });

      // Strategy B: Google Dorking (via DuckDuckGo to avoid heavy bot detection)
      const randomDork = SEARCH_DORKS[Math.floor(Math.random() * SEARCH_DORKS.length)];
      console.log(`[AutoSeeder] Executing Dork: ${randomDork}`);
      await page.goto(`https://duckduckgo.com/?q=${encodeURIComponent(randomDork)}`, { waitUntil: 'networkidle2' });
      
      const dorkLinks = await page.evaluate(() => {
        const results = Array.from(document.querySelectorAll('a.result__a'));
        return results.map(a => (a as HTMLAnchorElement).href);
      });

      const allTargets = [...new Set([...foundLinks, ...dorkLinks])];
      
      let added = 0;
      for (const url of allTargets) {
        try {
          const domain = new URL(url).origin.toLowerCase();
          const insertRes = await client.query(
            "INSERT INTO public.scan_queue (url, crm_status, priority) VALUES ($1, 'pending', 5) ON CONFLICT (url) DO NOTHING",
            [domain]
          );
          if (insertRes.rowCount && insertRes.rowCount > 0) added++;
        } catch (e) {}
        if (added >= 10) break;
      }

      console.log(`[AutoSeeder] Mission Success. Added ${added} new high-value targets.`);
      await browser.close();
    }
  } catch (err: any) {
    console.error('[AutoSeeder Error]', err.message);
  } finally {
    client.release();
  }
}
