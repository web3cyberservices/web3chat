
import * as cheerio from 'cheerio';
import { Violation, ComplianceReport, VerificationMethod } from '@/types';

/**
 * @fileOverview Intelligent Legal Parser
 * - Handles country-specific jurisdictions (Germany, Poland, etc.)
 * - Identifies legal markers for statutory audits.
 */

const LIABILITY_GDPR = "Administrative fines up to €20,000,000 or 4% of global annual turnover under Art. 83 GDPR.";

interface JurisdictionConfig {
  name: string;
  laws: {
    privacy: string;
    impressum: string;
    terms: string;
  };
  keywords: {
    privacy: RegExp[];
    impressum: RegExp[];
    terms: RegExp[];
  };
  mandatory_impressum: boolean;
}

const JURISDICTIONS: Record<string, JurisdictionConfig> = {
  'DE': {
    name: 'Germany',
    laws: { privacy: 'Art. 13 GDPR', impressum: '§ 5 TDDG (Digitale-Dienste-Gesetz)', terms: 'BGB § 305' },
    keywords: {
      privacy: [/datenschutz/i, /privacy/i],
      impressum: [/impressum/i, /legal notice/i, /anbieterkennzeichnung/i],
      terms: [/agb/i, /terms/i, /nutzungsbedingungen/i]
    },
    mandatory_impressum: true
  },
  'PL': {
    name: 'Poland',
    laws: { privacy: 'RODO (Art. 13)', impressum: 'Art. 5 UŚUDE', terms: 'Regulamin' },
    keywords: {
      privacy: [/polityka prywatności/i, /rodo/i],
      impressum: [/o nas/i, /kontakt/i],
      terms: [/regulamin/i]
    },
    mandatory_impressum: true
  },
  'DEFAULT': {
    name: 'European Union',
    laws: { privacy: 'Art. 13 GDPR', impressum: 'ePrivacy Directive', terms: 'Consumer Protection Law' },
    keywords: {
      privacy: [/privacy/i, /policy/i, /cookies/i],
      impressum: [/impressum/i, /legal/i, /notice/i],
      terms: [/terms/i, /conditions/i]
    },
    mandatory_impressum: false
  }
};

export function parseHtmlContent(html: string, url: string, headers: any = {}, screenshot?: string, isPuppeteer: boolean = false): {
  violations: Violation[],
  discoveredLinks: string[],
  meta: { hasCMP: boolean, legal_links: Record<string, string | null> },
  compliance_report: ComplianceReport
} {
  const $ = cheerio.load(html);
  const domain = new URL(url).hostname;
  const tld = domain.split('.').pop()?.toUpperCase() || '';
  const config = JURISDICTIONS[tld] || JURISDICTIONS.DEFAULT;

  const links: Record<string, string | null> = { impressum: null, privacy: null, terms: null };
  const allLinks: string[] = [];

  $('a').each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    const href = $(el).attr('href') || '';
    if (!href || href.startsWith('javascript:')) return;
    
    allLinks.push(href);

    if (config.keywords.privacy.some(k => k.test(text))) links.privacy = href;
    if (config.keywords.impressum.some(k => k.test(text))) links.impressum = href;
    if (config.keywords.terms.some(k => k.test(text))) links.terms = href;
  });

  const violations: Violation[] = [];

  if (!links.privacy) {
    violations.push({
      category: 'Privacy',
      issue_type: 'MISSING_PRIVACY_POLICY',
      severity: 'critical',
      evidence_html: url,
      description: `The domain ${domain} lacks a visible link to a Privacy Policy, violating mandatory transparency requirements under ${config.laws.privacy}.`,
      business_impact: 'High risk of ad account suspension (Meta/Google) and regulatory audits.',
      law_name: config.laws.privacy,
      potential_fine: LIABILITY_GDPR,
      recommendation: 'ACTION: Implement a dedicated Privacy Policy page and link it in the global site footer.',
      explanation: 'Statutory laws require users to be informed about data processing before any collection occurs.',
      confidence_score: 1.0,
      report_type: 'SaaS'
    });
  }

  if (config.mandatory_impressum && !links.impressum) {
    violations.push({
      category: 'IMPRESSUM',
      issue_type: 'MISSING_IMPRESSUM',
      severity: 'high',
      evidence_html: url,
      description: `For commercial entities in ${config.name}, a detailed Impressum (Legal Notice) is strictly mandatory under ${config.laws.impressum}.`,
      business_impact: 'Risk of Abmahnung (legal warning) and fines up to €50,000 in Germany.',
      law_name: config.laws.impressum,
      potential_fine: "Up to €50,000 for administrative non-compliance.",
      recommendation: 'ACTION: Add a "Legal Notice" or "Impressum" link containing your registered company address, VAT ID, and registration number.',
      explanation: 'Transparency of ownership is a core requirement for digital services in many EU member states.',
      confidence_score: 1.0,
      report_type: 'SaaS'
    });
  }

  return {
    violations,
    discoveredLinks: allLinks,
    meta: { hasCMP: false, legal_links: links },
    compliance_report: {
      score: Math.max(0, 100 - (violations.length * 30)),
      grade: violations.length === 0 ? 'A' : 'F',
      verdict: violations.length > 0 ? 'RISKY' : 'COMPLIANT',
      jurisdiction: config.name,
      top_risks: violations.map(v => v.issue_type),
      validation_status: 'incomplete',
      nav_scout: { found_links: Object.values(links).filter(Boolean) as string[], missing_critical: [], discovery_score: 100 },
      lex_analyzer: { has_vat_id: false, has_contact_info: false, has_mandatory_terms: !!links.terms, content_truncated: false, missing_clusters: [] },
      cmp_detect: { detected_provider: null, is_active: false }
    }
  };
}
