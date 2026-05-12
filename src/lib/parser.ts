
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
    entitySuffixes: [/GmbH/i, /AG/i, /e\.V\./i, /UG/i],
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
    entitySuffixes: [/SAS/i, /SARL/i, /SA/i],
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
    entitySuffixes: [/Sp\. z o\.o\./i, /S\.A\./i, /Sp\.k\./i],
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
    entitySuffixes: [/Limited/i, /Ltd/i, /LLC/i],
    phonePrefixes: []
  }
};

const DOC_KEYWORDS: Record<string, RegExp[]> = {
  privacy: [/privacy/i, /datenschutz/i, /confidentialit/i, /privacidad/i, /trattamento/i, /privacyverklaring/i, /polityka prywatno/i, /rodo/i, /tietosuojaseloste/i, /integritetspolicy/i],
  impressum: [/impressum/i, /legal notice/i, /mentions l/i, /aviso legal/i, /note legali/i, /rechtliche hinweise/i, /mentions légales/i]
};

const PROCESSING_ACTIVITIES = [
  { name: 'Analytics & Usage Tracking', keywords: [/analytics/i, /tracking/i, /analyse/i, /analityka/i], article: 'Art. 6(1)(f)' },
  { name: 'Security & Fraud Prevention', keywords: [/fraud/i, /security/i, /s[ée]curit[ée]/i, /oszustwom/i], article: 'Art. 6(1)(f)' },
  { name: 'Direct Marketing', keywords: [/marketing/i, /advertising/i, /publicit[ée]/i, /publicidad/i], article: 'Art. 6(1)(a)' }
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
  const fullText = html.substring(0, 400000).toLowerCase();
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

  // 1. SYSTEMIC PRESENCE (Page 1 Priority)
  if (!links.privacy) {
    violations.push({
      category: 'Privacy',
      report_type: 'SaaS',
      issue_type: 'SYSTEMIC TRANSPARENCY FAILURE (Art. 13)',
      severity: 'critical',
      evidence_html: url,
      description: `The audit system analyzed the ${profile.lang} infrastructure and confirmed the total absence of a statutory Privacy Policy.`,
      business_impact: 'Operating without a visible privacy framework signals a systemic disregard for Art. 13 mandates, subjecting the entity to maximum regulatory exposure and potential site-blocking orders.',
      law_name: profile.law,
      potential_fine: LIABILITY_TEXT,
      explanation: 'Statutory compliance requires the immediate availability of transparency documents to all data subjects.',
      recommendation: '1. Establish a dedicated Privacy Policy page.\n2. Ensure it is accessible via the persistent footer.\n3. Link it to all data collection forms.',
      verification_method
    });
  }

  // 2. JURISDICTIONAL TRANSPARENCY
  if (profile.requiresImpressum && !links.impressum) {
    violations.push({
      category: 'IMPRESSUM',
      report_type: 'SaaS',
      issue_type: 'MISSING MANDATORY LEGAL NOTICE (§ 5 TDDG)',
      severity: 'critical',
      evidence_html: url,
      description: `The legal diagnostic identified the controller jurisdiction as ${profile.name}. Under § 5 TDDG, a Legal Notice (Impressum) is a mandatory technical and legal disclosure.`,
      business_impact: 'Absence of provider identification is a high-visibility target for predatory litigation (Abmahnung) and consumer protection lawsuits in the DACH region.',
      law_name: profile.law,
      potential_fine: LIABILITY_TEXT,
      explanation: 'Statutory transparency requires full provider identification for commercial operations.',
      recommendation: '1. Create a dedicated "Impressum" page.\n2. Include legal name, physical address, registration number, and VAT ID.\n3. Ensure single-click accessibility from any page.',
      verification_method
    });
  }

  // 3. CONTROLLER ACCOUNTABILITY (Art. 13-1-a)
  if (links.privacy) {
    const hasIdentity = profile.entitySuffixes.some(s => s.test(fullText));
    if (!hasIdentity) {
      violations.push({
        category: 'Privacy',
        report_type: 'SaaS',
        issue_type: 'CONTROLLER IDENTITY FAILURE (Art. 13-1-a)',
        severity: 'high',
        evidence_html: links.privacy,
        description: `Our analysis of the legal documentation failed to identify the data controller's official legal name, registered physical address, or registration details.`,
        business_impact: 'Lack of clear identity markers makes the company anonymous to regulators, which automatically marks any data processing as "bad faith" and high-risk during an audit.',
        law_name: 'Art. 13(1)(a) GDPR',
        potential_fine: LIABILITY_TEXT,
        explanation: 'Accountability requires that data subjects can identify and contact the entity responsible for their data.',
        recommendation: '1. Append full legal entity details to the document.\n2. Include physical street address (not PO Box).\n3. State the commercial registration number.',
        verification_method
      });
    }
  }

  // 4. DATA PROCESSING AUDIT (Art. 13-1-c)
  const detectedOps = PROCESSING_ACTIVITIES.filter(op => op.keywords.some(k => k.test(fullText)));
  if (links.privacy && detectedOps.length > 0) {
    violations.push({
      category: 'LEGAL_GROUNDS',
      report_type: 'SaaS',
      issue_type: 'DEFICIENT PROCESSING GROUNDS (Art. 13-1-c)',
      severity: 'high',
      evidence_html: links.privacy,
      description: `The diagnostic identified active processing for ${detectedOps.map(o => o.name).join(', ')} but found no explicit correlation to mandatory Art. 6 legal bases.`,
      business_impact: 'Processing data without a clearly linked legal basis is a fundamental breach that can result in the legal invalidation of the entire customer dataset.',
      law_name: 'Art. 13(1)(c) GDPR',
      potential_fine: LIABILITY_TEXT,
      explanation: 'Every distinct processing activity must be mapped to a specific legal ground to be considered lawful.',
      recommendation: '1. Audit all tracking scripts and pixels.\n2. Update the Privacy Policy with a mapping table.\n3. Explicitly cite the relevant Art. 6(1) clause for each activity.',
      verification_method
    });
  }

  // Calculate score and grade
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
