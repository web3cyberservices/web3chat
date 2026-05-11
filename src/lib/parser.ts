
import * as cheerio from 'cheerio';
import { Violation, ComplianceReport } from '@/types';

const LEGAL_PATTERNS = {
  impressum: [/impressum/i, /legal notice/i, /mentions l[eé]gales/i, /aviso legal/i, /note legali/i, /legal disclosure/i],
  privacy: [/privacy/i, /datenschutz/i, /confidentialit[eé]/i, /privacidad/i, /politika privatnosti/i, /data protection/i],
  terms: [/terms/i, /tos/i, /conditions/i, /bedingungen/i, /condiciones/i, /agb/i, /nutzungsbedingungen/i],
  cookies: [/cookie/i, /galletas/i, /biscotti/i, /cookie policy/i]
};

const CMP_SIGNATURES = {
  'OneTrust': /ot-sdk-column|onetrust-consent-sdk/i,
  'Cookiebot': /cookiebot/i,
  'Usercentrics': /usercentrics/i,
  'Sourcepoint': /sourcepoint/i
};

function normalizeUrl(url: string, base: string): string | null {
  try {
    const absolute = new URL(url, base);
    absolute.hash = '';
    let pathname = absolute.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    absolute.pathname = pathname;
    return absolute.href;
  } catch (e) {
    return null;
  }
}

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
    if (!href || href.startsWith('javascript:')) return;

    const normalized = normalizeUrl(href, baseUrl);
    if (!normalized) return;

    // Smart Semantic Mapping
    if (LEGAL_PATTERNS.impressum.some(p => p.test(text) || p.test(href))) {
      if (!links.impressum) { links.impressum = normalized; score += 40; }
    }
    if (LEGAL_PATTERNS.privacy.some(p => p.test(text) || p.test(href))) {
      if (!links.privacy) { links.privacy = normalized; score += 30; }
    }
    if (LEGAL_PATTERNS.terms.some(p => p.test(text) || p.test(href))) {
      if (!links.terms) { links.terms = normalized; score += 15; }
    }
    if (LEGAL_PATTERNS.cookies.some(p => p.test(text) || p.test(href))) {
      if (!links.cookies) { links.cookies = normalized; score += 15; }
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

export function parseHtmlContent(html: string, url: string, headers: any = {}, screenshot?: string, isPuppeteer: boolean = false): { 
  violations: Violation[], 
  discoveredLinks: string[],
  meta: { hasCMP: boolean, legal_links: Record<string, string | null> },
  compliance_report: ComplianceReport
} {
  const $ = cheerio.load(html);
  const targetUrl = new URL(url);
  const domain = targetUrl.hostname.toLowerCase();
  const verification_method = isPuppeteer ? 'Dynamic Emulation' : 'Static Analysis';
  
  // Link Discovery with Deduplication
  const linkSet = new Set<string>();
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || href.startsWith('javascript:') || href.startsWith('mailto:')) return;
    const normalized = normalizeUrl(href, url);
    if (normalized && new URL(normalized).hostname === domain) {
      linkSet.add(normalized);
    }
  });

  const nav = navScout($, url);
  const lex = lexAnalyzer(html);
  const cmp = cmpDetect(html);

  const raw_violations: Violation[] = [];

  if (nav.missing_critical.length > 0) {
    nav.missing_critical.forEach(missing => {
      raw_violations.push({
        category: 'Legal_Content',
        report_type: 'SaaS',
        issue_type: `Missing ${missing}`,
        severity: 'critical',
        evidence_html: url,
        description: `NAV-SCOUT engine scanned the footer and did not detect a link to ${missing}. This is a critical transparency violation.`,
        law_name: missing.includes('Impressum') ? '§5 TMG (Germany)' : 'GDPR Art. 13/14',
        potential_fine: '€5,000 - €20,000,000',
        explanation: 'Mandatory legal disclosures must be "easily recognizable, directly accessible, and permanently available".',
        recommendation: `Add a clearly labeled "${missing}" link to your website footer.`,
        verification_method
      });
    });
  }

  if (nav.links.impressum && !lex.has_vat_id && domain.endsWith('.de')) {
    raw_violations.push({
      category: 'Legal_Content',
      report_type: 'SaaS',
      issue_type: 'Missing VAT ID',
      severity: 'medium',
      evidence_html: nav.links.impressum,
      description: 'LEX-ANALYZER scanned the Impressum but failed to find a valid VAT ID (USt-IdNr).',
      law_name: '§5 Abs. 1 Nr. 6 TMG',
      potential_fine: '€100 - €5,000',
      explanation: 'Companies in Germany must disclose their VAT ID in the Impressum if applicable.',
      recommendation: 'Update your Impressum with the correct VAT ID.',
      verification_method
    });
  }

  // Deduplication & Grouping Logic
  const grouped = raw_violations.reduce((acc: Record<string, Violation>, curr) => {
    const key = `${curr.issue_type}_${curr.category}`;
    if (!acc[key]) {
      acc[key] = { ...curr, affected_urls: [curr.evidence_html] };
    } else {
      if (!acc[key].affected_urls?.includes(curr.evidence_html)) {
        acc[key].affected_urls?.push(curr.evidence_html);
      }
    }
    return acc;
  }, {});

  const violations = Object.values(grouped);
  const score = Math.round((nav.discovery_score + lex.score) / 2);
  const verdict = (nav.missing_critical.length === 0 && score > 70) ? 'COMPLIANT' : 'RISKY';

  return { 
    violations, 
    discoveredLinks: Array.from(linkSet).slice(0, 50),
    meta: { hasCMP: cmp.isActive, legal_links: nav.links },
    compliance_report: {
      score,
      verdict,
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
    }
  };
}

export function shouldRunDeepScan(html: string): boolean {
  const $ = cheerio.load(html);
  const isSPA = $('#app').length > 0 || $('#root').length > 0;
  const hasCMP = /onetrust|cookiebot|usercentrics/i.test(html);
  const bodyEmpty = $('body').text().trim().length < 200;
  return isSPA || hasCMP || bodyEmpty;
}
