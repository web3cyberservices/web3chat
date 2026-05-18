
import { scrapeUrl } from '@/lib/scraper';
import { parseHtmlContent } from '@/lib/parser';
import { isUrlAllowed } from '@/config/robots-rules';
import { saveAuditLog, saveBotEvent, saveAuditResults, normalizeUrl, saveValidationLog } from '@/lib/db';
import { verifyIntegrity } from '@/lib/validator';
import { CrawlResult, Violation } from '@/types';
import { z } from 'zod';
import { performance } from 'perf_hooks';

const urlSchema = z.string().url();

/**
 * The Loop Architecture (V32.5) - Semantic Deep Analysis & Fallback Discovery
 */
export async function runCrawlTask(seedUrl: string, iteration: number = 1): Promise<CrawlResult> {
  const startTime = performance.now();
  const timestamp = new Date().toISOString();
  
  try {
    const validation = urlSchema.safeParse(seedUrl);
    if (!validation.success) {
      return { url: seedUrl, timestamp, status: 'failed', issuesFound: 0, scanType: 'basic', reason: 'Invalid URL format' };
    }

    const initialNormalized = normalizeUrl(seedUrl) || seedUrl;
    const domain = new URL(initialNormalized).hostname;

    const robotsCheck = await isUrlAllowed(initialNormalized);
    if (!robotsCheck.allowed) {
      return { url: initialNormalized, timestamp, status: 'blocked', issuesFound: 0, scanType: 'basic', reason: robotsCheck.reason };
    }

    // PHASE 1: COLLECTION (HOME PAGE)
    await saveBotEvent('SUCCESS', `Audit Loop Start: ${initialNormalized}`);
    const scrape = await scrapeUrl(initialNormalized);
    if (scrape.status === 'fail') {
      return { url: initialNormalized, timestamp, status: 'failed', issuesFound: 0, scanType: 'basic', reason: 'Failed to retrieve content' };
    }

    const initialParsed = parseHtmlContent(
      scrape.html, 
      initialNormalized, 
      scrape.rawHeaders, 
      scrape.screenshot,
      scrape.method === 'puppeteer'
    );

    // PHASE 2: SEMANTIC DEEP DIVE (FOLLOWING LEGAL CANDIDATES)
    const legalLinks = { ...initialParsed.meta.legal_links };
    
    // SMART FALLBACK: If semantic analysis missed the link (e.g. JS rendered), try common paths
    const baseUrl = initialNormalized.endsWith('/') ? initialNormalized.slice(0, -1) : initialNormalized;
    if (!legalLinks.privacy) {
      legalLinks.privacy = `${baseUrl}/legal/privacy`;
    }

    const candidates = Object.entries(legalLinks).filter(([_, href]) => !!href);
    const hasAnyFooterLink = candidates.length > 0;

    let aggregatedLegalContent = scrape.html; 

    if (hasAnyFooterLink) {
      await saveBotEvent('SUCCESS', `Semantic Discovery: Found potential legal paths. Fetching content...`);
      
      for (const [type, href] of candidates) {
          const deepUrl = normalizeUrl(href!, initialNormalized);
          if (deepUrl === initialNormalized) continue;

          try {
            const deepScrape = await scrapeUrl(deepUrl);
            if (deepScrape.status === 'success') {
                aggregatedLegalContent += `\n\n--- DOCUMENT: ${type.toUpperCase()} AT ${deepUrl} ---\n\n` + deepScrape.html;
            }
          } catch (e) {
            // Silently skip failed fallback paths
          }
      }
    }

    // PHASE 3: AI VERIFICATION (ANALYSING CONTENT POOL)
    const validationResult = await verifyIntegrity(aggregatedLegalContent, initialParsed.violations, hasAnyFooterLink);
    
    await saveValidationLog(initialNormalized, iteration, validationResult.integrity_status, validationResult.validated_findings, validationResult.overall_confidence);

    // PHASE 4: FINALIZATION
    await saveAuditLog(domain, 200, null);
    
    const verifiedFindings = validationResult.validated_findings;
    await saveAuditResults(domain, initialNormalized, verifiedFindings, iteration > 1 ? 'deep' : 'basic');
    
    const total_ms = Math.round(performance.now() - startTime);
    await saveBotEvent('SUCCESS', `Loop Finished: ${domain} | Confidence: ${validationResult.overall_confidence} | Issues: ${verifiedFindings.length}`);

    return {
      url: initialNormalized,
      timestamp,
      status: 'success',
      issuesFound: verifiedFindings.length,
      violations: verifiedFindings as any,
      compliance_report: {
        ...initialParsed.compliance_report,
        score: Math.max(0, 100 - (verifiedFindings.length * 25)),
        verdict: verifiedFindings.length > 0 ? 'RISKY' : 'COMPLIANT',
        validation_status: validationResult.integrity_status
      },
      scanType: iteration > 1 ? 'deep' : 'basic',
      meta: {
        duration_ms: total_ms,
        memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        method: scrape.method,
        verification_method: iteration > 1 ? 'Dynamic Emulation' : 'Static Analysis',
        hasCMP: initialParsed.meta.hasCMP,
        legal_links: legalLinks,
        attempts: iteration,
        confidence: validationResult.overall_confidence
      }
    };
  } catch (error: any) {
    await saveBotEvent('ERROR', `Loop Crash [${seedUrl}]: ${error.message}`);
    return { url: seedUrl, timestamp, status: 'failed', issuesFound: 0, scanType: 'basic', reason: error.message };
  }
}
