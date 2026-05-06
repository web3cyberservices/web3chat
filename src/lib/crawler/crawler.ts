import { scrapeUrl } from '@/lib/scraper';
import { parseHtmlContent } from '@/lib/parser';
import { isUrlAllowed, getCrawlDelay } from '@/config/robots-rules';
import { getBotStatus, saveAuditLog, saveBotEvent, saveAuditResults } from '@/lib/db';
import { CrawlResult } from '@/types';
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
      return { url: seedUrl, timestamp, status: 'blocked', issuesFound: 0, reason: validation.error.errors[0].message };
    }

    const isActive = await getBotStatus();
    if (!isActive) {
      return { url: seedUrl, timestamp, status: 'skipped', issuesFound: 0, reason: 'Engine paused.' };
    }

    const url = new URL(seedUrl);
    const domain = url.hostname;

    const { allowed, reason } = await isUrlAllowed(seedUrl);
    if (!allowed) {
      await saveAuditLog(domain, 403, reason || 'Blocked by robots.txt');
      return { url: seedUrl, timestamp, status: 'blocked', issuesFound: 0, reason };
    }

    const delay = getCrawlDelay() * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));

    const { html, security, rawHeaders } = await scrapeUrl(seedUrl);
    const { violations, discoveredLinks } = parseHtmlContent(html, seedUrl, rawHeaders);
    
    await saveAuditLog(domain, 200, null);
    if (violations.length > 0) {
      await saveAuditResults(domain, seedUrl, violations);
      await saveBotEvent('SUCCESS', `Audit of ${domain} finished. Violations: ${violations.length}`);
    }

    return {
      url: seedUrl,
      timestamp,
      status: 'success',
      issuesFound: violations.length,
      violations,
      securityHeaders: security,
      discoveredLinks
    };
  } catch (error: any) {
    let domain = 'unknown';
    try { domain = new URL(seedUrl).hostname; } catch(e) {}
    await saveAuditLog(domain, 500, error.message);
    return { url: seedUrl, timestamp, status: 'failed', issuesFound: 0, error: error.message };
  }
}
