
import settings from '@/config/crawler-settings.json';
import { shouldRunDeepScan } from './parser';
import puppeteer from 'puppeteer';
import { ScanType } from '@/types';

const MAX_REDIRECTS = 5;
const REQUEST_TIMEOUT = 10000;

async function deepScrapeUrl(url: string) {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    const html = await page.content();
    const cookies = await page.cookies();
    
    return { html, cookies };
  } finally {
    await browser.close();
  }
}

export async function scrapeUrl(url: string, redirectCount = 0): Promise<{html: string, security: any, rawHeaders: any, scanType: ScanType, dynamicCookies?: any[]}> {
  if (redirectCount > MAX_REDIRECTS) throw new Error('REDIRECT_LOOP');

  // 1. Basic Fetch
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': settings.userAgent,
      'X-Crawler-Contact': settings.abuseEmail,
      'X-Compliance-Portal': 'https://bot.humango.app'
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT)
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  let html = await response.text();
  const headers: Record<string, string> = {};
  response.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });

  const security = {
    ssl: url.startsWith('https') ? 'TLS 1.3' : 'None',
    hsts: !!headers['strict-transport-security'],
    csp: !!headers['content-security-policy'] || html.includes('Content-Security-Policy')
  };

  // 2. Hybrid Logic: Deep Scan check
  let scanType: ScanType = 'basic';
  let dynamicCookies: any[] = [];

  if (shouldRunDeepScan(html)) {
    try {
      const deepResult = await deepScrapeUrl(url);
      html = deepResult.html;
      dynamicCookies = deepResult.cookies;
      scanType = 'deep';
    } catch (e) {
      console.error(`[Scraper] Deep Scan failed for ${url}, falling back to basic.`);
    }
  }

  return { html, rawHeaders: headers, security, scanType, dynamicCookies };
}
