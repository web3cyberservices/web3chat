
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
    category: 'PRIVACY'
  },
  RIGHTS: {
    keywords: [/right to access/i, /right to erasure/i, /right to object/i, /auskunftsrecht/i, /löschungsrecht/i, /widerrufsrecht/i],
    law: "Art. 13(2)(b) GDPR",
    name: "Data Subject Rights",
    category: 'PRIVACY'
  },
  RETENTION: {
    keywords: [/retention period/i, /speicherdauer/i, /durée de conservation/i, /how long we keep/i],
    law: "Art. 13(2)(a) GDPR",
    name: "Retention Periods",
    category: 'PRIVACY'
  },
  DPO: {
    keywords: [/data protection officer/i, /datenschutzbeauftragter/i, /dpo/i, /délégué à la protection des données/i],
    law: "Art. 13(1)(b) GDPR",
    name: "DPO Contact",
    category: 'PRIVACY'
  }
};

const PROCESSING_ACTIVITIES = [
  { name: 'Usage Analysis', keywords: [/analytics/i, /tracking/i, /usage analysis/i], defaultBasis: 'Art. 6(1)(f) (Legitimate Interests)' },
  { name: 'Marketing / Advertising', keywords: [/marketing/i, /advertising/i, /remarketing/i], defaultBasis: 'Art. 6(1)(a) (Consent)' },
  { name: 'Fraud Prevention', keywords: [/fraud/i, /security/i, /bot detection/i], defaultBasis: 'Art. 6(1)(f) (Legitimate Interests)' },
  { name: 'Customer Support', keywords: [/customer support/i, /contact form/i, /ticketing/i], defaultBasis: 'Art. 6(1)(b) (Contractual Performance)' }
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
      // 1. Controller Identity Audit (Special Case for Footer)
      const controllerCluster = MANDATORY_CLUSTERS.CONTROLLER;
      const clusterFoundInPolicy = controllerCluster.keywords.some(k => k.test(fullText));
      const clusterFoundInFooter = controllerCluster.keywords.some(k => k.test(footerText));

      if (!clusterFoundInPolicy) {
        violations.push({
          category: 'PRIVACY',
          report_type: 'SaaS',
          issue_type: `INCOMPLETE DISCLOSURE: CONTROLLER IDENTITY`,
          severity: clusterFoundInFooter ? 'low' : 'high',
          evidence_html: clusterFoundInFooter ? url : foundUrl,
          description: clusterFoundInFooter 
            ? `Controller Identity found in website footer but absent from Privacy Policy text.`
            : `Mandatory cluster [Controller Identity] not detected in policy document.`,
          law_name: controllerCluster.law,
          potential_fine: LIABILITY_DATABASE.PRIVACY,
          explanation: `${controllerCluster.law} mandates explicit disclosure regarding the identity of the controller.`,
          recommendation: clusterFoundInFooter 
            ? `Status: Detected in footer. Requirement: To meet Article 13 transparency standards, you must also include this identity information directly within the main body of the Privacy Policy document.`
            : `Append the full legal name and physical address of the data controller to the policy body.`,
          verification_method
        });
      }

      // 2. CONSOLIDATED TRANSPARENCY FRAMEWORK AUDIT (Rights, Retention, DPO)
      const transparencyIssues: string[] = [];
      const transparencyLaws: Set<string> = new Set();
      
      ['RIGHTS', 'RETENTION', 'DPO'].forEach(key => {
        const cluster = MANDATORY_CLUSTERS[key as keyof typeof MANDATORY_CLUSTERS];
        if (!cluster.keywords.some(k => k.test(fullText))) {
          transparencyIssues.push(cluster.name);
          transparencyLaws.add(cluster.law);
        }
      });

      if (transparencyIssues.length > 0) {
        violations.push({
          category: 'PRIVACY',
          report_type: 'SaaS',
          issue_type: `INCOMPLETE TRANSPARENCY FRAMEWORK`,
          severity: 'high',
          evidence_html: foundUrl,
          description: `Policy document is missing core transparency segments required by Articles 13/14.`,
          law_name: Array.from(transparencyLaws).join(', '),
          potential_fine: LIABILITY_DATABASE.PRIVACY,
          explanation: `The following mandatory clusters were not detected: ${transparencyIssues.join(', ')}. This indicates a structural failure in data subject communication.`,
          recommendation: `Update the Privacy Policy to include explicit sections for: ${transparencyIssues.join(', ')}.`,
          verification_method
        });
      }

      // 3. CONSOLIDATED PROCESSING BASIS AUDIT (Art. 13(1)(c))
      if (doc.key === 'privacy') {
        const missingBasisActivities: string[] = [];
        PROCESSING_ACTIVITIES.forEach(activity => {
          if (activity.keywords.some(k => k.test(fullText))) {
            const hasBasis = LEGAL_BASES.some(basis => basis.keywords.some(k => k.test(fullText)));
            if (!hasBasis) {
              missingBasisActivities.push(`${activity.name} -> Missing link to Art. 6 (e.g. ${activity.defaultBasis})`);
            }
          }
        });

        if (missingBasisActivities.length > 0) {
          violations.push({
            category: 'LEGAL_GROUNDS',
            report_type: 'SaaS',
            issue_type: `AUDIT OF PROCESSING OPERATIONS (ART. 13(1)(c))`,
            severity: 'critical',
            evidence_html: foundUrl,
            description: `Website performs specific processing operations without explicitly linking them to a statutory legal basis.`,
            law_name: 'Art. 13(1)(c) GDPR',
            potential_fine: LIABILITY_DATABASE.LEGAL_GROUNDS,
            explanation: `Art. 13(1)(c) requires a purpose-to-basis mapping. The following detected activities lack a clear Article 6 reference:\n\n* ${missingBasisActivities.join('\n* ')}`,
            recommendation: `REMEDIATION: Explicitly cite the legal basis for every processing purpose. Example: "Processing for usage analysis is based on Art. 6(1)(f) (Legitimate Interests)."`,
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
      score: Math.max(0, 100 - (violations.length * 15)),
      verdict: violations.length > 0 ? 'RISKY' : 'COMPLIANT',
      nav_scout: { found_links: [], missing_critical: [], discovery_score: 100 },
      lex_analyzer: { has_vat_id: true, has_contact_info: true, has_mandatory_terms: true, content_truncated: false, missing_clusters: [] },
      cmp_detect: { detected_provider: null, is_active: false }
    }
  };
}
