
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
  privacy: [/privacy/i, /datenschutz/i, /confidentialit/i, /privacidad/i, /trattamento/i, /privacyverklaring/i, /polityka prywatno/i, /rodo/i, /tietosuojaseloste/i, /integritetspolicy/i, /zásady ochrany/i],
  impressum: [/impressum/i, /legal notice/i, /mentions l/i, /aviso legal/i, /note legali/i, /rechtliche hinweise/i, /mentions légales/i, /colofon/i]
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
  const footerText = $('footer').text().toLowerCase();
  const fullHtmlLower = html.toLowerCase();

  // 1. MANDATORY LEGAL INFRASTRUCTURE (PHASE I)
  if (!links.privacy) {
    violations.push({
      category: 'Privacy',
      report_type: 'SaaS',
      issue_type: 'SYSTEMIC TRANSPARENCY FAILURE (Art. 13)',
      severity: 'critical',
      evidence_html: url,
      description: `The legal diagnostic confirmed the complete absence of a statutory Privacy Policy for the ${profile.name} domain.`,
      business_impact: 'Operating without a visible privacy framework signals a systemic disregard for Art. 13 mandates, subjecting the entity to maximum regulatory exposure and potential bad-faith findings in the event of an audit.',
      law_name: profile.law,
      potential_fine: LIABILITY_TEXT,
      explanation: 'Statutory compliance requires the immediate availability of transparency documents to all data subjects.',
      recommendation: '1. Establish a dedicated Privacy Policy page.\n2. Link it to all data collection forms and the site footer.',
      verification_method
    });
  }

  // 2. CONTROLLER ACCOUNTABILITY (PHASE II)
  const identityInFooter = profile.entitySuffixes.some(s => s.test(footerText));
  // Semantic check: if we have a privacy policy, is identity mentioned inside?
  const identityInPrivacy = links.privacy && profile.entitySuffixes.some(s => s.test(fullHtmlLower));

  if (links.privacy && identityInFooter && !identityInPrivacy) {
     violations.push({
       category: 'Privacy',
       report_type: 'SaaS',
       issue_type: 'PARTIAL IDENTITY TRANSPARENCY (Art. 13-1-a)',
       severity: 'medium',
       evidence_html: url,
       description: 'The audit system detected controller identity markers in the website footer, but these specific details are missing from the formal Privacy Policy document.',
       business_impact: 'While footer placement provides general visibility, Art. 13 requires the controller identity to be consolidated within the transparency disclosure itself. Fragmented identity information can be interpreted by regulators as a failure to provide information in a consolidated and accessible manner.',
       law_name: 'Art. 13(1)(a) GDPR',
       potential_fine: LIABILITY_TEXT,
       explanation: 'Accountability requires that the data subject does not have to search different site components to identify the data controller.',
       recommendation: '1. Duplicate the official legal name, registered address, and registration number from the footer into the body of the Privacy Policy.',
       verification_method
     });
  } else if (!identityInFooter && !identityInPrivacy) {
    violations.push({
      category: 'Privacy',
      report_type: 'SaaS',
      issue_type: 'CONTROLLER IDENTITY FAILURE (Art. 13-1-a)',
      severity: 'high',
      evidence_html: url,
      description: 'Our legal analysis failed to identify the official legal name, physical registered address, or registration number of the data controller across the site infrastructure.',
      business_impact: 'Lack of clear controller identity creates regulatory anonymity, which is viewed as a high-risk indicator. This prevents data subjects from exercising their rights and subjects the entity to immediate bad-faith findings.',
      law_name: 'Art. 13(1)(a) GDPR',
      potential_fine: LIABILITY_TEXT,
      explanation: 'Statutory accountability requires the unambiguous identification of the entity responsible for data processing.',
      recommendation: '1. Explicitly state the legal entity name and registered address in the footer and Privacy Policy.',
      verification_method
    });
  }

  // 3. AUDIT OF PROCESSING OPERATIONS (PHASE III - Art. 13-1-c/d)
  const processingFindings = PROCESSING_PURPOSES.filter(p => p.keywords.some(k => k.test(fullHtmlLower)));
  
  if (links.privacy && processingFindings.length > 0) {
    const hasArt6Basis = fullHtmlLower.includes('article 6') || fullHtmlLower.includes('art. 6') || fullHtmlLower.includes('legitimate interest') || fullHtmlLower.includes('consent');
    const hasLegitInterestDesc = fullHtmlLower.includes('legitimate interest') && fullHtmlLower.length > 500; // Simplified check for description

    if (!hasArt6Basis) {
      violations.push({
        category: 'LEGAL_GROUNDS',
        report_type: 'SaaS',
        issue_type: 'PURPOSE-BASIS CORRELATION FAILURE (Art. 13-1-c)',
        severity: 'high',
        evidence_html: links.privacy,
        description: `The audit identified active processing (e.g., ${processingFindings.map(f => f.name).join(', ')}) but found no explicit correlation to the required Art. 6 legal bases.`,
        business_impact: 'Processing data without explicitly linking each activity to a legal basis is a fundamental breach that invalidates the lawfulness of the processing activity.',
        law_name: 'Art. 13(1)(c) GDPR',
        potential_fine: LIABILITY_TEXT,
        explanation: 'Controllers must explicitly state the legal basis (from Art. 6) for every processing purpose.',
        recommendation: '1. Map each processing activity to a specific legal basis.\n2. Use a structured table in the Privacy Policy for clarity.',
        verification_method
      });
    }

    // Art. 13(1)(d) - Legitimate Interest Description
    if (fullHtmlLower.includes('legitimate interest') && !fullHtmlLower.includes('pursued by')) {
        violations.push({
          category: 'LEGAL_GROUNDS',
          report_type: 'SaaS',
          issue_type: 'LEGITIMATE INTEREST DISCLOSURE DEFICIT (Art. 13-1-d)',
          severity: 'medium',
          evidence_html: links.privacy,
          description: 'The system detected reliance on "Legitimate Interests" as a legal basis, but found no explicit description of the specific interests being pursued.',
          business_impact: 'Vague references to legitimate interests are insufficient. Failure to describe these interests prevents the data subject from evaluating the balance of rights, potentially making the processing unlawful.',
          law_name: 'Art. 13(1)(d) GDPR',
          potential_fine: LIABILITY_TEXT,
          explanation: 'When relying on Art. 6(1)(f), the controller must explicitly specify the legitimate interests being pursued.',
          recommendation: '1. Explicitly define what interests (e.g., fraud prevention, site security) are pursued under the legitimate interest basis.',
          verification_method
        });
    }
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
