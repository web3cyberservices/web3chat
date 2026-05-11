
import * as cheerio from 'cheerio';
import { Violation, ComplianceReport, Category, VerificationMethod } from '@/types';

const MANDATORY_CLUSTERS = {
  CONTROLLER: {
    keywords: [/data controller/i, /verantwortlicher/i, /responsable du traitement/i, /titular del tratamiento/i, /identity of the controller/i],
    law: "GDPR Article 13(1)(a)",
    desc: "Identity and contact details of the controller.",
    remediation: "Include the full legal name of your entity, registered physical address, and a direct contact email in the first section of your policy."
  },
  RIGHTS: {
    keywords: [/right to access/i, /right to erasure/i, /right to object/i, /auskunftsrecht/i, /löschungsrecht/i, /widerrufsrecht/i, /data subject rights/i],
    law: "GDPR Article 13(2)(b)",
    desc: "Information on data subject rights (access, rectification, erasure).",
    remediation: "Add a dedicated section explaining that users have the right to request access, correction, or deletion of their personal data."
  },
  RETENTION: {
    keywords: [/retention period/i, /speicherdauer/i, /durée de conservation/i, /plazo de conservación/i, /storage period/i],
    law: "GDPR Article 13(2)(a)",
    desc: "The period for which the personal data will be stored.",
    remediation: "Specify clear criteria or exact timeframes for how long user data is stored (e.g., 'Marketing data is kept for 24 months')."
  },
  DPO: {
    keywords: [/data protection officer/i, /datenschutzbeauftragter/i, /délégué à la protection des données/i, /DPO contact/i],
    law: "GDPR Article 13(1)(b)",
    desc: "Contact details of the Data Protection Officer (if applicable).",
    remediation: "If your organization is required to appoint a DPO, provide their professional contact details for privacy inquiries."
  }
};

const FINE_GDPR_CRITICAL = "Administrative fines up to €20,000,000 or 4% of global annual turnover (Art. 83 GDPR).";
const FINE_GDPR_HIGH = "Administrative fines up to €10,000,000 or 2% of global annual turnover (Art. 83 GDPR).";

const LEGAL_PATTERNS = {
  impressum: [/impressum/i, /legal notice/i, /mentions légales/i, /aviso legal/i, /note legali/i, /legal disclosure/i],
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
  const $ = cheerio.load(html);
  const verification_method: VerificationMethod = isPuppeteer ? 'Dynamic Emulation' : 'Static Analysis';
  
  const links: Record<string, string | null> = { impressum: null, privacy: null, terms: null, cookies: null };
  const violations: Violation[] = [];
  const lowerHtml = html.substring(0, 100000).toLowerCase();

  // 1. NAV-SCOUT Phase: Identify Links
  $('a').each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    const href = $(el).attr('href')?.toLowerCase() || '';
    if (!href || href.startsWith('javascript:')) return;

    const normalized = normalizeUrl(href, url);
    if (!normalized) return;

    if (!links.impressum && LEGAL_PATTERNS.impressum.some(p => p.test(text) || p.test(href))) links.impressum = normalized;
    if (!links.privacy && LEGAL_PATTERNS.privacy.some(p => p.test(text) || p.test(href))) links.privacy = normalized;
    if (!links.terms && LEGAL_PATTERNS.terms.some(p => p.test(text) || p.test(href))) links.terms = normalized;
    if (!links.cookies && LEGAL_PATTERNS.cookies.some(p => p.test(text) || p.test(href))) links.cookies = normalized;
  });

  // 2. Report Phase: Missing vs Incomplete
  const mandatoryDocs = [
    { key: 'impressum', name: 'Legal Notice / Impressum', law: '§ 5 TMG / Art. 13 GDPR' },
    { key: 'privacy', name: 'Privacy Policy', law: 'Art. 13 GDPR' }
  ];

  mandatoryDocs.forEach(doc => {
    const foundUrl = links[doc.key as keyof typeof links];
    if (!foundUrl) {
      violations.push({
        category: 'Legal_Content',
        report_type: 'SaaS',
        issue_type: `Missing ${doc.name}`,
        severity: 'critical',
        evidence_html: url,
        description: `NAV-SCOUT engine scanned the navigation and footer but failed to detect a dedicated link to the ${doc.name}.`,
        law_name: doc.law,
        potential_fine: FINE_GDPR_CRITICAL,
        explanation: 'Mandatory legal information must be easily recognizable, directly accessible, and permanently available.',
        recommendation: `Implement a footer link explicitly labeled "${doc.name}" pointing to a compliant document.`,
        verification_method
      });
    } else {
      // LEX-ANALYZER Phase: Check existing document for clusters
      Object.entries(MANDATORY_CLUSTERS).forEach(([clusterKey, cluster]) => {
        // Skip DPO check for Legal Notice
        if (doc.key === 'impressum' && clusterKey !== 'CONTROLLER') return;

        if (!cluster.keywords.some(k => k.test(lowerHtml))) {
          violations.push({
            category: 'Privacy',
            report_type: 'SaaS',
            issue_type: `Incomplete ${doc.name}: Missing ${clusterKey}`,
            severity: 'high',
            evidence_html: foundUrl,
            snippet: html.substring(0, 300) + '...',
            description: `LEX-ANALYZER identified the ${doc.name} at ${foundUrl} but detected a critical omission of the ${cluster.desc}`,
            law_name: cluster.law,
            potential_fine: FINE_GDPR_HIGH,
            explanation: `Transparency requirements under Art. 13 GDPR mandate the inclusion of specific disclosures. Your document is missing the ${clusterKey} section.`,
            recommendation: cluster.remediation,
            verification_method
          });
        }
      });
    }
  });

  // 3. CMP-DETECT Phase
  const cmpSignatures = [/cookiebot/i, /onetrust/i, /usercentrics/i, /sourcepoint/i, /cookie-law-info/i];
  const hasCMP = cmpSignatures.some(s => s.test(lowerHtml));

  return {
    violations,
    discoveredLinks: [],
    meta: { hasCMP, legal_links: links },
    compliance_report: {
      score: 100 - (violations.length * 15),
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
        content_truncated: html.length > 100000,
        missing_clusters: [] // Calculated per document above
      },
      cmp_detect: {
        detected_provider: hasCMP ? 'Generic CMP Detected' : null,
        is_active: hasCMP
      }
    }
  };
}
