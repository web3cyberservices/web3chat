
import { scrapeUrl } from '@/lib/scraper';
import { parseHtmlContent } from '@/lib/parser';
import { isUrlAllowed, getCrawlDelay } from '@/config/robots-rules';
import { getBotStatus, saveAuditLog, saveBotEvent, saveAuditResults } from '@/lib/db';
import { CrawlResult, Violation } from '@/types';
import * as cheerio from 'cheerio';
import { z } from 'zod';

const urlSchema = z.string().url().refine((url) => {
  const parsed = new URL(url);
  const hostname = parsed.hostname.toLowerCase();
  const blockedHostnames = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
  const isPrivateIp = /^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/.test(hostname);
  return !blockedHostnames.includes(hostname) && !isPrivateIp;
}, { message: "Internal/private addresses restricted (SSRF Protection)" });

// Черный список гигантов
const BLACKLIST_KEYWORDS = ['google.', 'facebook.', 'amazon.', 'wikipedia.', 'linkedin.', 'microsoft.', 'apple.', 'twitter.', 'youtube.'];

// EU TLDs для приоритезации
const EU_TLDS = ['.de', '.fr', '.it', '.es', '.pl', '.nl', '.be', '.at', '.dk', '.fi', '.se', '.ie', '.pt', '.cz', '.gr', '.hu', '.ro', '.sk', '.bg', '.ee', '.lv', '.lt', '.hr', '.si', '.mt', '.cy'];

// EU языки для фильтрации .com/.net
const EU_LANGS = ['de', 'fr', 'it', 'es', 'pl', 'nl', 'be', 'da', 'fi', 'sv', 'pt', 'cs', 'hu', 'sk', 'sl', 'et', 'lv', 'lt', 'bg', 'ro', 'el'];

export async function runCrawlTask(seedUrl: string): Promise<CrawlResult> {
  const timestamp = new Date().toISOString();
  try {
    const validation = urlSchema.safeParse(seedUrl);
    if (!validation.success) {
      return { url: seedUrl, timestamp, status: 'blocked', issuesFound: 0, scanType: 'basic', reason: validation.error.errors[0].message };
    }

    const url = new URL(seedUrl);
    const domain = url.hostname.toLowerCase();

    // 1. Проверка черного списка
    if (BLACKLIST_KEYWORDS.some(kw => domain.includes(kw))) {
      return { url: seedUrl, timestamp, status: 'skipped', issuesFound: 0, scanType: 'basic', reason: 'Global giant domain blacklist.' };
    }

    const isActive = await getBotStatus();
    if (!isActive) {
      return { url: seedUrl, timestamp, status: 'skipped', issuesFound: 0, scanType: 'basic', reason: 'Engine paused.' };
    }

    const { allowed, reason } = await isUrlAllowed(seedUrl);
    if (!allowed) {
      await saveAuditLog(domain, 403, reason || 'Blocked by robots.txt');
      return { url: seedUrl, timestamp, status: 'blocked', issuesFound: 0, scanType: 'basic', reason };
    }

    const delay = getCrawlDelay() * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));

    const { html, security, rawHeaders, scanType, dynamicCookies } = await scrapeUrl(seedUrl);
    
    // 2. Региональный фильтр для .com/.net (проверка lang)
    const isEuTld = EU_TLDS.some(tld => domain.endsWith(tld));
    if (!isEuTld && (domain.endsWith('.com') || domain.endsWith('.net') || domain.endsWith('.org'))) {
      const $ = cheerio.load(html);
      const lang = $('html').attr('lang')?.toLowerCase()?.split('-')[0] || '';
      if (lang && !EU_LANGS.includes(lang)) {
         return { url: seedUrl, timestamp, status: 'skipped', issuesFound: 0, scanType: 'basic', reason: `Non-EU language detected: ${lang}` };
      }
    }

    const { violations, discoveredLinks } = parseHtmlContent(html, seedUrl, rawHeaders);
    
    if (scanType === 'deep' && dynamicCookies && dynamicCookies.length > 0) {
      const trackerKeywords = ['fb', 'google', 'ads', 'analytics', 'pixel', 'intercom', 'tiktok'];
      const suspiciousCookies = dynamicCookies.filter((c: any) => 
        trackerKeywords.some(key => c.name.toLowerCase().includes(key) || (c.domain && c.domain.toLowerCase().includes(key)))
      );

      if (suspiciousCookies.length > 0) {
        violations.push({
          category: 'GDPR',
          issue_type: 'DYNAMIC_TRACKING_COOKIES',
          severity: 'high',
          evidence_html: 'Browser Runtime Cookies',
          description: `Detected ${suspiciousCookies.length} potential tracking cookies during dynamic browser rendering.`,
          explanation: 'Dynamic tracking cookies detected without prior explicit consent. This violates GDPR Art. 5(3) (ePrivacy Directive).',
          fine_amount: "Up to €20M or 4% of global turnover",
          recommendation: 'Implement a cookie consent banner that blocks these scripts until user consent is given.'
        });
      }
    }

    await saveAuditLog(domain, 200, null);
    
    if (violations.length > 0) {
      await saveAuditResults(domain, seedUrl, violations, scanType);
      await saveBotEvent('SUCCESS', `Audit of ${domain} (${scanType}) finished. Saved ${violations.length} violations.`);
    }

    return {
      url: seedUrl,
      timestamp,
      status: 'success',
      issuesFound: violations.length,
      violations,
      scanType,
      securityHeaders: security,
      discoveredLinks
    };
  } catch (error: any) {
    let domain = 'unknown';
    try { domain = new URL(seedUrl).hostname; } catch(e) {}
    await saveAuditLog(domain, 500, error.message);
    console.error(`[Crawler Error] Task failed for ${seedUrl}:`, error.message);
    return { url: seedUrl, timestamp, status: 'failed', issuesFound: 0, scanType: 'basic', error: error.message };
  }
}
