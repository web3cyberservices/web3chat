
import * as cheerio from 'cheerio';
import { Violation, ComplianceReport, VerificationMethod } from '@/types';

const LIABILITY_STANDARD = 'Potential Administrative Liability: Up to €20,000,000 or 4% of annual global turnover (Art. 83 GDPR)';

interface JurisdictionProfile {
  name: string;
  law: string;
  authority: string;
  lang: string;
  localGdprTerm: string;
  requireImpressum: boolean;
  entitySuffixes: RegExp[];
  phonePrefixes: string[];
}

const JURISDICTION_CONFIG: Record<string, JurisdictionProfile> = {
  'DE': { 
    name: 'Germany',
    law: 'Art. 13 GDPR & § 5 TDDG', 
    authority: 'BfDI', 
    lang: 'German', 
    requireImpressum: true, 
    localGdprTerm: 'DSGVO',
    entitySuffixes: [/GmbH/i, /AG/i, /e\.V\./i, /UG/i, /GmbH & Co\. KG/i],
    phonePrefixes: ['+49', '0049']
  },
  'FR': { 
    name: 'France',
    law: 'Art. 13 GDPR & Loi Informatique et Libertés', 
    authority: 'CNIL', 
    lang: 'French', 
    requireImpressum: false, 
    localGdprTerm: 'RGPD',
    entitySuffixes: [/SAS/i, /SARL/i, /SA/i, /EI/i],
    phonePrefixes: ['+33', '0033']
  },
  'PL': { 
    name: 'Poland',
    law: 'Art. 13 GDPR & RODO', 
    authority: 'UODO', 
    lang: 'Polish', 
    requireImpressum: false, 
    localGdprTerm: 'RODO',
    entitySuffixes: [/Sp\. z o\.o\./i, /S\.A\./i, /Sp\.k\./i, /S\.K\.A\./i],
    phonePrefixes: ['+48', '0048']
  },
  'DEFAULT': { 
    name: 'European Union',
    law: 'GDPR Article 13', 
    authority: 'Data Protection Authority', 
    lang: 'English', 
    requireImpressum: false, 
    localGdprTerm: 'GDPR',
    entitySuffixes: [/Limited/i, /Ltd/i, /LLC/i, /PLC/i],
    phonePrefixes: []
  }
};

const DOC_KEYWORDS: Record<string, RegExp[]> = {
  privacy: [
    /privacy/i, /datenschutz/i, /confidentialit/i, /privacidad/i, /trattamento/i, 
    /privacyverklaring/i, /polityka prywatno/i, /rodo/i, /tietosuojaseloste/i, 
    /integritetspolicy/i, /zásady ochrany/i, /privatlivspolitik/i, /privatumo politika/i
  ],
  impressum: [
    /impressum/i, /legal notice/i, /mentions l/i, /aviso legal/i, /note legali/i, 
    /rechtliche hinweise/i, /mentions légales/i, /colofon/i, /aviso legal/i
  ]
};

const PROCESSING_PURPOSES = [
  { id: 'analytics', name: 'Usage Analysis & Optimization', keywords: [/analytics/i, /tracking/i, /analyse/i, /analityka/i, /pixels/i, /matomo/i, /hotjar/i], defaultBasis: 'Art. 6(1)(f)' },
  { id: 'security', name: 'Security & Fraud Prevention', keywords: [/fraud/i, /security/i, /s[ée]curit[ée]/i, /oszustwom/i, /firewall/i], defaultBasis: 'Art. 6(1)(f)' },
  { id: 'marketing', name: 'Direct Marketing & Advertising', keywords: [/marketing/i, /advertising/i, /publicit[ée]/i, /publicidad/i, /adsense/i], defaultBasis: 'Art. 6(1)(a)' },
  { id: 'support', name: 'Customer Support & Contact', keywords: [/support/i, /contact/i, /kontakt/i, /hilfe/i], defaultBasis: 'Art. 6(1)(b)' }
];

function detectJurisdiction(html: string, url: string, userInput?: string): JurisdictionProfile {
  if (userInput && JURISDICTION_CONFIG[userInput.toUpperCase()]) {
    return JURISDICTION_CONFIG[userInput.toUpperCase()];
  }
  const fullText = html.substring(0, 50000);
  const hostname = new URL(url).hostname;
  for (const [code, profile] of Object.entries(JURISDICTION_CONFIG)) {
    if (profile.entitySuffixes.some(s => s.test(fullText))) return profile;
  }
  const tld = hostname.split('.').pop()?.toUpperCase();
  if (tld && JURISDICTION_CONFIG[tld]) return JURISDICTION_CONFIG[tld];
  return JURISDICTION_CONFIG.DEFAULT;
}

export function parseHtmlContent(html: string, url: string, headers: any = {}, screenshot?: string, isPuppeteer: boolean = false, userInputCountry?: string): {
  violations: Violation[],
  discoveredLinks: string[],
  meta: { hasCMP: boolean, legal_links: Record<string, string | null> },
  compliance_report: ComplianceReport
} {
  const $ = cheerio.load(html);
  const verification_method: VerificationMethod = isPuppeteer ? 'Dynamic Emulation' : 'Static Analysis';
  const profile = detectJurisdiction(html, url, userInputCountry);
  const links: Record<string, string | null> = { impressum: null, privacy: null };
  
  $('a').each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    const href = $(el).attr('href') || '';
    if (!href || href.startsWith('javascript:') || href.startsWith('#')) return;
    if (DOC_KEYWORDS.privacy.some(k => k.test(text))) links.privacy = href;
    if (DOC_KEYWORDS.impressum.some(k => k.test(text))) links.impressum = href;
  });

  const violationMap = new Map<string, Violation>();
  const fullHtmlLower = html.toLowerCase();
  const footerText = $('footer').text().toLowerCase();

  // HARD MERGE: TRACK REPORTED ARTICLES TO PREVENT REDUNDANCY
  const reportedArticles = new Set<string>();

  // 1. MANDATORY LEGAL INFRASTRUCTURE (Art. 13)
  if (!links.privacy && !fullHtmlLower.includes('privacy policy') && !fullHtmlLower.includes(profile.localGdprTerm.toLowerCase())) {
    const article = 'Art. 13';
    if (!reportedArticles.has(article)) {
      violationMap.set(article, {
        category: 'Privacy',
        report_type: 'SaaS',
        issue_type: 'SYSTEMIC TRANSPARENCY FAILURE (Art. 13)',
        severity: 'critical',
        evidence_html: url,
        description: `The audit system confirmed the complete absence of a statutory Privacy Policy for the ${profile.name} domain. The legal diagnostic analyzed the site structure and failed to identify any transparency disclosure mapping processing activities to Article 13 mandates.`,
        business_impact: 'Operating without a visible privacy framework signals a systemic disregard for mandatory transparency rules. This prevents data subjects from exercising their rights and subjects the entity to immediate regulatory scrutiny and "bad faith" findings during potential audits.',
        law_name: profile.law,
        potential_fine: LIABILITY_STANDARD,
        explanation: 'Statutory compliance requires the immediate, unambiguous availability of transparency documents to all data subjects prior to data collection.',
        recommendation: '1. Establish a dedicated Privacy Policy page.\n2. Ensure it is accessible from every page (footer) and linked to all collection forms.',
        verification_method
      });
      reportedArticles.add(article);
    }
  }

  // 2. CONTROLLER ACCOUNTABILITY (Art. 13-1-a)
  const identityInFooter = profile.entitySuffixes.some(s => s.test(footerText));
  const identityInDocument = profile.entitySuffixes.some(s => s.test(fullHtmlLower));
  const article131a = 'Art. 13(1)(a)';

  if (!reportedArticles.has(article131a)) {
    if (!identityInDocument && !identityInFooter) {
      violationMap.set(article131a, {
        category: 'Privacy',
        report_type: 'SaaS',
        issue_type: 'CONTROLLER IDENTITY FAILURE (Art. 13-1-a)',
        severity: 'high',
        evidence_html: url,
        description: `The legal diagnostic performed a semantic analysis of the site metadata and legal documents. It failed to identify the official legal name of the data controller, a registered physical address, or a specific registration number.`,
        business_impact: 'Lack of clear controller identity creates regulatory anonymity, which is viewed as a high-risk indicator by authorities. Under Art. 13(1)(a), this information is mandatory for establishing accountability.',
        law_name: 'Art. 13(1)(a) GDPR',
        potential_fine: LIABILITY_STANDARD,
        explanation: 'Statutory accountability requires the unambiguous identification of the entity responsible for data processing activities.',
        recommendation: '1. Explicitly state the legal entity name and registered address in the footer and body of the Privacy Policy.',
        verification_method
      });
      reportedArticles.add(article131a);
    } else if (identityInFooter && !identityInDocument && links.privacy) {
      violationMap.set(article131a, {
        category: 'Privacy',
        report_type: 'SaaS',
        issue_type: 'PARTIAL IDENTITY TRANSPARENCY (Art. 13-1-a)',
        severity: 'medium',
        evidence_html: url,
        description: 'The audit system detected controller identity markers in the website footer, but these specific details are missing from the formal transparency disclosure (Privacy Policy).',
        business_impact: 'While footer placement provides visibility, Art. 13 requires identity details to be consolidated within the transparency disclosure itself. Fragmented information can be interpreted as a failure to provide information in an accessible manner.',
        law_name: 'Art. 13(1)(a) GDPR',
        potential_fine: LIABILITY_STANDARD,
        explanation: 'Accountability requires that data subjects do not have to search different site components to identify the data controller.',
        recommendation: '1. Duplicate the official legal name, address, and registration number into the body of the Privacy Policy.',
        verification_method
      });
      reportedArticles.add(article131a);
    }
  }

  // 3. AUDIT OF PROCESSING OPERATIONS (Art. 13-1-c/d)
  const activeProcessing = PROCESSING_PURPOSES.filter(p => p.keywords.some(k => k.test(fullHtmlLower)));
  
  if (activeProcessing.length > 0) {
    const article131c = 'Art. 13(1)(c)';
    const hasArt6Link = fullHtmlLower.includes('article 6') || fullHtmlLower.includes('art. 6') || fullHtmlLower.includes('legal basis');
    const hasLegitInterestDesc = fullHtmlLower.includes('legitimate interest') && fullHtmlLower.includes('pursued by');

    if (!hasArt6Link && !reportedArticles.has(article131c)) {
      violationMap.set(article131c, {
        category: 'LEGAL_GROUNDS',
        report_type: 'SaaS',
        issue_type: 'PURPOSE-BASIS CORRELATION FAILURE (Art. 13(1)(c))',
        severity: 'high',
        evidence_html: links.privacy || url,
        description: `The diagnostic identified active processing activities (e.g., ${activeProcessing.map(f => f.name).join(', ')}) but failed to identify an explicit correlation to Article 6 legal bases.`,
        business_impact: 'Processing data without explicitly linking each activity to a legal basis invalidates the lawfulness of the processing operation.',
        law_name: 'Art. 13(1)(c) GDPR',
        potential_fine: LIABILITY_STANDARD,
        explanation: 'Controllers must explicitly state the specific legal basis for every processing purpose to meet the lawfulness principle.',
        recommendation: '1. Create a table mapping each processing activity to its specific Art. 6 legal basis.',
        verification_method
      });
      reportedArticles.add(article131c);
    }

    const article131d = 'Art. 13(1)(d)';
    if (fullHtmlLower.includes('legitimate interest') && !hasLegitInterestDesc && !reportedArticles.has(article131d)) {
      violationMap.set(article131d, {
        category: 'LEGAL_GROUNDS',
        report_type: 'SaaS',
        issue_type: 'LEGITIMATE INTEREST DISCLOSURE DEFICIT (Art. 13(1)(d))',
        severity: 'medium',
        evidence_html: links.privacy || url,
        description: 'The system detected reliance on "Legitimate Interests" but found no explicit description of the specific interests being pursued.',
        business_impact: 'Vague references to legitimate interests are insufficient. Failure to describe these interests prevents data subjects from evaluating the balance of rights.',
        law_name: 'Art. 13(1)(d) GDPR',
        potential_fine: LIABILITY_STANDARD,
        explanation: 'When relying on Art. 6(1)(f), the controller must explicitly specify the legitimate interests pursued.',
        recommendation: '1. Explicitly define what interests (e.g., site security optimization) are pursued under the legitimate interest basis.',
        verification_method
      });
      reportedArticles.add(article131d);
    }
  }

  // 4. JURISDICTIONAL SPECIFICS (Section B)
  if (profile.requireImpressum && !links.impressum && !fullHtmlLower.includes('impressum')) {
    const articleImpressum = 'Impressum';
    if (!reportedArticles.has(articleImpressum)) {
      violationMap.set(articleImpressum, {
        category: 'IMPRESSUM',
        report_type: 'SaaS',
        issue_type: 'STATUTORY LEGAL NOTICE FAILURE (TDDG)',
        severity: 'critical',
        evidence_html: url,
        description: `The audit confirmed the absence of a mandatory 'Impressum' required for entities operating in the ${profile.name} jurisdiction.`,
        business_impact: 'In jurisdictions like Germany, the lack of an Impressum is a direct violation of § 5 TDDG, escalating regulatory scrutiny.',
        law_name: '§ 5 TDDG (Germany)',
        potential_fine: LIABILITY_STANDARD,
        explanation: 'Statutory law requires specific identity and contact transparency for commercial websites.',
        recommendation: '1. Create a dedicated Legal Notice (Impressum) page.',
        verification_method
      });
      reportedArticles.add(articleImpressum);
    }
  }

  const violations = Array.from(violationMap.values());
  const score = Math.max(0, 100 - (violations.length * 20));
  let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
  if (score > 90) grade = 'A';
  else if (score > 80) grade = 'B';
  else if (score > 70) grade = 'C';
  else if (score > 60) grade = 'D';

  return {
    violations,
    discoveredLinks: [],
    meta: { hasCMP: false, legal_links: links },
    compliance_report: {
      score,
      grade,
      verdict: violations.length > 0 ? 'RISKY' : 'COMPLIANT',
      jurisdiction: profile.name,
      top_risks: violations.slice(0, 3).map(v => v.issue_type),
      nav_scout: { found_links: Object.values(links).filter(Boolean) as string[], missing_critical: [], discovery_score: 100 },
      lex_analyzer: { has_vat_id: true, has_contact_info: true, has_mandatory_terms: true, content_truncated: false, missing_clusters: [] },
      cmp_detect: { detected_provider: null, is_active: false }
    }
  };
}
