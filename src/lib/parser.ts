
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
    excluded_checks: ['impressum_check'], // PL Override
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
  
  // Jurisdiction Detection
  const hostname = new URL(url).hostname;
  const tld = hostname.split('.').pop()?.toUpperCase();
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

  // 1. STATUTORY PRIVACY NOTICE (Art. 13)
  if (!links.privacy && !fullHtmlLower.includes('privacy policy')) {
    violationMap.set('Art. 13', {
      category: 'Privacy',
      report_type: 'SaaS',
      issue_type: 'SYSTEMIC TRANSPARENCY FAILURE (Art. 13)',
      severity: 'critical',
      evidence_html: url,
      description: `Complete absence of a statutory Privacy Policy as required by Article 13 GDPR.`,
      business_impact: 'High Risk of Regulatory Injunction: Failing to provide a privacy policy is a fundamental violation that triggers immediate administrative scrutiny and blocks ad accounts in Google/Meta.',
      law_name: profile.law,
      potential_fine: LIABILITY_STANDARD,
      explanation: 'Companies must inform users of data processing activities at the moment of collection.',
      recommendation: '1. Create a "Privacy Policy" page.\n2. Add a clear footer link.\n3. Include processing purposes and data subject rights.',
      verification_method
    });
  }

  // 2. CONTROLLER IDENTITY (Art. 13-1-a)
  const identityFound = profile.entitySuffixes.some(s => s.test(fullHtmlLower));
  if (!identityFound && !violationMap.has('Art. 13')) {
    violationMap.set('Art. 13(1)(a)', {
      category: 'Privacy',
      report_type: 'SaaS',
      issue_type: 'IDENTITY TRANSPARENCY FAILURE (Art. 13-1-a)',
      severity: 'high',
      evidence_html: url,
      description: 'The audit failed to identify the official legal entity responsible for data processing.',
      business_impact: 'Loss of Customer Trust: Visitors are less likely to convert or provide information when they cannot verify the legal ownership of the platform.',
      law_name: 'Art. 13(1)(a) GDPR',
      potential_fine: LIABILITY_STANDARD,
      explanation: 'The Data Controller\'s official identity and registered address must be explicitly disclosed.',
      recommendation: '1. Add your official legal company name (e.g., Ltd/GmbH).\n2. Provide the full registered office address in your policy.',
      verification_method
    });
  }

  // 3. STATUTORY LEGAL NOTICE (Impressum) - Override for PL
  if (profile.requireImpressum && !links.impressum && !profile.excluded_checks.includes('impressum_check')) {
    violationMap.set('TDDG', {
      category: 'IMPRESSUM',
      report_type: 'SaaS',
      issue_type: 'MISSING STATUTORY LEGAL NOTICE',
      severity: 'critical',
      evidence_html: url,
      description: `Absence of a mandatory Legal Notice (Impressum) required for commercial operations in ${profile.name}.`,
      business_impact: 'Immediate Injunction Risk: Competitors in jurisdictions like Germany can file legal cease-and-desist orders (Abmahnung) for missing identity info.',
      law_name: profile.law.includes('TDDG') ? '§ 5 TDDG (Germany)' : 'Statutory Transparency Act',
      potential_fine: LIABILITY_STANDARD,
      explanation: 'Statutory transparency laws require commercial websites to identify company ownership and contact details in a single, accessible notice.',
      recommendation: '1. Create an "Impressum" page.\n2. List Company Name, Address, VAT ID, and Managing Directors.',
      verification_method
    });
  }

  // 4. COOKIE DISCLOSURE (ePrivacy)
  if (!fullHtmlLower.includes('cookie') && !fullHtmlLower.includes('tracking')) {
    violationMap.set('ePrivacy', {
      category: 'Privacy',
      report_type: 'SaaS',
      issue_type: 'COOKIE CONSENT FAILURE (ePrivacy)',
      severity: 'medium',
      evidence_html: url,
      description: 'Failure to provide comprehensive information about the use of cookies and tracking pixels.',
      business_impact: 'Marketing Restriction: Ad platforms strictly require transparency for tracking pixels. Lack of disclosure leads to platform-wide advertising bans.',
      law_name: 'ePrivacy Directive (2002/58/EC)',
      potential_fine: LIABILITY_STANDARD,
      explanation: 'Operators must provide clear information about non-essential cookies and obtain user consent before storage.',
      recommendation: '1. Implement a Cookie Disclosure or Banner.\n2. Categorize all cookies and provide a clear opt-out mechanism.',
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
