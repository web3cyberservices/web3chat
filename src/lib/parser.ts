
import * as cheerio from 'cheerio';
import { Violation, Category, Severity } from '@/types';

/**
 * Эвристическая проверка: нужен ли запуск браузера (Deep Scan).
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

/**
 * Основной парсер HTML для технического и комплаенс аудита.
 */
export function parseHtmlContent(html: string, url: string, headers: any = {}): { violations: Violation[], discoveredLinks: string[] } {
  const $ = cheerio.load(html);
  const violations: Violation[] = [];
  const discoveredLinks: string[] = [];

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

  // --- ADA Compliance Audit ---
  
  // 1. Изображения без атрибута ALT
  $('img:not([alt])').each((_, el) => {
    violations.push({
      category: 'ADA',
      issue_type: 'MISSING_ALT_TEXT',
      severity: 'medium',
      evidence_html: $.html(el),
      description: 'Элемент изображения не имеет атрибута alt. Программы чтения с экрана не смогут описать это изображение пользователю.'
    });
  });

  // 2. Пустые интерактивные элементы (ссылки и кнопки без текста)
  $('a, button').each((_, el) => {
    const text = $(el).text().trim();
    const ariaLabel = $(el).attr('aria-label');
    if (!text && !ariaLabel) {
      violations.push({
        category: 'ADA',
        issue_type: 'EMPTY_INTERACTIVE_ELEMENT',
        severity: 'high',
        evidence_html: $.html(el),
        description: 'Интерактивный элемент (ссылка или кнопка) не содержит текста или атрибута aria-label.'
      });
    }
  });

  // 3. Отсутствие языка документа
  if (!$('html').attr('lang')) {
    violations.push({
      category: 'ADA',
      issue_type: 'MISSING_HTML_LANG',
      severity: 'low',
      evidence_html: '<html ...>',
      description: 'Корневой элемент HTML не имеет атрибута lang, что затрудняет работу синтезаторов речи.'
    });
  }

  // --- GDPR & Privacy Audit ---

  // 4. Внешние Google Fonts (утечка IP без согласия)
  $('link[href*="fonts.googleapis.com"]').each((_, el) => {
    violations.push({
      category: 'GDPR',
      issue_type: 'EXTERNAL_GOOGLE_FONTS',
      severity: 'medium',
      evidence_html: $.html(el),
      description: 'Загрузка шрифтов Google напрямую с их серверов передает IP-адреса пользователей без их явного согласия.'
    });
  });

  // 5. Наличие трекеров (Facebook Pixel, TikTok) при отсутствии Cookie-баннера
  const trackers = [
    { name: 'Facebook Pixel', pattern: 'connect.facebook.net' },
    { name: 'TikTok Pixel', pattern: 'analytics.tiktok.com' }
  ];

  const hasCookieBanner = html.toLowerCase().includes('cookie') && 
    (html.toLowerCase().includes('consent') || html.toLowerCase().includes('accept') || html.toLowerCase().includes('banner'));

  if (!hasCookieBanner) {
    trackers.forEach(tracker => {
      if (html.includes(tracker.pattern)) {
        violations.push({
          category: 'GDPR',
          issue_type: `UNAUTHORIZED_${tracker.name.toUpperCase().replace(' ', '_')}`,
          severity: 'high',
          evidence_html: `Script pattern: ${tracker.pattern}`,
          description: `Обнаружен трекер ${tracker.name} на сайте без видимых механизмов управления согласием (Cookie Consent Banner).`
        });
      }
    });
  }

  // 6. Незащищенные формы (передача данных по HTTP)
  $('form').each((_, el) => {
    const action = $(el).attr('action') || '';
    const isUnsecure = action.startsWith('http://') || (!action.startsWith('https://') && url.startsWith('http://'));
    if (isUnsecure) {
      violations.push({
        category: 'GDPR',
        issue_type: 'UNSECURE_FORM_SUBMISSION',
        severity: 'critical',
        evidence_html: $.html(el),
        description: 'Форма отправляет данные по незащищенному протоколу HTTP. Это критическое нарушение GDPR.'
      });
    }
  });

  // 7. Поиск ссылки на Политику Конфиденциальности
  const hasPrivacyLink = $('a').toArray().some(a => {
    const text = $(a).text().toLowerCase();
    const href = $(a).attr('href')?.toLowerCase() || '';
    return text.includes('privacy') || text.includes('policy') || text.includes('политика') || href.includes('privacy');
  });

  if (!hasPrivacyLink) {
    violations.push({
      category: 'Privacy',
      issue_type: 'MISSING_PRIVACY_POLICY',
      severity: 'high',
      evidence_html: 'Footer/Main links',
      description: 'На сайте не обнаружена ссылка на Политику конфиденциальности.'
    });
  }

  // --- Security Audit ---

  // 8. Отсутствие CSP (Content Security Policy)
  const hasCSP = $('meta[http-equiv="Content-Security-Policy"]').length > 0 || headers['content-security-policy'];
  if (!hasCSP) {
    violations.push({
      category: 'Security',
      issue_type: 'MISSING_CSP',
      severity: 'medium',
      evidence_html: '<head> Headers',
      description: 'Отсутствует политика безопасности контента (CSP). Это повышает риск атак типа XSS.'
    });
  }

  return { 
    violations, 
    discoveredLinks: Array.from(new Set(discoveredLinks)).slice(0, 10) 
  };
}
