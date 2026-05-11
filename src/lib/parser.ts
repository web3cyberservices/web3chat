
import * as cheerio from 'cheerio';
import { Violation, ComplianceReport } from '@/types';

const LEGAL_PATTERNS = {
  impressum: [/impressum/i, /legal notice/i, /mentions l[eé]gales/i, /aviso legal/i, /note legali/i],
  privacy: [/privacy/i, /datenschutz/i, /confidentialit[eé]/i, /privacidad/i, /politika privatnosti/i],
  terms: [/terms/i, /tos/i, /conditions/i, /bedingungen/i, /condiciones/i, /agb/i],
  cookies: [/cookie/i, /galletas/i, /biscotti/i]
};

const CMP_SIGNATURES = {
  'OneTrust': /ot-sdk-column|onetrust-consent-sdk/i,
  'Cookiebot': /cookiebot/i,
  'Usercentrics': /usercentrics/i,
  'Sourcepoint': /sourcepoint/i
};

/**
 * NAV-SCOUT: Navigation & Link Discovery Module
 */
function navScout($: cheerio.CheerioAPI, baseUrl: string) {
  const links: Record<string, string | null> = { impressum: null, privacy: null, terms: null, cookies: null };
  const missing_critical: string[] = [];
  let score = 0;

  $('a').each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    const href = $(el).attr('href')?.toLowerCase() || '';
    
    // High Priority Scoring
    if (/impressum|legal notice/i.test(text)) {
      links.impressum = new URL(href, baseUrl).href;
      score += 40;
    }
    if (/privacy|datenschutz/i.test(text)) {
      links.privacy = new URL(href, baseUrl).href;
      score += 30;
    }
    
    // Medium Priority Scoring
    if (/agb|terms|conditions/i.test(text)) {
      links.terms = new URL(href, baseUrl).href;
      score += 15;
    }
    if (/cookie/i.test(text)) {
      links.cookies = new URL(href, baseUrl).href;
      score += 15;
    }
  });

  if (!links.impressum) missing_critical.push('Impressum / Legal Notice');
  if (!links.privacy) missing_critical.push('Privacy Policy');

  return {
    links,
    missing_critical,
    discovery_score: Math.min(score, 100)
  };
}

/**
 * LEX-ANALYZER: Semantic Legal Analysis
 */
function lexAnalyzer(html: string) {
  // Truncate to 100KB for memory safety
  const text = html.substring(0, 102400).toLowerCase();
  
  const has_vat_id = /de[0-9]{9}/i.test(text);
  const has_email = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text);
  const has_phone = /\+?[0-9\s-]{8,20}/i.test(text);
  const has_mandatory_terms = /haftungsausschluss|streitbeilegung|disclaimer|jurisdiction/i.test(text);

  let score = 0;
  if (has_vat_id) score += 30;
  if (has_email && has_phone) score += 30;
  if (has_mandatory_terms) score += 40;

  return {
    score,
    has_vat_id,
    has_contact_info: has_email && has_phone,
    has_mandatory_terms,
    content_truncated: html.length > 102400
  };
}

/**
 * CMP-DETECT: Consent Management Platform Detection
 */
function cmpDetect(html: string) {
  let detectedProvider: string | null = null;
  let isActive = false;

  for (const [provider, pattern] of Object.entries(CMP_SIGNATURES)) {
    if (pattern.test(html)) {
      detectedProvider = provider;
      isActive = true;
      break;
    }
  }

  return { detectedProvider, isActive };
}

/**
 * Main Compliance Parser Engine
 */
export function parseHtmlContent(html: string, url: string, headers: any = {}, screenshot?: string): { 
  violations: Violation[], 
  discoveredLinks: string[],
  meta: { hasCMP: boolean, legal_links: Record<string, string | null> },
  compliance_report: ComplianceReport
} {
  const $ = cheerio.load(html);
  const violations: Violation[] = [];
  const discoveredLinks: string[] = [];
  const targetUrl = new URL(url);
  const domain = targetUrl.hostname.toLowerCase();
  
  // Link Discovery
  $('a[href]').each((_, el) => {
    try {
      const href = $(el).attr('href');
      if (!href || href.startsWith('javascript:') || href.startsWith('mailto:')) return;
      const absoluteUrl = new URL(href, url);
      if (absoluteUrl.hostname === domain) discoveredLinks.push(absoluteUrl.href);
    } catch (e) {}
  });

  // Run Sub-Modules
  const nav = navScout($, url);
  const lex = lexAnalyzer(html);
  const cmp = cmpDetect(html);

  // Generate Violations based on Module results
  if (nav.missing_critical.length > 0) {
    nav.missing_critical.forEach(missing => {
      violations.push({
        category: 'Legal_Content',
        report_type: 'SaaS',
        issue_type: `Missing ${missing}`,
        severity: 'critical',
        evidence_html: url,
        description: `NAV-SCOUT engine scanned the footer and did not detect a link to ${missing}. This is a critical transparency violation.`,
        law_name: missing.includes('Impressum') ? '§5 TMG (Germany)' : 'GDPR Art. 13/14',
        potential_fine: '€500 - €20,000,000',
        explanation: 'Mandatory legal disclosures must be "easily recognizable, directly accessible, and permanently available".',
        recommendation: `Add a clearly labeled "${missing}" link to your website footer.`
      });
    });
  }

  if (nav.links.impressum && !lex.has_vat_id && domain.endsWith('.de')) {
    violations.push({
      category: 'Legal_Content',
      report_type: 'SaaS',
      issue_type: 'Missing VAT ID',
      severity: 'medium',
      evidence_html: nav.links.impressum,
      description: 'LEX-ANALYZER scanned the Impressum but failed to find a valid VAT ID (USt-IdNr).',
      law_name: '§5 Abs. 1 Nr. 6 TMG',
      potential_fine: '€100 - €5,000',
      explanation: 'Companies in Germany must disclose their VAT ID in the Impressum if applicable.',
      recommendation: 'Update your Impressum with the correct VAT ID.'
    });
  }

  const compliance_report: ComplianceReport = {
    score: Math.round((nav.discovery_score + lex.score) / 2),
    nav_scout: {
      found_links: Object.values(nav.links).filter(Boolean) as string[],
      missing_critical: nav.missing_critical,
      discovery_score: nav.discovery_score
    },
    lex_analyzer: {
      has_vat_id: lex.has_vat_id,
      has_contact_info: lex.has_contact_info,
      has_mandatory_terms: lex.has_mandatory_terms,
      content_truncated: lex.content_truncated
    },
    cmp_detect: {
      detected_provider: cmp.detectedProvider,
      is_active: cmp.isActive
    }
  };

  return { 
    violations, 
    discoveredLinks: Array.from(new Set(discoveredLinks)).slice(0, 50),
    meta: { hasCMP: cmp.isActive, legal_links: nav.links },
    compliance_report
  };
}

export function shouldRunDeepScan(html: string): boolean {
  const $ = cheerio.load(html);
  const isSPA = $('#app').length > 0 || $('#root').length > 0;
  const hasCMP = /onetrust|cookiebot|usercentrics/i.test(html);
  return isSPA || hasCMP;
}
