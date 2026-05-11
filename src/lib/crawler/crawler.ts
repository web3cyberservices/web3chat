
'use server';

import { scrapeUrl } from '@/lib/scraper';
import { parseHtmlContent } from '@/lib/parser';
import { isUrlAllowed } from '@/config/robots-rules';
import { saveAuditLog, saveBotEvent, saveAuditResults } from '@/lib/db';
import { CrawlResult, Violation } from '@/types';
import * as cheerio from 'cheerio';
import { z } from 'zod';

const urlSchema = z.string().url().refine((url) => {
  const parsed = new URL(url);
  const hostname = parsed.hostname.toLowerCase();
  const blockedHostnames = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
  return !blockedHostnames.includes(hostname);
}, { message: "Internal/private addresses restricted." });

const BLACKLIST_KEYWORDS = ['google.', 'facebook.', 'amazon.', 'wikipedia.', 'linkedin.', 'microsoft.', 'apple.', 'twitter.', 'youtube.'];
const EU_LANGS = ['de', 'fr', 'it', 'es', 'pl', 'nl', 'da', 'fi', 'sv', 'pt', 'cs', 'hu', 'sk', 'sl', 'et', 'lv', 'lt', 'bg', 'ro', 'el'];

export async function runCrawlTask(seedUrl: string): Promise<CrawlResult> {
  const timestamp = new Date().toISOString();
  try {
    const validation = urlSchema.safeParse(seedUrl);
    if (!validation.success) {
      return { url: seedUrl, timestamp, status: 'blocked', issuesFound: 0, scanType: 'basic', reason: validation.error.errors[0].message };
    }

    const url = new URL(seedUrl);
    const domain = url.hostname.toLowerCase();

    if (BLACKLIST_KEYWORDS.some(kw => domain.includes(kw))) {
      return { url: seedUrl, timestamp, status: 'skipped', issuesFound: 0, scanType: 'basic', reason: 'Global giant domain blacklist.' };
    }

    // 1. Robots.txt Check (RFC 9309)
    const { allowed, reason, delay } = await isUrlAllowed(seedUrl);
    if (!allowed) {
      await saveAuditLog(domain, 403, reason || 'Blocked by robots.txt');
      return { url: seedUrl, timestamp, status: 'blocked', issuesFound: 0, scanType: 'basic', reason };
    }

    // 2. Polite Wait
    const waitTime = delay || 5000;
    await new Promise(resolve => setTimeout(resolve, waitTime));

    // 3. Scrape with Retry/Backoff Handling
    const { html, security, rawHeaders, scanType, dynamicCookies, screenshot } = await scrapeUrl(seedUrl);
    
    // Lang Check for non-EU TLDs
    const isGlobalTld = ['.com', '.net', '.org'].some(tld => domain.endsWith(tld));
    if (isGlobalTld) {
      const $ = cheerio.load(html);
      const lang = $('html').attr('lang')?.toLowerCase()?.split('-')[0] || '';
      if (lang && !EU_LANGS.includes(lang)) {
         return { url: seedUrl, timestamp, status: 'skipped', issuesFound: 0, scanType: 'basic', reason: `Non-EU language: ${lang}` };
      }
    }

    // Pass screenshot to parser for evidence
    const { violations, discoveredLinks } = parseHtmlContent(html, seedUrl, rawHeaders, screenshot);
    
    // Dynamic Cookie Audit
    if (scanType === 'deep' && dynamicCookies && dynamicCookies.length > 0) {
      const trackers = ['fb', 'google', 'ads', 'analytics', 'pixel', 'intercom'];
      const suspicious = dynamicCookies.filter((c: any) => 
        trackers.some(key => c.name.toLowerCase().includes(key))
      );

      if (suspicious.length > 0) {
        violations.push({
          category: 'GDPR',
          report_type: 'SaaS',
          issue_type: 'Privacy Violation (Dynamic Trackers)',
          severity: 'high',
          evidence_html: screenshot ? `data:image/jpeg;base64,${screenshot}` : 'Detected cookies',
          snippet: 'Detected via headless browser rendering.',
          description: 'Detected tracking cookies set without consent.',
          law_name: 'EU GDPR / ePrivacy Directive',
          potential_fine: '€10,000 - €20,000,000',
          explanation: 'Xevon engine detected dynamic trackers and cookies that are set automatically upon page load without obtaining valid user consent.',
          recommendation: 'Configure your CMP to block scripts until explicit consent is provided.'
        });
      }
    }

    await saveAuditLog(domain, 200, null);
    
    if (violations.length > 0) {
      await saveAuditResults(domain, seedUrl, violations, scanType);
      await saveBotEvent('SUCCESS', `Audit of ${domain} finished. ${violations.length} violations recorded.`);
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
    let d = 'unknown';
    try { d = new URL(seedUrl).hostname; } catch(e) {}
    
    if (error.message.includes('RATE_LIMITED')) {
       await saveBotEvent('ERROR', `Rate Limit (429/503) for ${d}. Backoff applied.`);
       return { url: seedUrl, timestamp, status: 'blocked', issuesFound: 0, scanType: 'basic', reason: 'Target server is rate limiting our crawler.' };
    }

    await saveAuditLog(d, 500, error.message);
    return { url: seedUrl, timestamp, status: 'failed', issuesFound: 0, scanType: 'basic', error: error.message };
  }
}
