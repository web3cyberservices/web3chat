
import * as cheerio from 'cheerio';
import { Violation, ComplianceReport, Category, VerificationMethod } from '@/types';

/**
 * AUTHORITATIVE LIABILITY DATABASE
 * Eliminates 'null' and 'Calculating...' from all reports.
 */
const LIABILITY_DATABASE: Record<string, string> = {
    'PRIVACY': 'Administrative fines up to €20,000,000 or 4% of global annual turnover (Art. 83 GDPR).',
    'COOKIES': 'Fines up to €10,000,000 or 2% of global turnover (ePrivacy Directive).',
    'IMPRESSUM': 'Fines up to €50,000 (German TMG §5).',
    'TERMS': 'Loss of liability protection and potential consumer law fines.',
    'LEGAL_GROUNDS': 'Fines for unlawful processing under Art. 83(5)(a) GDPR.',
    'DEFAULT': 'Administrative fines under GDPR Article 83.'
};

/**
 * Mandatory Legal Clusters for Semantic Analysis
 */
const MANDATORY_CLUSTERS = {
  CONTROLLER: {
    keywords: [/data controller/i, /verantwortlicher/i, /responsable du traitement/i, /identity of the controller/i, /legal disclosure/i, /registered office/i, /provider identification/i],
    law: "Art. 13(1)(a) GDPR",
    name: "Controller Identity",
    remediation: "Include the full legal name of your entity, registered physical address, and a direct contact email."
  },
  RIGHTS: {
    keywords: [/right to access/i, /right to erasure/i, /right to object/i, /auskunftsrecht/i, /löschungsrecht/i, /widerrufsrecht/i, /data subject rights/i, /your rights/i, /art\. 15/i],
    law: "Art. 13(2)(b) GDPR",
    name: "Data Subject Rights",
    remediation: "Explain that users have the right to request access, correction, or deletion of their personal data."
  },
  RETENTION: {
    keywords: [/retention period/i, /speicherdauer/i, /durée de conservation/i, /plazo de conservación/i, /storage period/i, /how long we keep/i, /retention policy/i],
    law: "Art. 13(2)(a) GDPR",
    name: "Retention Periods",
    remediation: "Specify criteria or exact timeframes for how long user data is stored."
  },
  DPO: {
    keywords: [/data protection officer/i, /datenschutzbeaustragter/i, /délégué à la protection des données/i, /DPO contact/i, /privacy officer/i, /dataprotectionofficer/i],
    law: "Art. 13(1)(b) GDPR",
    name: "DPO Contact Details",
    remediation: "Provide professional contact details for privacy inquiries."
  }
};

const PROCESSING_ACTIVITIES = [
  { name: 'Analytics', keywords: [/analytics/i, /tracking/i, /usage data/i, /hotjar/i, /google analytics/i] },
  { name: 'Marketing', keywords: [/marketing/i, /advertising/i, /newsletter/i, /remarketing/i] },
  { name: 'Fraud Prevention', keywords: [/fraud/i, /security/i, /prevention/i, /bot detection/i] },
  { name: 'Customer Support', keywords: [/support/i, /contact form/i, /zendesk/i, /intercom/i] }
];

const LEGAL_BASES = [
  { name: 'Consent', keywords: [/consent/i, /art\. 6\(1\)\(a\)/i, /einwilligung/i], article: '6(1)(a)' },
  { name: 'Contract', keywords: [/contract/i, /performance of a contract/i, /art\. 6\(1\)\(b\)/i], article: '6(1)(b)' },
  { name: 'Legal Obligation', keywords: [/legal obligation/i, /compliance/i, /art\. 6\(1\)\(c\)/i], article: '6(1)(c)' },
  { name: 'Legitimate Interests', keywords: [/legitimate interest/i, /berechtigtes interesse/i, /art\. 6\(1\)\(f\)/i], article: '6(1)(f)' }
];

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
  const fullText = html.substring(0, 300000).toLowerCase();
  const footerText = $('footer').text().toLowerCase();

  // NAV-SCOUT: Pattern-First Discovery Logic
  $('a').each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    const href = $(el).attr('href')?.toLowerCase() || '';
    if (!href || href.startsWith('javascript:') || href.startsWith('#')) return;

    const normalized = normalizeUrl(href, url);
    if (!normalized) return;

    const isPrivacy = /privacy|datenschutz|protection|privacy-policy/i.test(text) || /privacy|datenschutz|protection/i.test(href);
    const isImpressum = /impressum|legal-notice|legal-disclosure|legalnotice/i.test(text) || /impressum|legal-notice|legal-disclosure/i.test(href);
    const isTerms = /terms|agb|tos|usage|terms-of-service/i.test(text) || /agb|tos|terms|usage/i.test(href);
    const isCookies = /cookie|cookies/i.test(text) || /cookie/i.test(href);

    if (!links.privacy && isPrivacy) links.privacy = normalized;
    if (!links.impressum && isImpressum) links.impressum = normalized;
    if (!links.terms && isTerms) links.terms = normalized;
    if (!links.cookies && isCookies) links.cookies = normalized;
  });

  const mandatoryDocsConfig = [
    { key: 'privacy', name: 'Privacy Policy', law: 'Art. 13 GDPR', category: 'PRIVACY', required: true },
    { key: 'cookies', name: 'Cookie Policy', law: 'ePrivacy Directive', category: 'COOKIES', required: true },
    { key: 'terms', name: 'Terms of Service', law: 'Consumer Rights Act', category: 'TERMS', required: true },
    { key: 'impressum', name: 'Legal Notice (Impressum)', law: '§ 5 TMG', category: 'IMPRESSUM', required: requiresImpressum(url, html) }
  ];

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
        description: `NAV-SCOUT structural audit failed to identify a compliant ${doc.name} matching standard patterns.`,
        law_name: doc.law,
        potential_fine: LIABILITY_DATABASE[doc.category] || LIABILITY_DATABASE.DEFAULT,
        explanation: `Under ${doc.law}, website operators are strictly required to provide a clearly visible and accessible ${doc.name}.`,
        recommendation: `Remediation required: Implement a compliant ${doc.name} and provide a permanent link in the global footer.`,
        verification_method
      });
    } else {
      // Lex-Analyzer for cluster verification
      Object.entries(MANDATORY_CLUSTERS).forEach(([clusterKey, cluster]) => {
        if (doc.key === 'cookies' || doc.key === 'terms') return;
        
        const clusterFound = cluster.keywords.some(k => k.test(fullText));
        
        if (clusterKey === 'CONTROLLER' && !clusterFound) {
          // Cross-page check: is it in the footer?
          const inFooter = cluster.keywords.some(k => k.test(footerText));
          if (inFooter) {
            violations.push({
              category: doc.category as Category,
              report_type: 'SaaS',
              issue_type: `Placement Recommendation: Controller Identity`,
              severity: 'low',
              evidence_html: url,
              description: `Controller information found in footer, but missing from Privacy Policy document.`,
              law_name: cluster.law,
              potential_fine: LIABILITY_DATABASE[doc.category],
              explanation: `Art. 13 mandates clear disclosure. While found on site, accessibility is improved by direct inclusion in the policy.`,
              recommendation: `Article 13 suggests including Controller identity directly in the Privacy Policy for better accessibility.`,
              verification_method
            });
          } else {
            violations.push({
              category: doc.category as Category,
              report_type: 'SaaS',
              issue_type: `Incomplete ${doc.name}: ${cluster.name}`,
              severity: 'high',
              evidence_html: foundUrl,
              description: `Violation of ${cluster.law}. document identified, but cluster [${cluster.name}] was not detected.`,
              law_name: cluster.law,
              potential_fine: LIABILITY_DATABASE[doc.category],
              explanation: `${cluster.law} mandates explicit disclosure regarding ${cluster.name}.`,
              recommendation: `Corrective Action (Art. 13 Compliance): Append specific disclosure details for ${cluster.name}. ${cluster.remediation}`,
              verification_method
            });
          }
        } else if (!clusterFound) {
          violations.push({
            category: doc.category as Category,
            report_type: 'SaaS',
            issue_type: `Incomplete ${doc.name}: ${cluster.name}`,
            severity: 'high',
            evidence_html: foundUrl,
            description: `Violation of ${cluster.law}. Cluster [${cluster.name}] missing from ${doc.name}.`,
            law_name: cluster.law,
            potential_fine: LIABILITY_DATABASE[doc.category],
            explanation: `${cluster.law} mandates explicit disclosure regarding ${cluster.name}.`,
            recommendation: `Corrective Action (Art. 13 Compliance): Append specific disclosure details for ${cluster.name}. ${cluster.remediation}`,
            verification_method
          });
        }
      });

      // Legal Basis Deep Dive (Art. 13(1)(c))
      if (doc.key === 'privacy') {
        PROCESSING_ACTIVITIES.forEach(activity => {
          if (activity.keywords.some(k => k.test(fullText))) {
            const hasBasis = LEGAL_BASES.some(basis => basis.keywords.some(k => k.test(fullText)));
            if (!hasBasis) {
              violations.push({
                category: 'LEGAL_GROUNDS',
                report_type: 'SaaS',
                issue_type: `Missing Legal Basis for ${activity.name}`,
                severity: 'critical',
                evidence_html: foundUrl,
                description: `Activity [${activity.name}] detected, but no explicit legal basis (Art. 6 GDPR) is linked.`,
                law_name: 'Art. 13(1)(c) GDPR',
                potential_fine: LIABILITY_DATABASE.LEGAL_GROUNDS,
                explanation: `Every processing operation must be tied to a specific legal ground from Article 6.`,
                recommendation: `Associate the [${activity.name}] operation with a valid legal basis (e.g., Consent or Legitimate Interest).`,
                verification_method
              });
            }
          }
        });

        // Legitimate Interests Specification (Art. 13(1)(d))
        if (/legitimate interest|berechtigtes interesse/i.test(fullText)) {
          const describesInterest = /interests pursued by/i.test(fullText) || /following legitimate interests/i.test(fullText) || /our interest in/i.test(fullText);
          if (!describesInterest) {
            violations.push({
              category: 'LEGAL_GROUNDS',
              report_type: 'SaaS',
              issue_type: `Failure to specify Legitimate Interests`,
              severity: 'high',
              evidence_html: foundUrl,
              description: `Legitimate Interest used as legal basis, but specific interests are not described.`,
              law_name: 'Art. 13(1)(d) GDPR',
              potential_fine: LIABILITY_DATABASE.LEGAL_GROUNDS,
              explanation: `Art. 13(1)(d) requires disclosure of the specific interests pursued when processing under Art. 6(1)(f).`,
              recommendation: `Provide a detailed description of the specific legitimate interests pursued by the controller or third party.`,
              verification_method
            });
          }
        }
      }
    }
  });

  const hasCMP = [/cookiebot/i, /onetrust/i, /usercentrics/i, /cmp/i, /consent/i].some(s => s.test(fullText));

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
        has_vat_id: /de[0-9]{9}/i.test(fullText) || /vat id/i.test(fullText),
        has_contact_info: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(fullText),
        has_mandatory_terms: true,
        content_truncated: html.length > 300000,
        missing_clusters: []
      },
      cmp_detect: {
        detected_provider: hasCMP ? 'Active CMP Detected' : null,
        is_active: hasCMP
      }
    }
  };
}
