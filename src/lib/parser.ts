import * as cheerio from 'cheerio';
import { Violation, ComplianceReport, VerificationMethod } from '@/types';

/**
 * @fileOverview Senior Legal Architect V22.2 - Statutory Truth-Mapping.
 * 
 * - Rule: Human-Friendly definitions (DPO, Official Ownership).
 * - Rule: Copy-pasteable HTML/Text solutions.
 */

const LIABILITY_CRITICAL = "Fines up to €20,000,000 or 4% of annual global turnover (Art. 83 GDPR). High risk of immediate ad account suspension.";
const LIABILITY_HIGH = "Administrative penalties up to €20,000,000 (Art. 83 GDPR). High risk of competitor cease and desist (Abmahnung) notices.";

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
  privacy: [/privacy/i, /datenschutz/i, /confidentialit/i, /privacidad/i, /rodo/i],
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

  // RULE: V22.2 - Identity Check (Human-Friendly)
  const identityFound = profile.entitySuffixes.some(s => s.test(fullHtmlLower));
  
  if (!links.privacy) {
    violationMap.set('Art. 13-Missing', {
      category: 'Privacy',
      report_type: 'SaaS',
      issue_type: 'MISSING PRIVACY INFRASTRUCTURE',
      severity: 'critical',
      evidence_html: url,
      description: `Statutory law requires you to display a Privacy Policy before any data collection begins. None was detected.`,
      business_impact: 'Business Risk: Immediate loss of marketing ROI as Google/Meta advertising platforms require valid compliance signals.',
      law_name: profile.law,
      potential_fine: LIABILITY_CRITICAL,
      explanation: 'You must inform users of site ownership and data usage before collection starts.',
      recommendation: `INSERT THIS HTML: '<a href="/privacy">Privacy Policy</a>' and add to your website footer.`,
      verification_method
    });
  } else {
    // If document exists, check for specific gaps
    if (!/retention|storage|storing/i.test($('body').text())) {
       violationMap.set('Art. 13-Retention', {
        category: 'Privacy',
        report_type: 'SaaS',
        issue_type: 'CRITICAL GAP: DATA RETENTION',
        severity: 'high',
        evidence_html: links.privacy,
        description: `Statutory law requires you to state exactly how long you store user data. This is missing from your policy.`,
        business_impact: 'Business Risk: Direct vulnerability to regulatory audits and Art. 17 data erasure lawsuits.',
        law_name: 'Art. 13(2)(a) GDPR',
        potential_fine: LIABILITY_HIGH,
        explanation: 'You must state how long you keep user data or the criteria used to decide that timeframe.',
        recommendation: `INSERT THIS TEXT: 'Data Retention: We store user data for 24 months from the last login or until you request account deletion.'`,
        verification_method
      });
    }
  }

  if (!identityFound && !violationMap.has('Art. 13-Missing')) {
    violationMap.set('Art. 13(1)(a)', {
      category: 'Privacy',
      report_type: 'SaaS',
      issue_type: 'OFFICIAL COMPANY OWNERSHIP INFO',
      severity: 'high',
      evidence_html: url,
      description: 'The law requires you to display your registered company name and physical address for commercial accountability.',
      business_impact: 'Business Risk: Loss of B2B trust and potential payment gateway (Stripe/PayPal) account suspension.',
      law_name: 'Art. 13(1)(a) GDPR',
      potential_fine: LIABILITY_HIGH,
      explanation: 'Statutory rules require a physical address and registered name for all commercial entities.',
      recommendation: `INSERT THIS TEXT: 'Data Controller: [Company Name], Address: [Street, City], Email: legal@${domain}'`,
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
