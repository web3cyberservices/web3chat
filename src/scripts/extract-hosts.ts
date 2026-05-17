
import puppeteer from 'puppeteer';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * @fileOverview HUMANGO GLOBAL SMB DISCOVERY V4.0
 * Масштабируемый сборщик целей для аудита.
 * Охватывает Германию, Францию, Италию и Австрию по ключевым B2B секторам.
 */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Домены, которые точно не являются сайтами малого бизнеса
const BLACKLIST = [
  'gelbeseiten.de', 'pagesjaunes.fr', 'paginegialle.it', 'herold.at',
  'google.', 'facebook.', 'instagram.', 'twitter.', 'linkedin.', 
  'youtube.', 'apple.', 'microsoft.', 'amazon.', 'wikipedia.',
  'timmone.', 'goyellow.', 'sundon.', 'w-medien.', 'link.', 'maps.',
  'yelp.', 'tripadvisor.', 'xing.', 'pinterest.', 'tiktok.'
];

const INDUSTRIES = ['software', 'it-service', 'marketing', 'consulting', 'produktion', 'ecommerce'];

const SOURCES = [
  { name: 'DE', url: (kw: string, p: number) => `https://www.gelbeseiten.de/suche/${kw}/seite-${p}` },
  { name: 'FR', url: (kw: string, p: number) => `https://www.pagesjaunes.fr/recherche?quoiqui=${kw}&page=${p}` },
  { name: 'IT', url: (kw: string, p: number) => `https://www.paginegialle.it/ricerca/${kw}/${p}` },
  { name: 'AT', url: (kw: string, p: number) => `https://www.herold.at/gelbe-seiten/suche/?was=${kw}&seite=${p}` }
];

async function runGlobalDiscovery() {
  console.log('==================================================');
  console.log('   HUMANGO GLOBAL SMB DISCOVERY V4.0              ');
  console.log('   Method: Cross-Border Multi-Industry Crawl      ');
  console.log('==================================================');

  const dbClient = await pool.connect();
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    for (const source of SOURCES) {
      for (const keyword of INDUSTRIES) {
        // Берем по 5 страниц для каждой комбинации Страна + Индустрия
        for (let p = 1; p <= 5; p++) {
          const targetUrl = source.url(keyword, p);
          console.log(`[Discovery] [${source.name}] [${keyword}] Скан страницы ${p}: ${targetUrl}`);

          try {
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
            
            // Ждем немного для прогрузки динамических элементов
            await new Promise(r => setTimeout(r, Math.random() * 3000 + 2000));

            // Собираем все ссылки, которые могут вести на сайты компаний
            const links = await page.evaluate(() => {
              const results: string[] = [];
              const allLinks = Array.from(document.querySelectorAll('a[href*="http"]'));
              
              allLinks.forEach(a => {
                const href = (a as HTMLAnchorElement).href;
                const text = a.textContent?.toLowerCase() || '';
                const html = a.innerHTML.toLowerCase();
                
                // Ищем маркеры корпоративного сайта
                const isLikelyWebsite = 
                  text.includes('webseite') || 
                  text.includes('homepage') || 
                  text.includes('visit') ||
                  text.includes('visiter') ||
                  text.includes('sito') ||
                  html.includes('website') ||
                  html.includes('icon-homepage');

                if (isLikelyWebsite) {
                  results.push(href);
                }
              });
              
              return results;
            });

            const filtered = [...new Set(links)].filter(href => {
              try {
                const host = new URL(href).hostname.toLowerCase();
                return !BLACKLIST.some(b => host.includes(b));
              } catch {
                return false;
              }
            });

            console.log(`  -> Найдено уникальных целей: ${filtered.length}`);

            let added = 0;
            for (const siteUrl of filtered) {
              try {
                const cleanUrl = new URL(siteUrl).origin.toLowerCase();
                const res = await dbClient.query(
                  `INSERT INTO public.scan_queue (url, status, priority) 
                   VALUES ($1, 'pending', 1) 
                   ON CONFLICT (url) DO NOTHING;`,
                  [cleanUrl]
                );
                if (res.rowCount && res.rowCount > 0) {
                  console.log(`     [+] Добавлен: ${cleanUrl}`);
                  added++;
                }
              } catch (e) {}
            }
            console.log(`  -> Успешно занесено в очередь: ${added}`);

          } catch (pageErr: any) {
            console.warn(`  [!] Ошибка на ${targetUrl}: ${pageErr.message}`);
          }
          
          // Пауза между запросами для имитации человека
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }
  } catch (err: any) {
    console.error('[Critical Discovery Error]:', err.message);
  } finally {
    await browser.close();
    dbClient.release();
    await pool.end();
    console.log('==================================================');
    console.log('[Discovery] Глобальная сессия завершена.');
  }
}

runGlobalDiscovery();
