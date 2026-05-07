
import * as cheerio from 'cheerio';
import { Violation, Category } from '@/types';

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

// Константы для Auto-Discovery
const EU_TLDS = ['.de', '.fr', '.it', '.es', '.pl', '.nl', '.be', '.at', '.dk', '.fi', '.se', '.ie', '.pt', '.cz', '.gr', '.hu', '.ro', '.sk', '.bg', '.ee', '.lv', '.lt', '.hr', '.si', '.mt', '.cy'];
const SOCIAL_NETWORKS = ['facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'linkedin.com', 'youtube.com', 'tiktok.com', 'pinterest.com'];
const TECH_GIANTS = ['google.', 'wikipedia.org', 'amazon.', 'microsoft.', 'apple.', 'yahoo.', 'bing.', 'baidu.'];

/**
 * Основной экспертный парсер для глубокого аудита и Auto-Discovery.
 */
export function parseHtmlContent(html: string, url: string, headers: any = {}): { violations: Violation[], discoveredLinks: string[] } {
  const $ = cheerio.load(html);
  const violations: Violation[] = [];
  const discoveredLinks: string[] = [];
  
  const currentUrl = new URL(url);
  const currentHostname = currentUrl.hostname.toLowerCase();

  // --- Auto-Discovery Logic ---
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;

    try {
      const absoluteUrl = new URL(href, url);
      const hostname = absoluteUrl.hostname.toLowerCase();
      
      // Только HTTP/HTTPS
      if (!absoluteUrl.protocol.startsWith('http')) return;

      // Проверка на гигантов
      if (TECH_GIANTS.some(giant => hostname.includes(giant))) return;

      // Проверка на соцсети
      if (SOCIAL_NETWORKS.some(social => hostname.includes(social))) return;

      // Фокус только на EU TLDs
      const isEu = EU_TLDS.some(tld => hostname.endsWith(tld));
      
      // Добавляем только если это внешний домен из ЕС
      if (isEu && hostname !== currentHostname) {
        discoveredLinks.push(absoluteUrl.href);
      }
    } catch (e) {}
  });

  // --- ADA Compliance Audit ---
  $('img:not([alt])').each((_, el) => {
    const snippet = $.html(el);
    violations.push({
      category: 'ADA',
      issue_type: 'MISSING_ALT_TEXT',
      severity: 'medium',
      evidence_html: snippet,
      description: 'Image missing descriptive alt text.',
      explanation: 'Изображение недоступно для программ-чтецов экрана, что нарушает раздел 508 закона ADA. Это распространенная причина гражданских исков.',
      fine_amount: calculatePenalty('ADA', 'MISSING_ALT_TEXT'),
      recommendation: 'Add a descriptive alt="..." attribute to the <img> tag.'
    });
  });

  // --- GDPR & Privacy Audit ---
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

  return { 
    violations, 
    discoveredLinks: Array.from(new Set(discoveredLinks)).slice(0, 50) // Лимит ссылок с одной страницы
  };
}
