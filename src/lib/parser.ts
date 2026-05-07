
import * as cheerio from 'cheerio';
import { Violation, Category, Severity } from '@/types';

/**
 * Расчет потенциального штрафа на основе категории и контекста нарушения.
 */
function calculatePenalty(category: Category, issueType: string): string {
  switch (category) {
    case 'ADA':
      return "$4,000+ (Statutory damages per incident)";
    case 'GDPR':
      return "Up to €20M or 4% of global turnover";
    case 'Privacy':
      return "Up to $7,500 per violation (CCPA/CPRA)";
    default:
      return "Variable based on jurisdiction";
  }
}

/**
 * Эвристическая проверка: нужен ли запуск браузера (Deep Scan).
 */
export function shouldRunDeepScan(html: string): boolean {
  const indicators = [
    'react.js', 'vue.js', '_next/static', 'gtm.js', 'fbevents.js', 
    'adsbygoogle', 'intercom', 'crisp.chat', 'drift.com', 'zendesk.com',
    'cookie-law', 'cookie-banner', 'onetrust', 'didomi', 'checkout'
  ];
  const lowerHtml = html.toLowerCase();
  return indicators.some(indicator => lowerHtml.includes(indicator.toLowerCase()));
}

/**
 * Основной экспертный парсер для глубокого аудита.
 */
export function parseHtmlContent(html: string, url: string, headers: any = {}): { violations: Violation[], discoveredLinks: string[] } {
  const $ = cheerio.load(html);
  const violations: Violation[] = [];
  const discoveredLinks: string[] = [];
  const lowerHtml = html.toLowerCase();

  // Извлечение ссылок для обхода
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      try {
        const absoluteUrl = new URL(href, url).href;
        if (absoluteUrl.startsWith('http')) {
           discoveredLinks.push(absoluteUrl);
        }
      } catch (e) {}
    }
  });

  // --- ADA Compliance ---
  $('img:not([alt])').each((_, el) => {
    const snippet = $.html(el);
    violations.push({
      category: 'ADA',
      issue_type: 'MISSING_ALT_TEXT',
      severity: 'medium',
      evidence_html: snippet,
      description: 'Image missing descriptive alt text.',
      explanation: 'The image is inaccessible to screen readers, violating WCAG 2.1 and ADA Section 508. This is a common trigger for civil litigation in NY and CA.',
      fine_amount: calculatePenalty('ADA', 'MISSING_ALT_TEXT'),
      recommendation: 'Add a descriptive alt="..." attribute to the <img> tag.'
    });
  });

  // --- GDPR & Privacy ---
  $('input[type="checkbox"][checked]').each((_, el) => {
    violations.push({
      category: 'GDPR',
      issue_type: 'PREFILLED_CONSENT',
      severity: 'high',
      evidence_html: $.html(el),
      description: 'Detected pre-filled consent checkbox.',
      explanation: 'Under GDPR Art. 4(11), consent must be a clear affirmative action. Pre-checked boxes do not constitute valid voluntary consent.',
      fine_amount: calculatePenalty('GDPR', 'PREFILLED_CONSENT'),
      recommendation: 'Remove the "checked" attribute. Consent must be opt-in, not opt-out.'
    });
  });

  if (url.startsWith('http://')) {
    violations.push({
      category: 'GDPR',
      issue_type: 'UNSECURE_DATA_TRANSMISSION',
      severity: 'critical',
      evidence_html: 'Protocol: HTTP',
      description: 'Data transmission over unencrypted HTTP.',
      explanation: 'Failure to use TLS encryption violates GDPR Art. 32 requirements for data processing security.',
      fine_amount: calculatePenalty('GDPR', 'UNSECURE_DATA_TRANSMISSION'),
      recommendation: 'Install an SSL certificate and enforce HTTPS redirects.'
    });
  }

  if (lowerHtml.includes('fonts.googleapis.com')) {
    violations.push({
      category: 'GDPR',
      issue_type: 'EXTERNAL_IP_LEAK_FONTS',
      severity: 'medium',
      evidence_html: 'Google Fonts external link detected',
      description: 'Potential PII leak via Google Fonts.',
      explanation: 'Loading fonts directly from Google servers transmits the user\'s IP address (PII) to a third party without a legal basis, as established by EU court rulings.',
      fine_amount: calculatePenalty('GDPR', 'EXTERNAL_IP_LEAK_FONTS'),
      recommendation: 'Self-host fonts on your own infrastructure.'
    });
  }

  return { 
    violations, 
    discoveredLinks: Array.from(new Set(discoveredLinks)).slice(0, 10) 
  };
}
