
import * as cheerio from 'cheerio';
import { Violation, ComplianceReport, VerificationMethod } from '@/types';

const LIABILITY_TEXT = 'Potential Administrative Liability: Up to €20,000,000 or 4% of annual global turnover (Art. 83 GDPR)';

interface JurisdictionProfile {
  name: string;
  law: string;
  authority: string;
  lang: string;
  requiresImpressum: boolean;
  requiresMentionsLegales: boolean;
  localGdprTerm: string;
  entitySuffixes: RegExp[];
  phonePrefixes: string[];
}

const JURISDICTION_CONFIG: Record<string, JurisdictionProfile> = {
  'DE': { 
    name: 'Germany',
    law: 'Art. 13 GDPR & § 5 TDDG', 
    authority: 'BfDI', 
    lang: 'German', 
    requiresImpressum: true, 
    requiresMentionsLegales: false,
    localGdprTerm: 'DSGVO',
    entitySuffixes: [/GmbH/i, /AG/i, /e\.V\./i, /UG/i, /GmbH & Co\. KG/i],
    phonePrefixes: ['+49', '0049']
  },
  'FR': { 
    name: 'France',
    law: 'Art. 13 GDPR & Loi Informatique et Libertés', 
    authority: 'CNIL', 
    lang: 'French', 
    requiresImpressum: false, 
    requiresMentionsLegales: true,
    localGdprTerm: 'RGPD',
    entitySuffixes: [/SAS/i, /SARL/i, /SA/i, /EI/i],
    phonePrefixes: ['+33', '0033']
  },
  'PL': { 
    name: 'Poland',
    law: 'Art. 13 GDPR & RODO', 
    authority: 'UODO', 
    lang: 'Polish', 
    requiresImpressum: false, 
    requiresMentionsLegales: false,
    localGdprTerm: 'RODO',
    entitySuffixes: [/Sp\. z o\.o\./i, /S\.A\./i, /Sp\.k\./i, /S\.K\.A\./i],
    phonePrefixes: ['+48', '0048']
  },
  'DEFAULT': { 
    name: 'European Union',
    law: 'GDPR Article 13', 
    authority: 'Data Protection Authority', 
    lang: 'English', 
    requiresImpressum: false, 
    requiresMentionsLegales: false,
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

  const violations: Violation[] = [];
  const fullHtmlLower = html.toLowerCase();
  const footerText = $('footer').text().toLowerCase();

  // 1. MANDATORY LEGAL INFRASTRUCTURE (Art. 13)
  // Logic Fix: If document is detected via URL or content, do not report as missing.
  if (!links.privacy && !fullHtmlLower.includes('privacy policy') && !fullHtmlLower.includes(profile.localGdprTerm.toLowerCase())) {
    violations.push({
      category: 'Privacy',
      report_type: 'SaaS',
      issue_type: 'SYSTEMIC TRANSPARENCY FAILURE (Art. 13)',
      severity: 'critical',
      evidence_html: url,
      description: `The legal diagnostic confirmed the complete absence of a statutory Privacy Policy for the ${profile.name} domain.`,
      business_impact: 'Operating without a visible privacy framework signals a systemic disregard for Art. 13 mandates, subjecting the entity to maximum regulatory exposure and immediate "bad faith" findings during audits.',
      law_name: profile.law,
      potential_fine: LIABILITY_TEXT,
      explanation: 'Statutory compliance requires the immediate availability of transparency documents to all data subjects.',
      recommendation: '1. Establish a dedicated Privacy Policy page.\n2. Link it to all data collection forms and the site footer.',
      verification_method
    });
  }

  // 2. CONTROLLER ACCOUNTABILITY (Art. 13-1-a)
  const identityInFooter = profile.entitySuffixes.some(s => s.test(footerText));
  const identityInDocument = profile.entitySuffixes.some(s => s.test(fullHtmlLower));

  if (!identityInDocument && !identityInFooter) {
    violations.push({
      category: 'Privacy',
      report_type: 'SaaS',
      issue_type: 'CONTROLLER IDENTITY FAILURE (Art. 13-1-a)',
      severity: 'high',
      evidence_html: url,
      description: 'The audit system performed a semantic and structural analysis of the website and failed to identify the data controller official legal name, registered address, or registration number.',
      business_impact: 'Lack of clear controller identity creates regulatory anonymity, which is viewed as a high-risk indicator. This prevents data subjects from exercising their rights and subjects the entity to immediate regulatory scrutiny from authorities such as the ' + profile.authority + '.',
      law_name: 'Art. 13(1)(a) GDPR',
      potential_fine: LIABILITY_TEXT,
      explanation: 'Statutory accountability requires the unambiguous identification of the entity responsible for data processing.',
      recommendation: '1. Explicitly state the legal entity name and registered address in the footer and Privacy Policy.',
      verification_method
    });
  } else if (identityInFooter && !identityInDocument && links.privacy) {
    violations.push({
      category: 'Privacy',
      report_type: 'SaaS',
      issue_type: 'PARTIAL IDENTITY TRANSPARENCY (Art. 13-1-a)',
      severity: 'medium',
      evidence_html: url,
      description: 'The audit system detected controller identity markers in the website footer, but these specific details are missing from the formal transparency disclosure (Privacy Policy).',
      business_impact: 'While footer placement provides general visibility, Art. 13 requires identity details to be consolidated within the transparency disclosure itself. Fragmented identity information is often interpreted as a failure to provide information in an accessible manner.',
      law_name: 'Art. 13(1)(a) GDPR',
      potential_fine: LIABILITY_TEXT,
      explanation: 'Accountability requires that data subjects do not have to search different site components to identify the controller.',
      recommendation: '1. Duplicate the official legal name, address, and registration number into the body of the Privacy Policy.',
      verification_method
    });
  }

  // 3. AUDIT OF PROCESSING OPERATIONS (Art. 13-1-c/d)
  const activeProcessing = PROCESSING_PURPOSES.filter(p => p.keywords.some(k => k.test(fullHtmlLower)));
  
  if (activeProcessing.length > 0) {
    const hasArt6Link = fullHtmlLower.includes('article 6') || fullHtmlLower.includes('art. 6') || fullHtmlLower.includes('legal basis');
    const hasLegitInterestDesc = fullHtmlLower.includes('legitimate interest') && fullHtmlLower.includes('pursued by');

    if (!hasArt6Link) {
      violations.push({
        category: 'LEGAL_GROUNDS',
        report_type: 'SaaS',
        issue_type: 'PURPOSE-BASIS CORRELATION FAILURE (Art. 13-1-c)',
        severity: 'high',
        evidence_html: links.privacy || url,
        description: `The diagnostic identified active processing (e.g., ${activeProcessing.map(f => f.name).join(', ')}) but found no explicit correlation to the required Art. 6 legal bases.`,
        business_impact: 'Processing data without explicitly linking each activity to a legal basis is a fundamental breach that invalidates the lawfulness of the processing activity.',
        law_name: 'Art. 13(1)(c) GDPR',
        potential_fine: LIABILITY_TEXT,
        explanation: 'Controllers must explicitly state the legal basis for every processing purpose.',
        recommendation: '1. Map each processing activity (Analytics, Support, etc.) to a specific Art. 6 legal basis in a structured table.',
        verification_method
      });
    }

    if (fullHtmlLower.includes('legitimate interest') && !hasLegitInterestDesc) {
      violations.push({
        category: 'LEGAL_GROUNDS',
        report_type: 'SaaS',
        issue_type: 'LEGITIMATE INTEREST DISCLOSURE DEFICIT (Art. 13-1-d)',
        severity: 'medium',
        evidence_html: links.privacy || url,
        description: 'The system detected reliance on "Legitimate Interests" but found no explicit description of the specific interests being pursued.',
        business_impact: 'Vague references to legitimate interests are insufficient. Failure to describe these interests prevents the data subject from evaluating the balance of rights, potentially making the processing unlawful.',
        law_name: 'Art. 13(1)(d) GDPR',
        potential_fine: LIABILITY_TEXT,
        explanation: 'When relying on Art. 6(1)(f), the controller must explicitly specify the legitimate interests being pursued.',
        recommendation: '1. Explicitly define what interests (e.g., site security, fraud prevention) are pursued under the legitimate interest basis.',
        verification_method
      });
    }
  }

  // 4. JURISDICTIONAL SPECIFICS (Section B)
  if (profile.requiresImpressum && !links.impressum && !fullHtmlLower.includes('impressum')) {
    violations.push({
      category: 'IMPRESSUM',
      report_type: 'SaaS',
      issue_type: 'STATUTORY LEGAL NOTICE FAILURE (TDDG)',
      severity: 'critical',
      evidence_html: url,
      description: `The audit confirmed the absence of a mandatory 'Impressum' section required for entities operating in ${profile.name}.`,
      business_impact: 'In jurisdictions like Germany, the lack of an Impressum is a direct violation of § 5 TDDG, leading to immediate administrative warnings (Abmahnungen) and significant financial liability.',
      law_name: '§ 5 TDDG (Germany)',
      potential_fine: LIABILITY_TEXT,
      explanation: 'Statutory law requires specific identity and contact transparency for commercial websites.',
      recommendation: '1. Create a dedicated Legal Notice (Impressum) page.\n2. Include legal name, address, VAT ID, and contact details.',
      verification_method
    });
  }

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
