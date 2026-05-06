import * as cheerio from 'cheerio';
import { Violation, Category, Severity } from '@/types';

/**
 * Расширенный парсер для сбора доказательной базы нарушений.
 * Реализует проверки ADA, GDPR, Privacy и Security.
 */
export function parseHtmlContent(html: string, url: string, headers: any = {}): { violations: Violation[], discoveredLinks: string[] } {
  const $ = cheerio.load(html);
  const violations: Violation[] = [];
  const discoveredLinks: string[] = [];

  // 1. Сбор ссылок для Discovery
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

  // --- ADA Compliance Checks ---
  
  // img без alt
  $('img:not([alt])').each((_, el) => {
    violations.push({
      category: 'ADA',
      issue_type: 'MISSING_ALT_TEXT',
      severity: 'medium',
      evidence_html: $.html(el),
      description: 'Изображение не имеет атрибута alt, что делает его недоступным для программ чтения экрана.'
    });
  });

  // a/button без текста или label
  $('a, button').each((_, el) => {
    const text = $(el).text().trim();
    const ariaLabel = $(el).attr('aria-label');
    if (!text && !ariaLabel) {
      violations.push({
        category: 'ADA',
        issue_type: 'EMPTY_INTERACTIVE_ELEMENT',
        severity: 'high',
        evidence_html: $.html(el),
        description: 'Интерактивный элемент не имеет текстового описания или aria-label.'
      });
    }
  });

  // html без lang
  if (!$('html').attr('lang')) {
    violations.push({
      category: 'ADA',
      issue_type: 'MISSING_HTML_LANG',
      severity: 'low',
      evidence_html: '<html>',
      description: 'Корневой тег <html> не содержит атрибут lang, необходимый для синтезаторов речи.'
    });
  }

  // --- GDPR Compliance Checks ---

  // Внешние Google Fonts
  $('link[href*="fonts.googleapis.com"]').each((_, el) => {
    violations.push({
      category: 'GDPR',
      issue_type: 'EXTERNAL_GOOGLE_FONTS',
      severity: 'medium',
      evidence_html: $.html(el),
      description: 'Использование внешних Google Fonts передает IP-адрес пользователя в Google без согласия.'
    });
  });

  // Формы на HTTP
  $('form').each((_, el) => {
    const action = $(el).attr('action') || '';
    if (action.startsWith('http://') || (!action.startsWith('https://') && url.startsWith('http://'))) {
      violations.push({
        category: 'GDPR',
        issue_type: 'UNSECURE_FORM_SUBMISSION',
        severity: 'critical',
        evidence_html: $.html(el),
        description: 'Форма отправляет данные через незащищенное HTTP соединение.'
      });
    }
  });

  // Пиксели (FB, TikTok, GA) без Cookie Consent
  const trackingScript = $('script').filter((_, el) => {
    const src = $(el).attr('src') || '';
    const content = $(el).html() || '';
    return /facebook\.net|tiktok\.com|googletagmanager\.com|analytics\.js/.test(src + content);
  });

  const hasConsent = $('.cookie-consent, #cookie-banner, [class*="cookie"], [id*="cookie"]').length > 0;
  
  if (trackingScript.length > 0 && !hasConsent) {
    violations.push({
      category: 'GDPR',
      issue_type: 'TRACKING_WITHOUT_CONSENT',
      severity: 'high',
      evidence_html: $.html(trackingScript.get(0)),
      description: 'Обнаружены трекеры при отсутствии видимых элементов согласия с Cookie Policy.'
    });
  }

  // --- Privacy Checks ---

  // Ссылка на Privacy Policy
  const privacyKeywords = /Privacy Policy|Политика конфиденциальности/i;
  const hasPrivacyLink = $('a').filter((_, el) => privacyKeywords.test($(el).text())).length > 0;
  
  if (!hasPrivacyLink) {
    violations.push({
      category: 'Privacy',
      issue_type: 'MISSING_PRIVACY_POLICY',
      severity: 'high',
      evidence_html: '<footer>',
      description: 'В футере или меню не найдена ссылка на Политику конфиденциальности.'
    });
  }

  // --- Security Checks ---

  // Отсутствие CSP в мета-тегах
  const hasCSPMeta = $('meta[http-equiv="Content-Security-Policy"]').length > 0;
  const hasCSPHeader = headers['content-security-policy'];

  if (!hasCSPMeta && !hasCSPHeader) {
    violations.push({
      category: 'Security',
      issue_type: 'MISSING_CSP',
      severity: 'medium',
      evidence_html: '<head>',
      description: 'На сайте не настроена Content Security Policy (ни в мета-тегах, ни в заголовках).'
    });
  }

  // Отсутствие HSTS или X-Frame-Options (проверка по заголовкам)
  if (!headers['strict-transport-security']) {
    violations.push({
      category: 'Security',
      issue_type: 'MISSING_HSTS',
      severity: 'medium',
      evidence_html: 'HTTP Headers',
      description: 'Заголовок Strict-Transport-Security (HSTS) не обнаружен.'
    });
  }

  return { 
    violations, 
    discoveredLinks: Array.from(new Set(discoveredLinks)).slice(0, 10) 
  };
}
