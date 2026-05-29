
import * as cheerio from 'cheerio';
import { Violation, ComplianceReport } from '@/types';

/**
 * @fileOverview Targeted EU Compliance Discovery Parser
 * Optimized for German market link patterns.
 */

const LIABILITY_GDPR = "Up to €20,000,000 or 4% of global annual turnover.";

interface NationalRule {
  country: string;
  law: string;
  regulator: string;
  fine: string;
  required_markers: RegExp[];
}

const EU_NATIONAL_RULES: Record<string, NationalRule> = {
  'DE': {
    country: 'Germany',
    law: '§ 5 DDG (Digitale-Dienste-Gesetz)',
    regulator: 'BfDI / LfD',
    fine: 'Up to €50,000 for Impressum errors; GDPR fines for others.',
    required_markers: [/handelsregister/i, /registernummer/i, /ust-idnr/i, /amtsgericht/i, /geschäftsführer/i]
  },
  'AT': {
    country: 'Austria',
    law: '§ 5 ECG / § 25 Mediengesetz',
    regulator: 'DSB',
    fine: 'Administrative fines up to €20M.',
    required_markers: [/firmenbuch/i, /uid-nummer/i]
  }
};

export function parseHtmlContent(html: string, url: string): {
  violations: Violation[],
  meta: { hasCMP: boolean, legal_links: Record<string, string | null> },
  compliance_report: ComplianceReport
} {
  const $ = cheerio.load(html);
  const domain = new URL(url).hostname;
  const tld = domain.split('.').pop()?.toUpperCase() || '';
  const textLower = $('body').text().toLowerCase();

  // Link Discovery Logic
  const legalLinks: Record<string, string | null> = {
    impressum: null,
    privacy: null,
    cookies: null,
    terms: null
  };

  $('a').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().toLowerCase();
    if (!href) return;

    if (text.includes('impressum') || text.includes('legal notice') || text.includes('mentions legales')) legalLinks.impressum = href;
    if (text.includes('datenschutz') || text.includes('privacy') || text.includes('confidentialité')) legalLinks.privacy = href;
    if (text.includes('cookie') || text.includes('tracking')) legalLinks.cookies = href;
    if (text.includes('agb') || text.includes('terms') || text.includes('nutzungsbedingungen')) legalLinks.terms = href;
  });

  const violations: Violation[] = [];
  const countryCode = tld === 'COM' || tld === 'NET' ? 'EU' : tld;
  const rule = EU_NATIONAL_RULES[countryCode] || null;

  if (rule) {
    const missingMarkers = rule.required_markers.filter(m => !m.test(textLower));
    if (missingMarkers.length > 2 && !legalLinks.impressum) {
      violations.push({
        category: 'IMPRESSUM',
        issue_type: `MISSING_STATUTORY_IMPRESSUM_${countryCode}`,
        severity: 'critical',
        evidence_html: url,
        description: `Site for ${rule.country} market is missing a mandatory Impressum/Legal Notice.`,
        business_impact: 'High risk of immediate Abmahnung (Fine) under UWG/DDG.',
        law_name: rule.law,
        potential_fine: rule.fine,
        recommendation: `ACTION: Create a dedicated /impressum page containing Managing Director, Physical Address, and Registration numbers.`,
        explanation: 'German law requires specific operator information to be accessible within 2 clicks.',
        confidence_score: 1.0,
        report_type: 'SaaS',
        country: countryCode
      });
    }
  }

  return {
    violations,
    meta: { 
      hasCMP: textLower.includes('cookie') || textLower.includes('einwilligung'), 
      legal_links: legalLinks 
    },
    compliance_report: {
      score: Math.max(0, 100 - (violations.length * 25)),
      grade: violations.length === 0 ? 'A' : 'F',
      verdict: violations.length > 0 ? 'RISKY' : 'COMPLIANT',
      jurisdiction: rule?.country || 'EU General',
      top_risks: violations.map(v => v.issue_type),
      validation_status: 'incomplete',
      nav_scout: { found_links: Object.values(legalLinks).filter(Boolean) as string[], missing_critical: [], discovery_score: 100 },
      lex_analyzer: { has_vat_id: /ust-idnr/i.test(textLower), has_contact_info: /@/.test(textLower), has_mandatory_terms: false, content_truncated: false, missing_clusters: [] },
      cmp_detect: { detected_provider: null, is_active: textLower.includes('accept') }
    }
  };
}
