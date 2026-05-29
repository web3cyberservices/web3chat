import { scrapeUrl } from '@/lib/scraper';
import { parseHtmlContent } from '@/lib/parser';
import { extractEmails } from '@/lib/crawler/parser';
import { isUrlAllowed } from '@/config/robots-rules';
import { 
  saveAuditLog, 
  saveBotEvent, 
  saveAuditResults, 
  normalizeUrl, 
  saveValidationLog,
  saveLeadContacts 
} from '@/lib/db';
import { verifyIntegrity } from '@/lib/validator';
import { CrawlResult, Violation } from '@/types';
import { z } from 'zod';
import { performance } from 'perf_hooks';

const urlSchema = z.string().url();

/**
 * The Loop Architecture (V35.0) - Integrated Lead Gen & Legal Audit
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
    const origin = new URL(initialNormalized).origin;
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

    // LEAD GEN: Extract emails from home page
    const foundEmails = extractEmails(scrape.html);

    // PHASE 2: SEMANTIC DEEP DIVE (FOLLOWING LEGAL CANDIDATES)
    const legalLinksRaw = { ...initialParsed.meta.legal_links };
    const legalLinksNormalized: Record<string, string | null> = {};
    
    Object.entries(legalLinksRaw).forEach(([key, val]) => {
      if (val) legalLinksNormalized[key] = normalizeUrl(val, origin);
      else legalLinksNormalized[key] = null;
    });

    // SMART FALLBACK
    if (!legalLinksNormalized.privacy) {
      const fallbacks = [
        normalizeUrl('/legal/privacy', origin),
        normalizeUrl('/privacy', origin),
        normalizeUrl('/privacy-policy', origin),
        normalizeUrl('/datenschutz', origin)
      ];
      for (const fb of fallbacks) {
        try {
          const check = await fetch(fb, { method: 'HEAD', signal: AbortSignal.timeout(4000) });
          if (check.ok) {
            legalLinksNormalized.privacy = fb;
            break;
          }
        } catch (e) {}
      }
    }

    const candidates = Object.entries(legalLinksNormalized).filter(([_, href]) => !!href);
    let aggregatedLegalContent = scrape.html; 
    let documentsFound = candidates.length > 0;

    if (documentsFound) {
      await saveBotEvent('SUCCESS', `Semantic Discovery: Fetching legal document content...`);
      for (const [type, href] of candidates) {
          const deepUrl = href!;
          if (deepUrl === initialNormalized) continue;

          try {
            const deepScrape = await scrapeUrl(deepUrl);
            if (deepScrape.status === 'success' && deepScrape.html.length > 200) {
                aggregatedLegalContent += `\n\n--- DOCUMENT: ${type.toUpperCase()} AT ${deepUrl} ---\n\n` + deepScrape.html;
                // Accumulate emails from legal pages too
                extractEmails(deepScrape.html).forEach(e => foundEmails.push(e));
            }
          } catch (e) {}
      }
    }

    // PHASE 3: AI VERIFICATION
    let verifiedFindings: Violation[] = [];
    let validationResult: any;

    if (aggregatedLegalContent.trim().length < 500 && !documentsFound) {
       verifiedFindings = [{
         category: 'Privacy',
         report_type: 'SaaS',
         issue_type: 'MISSING CORE FRAMEWORK',
         severity: 'critical',
         evidence_html: initialNormalized,
         description: 'No statutory legal disclosure links or content (Privacy Policy/Impressum) were identified.',
         business_impact: 'Critical risk: Advertising accounts may be suspended due to missing compliance signals.',
         law_name: 'Art. 12 & 13 GDPR',
         potential_fine: 'Up to €20,000,000 or 4% of global turnover.',
         explanation: 'The law requires a visible and accessible privacy policy on all commercial websites.',
         recommendation: 'ACTION: Create and link a dedicated /privacy page.',
         confidence_score: 1.0,
         verification_status: 'verified'
       }];
       validationResult = { integrity_status: 'incomplete', overall_confidence: 1.0 };
    } else {
       validationResult = await verifyIntegrity(aggregatedLegalContent, initialParsed.violations, documentsFound);
       verifiedFindings = validationResult.validated_findings;
    }
    
    // PHASE 4: FINALIZATION & CRM SAVE
    const uniqueEmails = [...new Set(foundEmails)];
    await saveLeadContacts(domain, uniqueEmails);
    await saveValidationLog(initialNormalized, iteration, validationResult.integrity_status, verifiedFindings, validationResult.overall_confidence);
    await saveAuditLog(domain, 200, null);
    await saveAuditResults(domain, initialNormalized, verifiedFindings, iteration > 1 ? 'deep' : 'basic');
    
    const total_ms = Math.round(performance.now() - startTime);
    await saveBotEvent('SUCCESS', `Loop Finished: ${domain} | Leads: ${uniqueEmails.length} | Findings: ${verifiedFindings.length}`);

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
        legal_links: legalLinksNormalized,
        attempts: iteration,
        confidence: validationResult.overall_confidence
      }
    };
  } catch (error: any) {
    await saveBotEvent('ERROR', `Loop Crash [${seedUrl}]: ${error.message}`);
    return { url: seedUrl, timestamp, status: 'failed', issuesFound: 0, scanType: 'basic', reason: error.message };
  }
}
