
import * as cheerio from 'cheerio';
import { Violation, ReportType, Category } from '@/types';

const LEGAL_KEYWORDS: Record<string, string[]> = {
  privacy: ['privacy', 'datenschutz', 'confidentialite', 'privacidad', 'confidenzialita', 'politika privatnosti', 'privacy policy'],
  cookies: ['cookie', 'cookies', 'galletas', 'biscotti', 'cookie policy'],
  terms: ['terms', 'tos', 'conditions', 'bedingungen', 'condiciones', 'termini', 'terms of service', 'agb', 'allgemeine geschäftsbedingungen'],
  impressum: ['impressum', 'legal notice', 'mentions legales', 'aviso legal', 'note legali'],
};

const CONTENT_MARKERS = {
  data_categories: ['ip address', 'cookies', 'email', 'name', 'phone', 'address', 'location', 'personbezogene daten'],
  retention: ['retention', 'storage', 'duration', 'deletion', 'period', 'aufbewahrung'],
  rights: ['right to access', 'erasure', 'portability', 'rectification', 'objection', 'withdraw consent', 'betroffenenrechte'],
  contacts: ['contact', 'email', 'address', 'controller', 'dpo', 'datenschutzbeachter'],
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
  const isDE = domain.endsWith('.de') || domain.endsWith('.at');
  const details: Record<string, any> = {
    privacy: {
      law: 'GDPR Art. 13 / 14',
      risk: 'Risk: Failure to provide transparent data processing information violates Art. 12 GDPR. Supervisory authorities can impose significant administrative fines.',
      fine: '€10,000 - €20,000,000 (Up to 4% turnover)',
      recommendation: 'Create a dedicated Privacy Policy page and link it clearly in the footer.'
    },
    terms: {
      law: isDE ? '§ 305 BGB (Germany)' : 'Consumer Rights Directive',
      risk: isDE 
        ? 'Risk: Under § 305 BGB, customers must have a reasonable opportunity to view Terms (AGB) before a contract is formed. Missing AGB leads to legal warnings and invalid contract terms.'
        : 'Risk: Missing Terms of Service leaves the business unprotected regarding liability and usage rights, violating transparency requirements for e-commerce.',
      fine: isDE ? '€1,500 - €50,000 (Legal warnings + court costs)' : '€5,000 - €10,000,000',
      recommendation: 'Link your Terms & Conditions (AGB) in the global footer or during the checkout flow.'
    },
    impressum: {
      law: isDE ? '§ 5 TMG (Telemediengesetz)' : 'e-Commerce Directive Art. 5',
      risk: isDE
        ? 'Risk: § 5 TMG requires every commercial website to provide an "easily recognizable, directly accessible, and permanently available" imprint. Missing it is a high-risk violation targeted by competitors.'
        : 'Risk: Professional entities must provide clear identification and contact details to ensure legal transparency in the EU.',
      fine: isDE ? '€500 - €50,000 (Per violation + legal warning costs)' : '€1,000 - €25,000',
      recommendation: 'Create an Imprint/Impressum page with your full legal name, physical address, and official contact email.'
    },
    cookies: {
      law: 'ePrivacy Directive / GDPR Art. 7',
      risk: 'Risk: Storing trackers without a clear Cookie Policy violates the consent requirements of the ePrivacy Directive. This is a primary target for DPA audits.',
      fine: '€5,000 - €20,000,000 (Varies by user reach)',
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

  // 1. Link Discovery for Crawling
  $('a[href]').each((_, el) => {
    try {
      const href = $(el).attr('href');
      if (!href || href.startsWith('javascript:') || href.startsWith('mailto:')) return;
      const absoluteUrl = new URL(href, url);
      if (absoluteUrl.hostname === domain) discoveredLinks.push(absoluteUrl.href);
    } catch (e) {}
  });

  // 2. Technical Checks (Manual Module)
  if (!url.startsWith('https:')) {
    violations.push({
      category: 'Security',
      report_type: 'Manual',
      issue_type: 'Missing HTTPS Encryption',
      severity: 'critical',
      evidence_html: url,
      description: 'The website is running over unencrypted HTTP protocol.',
      law_name: 'GDPR Art. 32 (Security of Processing)',
      potential_fine: '€2,500 - €20,000,000',
      explanation: 'Risk: Lack of encryption endangers user data and is a direct violation of Art. 32 GDPR, which mandates technical measures to protect personal data.',
      recommendation: 'Install an SSL certificate and force redirect all traffic to HTTPS.'
    });
  }

  // 3. Document Discovery (COSTERA Engine)
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
        description: `Costera engine proscanned the footer and did not detect a link to ${doc.toUpperCase()}. This is a transparency violation under ${detail.law}.`,
        law_name: detail.law,
        potential_fine: detail.fine,
        explanation: detail.risk,
        recommendation: detail.recommendation
      });
    }
  });

  // 4. Content Audit (XEVON Engine)
  if (bodyText.length > 500) {
    const docLang = detectLanguage(bodyText);
    if (docLang !== siteLang) {
      violations.push({
        category: 'Legal_Content',
        report_type: 'SaaS',
        issue_type: 'Language Mismatch',
        severity: 'medium',
        evidence_html: url,
        description: `Xevon engine analyzed the text. Link found, but the document is in ${docLang.toUpperCase()} while the site interface is in ${siteLang.toUpperCase()}.`,
        law_name: 'GDPR Art. 12 (Transparency)',
        potential_fine: '€2,500 - €250,000',
        explanation: 'Risk: Art. 12 GDPR requires information to be provided in an intelligible and easily accessible form for the target audience.',
        recommendation: 'Translate your legal documents into all languages supported by your website interface.'
      });
    }

    const missingBlocks = [];
    if (!CONTENT_MARKERS.data_categories.some(m => bodyText.includes(m))) missingBlocks.push('Data Categories');
    if (!CONTENT_MARKERS.retention.some(m => bodyText.includes(m))) missingBlocks.push('Retention Periods');
    if (!CONTENT_MARKERS.rights.some(m => bodyText.includes(m))) missingBlocks.push('User Rights');

    if (missingBlocks.length > 0) {
      violations.push({
        category: 'Legal_Content',
        report_type: 'SaaS',
        issue_type: 'Incomplete Legal Clauses',
        severity: 'high',
        evidence_html: screenshot ? `data:image/jpeg;base64,${screenshot}` : url,
        snippet: `Missing sections: ${missingBlocks.join(', ')}`,
        description: `Xevon engine analyzed the text. Document found, but mandatory sections (${missingBlocks.join(', ')}) are missing from the content.`,
        law_name: 'GDPR Art. 13/14',
        potential_fine: '€5,000 - €20,000,000',
        explanation: 'Risk: Omitting required information like retention periods or data subject rights is a primary cause for regulatory fines.',
        recommendation: 'Update the legal document to include specific sections for data categories and user rights.'
      });
    }
  }

  return { violations, discoveredLinks: Array.from(new Set(discoveredLinks)).slice(0, 50) };
}
