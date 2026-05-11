
'use server';

import settings from '@/config/crawler-settings.json';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { logger } from './logger';

const REQUEST_TIMEOUT = 10000;
const CHROME_PATH = '/root/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome';

export interface ScrapeResult {
  html: string;
  status: 'success' | 'fail';
  method: 'fetch' | 'puppeteer';
  rawHeaders: any;
  screenshot?: string;
  cookies?: any[];
  duration_ms: number;
  memory_usage_mb: number;
}

async function bruteForceScrape(url: string): Promise<Partial<ScrapeResult>> {
  logger.info(`Phase BRUTEFORCE: Launching Puppeteer for ${url}`);
  let browser: any = null;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Memory Optimization: Intercept and block heavy assets
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.setUserAgent(settings.userAgent);
    await page.setExtraHTTPHeaders({
      'DNT': '1',
      'Sec-GPC': '1'
    });

    // Iris Feedback: Wait for networkidle2 to ensure all JS fragments are rendered
    const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 35000 });
    
    if (response && [403, 429].includes(response.status())) {
      return { status: 'fail', method: 'puppeteer', rawHeaders: { 'x-waf-block': 'true' } };
    }

    const html = await page.content();
    const cookies = await page.cookies();
    const screenshot = await page.screenshot({ encoding: 'base64', type: 'jpeg', quality: 30 });

    return { html, cookies, screenshot: screenshot as string, method: 'puppeteer', status: 'success' };
  } catch (err: any) {
    logger.error(`Bruteforce Phase failed for ${url}: ${err.message}`);
    return { status: 'fail', method: 'puppeteer' };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;
  
  let method: 'fetch' | 'puppeteer' = 'fetch';
  let html = '';
  let status: 'success' | 'fail' = 'success';
  let headers: any = {};
  let screenshot: string | undefined;
  let cookies: any[] = [];

  try {
    // PHASE 1: SPEED (Native Fetch)
    const response = await fetch(url, {
      headers: {
        'User-Agent': settings.userAgent,
        'DNT': '1',
        'Sec-GPC': '1'
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT)
    });

    response.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });

    if (response.ok) {
      html = await response.text();
      const $ = cheerio.load(html);
      
      const isSPA = $('#app').length > 0 || $('#root').length > 0 || $('body').text().trim().length < 300;
      
      if (isSPA) {
        const brute = await bruteForceScrape(url);
        if (brute.status === 'success') {
          html = brute.html!;
          screenshot = brute.screenshot;
          cookies = brute.cookies || [];
          method = 'puppeteer';
        }
      }
    } else if ([403, 429].includes(response.status)) {
      const brute = await bruteForceScrape(url);
      if (brute.status === 'success') {
        html = brute.html!;
        screenshot = brute.screenshot;
        method = 'puppeteer';
      } else {
        status = 'fail';
        headers['x-waf-block'] = 'true';
      }
    } else {
      status = 'fail';
    }
  } catch (err: any) {
    const brute = await bruteForceScrape(url);
    if (brute.status === 'success') {
      html = brute.html!;
      screenshot = brute.screenshot;
      method = 'puppeteer';
    } else {
      status = 'fail';
    }
  }

  return {
    html,
    status,
    method,
    rawHeaders: headers,
    screenshot,
    cookies,
    duration_ms: Date.now() - startTime,
    memory_usage_mb: Math.round((process.memoryUsage().heapUsed - startMemory) / 1024 / 1024)
  };
}
