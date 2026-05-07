
import { scrapeUrl } from '@/lib/scraper';
import { parseHtmlContent } from '@/lib/parser';
import { isUrlAllowed, getCrawlDelay } from '@/config/robots-rules';
import { getBotStatus, saveAuditLog, saveBotEvent, saveAuditResults } from '@/lib/db';
import { CrawlResult, Violation } from '@/types';
import { z } from 'zod';

const urlSchema = z.string().url().refine((url) => {
  const parsed = new URL(url);
  const hostname = parsed.hostname.toLowerCase();
  const blockedHostnames = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
  const isPrivateIp = /^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/.test(hostname);
  return !blockedHostnames.includes(hostname) && !isPrivateIp;
}, { message: "Internal/private addresses restricted (SSRF Protection)" });

export async function runCrawlTask(seedUrl: string): Promise<CrawlResult> {
  const timestamp = new Date().toISOString();
  try {
    const validation = urlSchema.safeParse(seedUrl);
    if (!validation.success) {
      return { url: seedUrl, timestamp, status: 'blocked', issuesFound: 0, scanType: 'basic', reason: validation.error.errors[0].message };
    }

    const isActive = await getBotStatus();
    if (!isActive) {
      return { url: seedUrl, timestamp, status: 'skipped', issuesFound: 0, scanType: 'basic', reason: 'Engine paused.' };
    }

    const url = new URL(seedUrl);
    const domain = url.hostname;

    const { allowed, reason } = await isUrlAllowed(seedUrl);
    if (!allowed) {
      await saveAuditLog(domain, 403, reason || 'Blocked by robots.txt');
      return { url: seedUrl, timestamp, status: 'blocked', issuesFound: 0, scanType: 'basic', reason };
    }

    const delay = getCrawlDelay() * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));

    const { html, security, rawHeaders, scanType, dynamicCookies } = await scrapeUrl(seedUrl);
    const { violations, discoveredLinks } = parseHtmlContent(html, seedUrl, rawHeaders);
    
    // Добавляем динамические нарушения, если был Deep Scan
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
          recommendation: 'Implement a cookie consent banner that blocks these scripts until user consent is given.'
        });
      }
    }

    await saveAuditLog(domain, 200, null);
    
    if (violations.length > 0) {
      console.log(`[Crawler] Found ${violations.length} violations for ${domain}. Attempting to save...`);
      const dbResult = await saveAuditResults(domain, seedUrl, violations, scanType);
      if (dbResult.success) {
        await saveBotEvent('SUCCESS', `Audit of ${domain} (${scanType}) finished. Saved ${violations.length} violations.`);
      } else {
        console.error(`[Crawler] Failed to save results for ${domain} to DB.`);
      }
    } else {
      console.log(`[Crawler] No violations found for ${domain}.`);
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
