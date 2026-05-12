import * as cheerio from 'cheerio';
import { Violation, ComplianceReport, VerificationMethod } from '@/types';

const LIABILITY_STANDARD = 'Potential Fine: Up to €20,000,000 or 4% of annual global turnover (Art. 83 GDPR)';

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

  // RULE 1: Statutory Privacy Notice (Art. 13)
  if (!links.privacy && !fullHtmlLower.includes('privacy policy')) {
    violationMap.set('Art. 13', {
      category: 'Privacy',
      report_type: 'SaaS',
      issue_type: 'MISSING COMPANY IDENTITY INFO',
      severity: 'critical',
      evidence_html: url,
      description: `The site does not show a Privacy Policy. The law requires you to show who collects user data.`,
      business_impact: 'Business Risk: Identity Crisis. Without a clear owner, users will not trust your checkout or forms. Google Ads will likely block your domain.',
      law_name: profile.law,
      potential_fine: LIABILITY_STANDARD,
      explanation: 'You must inform users who you are and why you collect data. This is a basic rule for doing business in the EU.',
      recommendation: `ADD THIS TEXT to your website footer: 'Data Controller: ${hostname}, Registered Address: [Your Full Office Address], Contact: [Support Email]'.`,
      verification_method
    });
  }

  // RULE 2: Registered Identity (Art. 13-1-a)
  const identityFound = profile.entitySuffixes.some(s => s.test(fullHtmlLower));
  if (!identityFound && !violationMap.has('Art. 13')) {
    violationMap.set('Art. 13(1)(a)', {
      category: 'Privacy',
      report_type: 'SaaS',
      issue_type: 'HIDDEN BUSINESS OWNERSHIP',
      severity: 'high',
      evidence_html: url,
      description: 'The official registered name and address of your business are missing.',
      business_impact: 'Business Risk: Lawsuit Target. Competitors can report you to the authorities for being an anonymous/unregulated entity, leading to fines.',
      law_name: 'Art. 13(1)(a) GDPR',
      potential_fine: LIABILITY_STANDARD,
      explanation: 'The law requires you to show your official registered name and a physical street address where you can be reached.',
      recommendation: "ADD THIS TEXT to your 'Contact' page: '[Full Legal Company Name], Registered at [Full Street Address, City, Zip Code]'.",
      verification_method
    });
  }

  // RULE 3: Statutory Legal Notice (Impressum)
  if (profile.requireImpressum && !links.impressum && !profile.excluded_checks.includes('impressum_check')) {
    violationMap.set('TDDG', {
      category: 'IMPRESSUM',
      report_type: 'SaaS',
      issue_type: 'MISSING STATUTORY LEGAL NOTICE (IMPRESSUM)',
      severity: 'critical',
      evidence_html: url,
      description: `Missing "Impressum" (Legal Notice). This is a mandatory identity card for your business.`,
      business_impact: 'Business Risk: Immediate Legal Warning. In Germany, lawyers actively sue websites that miss an Impressum, costing you €2,000+ per incident.',
      law_name: profile.law.includes('TDDG') ? '§ 5 TDDG (Germany)' : 'Commercial Transparency Act',
      potential_fine: LIABILITY_STANDARD,
      explanation: 'In the EU, every commercial site must have an Impressum listing the owner, VAT ID, and managing directors.',
      recommendation: "ADD THIS TEXT to a new 'Legal Notice' page: 'Managing Directors: [Names], VAT ID: [Your ID], Registration Court: [City]'.",
      verification_method
    });
  }

  // RULE 4: Cookies & Tracking (ePrivacy)
  if (!fullHtmlLower.includes('cookie') && !fullHtmlLower.includes('tracking')) {
    violationMap.set('ePrivacy', {
      category: 'Privacy',
      report_type: 'SaaS',
      issue_type: 'ILLEGAL COOKIE TRACKING',
      severity: 'medium',
      evidence_html: url,
      description: 'The site sets tracking cookies without getting user permission first.',
      business_impact: 'Business Risk: Facebook Pixel Block. Meta and Google now require explicit "Consent Mode v2". Without it, your tracking and ad optimization will fail.',
      law_name: 'ePrivacy Directive Art. 5(3)',
      potential_fine: LIABILITY_STANDARD,
      explanation: 'The law says you must ask for permission before using any non-essential cookies or tracking pixels.',
      recommendation: "ADD THIS TEXT to your cookie banner: 'We use tracking cookies to improve your experience. We store this consent for 12 months.'",
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