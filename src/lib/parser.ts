
import * as cheerio from 'cheerio';
import { Violation, ComplianceReport, Category, VerificationMethod } from '@/types';

const LIABILITY_MAP: Record<string, string> = {
  'Legal_Content': 'Up to €50,000 (German TMG §5)',
  'Privacy': 'Up to €20M or 4% of annual global turnover (GDPR Art. 83)',
  'Cookies': 'Up to €10M or 2% of annual global turnover (ePrivacy Directive)',
  'Security': 'Up to €20M or 4% of annual global turnover (GDPR Art. 83)',
  'DEFAULT': 'Administrative fines under GDPR Art. 83'
};

const MANDATORY_CLUSTERS = {
  CONTROLLER: {
    keywords: [/data controller/i, /verantwortlicher/i, /responsable du traitement/i, /titular del tratamiento/i, /identity of the controller/i, /legal disclosure/i],
    law: "GDPR Article 13(1)(a)",
    name: "Controller Identity",
    remediation: "Include the full legal name of your entity, registered physical address, and a direct contact email."
  },
  RIGHTS: {
    keywords: [/right to access/i, /right to erasure/i, /right to object/i, /auskunftsrecht/i, /löschungsrecht/i, /widerrufsrecht/i, /data subject rights/i],
    law: "GDPR Article 13(2)(b)",
    name: "Data Subject Rights",
    remediation: "Explain that users have the right to request access, correction, or deletion of their personal data."
  },
  RETENTION: {
    keywords: [/retention period/i, /speicherdauer/i, /durée de conservation/i, /plazo de conservación/i, /storage period/i],
    law: "GDPR Article 13(2)(a)",
    name: "Retention Periods",
    remediation: "Specify criteria or exact timeframes for how long user data is stored."
  },
  DPO: {
    keywords: [/data protection officer/i, /datenschutzbeauftragter/i, /délégué à la protection des données/i, /DPO contact/i],
    law: "GDPR Article 13(1)(b)",
    name: "DPO Contact Details",
    remediation: "Provide professional contact details for privacy inquiries (if applicable)."
  }
};

const LEGAL_PATTERNS = {
  impressum: [/impressum/i, /legal notice/i, /mentions légales/i, /aviso legal/i, /legal-disclosure/i],
  privacy: [/privacy/i, /datenschutz/i, /confidentialité/i, /privacidad/i, /data protection/i, /privacy-policy/i],
  terms: [/terms/i, /tos/i, /conditions/i, /bedingungen/i, /condiciones/i, /agb/i, /terms-of-service/i],
  cookies: [/cookie/i, /galletas/i, /biscotti/i, /cookie policy/i, /cookie-richtlinie/i]
};

export function normalizeUrl(url: string, base: string): string | null {
  try {
    const absolute = new URL(url, base);
    absolute.hash = '';
    absolute.search = ''; 
    let pathname = absolute.pathname.toLowerCase();
    // Normalize trailing slashes
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    absolute.pathname = pathname;
    return absolute.href;
  } catch (e) {
    return null;
  }
}

export function parseHtmlContent(html: string, url: string, headers: any = {}, screenshot?: string, isPuppeteer: boolean = false): { 
  violations: Violation[], 
  discoveredLinks: string[],
  meta: { hasCMP: boolean, legal_links: Record<string, string | null> },
  compliance_report: ComplianceReport
} {
  const $ = cheerio. Cheerio = cheerio.load(html);
  const verification_method: VerificationMethod = isPuppeteer ? 'Dynamic Emulation' : 'Static Analysis';
  
  const links: Record<string, string | null> = { impressum: null, privacy: null, terms: null, cookies: null };
  const violations: Violation[] = [];
  const lowerHtml = html.substring(0, 150000).toLowerCase(); // Increased limit for complex docs

  // 1. NAV-SCOUT Phase: Identify Links by text AND URL pattern
  $('a').each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    const href = $(el).attr('href')?.toLowerCase() || '';
    if (!href || href.startsWith('javascript:')) return;

    const normalized = normalizeUrl(href, url);
    if (!normalized) return;

    const hrefCheck = (patterns: RegExp[]) => patterns.some(p => p.test(text) || p.test(href));

    if (!links.impressum && hrefCheck(LEGAL_PATTERNS.impressum)) links.impressum = normalized;
    if (!links.privacy && hrefCheck(LEGAL_PATTERNS.privacy)) links.privacy = normalized;
    if (!links.terms && hrefCheck(LEGAL_PATTERNS.terms)) links.terms = normalized;
    if (!links.cookies && hrefCheck(LEGAL_PATTERNS.cookies)) links.cookies = normalized;
  });

  // 2. Report Phase: Missing vs Incomplete
  const mandatoryDocs = [
    { key: 'impressum', name: 'Legal Notice (Impressum)', law: '§ 5 TMG / Art. 13 GDPR', category: 'Legal_Content' as Category },
    { key: 'privacy', name: 'Privacy Policy', law: 'Art. 13 GDPR', category: 'Privacy' as Category }
  ];

  mandatoryDocs.forEach(doc => {
    const foundUrl = links[doc.key as keyof typeof links];
    if (!foundUrl) {
      violations.push({
        category: doc.category,
        report_type: 'SaaS',
        issue_type: `Missing ${doc.name}`,
        severity: 'critical',
        evidence_html: url,
        description: `NAV-SCOUT engine scanned the navigation and footer but detected no compliant link for the ${doc.name}.`,
        law_name: doc.law,
        potential_fine: LIABILITY_MAP[doc.category] || LIABILITY_MAP.DEFAULT,
        explanation: 'Mandatory legal information must be easily recognizable and directly accessible.',
        recommendation: `Implement a footer link labeled "${doc.name}" pointing to a compliant document.`,
        verification_method
      });
    } else {
      // LEX-ANALYZER Phase: Check content of the found document
      Object.entries(MANDATORY_CLUSTERS).forEach(([clusterKey, cluster]) => {
        // Only check Controller for Impressum, check all for Privacy
        if (doc.key === 'impressum' && clusterKey !== 'CONTROLLER') return;

        if (!cluster.keywords.some(k => k.test(lowerHtml))) {
          violations.push({
            category: doc.category,
            report_type: 'SaaS',
            issue_type: `Incomplete ${doc.name}`,
            severity: 'high',
            evidence_html: foundUrl,
            snippet: html.substring(0, 500) + '...',
            description: `LEX-ANALYZER identified the ${doc.name} at ${foundUrl}, but mandatory section [${cluster.name}] is missing.`,
            law_name: cluster.law,
            potential_fine: LIABILITY_MAP[doc.category] || LIABILITY_MAP.DEFAULT,
            explanation: `Transparency requirements under Art. 13 GDPR mandate the disclosure of [${cluster.name}].`,
            recommendation: cluster.remediation,
            verification_method
          });
        }
      });
    }
  });

  const cmpSignatures = [/cookiebot/i, /onetrust/i, /usercentrics/i, /sourcepoint/i, /cookie-law-info/i];
  const hasCMP = cmpSignatures.some(s => s.test(lowerHtml));

  return {
    violations,
    discoveredLinks: [],
    meta: { hasCMP, legal_links: links },
    compliance_report: {
      score: Math.max(0, 100 - (violations.length * 15)),
      verdict: violations.some(v => v.severity === 'critical') ? 'RISKY' : (violations.length > 0 ? 'RISKY' : 'COMPLIANT'),
      nav_scout: {
        found_links: Object.values(links).filter(Boolean) as string[],
        missing_critical: mandatoryDocs.filter(d => !links[d.key as keyof typeof links]).map(d => d.name),
        discovery_score: Object.values(links).filter(Boolean).length * 25
      },
      lex_analyzer: {
        has_vat_id: /de[0-9]{9}/i.test(lowerHtml),
        has_contact_info: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(lowerHtml),
        has_mandatory_terms: true,
        content_truncated: html.length > 150000,
        missing_clusters: [] 
      },
      cmp_detect: {
        detected_provider: hasCMP ? 'Active CMP Detected' : null,
        is_active: hasCMP
      }
    }
  };
}
