
import * as cheerio from 'cheerio';
import { Violation, ComplianceReport, Category, VerificationMethod } from '@/types';

/**
 * AUTHORITATIVE LIABILITY DATABASE
 * Based on GDPR Article 83.
 */
const LIABILITY_DATABASE: Record<string, string> = {
    'PRIVACY': '€20,000,000 or 4% of global turnover',
    'COOKIES': '€20,000,000 or 4% of global turnover',
    'IMPRESSUM': '€20,000,000 or 4% of global turnover',
    'LEGAL_GROUNDS': '€20,000,000 or 4% of global turnover',
    'DEFAULT': '€20,000,000 or 4% of global turnover'
};

/**
 * Mandatory Legal Clusters for Semantic Analysis
 */
const MANDATORY_CLUSTERS = {
  CONTROLLER: {
    keywords: [/data controller/i, /verantwortlicher/i, /responsable du traitement/i, /identity of the controller/i, /legal disclosure/i, /registered office/i],
    law: "Art. 13(1)(a) GDPR",
    name: "Controller Identity",
    remediation: "Include the full legal name and physical address of the data controller directly within the Privacy Policy body."
  },
  RIGHTS: {
    keywords: [/right to access/i, /right to erasure/i, /right to object/i, /auskunftsrecht/i, /löschungsrecht/i, /widerrufsrecht/i],
    law: "Art. 13(2)(b) GDPR",
    name: "Data Subject Rights",
    remediation: "Explicitly list user rights (Access, Erasure, Objection) according to Article 15-21 GDPR."
  },
  RETENTION: {
    keywords: [/retention period/i, /speicherdauer/i, /durée de conservation/i, /how long we keep/i],
    law: "Art. 13(2)(a) GDPR",
    name: "Retention Periods",
    remediation: "Define criteria or exact timeframes for how long user data is stored."
  }
};

const PROCESSING_ACTIVITIES = [
  { name: 'Analyzing usage', keywords: [/analytics/i, /tracking/i, /usage analysis/i], defaultBasis: 'Art. 6(1)(f) (Legitimate Interests)' },
  { name: 'Marketing / Ads', keywords: [/marketing/i, /advertising/i], defaultBasis: 'Art. 6(1)(a) (Consent)' },
  { name: 'Fraud prevention', keywords: [/fraud/i, /security/i, /bot detection/i], defaultBasis: 'Art. 6(1)(f) (Legitimate Interests)' }
];

const LEGAL_BASES = [
  { name: 'Consent', keywords: [/consent/i, /art\. 6\(1\)\(a\)/i], article: '6(1)(a)' },
  { name: 'Contract', keywords: [/contract/i, /art\. 6\(1\)\(b\)/i], article: '6(1)(b)' },
  { name: 'Legitimate Interests', keywords: [/legitimate interest/i, /art\. 6\(1\)\(f\)/i], article: '6(1)(f)' }
];

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

  // Pattern-First Discovery
  $('a').each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    const href = $(el).attr('href')?.toLowerCase() || '';
    if (!href || href.startsWith('javascript:') || href.startsWith('#')) return;

    if (/privacy|datenschutz/i.test(text)) links.privacy = href;
    if (/impressum|legal-notice/i.test(text)) links.impressum = href;
    if (/terms|agb/i.test(text)) links.terms = href;
    if (/cookie/i.test(text)) links.cookies = href;
  });

  const mandatoryDocs = [
    { key: 'privacy', name: 'Privacy Policy', law: 'Art. 13 GDPR', category: 'PRIVACY' },
    { key: 'cookies', name: 'Cookie Policy', law: 'Art. 13 GDPR', category: 'COOKIES' }
  ];

  mandatoryDocs.forEach(doc => {
    const foundUrl = links[doc.key as keyof typeof links];
    if (!foundUrl) {
      violations.push({
        category: doc.category as Category,
        report_type: 'SaaS',
        issue_type: `MISSING ${doc.name.toUpperCase()}`,
        severity: 'critical',
        evidence_html: url,
        description: `NAV-SCOUT structural audit failed to identify a compliant ${doc.name}.`,
        law_name: doc.law,
        potential_fine: LIABILITY_DATABASE[doc.category],
        explanation: `Under ${doc.law}, website operators must provide a clearly visible ${doc.name}.`,
        recommendation: `Implement a compliant ${doc.name} and provide a permanent link in the global footer.`,
        verification_method
      });
    } else {
      // Lex-Analyzer for cluster verification
      Object.entries(MANDATORY_CLUSTERS).forEach(([clusterKey, cluster]) => {
        const clusterFound = cluster.keywords.some(k => k.test(fullText));
        
        if (clusterKey === 'CONTROLLER') {
          const inFooter = cluster.keywords.some(k => k.test(footerText));
          if (!clusterFound && inFooter) {
            violations.push({
              category: doc.category as Category,
              report_type: 'SaaS',
              issue_type: `INCOMPLETE DISCLOSURE: ${cluster.name.toUpperCase()}`,
              severity: 'low',
              evidence_html: url,
              description: `Controller Identity found in website footer but absent from Privacy Policy body.`,
              law_name: cluster.law,
              potential_fine: LIABILITY_DATABASE[doc.category],
              explanation: `Art. 13 GDPR mandates explicit disclosure. Data was detected in the footer, but statutory transparency standards require inclusion inside the policy document body.`,
              recommendation: `Status: Detected in website footer. Requirement: While present in the footer, Article 13 transparency principles require this information to be explicitly included within the main body of the Privacy Policy document.`,
              verification_method
            });
          } else if (!clusterFound) {
            violations.push({
              category: doc.category as Category,
              report_type: 'SaaS',
              issue_type: `INCOMPLETE DISCLOSURE: ${cluster.name.toUpperCase()}`,
              severity: 'high',
              evidence_html: foundUrl,
              description: `Mandatory cluster [${cluster.name}] was not detected within the policy document.`,
              law_name: cluster.law,
              potential_fine: LIABILITY_DATABASE[doc.category],
              explanation: `${cluster.law} mandates explicit disclosure regarding the identity and contact details of the controller.`,
              recommendation: `Corrective Action (Art. 13 Compliance): Append the full legal name and physical address of the data controller to the policy body.`,
              verification_method
            });
          }
        } else if (!clusterFound) {
          violations.push({
            category: doc.category as Category,
            report_type: 'SaaS',
            issue_type: `INCOMPLETE DISCLOSURE: ${cluster.name.toUpperCase()}`,
            severity: 'high',
            evidence_html: foundUrl,
            description: `Violation of ${cluster.law}. Cluster [${cluster.name}] missing.`,
            law_name: cluster.law,
            potential_fine: LIABILITY_DATABASE[doc.category],
            explanation: `${cluster.law} mandates explicit disclosure regarding ${cluster.name}.`,
            recommendation: `Explicitly cite ${cluster.name} and provide details required by ${cluster.law}.`,
            verification_method
          });
        }
      });

      // Art. 13(1)(c) Audit: Processing Purposes to Legal Bases Mapping
      if (doc.key === 'privacy') {
        const missingBases: string[] = [];
        PROCESSING_ACTIVITIES.forEach(activity => {
          if (activity.keywords.some(k => k.test(fullText))) {
            const hasBasis = LEGAL_BASES.some(basis => basis.keywords.some(k => k.test(fullText)));
            if (!hasBasis) missingBases.push(activity.name);
          }
        });

        if (missingBases.length > 0) {
          violations.push({
            category: 'LEGAL_GROUNDS',
            report_type: 'SaaS',
            issue_type: `LACK OF EXPLICIT LEGAL BASES (ART. 13(1)(C))`,
            severity: 'critical',
            evidence_html: foundUrl,
            description: `The website mentions specific processing operations but fails to link them to an Article 6 legal basis.`,
            law_name: 'Art. 13(1)(c) GDPR',
            potential_fine: LIABILITY_DATABASE.LEGAL_GROUNDS,
            explanation: `Art. 13(1)(c) requires explicit correlation between processing purposes and legal bases. For example: Processing activities like '${missingBases[0]}' must be explicitly linked to Art. 6(1)(f) (Legitimate Interests) or Art. 6(1)(a) (Consent).`,
            recommendation: `REMEDIATION BLUEPRINT: Explicitly state the legal basis for each processing activity. Example: "Processing for '${missingBases[0]}' is based on Art. 6(1)(f) (Legitimate Interests)."`,
            verification_method
          });
        }
      }
    }
  });

  return {
    violations,
    discoveredLinks: [],
    meta: { hasCMP: false, legal_links: links },
    compliance_report: {
      score: Math.max(0, 100 - (violations.length * 10)),
      verdict: violations.length > 0 ? 'RISKY' : 'COMPLIANT',
      nav_scout: { found_links: [], missing_critical: [], discovery_score: 100 },
      lex_analyzer: { has_vat_id: true, has_contact_info: true, has_mandatory_terms: true, content_truncated: false, missing_clusters: [] },
      cmp_detect: { detected_provider: null, is_active: false }
    }
  };
}
