
import * as cheerio from 'cheerio';
import { Violation, ReportType } from '@/types';

const LEGAL_KEYWORDS: Record<string, string[]> = {
  privacy: ['privacy', 'datenschutz', 'confidentialite', 'privacidad', 'confidenzialita', 'politika privatnosti', 'privacy policy'],
  cookies: ['cookie', 'cookies', 'galletas', 'biscotti', 'cookie policy'],
  terms: ['terms', 'tos', 'conditions', 'bedingungen', 'condiciones', 'termini', 'terms of service', 'agb', 'allgemeine geschäftsbedingungen'],
  impressum: ['impressum', 'legal notice', 'mentions legales', 'aviso legal', 'note legali'],
  legal_notice: ['legal notice', 'mentions legales', 'rechtliche hinweise'],
  consumer_rights: ['consumer rights', 'verbraucherrechte', 'droits des consommateurs', 'derechos del consumidor'],
  accessibility: ['accessibility', 'barrierefreiheit', 'accessibilite', 'accesibilidad', 'accessibilita']
};

const CONTENT_MARKERS = {
  data_categories: ['ip address', 'cookies', 'email', 'name', 'phone', 'address', 'location', 'personbezogene daten'],
  purposes: ['analytics', 'marketing', 'security', 'service', 'provision', 'optimization', 'zwecke'],
  retention: ['retention', 'storage', 'duration', 'deletion', 'period', 'aufbewahrung'],
  rights: ['right to access', 'erasure', 'portability', 'rectification', 'objection', 'withdraw consent', 'betroffenenrechte'],
  contacts: ['contact', 'email', 'address', 'controller', 'dpo', 'datenschutzbeachter'],
  laws: ['gdpr', 'dsgvo', 'rgpd', 'uk gdpr', 'data protection act']
};

const LANG_MARKERS: Record<string, string[]> = {
  de: ['der', 'die', 'das', 'und', 'ist'],
  fr: ['le', 'la', 'les', 'et', 'est'],
  es: ['el', 'la', 'los', 'y', 'es'],
  it: ['il', 'la', 'le', 'e', 'è'],
  en: ['the', 'and', 'is', 'for', 'that']
};

function detectLanguage(text: string): string {
  const lowerText = text.toLowerCase();
  let bestLang = 'en';
  let maxCount = 0;

  for (const [lang, markers] of Object.entries(LANG_MARKERS)) {
    const count = markers.reduce((acc, m) => acc + (lowerText.split(` ${m} `).length - 1), 0);
    if (count > maxCount) {
      maxCount = count;
      bestLang = lang;
    }
  }
  return bestLang;
}

function getLegalDetail(docType: string, domain: string) {
  const isDE = domain.endsWith('.de');
  const details: Record<string, any> = {
    privacy: {
      law: 'GDPR Art. 13 / 14',
      risk: 'Risk: Failure to provide transparent data processing information violates Art. 12 GDPR. Supervisory authorities can impose fines up to €20 million or 4% of global turnover.',
      fine: 'Up to €20m / 4% turnover',
      recommendation: 'Create a dedicated Privacy Policy page and link it clearly in the footer.'
    },
    terms: {
      law: isDE ? '§ 305 BGB (Germany)' : 'Consumer Rights Directive / GDPR',
      risk: isDE 
        ? 'Risk: Under § 305 BGB, customers must have a reasonable opportunity to view Terms (AGB) before a contract is formed. Missing AGB can lead to "Abmahnungen" (legal warnings) and invalid contract terms.'
        : 'Risk: Missing Terms of Service leaves the business unprotected regarding liability and usage rights, and violates transparency requirements for e-commerce.',
      fine: isDE ? 'Legal warnings (€1,000+) + court costs' : 'Up to €10m / 2% turnover',
      recommendation: 'Link your Terms & Conditions (AGB) in the global footer or during the checkout flow.'
    },
    impressum: {
      law: isDE ? '§ 5 TMG (Telemediengesetz)' : 'e-Commerce Directive Art. 5',
      risk: isDE
        ? 'Risk: § 5 TMG requires every commercial website to provide an "easily recognizable, directly accessible, and permanently available" imprint. Missing it is a high-risk violation frequently targeted by competitors.'
        : 'Risk: Professional entities must provide clear identification and contact details to ensure legal transparency in the EU.',
      fine: isDE ? 'Up to €50,000 + legal warnings' : 'Varies by EU state',
      recommendation: 'Create an Imprint/Impressum page with your full legal name, physical address, and official contact email.'
    },
    cookies: {
      law: 'ePrivacy Directive / GDPR Art. 7',
      risk: 'Risk: Storing trackers without a clear Cookie Policy violates the consent requirements of the ePrivacy Directive. This is a primary target for DPA audits.',
      fine: 'Up to €20m',
      recommendation: 'Deploy a Cookie Policy explaining each tracker and its specific purpose.'
    }
  };

  return details[docType] || details['privacy'];
}

export function shouldRunDeepScan(html: string): boolean {
  const lowerHtml = html.toLowerCase();
  const dynamicMarkers = ['fbq(', 'gtag(', 'analytics.js', 'googletagmanager', 'cookiebot', 'onetrust', 'cookie-consent'];
  return dynamicMarkers.some(m => lowerHtml.includes(m));
}

export function parseHtmlContent(html: string, url: string, headers: any = {}, screenshot?: string): { violations: Violation[], discoveredLinks: string[] } {
  const $ = cheerio.load(html);
  const violations: Violation[] = [];
  const discoveredLinks: string[] = [];
  const currentUrl = new URL(url);
  const domain = currentUrl.hostname.toLowerCase();
  
  const bodyText = $('body').text().toLowerCase();
  const siteLang = $('html').attr('lang')?.toLowerCase()?.split('-')[0] || detectLanguage(bodyText);

  // 1. Link Discovery
  $('a[href]').each((_, el) => {
    try {
      const href = $(el).attr('href');
      if (!href || href.startsWith('javascript:') || href.startsWith('mailto:')) return;
      const absoluteUrl = new URL(href, url);
      if (absoluteUrl.hostname === domain) discoveredLinks.push(absoluteUrl.href);
    } catch (e) {}
  });

  // 2. Technical Checks
  if (!url.startsWith('https:')) {
    const detail = getLegalDetail('security', domain);
    violations.push({
      category: 'Security',
      report_type: 'Manual',
      issue_type: 'Missing HTTPS Encryption',
      severity: 'critical',
      evidence_html: url,
      description: 'Violation: Site is running over unencrypted HTTP. Where: Root domain protocol check.',
      law_name: 'GDPR Art. 32 (Security of Processing)',
      potential_fine: 'Up to €20m',
      explanation: 'Risk: Lack of encryption endangers user data and is a direct violation of Art. 32 GDPR, which mandates technical measures to protect personal data.',
      recommendation: 'Install an SSL certificate and force redirect all traffic to HTTPS.'
    });
  }

  // 3. Document Discovery
  const docsFound: Record<string, string | null> = {};
  for (const key of Object.keys(LEGAL_KEYWORDS)) docsFound[key] = null;

  $('a').each((_, el) => {
    const text = $(el).text().toLowerCase();
    const href = $(el).attr('href')?.toLowerCase() || '';
    for (const [key, keywords] of Object.entries(LEGAL_KEYWORDS)) {
      if (keywords.some(k => text.includes(k) || href.includes(k))) {
        docsFound[key] = new URL(href, url).href;
      }
    }
  });

  // Mandatory Document Check
  const mandatory = ['privacy', 'terms', 'cookies'];
  if (domain.endsWith('.de') || domain.endsWith('.at')) mandatory.push('impressum');

  mandatory.forEach(doc => {
    if (!docsFound[doc]) {
      const detail = getLegalDetail(doc, domain);
      violations.push({
        category: 'Legal_Content',
        report_type: 'SaaS',
        issue_type: `Missing Document: ${doc.toUpperCase()}`,
        severity: 'critical',
        evidence_html: url,
        description: `Violation: Missing mandatory link to ${doc.toUpperCase()}. Where: No text matching keywords [${LEGAL_KEYWORDS[doc].join(', ')}] found in site navigation or footer.`,
        law_name: detail.law,
        potential_fine: detail.fine,
        explanation: detail.risk,
        recommendation: detail.recommendation
      });
    }
  });

  // 4. Content Audit of existing docs
  if (bodyText.includes('policy') || bodyText.includes('datenschutz') || bodyText.includes('privacy') || bodyText.includes('terms')) {
    const docLang = detectLanguage(bodyText);
    if (docLang !== siteLang && bodyText.length > 500) {
      violations.push({
        category: 'Legal_Content',
        report_type: 'SaaS',
        issue_type: 'Language Mismatch',
        severity: 'medium',
        evidence_html: url,
        description: `Violation: Legal document is in ${docLang.toUpperCase()} while the main site is in ${siteLang.toUpperCase()}. Where: Automatic language detection of body text.`,
        law_name: 'GDPR Art. 12 (Transparency)',
        potential_fine: 'Up to €20m',
        explanation: 'Risk: Art. 12 GDPR requires information to be provided in an "intelligible and easily accessible form, using clear and plain language." Forcing users to read a policy in a foreign language is a transparency failure.',
        recommendation: 'Translate your legal documents into all languages supported by your website interface.'
      });
    }

    // Completeness check
    const missingBlocks = [];
    if (!CONTENT_MARKERS.data_categories.some(m => bodyText.includes(m))) missingBlocks.push('Data Categories (IP, Cookies)');
    if (!CONTENT_MARKERS.retention.some(m => bodyText.includes(m))) missingBlocks.push('Retention/Storage Periods');
    if (!CONTENT_MARKERS.rights.some(m => bodyText.includes(m))) missingBlocks.push('User Rights (Access, Deletion)');

    if (missingBlocks.length > 0 && bodyText.length > 300) {
      violations.push({
        category: 'Legal_Content',
        report_type: 'SaaS',
        issue_type: 'Incomplete Clauses',
        severity: 'high',
        evidence_html: screenshot ? `data:image/jpeg;base64,${screenshot}` : url,
        snippet: `Missing key blocks: ${missingBlocks.join(', ')}`,
        description: `Violation: Legal document is missing mandatory GDPR disclosure blocks. Where: Scanned text for keywords related to [${missingBlocks.join(', ')}].`,
        law_name: 'GDPR Art. 13/14',
        potential_fine: 'Up to €20m / 4% turnover',
        explanation: 'Risk: Omitting required information like retention periods or specific data categories is a primary cause for GDPR fines under the transparency principle.',
        recommendation: 'Update your legal document to include specific sections for data categories, storage durations, and data subject rights.'
      });
    }
  }

  return { violations, discoveredLinks: Array.from(new Set(discoveredLinks)).slice(0, 50) };
}
