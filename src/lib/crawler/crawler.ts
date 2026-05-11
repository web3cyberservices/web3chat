
'use server';

import { scrapeUrl } from '@/lib/scraper';
import { parseHtmlContent } from '@/lib/parser';
import { isUrlAllowed } from '@/config/robots-rules';
import { saveAuditLog, saveBotEvent, saveAuditResults } from '@/lib/db';
import { CrawlResult, Violation, VerificationMethod } from '@/types';
import { z } from 'zod';
import { performance } from 'perf_hooks';

const urlSchema = z.string().url();

async function checkResources() {
  const memory = process.memoryUsage();
  const heapUsedMB = Math.round(memory.heapUsed / 1024 / 1024);
  if (heapUsedMB > 1024) { 
    if (global.gc) {
      global.gc();
    } else {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  return heapUsedMB;
}

export async function runCrawlTask(seedUrl: string): Promise<CrawlResult> {
  const startTime = performance.now();
  const timestamp = new Date().toISOString();
  
  try {
    await checkResources();
    const validation = urlSchema.safeParse(seedUrl);
    if (!validation.success) {
      return { url: seedUrl, timestamp, status: 'blocked', issuesFound: 0, scanType: 'basic', reason: 'Invalid URL' };
    }

    const { allowed, reason } = await isUrlAllowed(seedUrl);
    if (!allowed) {
      return { url: seedUrl, timestamp, status: 'blocked', issuesFound: 0, scanType: 'basic', reason };
    }

    const scrape = await scrapeUrl(seedUrl);
    if (scrape.status === 'fail') {
      const errorMsg = scrape.rawHeaders?.['x-waf-block'] ? 'WAF_BLOCK: Manual review required' : 'Failed to retrieve content';
      return { url: seedUrl, timestamp, status: 'failed', issuesFound: 0, scanType: 'basic', reason: errorMsg };
    }

    const isDeep = scrape.method === 'puppeteer';
    const verification_method: VerificationMethod = isDeep ? 'Dynamic Emulation' : 'Static Analysis';

    const { violations, discoveredLinks, meta, compliance_report } = parseHtmlContent(
      scrape.html, 
      seedUrl, 
      scrape.rawHeaders, 
      scrape.screenshot,
      isDeep
    );

    // SSL Security Triage
    if (!seedUrl.startsWith('https:')) {
      violations.push({
        category: 'Security',
        report_type: 'Manual',
        issue_type: 'Insecure Connection (HTTP)',
        severity: 'critical',
        evidence_html: seedUrl,
        description: 'The website transmits data over unencrypted HTTP. This exposes all user data to sniffing.',
        law_name: 'GDPR Art. 32',
        potential_fine: '€10,000 - €20,000,000',
        explanation: 'Security of processing is mandatory. Lack of SSL is a direct violation of Art. 32 GDPR.',
        recommendation: 'Deploy an SSL certificate and force HTTPS redirection.',
        verification_method,
        affected_urls: [seedUrl]
      });
    }

    // Sanity Check Update
    if (compliance_report.verdict === 'COMPLIANT' && violations.length > 0) {
      // If we have manual violations (like SSL), it's not fully compliant
      compliance_report.verdict = 'RISKY';
    }

    const domain = new URL(seedUrl).hostname;
    await saveAuditLog(domain, 200, null);
    await saveAuditResults(domain, seedUrl, violations, isDeep ? 'deep' : 'basic');
    
    const ramEnd = await checkResources();
    const total_ms = Math.round(performance.now() - startTime);

    await saveBotEvent('SUCCESS', `Audit finished: ${domain} | Verdict: ${compliance_report.verdict} | RAM: ${ramEnd}MB`);

    return {
      url: seedUrl,
      timestamp,
      status: 'success',
      issuesFound: violations.length,
      violations,
      compliance_report,
      scanType: isDeep ? 'deep' : 'basic',
      discoveredLinks,
      meta: {
        duration_ms: total_ms,
        memory_usage_mb: ramEnd,
        method: scrape.method,
        verification_method,
        hasCMP: meta.hasCMP,
        legal_links: meta.legal_links
      }
    };
  } catch (error: any) {
    const errorType = error.message.includes('TIMEOUT') ? 'ERR_CONNECTION_TIMED_OUT' : 
                     error.message.includes('CERT') ? 'ERR_CERT_INVALID' : 'CRITICAL_ERROR';
    await saveBotEvent('ERROR', `Audit Crash [${seedUrl}]: ${errorType} - ${error.message}`);
    return { url: seedUrl, timestamp, status: 'failed', issuesFound: 0, scanType: 'basic', error: errorType, reason: error.message };
  }
}
