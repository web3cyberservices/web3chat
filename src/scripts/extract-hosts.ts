
import puppeteer from 'puppeteer';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const BLACKLIST = [
  'gelbeseiten.de', 'google.', 'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
  'linkedin.com', 'pinterest.', 'tiktok.com', 'youtube.com', 'apple.com', 'android.com',
  'dastelefonbuch.de', 'dasoertliche.de', 'timmone.de', 'goyellow.de', 'sundon.de',
  'w-medien.de', 'surveymonkey.', 'yelp.', 'tripadvisor.', 'xing.', 'maps.'
];

const CHROME_PATHS = [
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/root/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
];

async function getExecutablePath() {
  for (const p of CHROME_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

async function runAutonomousExtractor() {
  console.log('==================================================');
  console.log('   HUMANGO GERMAN TARGET EXTRACTOR V3.7           ');
  console.log('   Method: Deep External Host Filtering (Puppeteer)');
  console.log('==================================================');

  const dbClient = await pool.connect();
  const executablePath = await getExecutablePath();
  const browser = await puppeteer.launch({ 
    executablePath,
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    
    for (let i = 1; i <= 10; i++) {
      const catalogUrl = `https://www.gelbeseiten.de/suche/software/seite-${i}`;
      console.log(`[GelbeSeiten] Сканируем страницу ${i}: ${catalogUrl}`);
      
      try {
        await page.goto(catalogUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        
        const allLinks = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a[href*="http"]'));
          return links.map(a => (a as HTMLAnchorElement).href);
        });

        const filteredSites = allLinks
          .filter(href => {
            if (!href) return false;
            try {
              const hostname = new URL(href).hostname.toLowerCase();
              return !BLACKLIST.some(badDomain => hostname.includes(badDomain));
            } catch {
              return false;
            }
          })
          .map(href => {
            try {
              return new URL(href).origin.toLowerCase();
            } catch {
              return null;
            }
          })
          .filter(Boolean) as string[];

        const uniquePageSites = [...new Set(filteredSites)];
        console.log(`  -> Найдено потенциальных бизнес-сайтов: ${uniquePageSites.length}`);

        let addedCount = 0;
        for (const cleanUrl of uniquePageSites) {
          try {
            const res = await dbClient.query(
              `INSERT INTO public.scan_queue (url, status, priority) 
               VALUES ($1, 'pending', 1) 
               ON CONFLICT (url) DO NOTHING;`,
              [cleanUrl]
            );
            
            if (res.rowCount && res.rowCount > 0) {
              console.log(`     [+] Добавлен в очередь: ${cleanUrl}`);
              addedCount++;
            }
          } catch (e) {}
        }
        console.log(`  -> Успешно занесено новых целей: ${addedCount}`);
      } catch (pageErr: any) {
        console.warn(`  [!] Ошибка на странице ${i}: ${pageErr.message}`);
      }
      
      await new Promise(r => setTimeout(r, 2000));
    }
  } catch (err: any) {
    console.error('[Critical Error]:', err.message);
  } finally {
    await browser.close();
    dbClient.release();
    await pool.end();
    console.log('==================================================');
    console.log('[Extractor] Сессия завершена.');
  }
}

runAutonomousExtractor();
