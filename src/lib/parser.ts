
import * as cheerio from 'cheerio';
import { Violation, ComplianceReport, VerificationMethod } from '@/types';

const LIABILITY_TEXT = 'Administrative fines up to €20,000,000 or 4% of global annual turnover (Art. 83 GDPR)';

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
  privacy: [
    /privacy/i, /datenschutz/i, /confidentialité/i, /privacidad/i, /trattamento/i, /privacyverklaring/i,
    /polityka prywatności/i, /rodo/i, /zásady ochrony/i, /adatkezelési/i, /integritetspolicy/i
  ],
  impressum: [
    /impressum/i, /legal notice/i, /mentions légales/i, /aviso legal/i, /note legali/i, /rechtliche hinweise/i,
    /notka prawna/i
  ]
};

const PROCESSING_ACTIVITIES = [
  { name: 'Analytics & Usage', keywords: [/analytics/i, /tracking/i, /analyse/i, /analityka/i], article: 'Art. 6(1)(f)' },
  { name: 'Fraud Prevention', keywords: [/fraud/i, /security/i, /sécurité/i, /oszustwom/i], article: 'Art. 6(1)(f)' },
  { name: 'Marketing/Ads', keywords: [/marketing/i, /advertising/i, /publicité/i, /publicidad/i], article: 'Art. 6(1)(a)' }
];

function detectJurisdiction(html: string, url: string, userInput?: string): JurisdictionProfile {
  if (userInput && JURISDICTION_CONFIG[userInput.toUpperCase()]) {
    return JURISDICTION_CONFIG[userInput.toUpperCase()];
  }

  const fullText = html.substring(0, 50000);
  const hostname = new URL(url).hostname;
  const tld = hostname.split('.').pop()?.toUpperCase();

  // 1. Entity Suffix Detection
  for (const [code, profile] of Object.entries(JURISDICTION_CONFIG)) {
    if (profile.entitySuffixes.some(s => s.test(fullText))) return profile;
  }

  // 2. Phone Prefix Detection
  for (const [code, profile] of Object.entries(JURISDICTION_CONFIG)) {
    if (profile.phonePrefixes.some(p => fullText.includes(p))) return profile;
  }

  // 3. TLD Fallback
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

  // SECTION I: MANDATORY INFRASTRUCTURE (Art. 13(1))
  if (!links.privacy) {
    violations.push({
      category: 'Privacy',
      report_type: 'SaaS',
      issue_type: 'SYSTEMIC TRANSPARENCY FAILURE (Art. 13)',
      severity: 'critical',
      evidence_html: url,
      description: `The automated scan analyzed the ${profile.lang} infrastructure of the site and failed to locate a mandatory Privacy Policy. Under Art. 13 of GDPR, even basic landing pages must provide data processing transparency to all visitors.`,
      law_name: profile.law,
      potential_fine: LIABILITY_TEXT,
      explanation: 'Statutory compliance requires the immediate availability of transparency documents.',
      recommendation: `Implement a compliant Privacy Policy referencing ${profile.localGdprTerm} requirements immediately.`,
      verification_method
    });
  }

  // SECTION II: JURISDICTIONAL MANDATES
  if (profile.requiresImpressum && !links.impressum) {
    violations.push({
      category: 'IMPRESSUM',
      report_type: 'SaaS',
      issue_type: 'MISSING MANDATORY IMPRESSUM',
      severity: 'critical',
      evidence_html: url,
      description: `The system detected the controller's jurisdiction as ${profile.name} via entity metadata. According to § 5 TDDG (Germany), an Impressum is a mandatory technical requirement for commercial transparency.`,
      law_name: profile.law,
      potential_fine: LIABILITY_TEXT,
      explanation: 'The Impressum provides essential provider identification as required by local TLD/owner laws.',
      recommendation: 'Establish a dedicated "Impressum" page with full legal registration and tax ID details.',
      verification_method
    });
  }

  // SECTION III: CONTROLLER ACCOUNTABILITY (Art. 13(1)(a))
  const hasIdentity = profile.entitySuffixes.some(s => s.test(fullText));
  if (links.privacy && !hasIdentity) {
    violations.push({
      category: 'Privacy',
      report_type: 'SaaS',
      issue_type: 'CONTROLLER IDENTITY COMPLIANCE',
      severity: 'high',
      evidence_html: links.privacy,
      description: "The automated scan performed a semantic and structural analysis of the website's legal documents and metadata. The system failed to identify the official legal name of the data controller, a registered physical address, or a specific registration number. Under Art. 13(1)(a), this information is mandatory for establishing accountability.",
      law_name: 'Art. 13(1)(a) GDPR',
      potential_fine: LIABILITY_TEXT,
      explanation: 'Accountability requires clear identification of the entity responsible for data processing.',
      recommendation: 'Append full legal company details (Name, Address, Registration) to the document body.',
      verification_method
    });
  }

  // SECTION IV: PROCESSING AUDIT (Art. 13(1)(c))
  const detectedOps = PROCESSING_ACTIVITIES.filter(op => op.keywords.some(k => k.test(fullText)));
  if (links.privacy && detectedOps.length > 0) {
    violations.push({
      category: 'LEGAL_GROUNDS',
      report_type: 'SaaS',
      issue_type: 'AUDIT OF PROCESSING OPERATIONS',
      severity: 'high',
      evidence_html: links.privacy,
      description: `The system analyzed the ${profile.lang} content and identified specific processing activities (${detectedOps.map(o => o.name).join(', ')}) but found no explicit correlation to Art. 6 legal bases. Art. 13(1)(c) requires each purpose to be linked to its specific statutory ground.`,
      law_name: 'Art. 13(1)(c) GDPR',
      potential_fine: LIABILITY_TEXT,
      explanation: 'Every data processing activity must be explicitly linked to a legal basis to be considered transparent.',
      recommendation: 'Update the policy to include a table or section explicitly mapping each processing activity to its Article 6 legal basis.',
      verification_method
    });
  }

  return {
    violations,
    discoveredLinks: [],
    meta: { hasCMP: false, legal_links: links },
    compliance_report: {
      score: Math.max(0, 100 - (violations.length * 20)),
      verdict: violations.length > 0 ? 'RISKY' : 'COMPLIANT',
      jurisdiction: profile.name,
      nav_scout: { found_links: Object.values(links).filter(Boolean) as string[], missing_critical: [], discovery_score: 100 },
      lex_analyzer: { has_vat_id: true, has_contact_info: true, has_mandatory_terms: true, content_truncated: false, missing_clusters: [] },
      cmp_detect: { detected_provider: null, is_active: false }
    }
  };
}
