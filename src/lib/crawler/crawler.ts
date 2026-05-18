
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
 * The Loop Architecture (V34.0) - Semantic Deep Analysis & Failback Discovery
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
    
    // SMART FALLBACK: If initial search failed, try forced common paths
    const origin = new URL(initialNormalized).origin;
    if (!legalLinks.privacy) {
      const fallbacks = [`${origin}/legal/privacy`, `${origin}/privacy`, `${origin}/privacy-policy`, `${origin}/datenschutz`];
      for (const fb of fallbacks) {
        try {
          // Check header first for speed
          const check = await fetch(fb, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
          if (check.ok) {
            legalLinks.privacy = fb;
            break;
          }
        } catch (e) {}
      }
    }

    const candidates = Object.entries(legalLinks).filter(([_, href]) => !!href);
    let aggregatedLegalContent = scrape.html; 
    let documentsFound = candidates.length > 0;

    if (documentsFound) {
      await saveBotEvent('SUCCESS', `Semantic Discovery: Found legal paths. Fetching content...`);
      
      for (const [type, href] of candidates) {
          const deepUrl = normalizeUrl(href!, initialNormalized);
          if (deepUrl === initialNormalized) continue;

          try {
            const deepScrape = await scrapeUrl(deepUrl);
            if (deepScrape.status === 'success' && deepScrape.html.length > 200) {
                aggregatedLegalContent += `\n\n--- DOCUMENT: ${type.toUpperCase()} AT ${deepUrl} ---\n\n` + deepScrape.html;
            }
          } catch (e) {}
      }
    }

    // PHASE 3: AI VERIFICATION & INTERCEPTION
    let verifiedFindings: Violation[] = [];
    let validationResult: any;

    // Hard Intercept: If content is missing even after fallback, skip AI content check
    if (aggregatedLegalContent.trim().length < 500 && !documentsFound) {
       verifiedFindings = [{
         category: 'Privacy',
         report_type: 'SaaS',
         issue_type: 'MISSING CORE FRAMEWORK',
         severity: 'critical',
         evidence_html: initialNormalized,
         description: 'No statutory legal disclosure links or content (Privacy Policy/Impressum) were identified in the site architecture.',
         business_impact: 'Critical risk: Meta and Google advertising accounts may be suspended due to missing compliance signals.',
         law_name: 'Art. 12 & 13 GDPR',
         potential_fine: 'Up to €20,000,000 or 4% of global turnover.',
         explanation: 'The law requires a visible and accessible privacy policy on all commercial websites.',
         recommendation: 'ACTION: INSERT THIS HTML -> "<footer class=\"legal-footer\"><a href=\"/privacy\">Privacy Policy</a></footer>"',
         confidence_score: 1.0,
         verification_status: 'verified'
       }];
       validationResult = { integrity_status: 'incomplete', overall_confidence: 1.0 };
    } else {
       validationResult = await verifyIntegrity(aggregatedLegalContent, initialParsed.violations, documentsFound);
       verifiedFindings = validationResult.validated_findings;
    }
    
    await saveValidationLog(initialNormalized, iteration, validationResult.integrity_status, verifiedFindings, validationResult.overall_confidence);

    // PHASE 4: FINALIZATION
    await saveAuditLog(domain, 200, null);
    await saveAuditResults(domain, initialNormalized, verifiedFindings, iteration > 1 ? 'deep' : 'basic');
    
    const total_ms = Math.round(performance.now() - startTime);
    await saveBotEvent('SUCCESS', `Loop Finished: ${domain} | Findings: ${verifiedFindings.length}`);

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
