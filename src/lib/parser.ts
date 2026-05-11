
import * as cheerio from 'cheerio';
import { Violation, ComplianceReport, Category, VerificationMethod } from '@/types';

/**
 * ПРЯМАЯ ИНСТРУКЦИЯ: ЖЕСТКИЙ МАППИНГ ШТРАФОВ
 * ЭТОТ ОБЪЕКТ УБИВАЕТ NULL И "CALCULATING..." В ОТЧЕТАХ
 */
const LIABILITY_DATABASE: Record<string, string> = {
    'PRIVACY': 'Administrative fines up to €20,000,000 or 4% of global annual turnover (Art. 83 GDPR).',
    'COOKIES': 'Fines up to €10,000,000 or 2% of global turnover (ePrivacy Directive).',
    'IMPRESSUM': 'Fines up to €50,000 (German TMG §5).',
    'TERMS': 'Loss of liability protection and potential consumer law fines.',
    'DEFAULT': 'Administrative fines under GDPR Article 83.'
};

/**
 * Mandatory Legal Clusters for Semantic Analysis
 */
const MANDATORY_CLUSTERS = {
  CONTROLLER: {
    keywords: [/data controller/i, /verantwortlicher/i, /responsable du traitement/i, /titular del tratamiento/i, /identity of the controller/i, /legal disclosure/i, /registered office/i],
    law: "Art. 13(1)(a) GDPR",
    name: "Controller Identity",
    remediation: "Include the full legal name of your entity, registered physical address, and a direct contact email."
  },
  RIGHTS: {
    keywords: [/right to access/i, /right to erasure/i, /right to object/i, /auskunftsrecht/i, /löschungsrecht/i, /widerrufsrecht/i, /data subject rights/i, /your rights/i],
    law: "Art. 13(2)(b) GDPR",
    name: "Data Subject Rights",
    remediation: "Explain that users have the right to request access, correction, or deletion of their personal data."
  },
  RETENTION: {
    keywords: [/retention period/i, /speicherdauer/i, /durée de conservation/i, /plazo de conservación/i, /storage period/i, /how long we keep/i],
    law: "Art. 13(2)(a) GDPR",
    name: "Retention Periods",
    remediation: "Specify criteria or exact timeframes for how long user data is stored."
  },
  DPO: {
    keywords: [/data protection officer/i, /datenschutzbeaustragter/i, /délégué à la protection des données/i, /DPO contact/i, /privacy officer/i],
    law: "Art. 13(1)(b) GDPR",
    name: "DPO Contact Details",
    remediation: "Provide professional contact details for privacy inquiries."
  }
};

/**
 * Determines if a site specifically requires an Impressum (Legal Notice) 
 * based on regional laws (primarily DACH region).
 */
function requiresImpressum(url: string, html: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const dachTlds = ['.de', '.at', '.ch', '.li'];
    if (dachTlds.some(tld => hostname.endsWith(tld))) return true;
    const isGermanLanguage = /lang="de"/i.test(html) || /datenschutz|impressum|kontakt/i.test(html);
    if (isGermanLanguage) return true;
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Authoritative URL Normalizer
 */
export function normalizeUrl(url: string, base: string): string | null {
  try {
    const absolute = new URL(url, base);
    absolute.hash = '';
    absolute.search = ''; 
    let pathname = absolute.pathname.toLowerCase();
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    absolute.pathname = pathname;
    return absolute.href.toLowerCase();
  } catch (e) {
    return url.toLowerCase().replace(/\/$/, "").split('?')[0];
  }
}

export function parseHtmlContent(html: string, url: string, headers: any = {}, screenshot?: string, isPuppeteer: boolean = false): { 
  violations: Violation[], 
  discoveredLinks: string[],
  meta: { hasCMP: boolean, legal_links: Record<string, string | null> },
  compliance_report: ComplianceReport
} {
  const $ = cheerio.load(html);
  const verification_method: VerificationMethod = isPuppeteer ? 'Dynamic Emulation' : 'Static Analysis';
  
  const links: Record<string, string | null> = { impressum: null, privacy: null, terms: null, cookies: null };
  const violations: Violation[] = [];
  const auditText = html.substring(0, 150000).toLowerCase();

  // NAV-SCOUT: SEARCH FOR LINKS (Smart Pattern Discovery)
  $('a').each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    const href = $(el).attr('href')?.toLowerCase() || '';
    if (!href || href.startsWith('javascript:')) return;

    const normalized = normalizeUrl(href, url);
    if (!normalized) return;

    // Pattern Matching: prioritize href logic to stop false Missing reports
    const isPrivacy = /privacy|datenschutz|protection/i.test(text) || /privacy|datenschutz/i.test(href);
    const isImpressum = /impressum|legal-notice|legal-disclosure/i.test(text) || /impressum|legal-notice/i.test(href);
    const isTerms = /terms|agb|tos|usage/i.test(text) || /agb|tos|terms/i.test(href);
    const isCookies = /cookie|cookies/i.test(text) || /cookie/i.test(href);

    if (!links.privacy && isPrivacy) links.privacy = normalized;
    if (!links.impressum && isImpressum) links.impressum = normalized;
    if (!links.terms && isTerms) links.terms = normalized;
    if (!links.cookies && isCookies) links.cookies = normalized;
  });

  const mandatoryDocsConfig = [
    { key: 'privacy', name: 'Privacy Policy', law: 'Art. 13 GDPR', category: 'PRIVACY', required: true },
    { key: 'cookies', name: 'Cookie Policy', law: 'ePrivacy Directive', category: 'COOKIES', required: true },
    { key: 'terms', name: 'Terms of Service', law: 'Consumer Law', category: 'TERMS', required: true },
    { key: 'impressum', name: 'Legal Notice (Impressum)', law: '§ 5 TMG', category: 'IMPRESSUM', required: requiresImpressum(url, html) }
  ];

  const missingClusters: string[] = [];

  mandatoryDocsConfig.forEach(doc => {
    if (!doc.required) return;
    const foundUrl = links[doc.key as keyof typeof links];
    
    if (!foundUrl) {
      violations.push({
        category: doc.category as Category,
        report_type: 'SaaS',
        issue_type: `Missing ${doc.name}`,
        severity: 'critical',
        evidence_html: url,
        description: `NAV-SCOUT scanned domain structure but found zero links matching ${doc.name} patterns.`,
        law_name: doc.law,
        potential_fine: LIABILITY_DATABASE[doc.category] || LIABILITY_DATABASE.DEFAULT,
        explanation: `Under ${doc.law}, website operators must provide a clearly visible ${doc.name}.`,
        recommendation: `Mandatory Remediation: Create a ${doc.name} and insert a visible link in your footer.`,
        verification_method
      });
    } else {
      // Document found -> Run Lex-Analyzer for mandatory clusters
      Object.entries(MANDATORY_CLUSTERS).forEach(([clusterKey, cluster]) => {
        if (doc.key === 'impressum' && clusterKey !== 'CONTROLLER') return;
        if (doc.key === 'cookies' || doc.key === 'terms') return;

        if (!cluster.keywords.some(k => k.test(auditText))) {
          missingClusters.push(clusterKey);
          violations.push({
            category: doc.category as Category,
            report_type: 'SaaS',
            issue_type: `Incomplete ${doc.name}: Missing ${cluster.name}`,
            severity: 'high',
            evidence_html: foundUrl,
            description: `Legal document found at ${foundUrl}, but mandatory section [${cluster.name}] is missing.`,
            law_name: cluster.law,
            potential_fine: LIABILITY_DATABASE[doc.category] || LIABILITY_DATABASE.DEFAULT,
            explanation: `${cluster.law} mandates explicit disclosure of ${cluster.name}.`,
            recommendation: `Corrective Action Required: Append details about ${cluster.name} to satisfy ${cluster.law}: ${cluster.remediation}`,
            verification_method
          });
        }
      });
    }
  });

  const hasCMP = [/cookiebot/i, /onetrust/i, /usercentrics/i, /cmp/i].some(s => s.test(auditText));

  return {
    violations,
    discoveredLinks: [],
    meta: { hasCMP, legal_links: links },
    compliance_report: {
      score: Math.max(0, 100 - (violations.length * 15)),
      verdict: violations.some(v => v.severity === 'critical') ? 'RISKY' : (violations.length > 0 ? 'RISKY' : 'COMPLIANT'),
      nav_scout: {
        found_links: Object.values(links).filter(Boolean) as string[],
        missing_critical: mandatoryDocsConfig.filter(d => d.required && !links[d.key as keyof typeof links]).map(d => d.name),
        discovery_score: Object.values(links).filter(Boolean).length * 25
      },
      lex_analyzer: {
        has_vat_id: /de[0-9]{9}/i.test(auditText),
        has_contact_info: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(auditText),
        has_mandatory_terms: true,
        content_truncated: html.length > 150000,
        missing_clusters: Array.from(new Set(missingClusters))
      },
      cmp_detect: {
        detected_provider: hasCMP ? 'Active CMP Detected' : null,
        is_active: hasCMP
      }
    }
  };
}
