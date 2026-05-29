import { Pool } from 'pg';
import * as cheerio from 'cheerio';
import * as dotenv from 'dotenv';

dotenv.config();

const EUROPEAN_B2B_CATALOGS = [
  { url: 'https://www.gelbeseiten.de/suche/software/seite-', pages: 10 },
  { url: 'https://clutch.co/de/agencies?page=', pages: 10 },
  { url: 'https://www.europages.de/unternehmen/Deutschland/software.html?page=', pages: 5 }
];

const SEARCH_DORKS = [
  'site:.de "powered by shopify" -inurl:impressum',
  'site:.at "powered by shopify" -inurl:impressum',
  'site:.it "partita iva" "checkout"',
  'site:.es "aviso legal" "contacto"',
  'site:.fr "mentions legales" "panier"'
];

export async function checkAndFeedQueue(pool: Pool) {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT COUNT(*) FROM public.scan_queue WHERE status = 'pending'");
    const count = parseInt(res.rows[0].count);

    if (count < 5) {
      console.log(`[AutoSeeder] Queue low (${count}). Fetching targets via lightweight HTTP...`);
      
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
      let allTargets: string[] = [];

      // Strategy A: Catalog Scraping
      const catalog = EUROPEAN_B2B_CATALOGS[Math.floor(Math.random() * EUROPEAN_B2B_CATALOGS.length)];
      const pageNum = Math.floor(Math.random() * catalog.pages) + 1;
      
      try {
        const response = await fetch(`${catalog.url}${pageNum}`, { headers: { 'User-Agent': userAgent } });
        if (response.ok) {
          const html = await response.text();
          const $ = cheerio.load(html);
          $('a').each((_, el) => {
            const href = $(el).attr('href');
            if (href?.startsWith('http')) {
              if (!['google', 'facebook', 'linkedin', 'instagram'].some(d => href.includes(d))) {
                allTargets.push(new URL(href).origin.toLowerCase());
              }
            }
          });
        }
      } catch (e) {}

      // Strategy B: Google Dorking via DuckDuckGo HTML
      try {
        const dork = SEARCH_DORKS[Math.floor(Math.random() * SEARCH_DORKS.length)];
        const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(dork)}`;
        const response = await fetch(ddgUrl, { headers: { 'User-Agent': userAgent } });
        if (response.ok) {
          const html = await response.text();
          const $ = cheerio.load(html);
          $('a.result__url').each((_, el) => {
            const href = $(el).attr('href');
            if (href?.startsWith('http')) {
              allTargets.push(new URL(href).origin.toLowerCase());
            }
          });
        }
      } catch (e) {}

      const uniqueTargets = [...new Set(allTargets)];
      let added = 0;

      for (const url of uniqueTargets) {
        try {
          const insertRes = await client.query(
            "INSERT INTO public.scan_queue (url, status, crm_status, priority) VALUES ($1, 'pending', 'pending', 5) ON CONFLICT (url) DO NOTHING",
            [url]
          );
          if (insertRes.rowCount && insertRes.rowCount > 0) added++;
        } catch (e) {}
        if (added >= 10) break;
      }

      console.log(`[AutoSeeder] Successfully seeded ${added} targets.`);
      return added > 0;
    }
    return false;
  } catch (err: any) {
    console.error('[AutoSeeder Error]', err.message);
    return false;
  } finally {
    client.release();
  }
}