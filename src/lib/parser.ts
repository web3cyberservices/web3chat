
import * as cheerio from 'cheerio';
import { Violation, Category, Severity } from '@/types';

/**
 * Эвристическая проверка: нужно ли запускать Deep Scan (браузер)
 */
export function shouldRunDeepScan(html: string): boolean {
  const indicators = [
    'react.js', 'vue.js', '_next/static', 'gtm.js', 'fbevents.js', 
    'adsbygoogle', 'intercom', 'cookie-law', 'cookie-banner', 
    'cookie-consent', 'trustarc', 'onetrust', 'didomi'
  ];
  const lowerHtml = html.toLowerCase();
  return indicators.some(indicator => lowerHtml.includes(indicator.toLowerCase()));
}

export function parseHtmlContent(html: string, url: string, headers: any = {}): { violations: Violation[], discoveredLinks: string[] } {
  const $ = cheerio.load(html);
  const violations: Violation[] = [];
  const discoveredLinks: string[] = [];

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      try {
        const absoluteUrl = new URL(href, url).href;
        if (absoluteUrl.startsWith('http')) discoveredLinks.push(absoluteUrl);
      } catch (e) {}
    }
  });

  // ADA
  $('img:not([alt])').each((_, el) => {
    violations.push({
      category: 'ADA',
      issue_type: 'MISSING_ALT_TEXT',
      severity: 'medium',
      evidence_html: $.html(el),
      description: 'Image missing alt attribute.'
    });
  });

  $('a, button').each((_, el) => {
    const text = $(el).text().trim();
    const ariaLabel = $(el).attr('aria-label');
    if (!text && !ariaLabel) {
      violations.push({
        category: 'ADA',
        issue_type: 'EMPTY_INTERACTIVE_ELEMENT',
        severity: 'high',
        evidence_html: $.html(el),
        description: 'Interactive element has no text or aria-label.'
      });
    }
  });

  if (!$('html').attr('lang')) {
    violations.push({
      category: 'ADA',
      issue_type: 'MISSING_HTML_LANG',
      severity: 'low',
      evidence_html: '<html>',
      description: 'Root html tag missing lang attribute.'
    });
  }

  // GDPR
  $('link[href*="fonts.googleapis.com"]').each((_, el) => {
    violations.push({
      category: 'GDPR',
      issue_type: 'EXTERNAL_GOOGLE_FONTS',
      severity: 'medium',
      evidence_html: $.html(el),
      description: 'External Google Fonts usage transmits user IP to Google without consent.'
    });
  });

  $('form').each((_, el) => {
    const action = $(el).attr('action') || '';
    if (action.startsWith('http://') || (!action.startsWith('https://') && url.startsWith('http://'))) {
      violations.push({
        category: 'GDPR',
        issue_type: 'UNSECURE_FORM_SUBMISSION',
        severity: 'critical',
        evidence_html: $.html(el),
        description: 'Form submits data over unsecure HTTP.'
      });
    }
  });

  // Security
  const hasCSP = $('meta[http-equiv="Content-Security-Policy"]').length > 0 || headers['content-security-policy'];
  if (!hasCSP) {
    violations.push({
      category: 'Security',
      issue_type: 'MISSING_CSP',
      severity: 'medium',
      evidence_html: '<head>',
      description: 'No Content Security Policy detected.'
    });
  }

  return { violations, discoveredLinks: Array.from(new Set(discoveredLinks)).slice(0, 10) };
}
