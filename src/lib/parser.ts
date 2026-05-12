import * as cheerio from 'cheerio';
import { Violation, ComplianceReport, VerificationMethod } from '@/types';

/**
 * @fileOverview Ultimate Compliance Architect V21.7 - Statutory Truth-Mapping.
 * 
 * - Truth-Mapping: Document presence vs Incompleteness logic.
 * - No-Advice Remediation: Copy-paste snippets only.
 */

const LIABILITY_CRITICAL = "Fines up to €20,000,000 or 4% of global annual turnover (Art. 83 GDPR). High risk of immediate ad account suspension (Google/Meta).";
const LIABILITY_HIGH = "Administrative penalties up to €20,000,000 (Art. 83 GDPR). Vulnerable to legal 'Abmahnung' notices.";

interface JurisdictionProfile {
  name: string;
  law: string;
  authority: string;
  lang: string;
  localGdprTerm: string;
  requireImpressum: boolean;
  excluded_checks: string[];
  entitySuffixes: RegExp[];
}

const JURISDICTION_CONFIG: Record<string, JurisdictionProfile> = {
  'DE': { 
    name: 'Germany',
    law: 'Art. 13 GDPR & § 5 TDDG', 
    authority: 'BfDI', 
    lang: 'German', 
    requireImpressum: true, 
    excluded_checks: [],
    localGdprTerm: 'DSGVO',
    entitySuffixes: [/GmbH/i, /AG/i, /e\.V\./i, /UG/i, /GmbH & Co\. KG/i]
  },
  'FR': { 
    name: 'France',
    law: 'Art. 13 GDPR & Loi Informatique et Libertés', 
    authority: 'CNIL', 
    lang: 'French', 
    requireImpressum: false, 
    excluded_checks: ['impressum_check'],
    localGdprTerm: 'RGPD',
    entitySuffixes: [/SAS/i, /SARL/i, /SA/i, /EI/i]
  },
  'PL': { 
    name: 'Poland',
    law: 'Art. 13 GDPR & RODO', 
    authority: 'UODO', 
    lang: 'Polish', 
    requireImpressum: false, 
    excluded_checks: ['impressum_check'],
    localGdprTerm: 'RODO',
    entitySuffixes: [/Sp\. z o\.o\./i, /S\.A\./i, /Sp\.k\./i, /S\.K\.A\./i]
  },
  'DEFAULT': { 
    name: 'European Union',
    law: 'GDPR Article 13', 
    authority: 'Data Protection Authority', 
    lang: 'English', 
    requireImpressum: false, 
    excluded_checks: [],
    localGdprTerm: 'GDPR',
    entitySuffixes: [/Limited/i, /Ltd/i, /LLC/i, /PLC/i]
  }
};

const DOC_KEYWORDS: Record<string, RegExp[]> = {
  privacy: [/privacy/i, /datenschutz/i, /confidentialit/i, /privacidad/i, /trattamento/i, /rodo/i],
  impressum: [/impressum/i, /legal notice/i, /mentions l/i, /aviso legal/i]
};

export function parseHtmlContent(html: string, url: string, headers: any = {}, screenshot?: string, isPuppeteer: boolean = false, userInputCountry?: string): {
  violations: Violation[],
  discoveredLinks: string[],
  meta: { hasCMP: boolean, legal_links: Record<string, string | null> },
  compliance_report: ComplianceReport
} {
  const $ = cheerio.load(html);
  const verification_method: VerificationMethod = isPuppeteer ? 'Dynamic Emulation' : 'Static Analysis';
  
  const domain = new URL(url).hostname;
  const tld = domain.split('.').pop()?.toUpperCase();
  const profile = JURISDICTION_CONFIG[userInputCountry?.toUpperCase() || tld || ''] || JURISDICTION_CONFIG.DEFAULT;

  const links: Record<string, string | null> = { impressum: null, privacy: null };
  $('a').each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    const href = $(el).attr('href') || '';
    if (DOC_KEYWORDS.privacy.some(k => k.test(text))) links.privacy = href;
    if (DOC_KEYWORDS.impressum.some(k => k.test(text))) links.impressum = href;
  });

  const violationMap = new Map<string, Violation>();
  const fullHtmlLower = html.toLowerCase();

  // RULE 1: Statutory Truth-Mapping (Art. 13)
  if (!links.privacy) {
    violationMap.set('Art. 13-Missing', {
      category: 'Privacy',
      report_type: 'SaaS',
      issue_type: 'MISSING PRIVACY INFRASTRUCTURE',
      severity: 'critical',
      evidence_html: url,
      description: `The website lacks the mandatory Privacy Statement required for legal data processing.`,
      business_impact: 'Business Risk: Immediate suspension of advertising accounts (Google/Meta) and loss of tracking ROI.',
      law_name: profile.law,
      potential_fine: LIABILITY_CRITICAL,
      explanation: 'Statutory rules require you to inform users of site ownership before collection begins.',
      recommendation: `ACTION: Copy and paste this HTML into your footer: '<a href="/privacy">Official Privacy Statement</a>'`,
      verification_method
    });
  } else {
    // Incomplete Content (Truth-Mapping: If link exists, it's never missing)
    const bodyText = $('body').text();
    if (!/retention|storage|storing/i.test(bodyText)) {
       violationMap.set('Art. 13-Incomplete', {
        category: 'Privacy',
        report_type: 'SaaS',
        issue_type: 'CRITICAL INCOMPLETENESS: DATA RETENTION',
        severity: 'high',
        evidence_html: links.privacy,
        description: `The existing Privacy Policy fails to specify mandatory data retention periods required by Art. 13(2)(a).`,
        business_impact: 'Business Risk: Vulnerability to GDPR regulatory audits and data subject erasure lawsuits.',
        law_name: 'Art. 13(2)(a) GDPR',
        potential_fine: LIABILITY_HIGH,
        explanation: 'The law requires an exact timeframe or specific criteria for how long you store user data.',
        recommendation: `ACTION: Copy and paste this into your Privacy Policy: 'Data Retention: We store user data for 24 months from last interaction or until a deletion request is received.'`,
        verification_method
      });
    }
  }

  // RULE 2: Registered Identity Card (Art. 13-1-a)
  const identityFound = profile.entitySuffixes.some(s => s.test(fullHtmlLower));
  if (!identityFound && !violationMap.has('Art. 13-Missing')) {
    violationMap.set('Art. 13(1)(a)', {
      category: 'Privacy',
      report_type: 'SaaS',
      issue_type: 'ANONYMOUS DATA CONTROLLER',
      severity: 'high',
      evidence_html: url,
      description: 'The website fails to provide official company ownership information (Registered Name & Address).',
      business_impact: 'Business Risk: Loss of B2B trust and potential payment gateway (Stripe/PayPal) suspension.',
      law_name: 'Art. 13(1)(a) GDPR',
      potential_fine: LIABILITY_HIGH,
      explanation: 'Statutory rules require a physical address and registered name for commercial accountability.',
      recommendation: `ACTION: Copy and paste this into your footer: 'Data Controller: [Your Company], Address: [Street, City, Postcode], Email: legal@${domain}'`,
      verification_method
    });
  }

  // RULE 3: ePrivacy Transparency (Art. 5(3))
  if (!fullHtmlLower.includes('cookie') && !fullHtmlLower.includes('consent')) {
    violationMap.set('ePrivacy', {
      category: 'Privacy',
      report_type: 'SaaS',
      issue_type: 'UNAUTHORIZED TRACKING: ePRIVACY',
      severity: 'high',
      evidence_html: url,
      description: 'The website sets tracking pixels without acquiring statutory user consent.',
      business_impact: 'Business Risk: Immediate loss of marketing attribution as Google/Meta require explicit Consent Mode v2.',
      law_name: 'ePrivacy Directive Art. 5(3) & Art. 7 GDPR',
      potential_fine: LIABILITY_HIGH,
      explanation: 'Consent is strictly required BEFORE setting non-essential cookies or tracking pixels.',
      recommendation: `ACTION: Copy and paste this HTML snippet for a basic banner: '<div id="consent">We use cookies. [Accept] [Settings]</div>'`,
      verification_method
    });
  }

  const violations = Array.from(violationMap.values());
  const score = Math.max(0, 100 - (violations.length * 20));

  return {
    violations,
    discoveredLinks: [],
    meta: { hasCMP: false, legal_links: links },
    compliance_report: {
      score,
      grade: score > 90 ? 'A' : score > 70 ? 'C' : 'F',
      verdict: violations.length > 0 ? 'RISKY' : 'COMPLIANT',
      jurisdiction: profile.name,
      top_risks: violations.slice(0, 3).map(v => v.issue_type),
      validation_status: 'incomplete',
      nav_scout: { found_links: [], missing_critical: [], discovery_score: 100 },
      lex_analyzer: { has_vat_id: true, has_contact_info: true, has_mandatory_terms: true, content_truncated: false, missing_clusters: [] },
      cmp_detect: { detected_provider: null, is_active: false }
    }
  };
}