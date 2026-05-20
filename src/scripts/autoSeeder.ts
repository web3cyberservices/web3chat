
'use server';
/**
 * @fileOverview Lead Discovery Module
 */
import 'dotenv/config';
import { Pool } from 'pg';
import puppeteer from 'puppeteer';

const EUROPEAN_B2B_CATALOGS = [
  { url: 'https://www.gelbeseiten.de/suche/software/seite-', pages: 10 },
  { url: 'https://www.europages.co.uk/companies/Germany/software.html?page=', pages: 5 }
];

export async function checkAndFeedQueue(pool: Pool): Promise<boolean> {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT COUNT(*) FROM public.scan_queue WHERE status = 'pending'");
    const count = parseInt(res.rows[0].count);

    if (count > 5) return false;

    console.log(`[AutoSeeder] Queue depth low (${count}). Launching Discovery...`);
    
    const browser = await puppeteer.launch({ 
      headless: true, 
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

    const randomCatalog = EUROPEAN_B2B_CATALOGS[Math.floor(Math.random() * EUROPEAN_B2B_CATALOGS.length)];
    const pageNum = Math.floor(Math.random() * randomCatalog.pages) + 1;
    const targetUrl = `${randomCatalog.url}${pageNum}`;

    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 45000 });
    
    const links = await page.evaluate(() => {
      const a = Array.from(document.querySelectorAll('a[href*="http"]'));
      return a.map(el => (el as HTMLAnchorElement).href).filter(h => {
          try {
              const host = new URL(h).hostname;
              return !['google', 'facebook', 'instagram', 'linkedin', 'youtube', 'gelbeseiten', 'europages'].some(d => host.includes(d));
          } catch(e) { return false; }
      });
    });

    const uniqueLinks = [...new Set(links)];
    let added = 0;

    for (const url of uniqueLinks) {
      try {
        const domain = new URL(url).origin.toLowerCase();
        const insertRes = await client.query(
          "INSERT INTO public.scan_queue (url, status, crm_status, priority) VALUES ($1, 'pending', 'pending', 1) ON CONFLICT (url) DO NOTHING",
          [domain]
        );
        if (insertRes.rowCount && insertRes.rowCount > 0) added++;
        if (added >= 10) break;
      } catch (e) {}
    }

    console.log(`[AutoSeeder] Seeded ${added} new discovery jobs.`);
    await browser.close();
    return added > 0;
  } catch (err: any) {
    console.error('[AutoSeeder Error]', err.message);
    return false;
  } finally {
    client.release();
  }
}
