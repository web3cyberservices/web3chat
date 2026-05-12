
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
 * Pan-European Statutory Mapping
 */
const LOCAL_LAW_MAP: Record<string, string> = {
  'de': 'Art. 13 GDPR & § 5 TMG / TDDG (Germany)',
  'at': 'Art. 13 GDPR & ECG (Austria)',
  'fr': 'Art. 13 GDPR & Mentions Légales (CNIL France)',
  'pl': 'Art. 13 GDPR & RODO (Poland)',
  'es': 'Art. 13 GDPR & LSSI-CE (Spain)',
  'it': 'Art. 13 GDPR & Codice della Privacy (Italy)',
  'pt': 'Art. 13 GDPR & Lei da Proteção de Dados (Portugal)',
  'nl': 'Art. 13 GDPR & AVG (Netherlands)',
  'default': 'GDPR Article 13'
};

/**
 * Universal EU Document Discovery Map (Pan-European)
 */
const DOC_KEYWORDS = {
  privacy: [
    /privacy/i, /datenschutz/i, /confidentialité/i, /privacidad/i, /trattamento dei dati/i, /privacyverklaring/i,
    /polityka prywatności/i, /rodo/i, /zásady ochrany osobních údajů/i, /adatkezelési tájékoztató/i,
    /politică de confidențialitate/i, /integritetspolicy/i, /privatlivspolitik/i, /tietosuojaseloste/i,
    /privatumo politika/i, /privātuma politika/i, /privaatsuspoliitika/i
  ],
  impressum: [
    /impressum/i, /legal notice/i, /mentions légales/i, /aviso legal/i, /note legali/i, /rechtliche hinweise/i,
    /notka prawna/i, /informacje prawne/i, /právní informace/i, /mentions legales/i
  ],
  terms: [/terms/i, /agb/i, /conditions/i, /términos/i, /condizioni/i, /voorwaarden/i, /regulamin/i, /všeobecné podmínky/i],
  cookies: [/cookie/i, /cookies/i, /galletas/i, /biscotti/i, /ciasteczka/i]
};

/**
 * Mandatory Legal Clusters for Semantic Analysis
 */
const MANDATORY_CLUSTERS = {
  CONTROLLER: {
    keywords: [
      /data controller/i, /verantwortlicher/i, /responsable du traitement/i, /responsable del tratamiento/i,
      /identity of the controller/i, /legal disclosure/i, /registered office/i, /siège social/i, /domicilio social/i,
      /administrator danych/i, /identitas/i
    ],
    law: "Art. 13(1)(a) GDPR",
    name: "Controller Identity",
    category: 'PRIVACY'
  },
  RIGHTS: {
    keywords: [
      /right to access/i, /right to erasure/i, /right to object/i, /auskunftsrecht/i, /löschungsrecht/i, 
      /droit d'accès/i, /derecho de acceso/i, /prawa osoby/i, /dostęp do danych/i
    ],
    law: "Art. 13(2)(b) GDPR",
    name: "Data Subject Rights",
    category: 'PRIVACY'
  },
  RETENTION: {
    keywords: [
      /retention period/i, /speicherdauer/i, /durée de conservation/i, /plazo de conservación/i, 
      /how long we keep/i, /okres przechowywania/i
    ],
    law: "Art. 13(2)(a) GDPR",
    name: "Retention Periods",
    category: 'PRIVACY'
  },
  DPO: {
    keywords: [
      /data protection officer/i, /datenschutzbeauftragter/i, /dpo/i, /délégué à la protection des données/i, 
      /delegado de protección de datos/i, /inspektor ochrony danych/i
    ],
    law: "Art. 13(1)(b) GDPR",
    name: "DPO Contact",
    category: 'PRIVACY'
  }
};

const PROCESSING_ACTIVITIES = [
  { name: 'Usage Analysis', keywords: [/analytics/i, /tracking/i, /usage analysis/i, /analyse d'utilisation/i, /analityka/i], defaultBasis: 'Art. 6(1)(f) (Legitimate Interests)' },
  { name: 'Marketing / Advertising', keywords: [/marketing/i, /advertising/i, /publicité/i, /publicidad/i, /marketingowych/i], defaultBasis: 'Art. 6(1)(a) (Consent)' },
  { name: 'Fraud Prevention', keywords: [/fraud/i, /security/i, /bot detection/i, /sécurité/i, /zapobieganie oszustwom/i], defaultBasis: 'Art. 6(1)(f) (Legitimate Interests)' }
];

const LEGAL_BASES = [
  { name: 'Consent', keywords: [/consent/i, /art\. 6\(1\)\(a\)/i, /consentement/i, /zgoda/i], article: '6(1)(a)' },
  { name: 'Contract', keywords: [/contract/i, /art\. 6\(1\)\(b\)/i, /contrat/i, /umowa/i], article: '6(1)(b)' },
  { name: 'Legitimate Interests', keywords: [/legitimate interest/i, /art\. 6\(1\)\(f\)/i, /intérêt légitime/i, /prawnie uzasadniony interes/i], article: '6(1)(f)' }
];

export function parseHtmlContent(html: string, url: string, headers: any = {}, screenshot?: string, isPuppeteer: boolean = false): {
  violations: Violation[],
  discoveredLinks: string[],
  meta: { hasCMP: boolean, legal_links: Record<string, string | null> },
  compliance_report: ComplianceReport
} {
  const $ = cheerio.load(html);
  const verification_method: VerificationMethod = isPuppeteer ? 'Dynamic Emulation' : 'Static Analysis';
  
  // Domain/Country Detection
  const domain = new URL(url).hostname.split('.').pop() || '';
  const localLaw = LOCAL_LAW_MAP[domain] || LOCAL_LAW_MAP.default;
  
  const links: Record<string, string | null> = { impressum: null, privacy: null, terms: null, cookies: null };
  const violations: Violation[] = [];
  const fullText = html.substring(0, 300000).toLowerCase();
  const footerText = $('footer').text().toLowerCase();

  // 1. Pan-European Link Discovery
  $('a').each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    const href = $(el).attr('href')?.toLowerCase() || '';
    if (!href || href.startsWith('javascript:') || href.startsWith('#')) return;

    if (DOC_KEYWORDS.privacy.some(k => k.test(text))) links.privacy = href;
    if (DOC_KEYWORDS.impressum.some(k => k.test(text))) links.impressum = href;
    if (DOC_KEYWORDS.terms.some(k => k.test(text))) links.terms = href;
    if (DOC_KEYWORDS.cookies.some(k => k.test(text))) links.cookies = href;
  });

  const mandatoryDocs = [
    { key: 'privacy', name: 'Privacy Policy', law: localLaw, category: 'PRIVACY' },
    { key: 'cookies', name: 'Cookie Policy', law: 'ePrivacy Directive / GDPR', category: 'COOKIES' }
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
        description: `The automated scan analyzed the site and failed to identify a compliant ${doc.name} in the detected language environment. Under Art. 13 of GDPR and applicable local statutory frameworks, this document is mandatory for transparency and establishing accountability.`,
        law_name: doc.law,
        potential_fine: LIABILITY_DATABASE[doc.category],
        explanation: `Under ${doc.law}, website operators must provide a clearly visible ${doc.name}. Minimalist or "under construction" pages are still subject to this mandate if they utilize tracking or cookies.`,
        recommendation: `Implement a compliant ${doc.name} and provide a permanent link in the global footer.`,
        verification_method
      });
    } else {
      // Semantic Audit for Found Documents
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
          description: `The system analyzed the document and found that the identity of the controller is not explicitly stated within the text body. While partial information may be present in the footer, Article 13 of GDPR requires these details to be integral to the transparency disclosure document.`,
          law_name: controllerCluster.law,
          potential_fine: LIABILITY_DATABASE.PRIVACY,
          explanation: `Art. 13(1)(a) mandates the disclosure of the identity and contact details of the controller. Presence in metadata or a generic footer is insufficient for document-level compliance.`,
          recommendation: clusterFoundInFooter 
            ? `Status: Detected in website footer. Requirement: While present in the footer, Article 13 transparency principles require this information to be explicitly included within the main body of the Privacy Policy document.`
            : `Append the full legal name, physical address, and registration details of the data controller to the main document body.`,
          verification_method
        });
      }

      // Legal Grounds Correlation (Art. 13(1)(c))
      if (doc.key === 'privacy') {
        const missingBasisActivities: string[] = [];
        PROCESSING_ACTIVITIES.forEach(activity => {
          if (activity.keywords.some(k => k.test(fullText))) {
            const hasBasis = LEGAL_BASES.some(basis => basis.keywords.some(k => k.test(fullText)));
            if (!hasBasis) {
              missingBasisActivities.push(`${activity.name}`);
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
            description: `The website mentions specific processing operations (e.g., ${missingBasisActivities.join(', ')}) but fails to explicitly link these activities to a valid statutory legal basis from Article 6 of GDPR.`,
            law_name: 'Art. 13(1)(c) GDPR',
            potential_fine: LIABILITY_DATABASE.LEGAL_GROUNDS,
            explanation: `Art. 13(1)(c) requires a purpose-to-basis mapping. The listed activities lack explicit statutory legal basis correlation (e.g., 'Analyzing usage' missing link to Art. 6(1)(f)).`,
            recommendation: `Update the Privacy Policy text to include a dedicated transparency table mapping every detected processing activity to a specific sub-section of Article 6 GDPR.`,
            verification_method
          });
        }
      }

      // Transparency Framework Clusters
      const missingClusters = ['RIGHTS', 'RETENTION', 'DPO'].filter(key => {
        const cluster = MANDATORY_CLUSTERS[key as keyof typeof MANDATORY_CLUSTERS];
        return !cluster.keywords.some(k => k.test(fullText));
      });

      if (missingClusters.length > 0) {
        violations.push({
          category: 'PRIVACY',
          report_type: 'SaaS',
          issue_type: `MISSING TRANSPARENCY FRAMEWORK CLUSTERS`,
          severity: 'high',
          evidence_html: foundUrl,
          description: `The system analyzed the [Language] version of the site and found that several mandatory disclosure clusters are missing: ${missingClusters.map(k => MANDATORY_CLUSTERS[k as keyof typeof MANDATORY_CLUSTERS].name).join(', ')}.`,
          law_name: 'Art. 13(2) GDPR',
          potential_fine: LIABILITY_DATABASE.PRIVACY,
          explanation: `Articles 13(1) and 13(2) require the explicit disclosure of data retention periods, data subject rights, and the identity of the Data Protection Officer (if applicable).`,
          recommendation: `Update the policy text to include dedicated sections for each of the identified missing clusters.`,
          verification_method
        });
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
