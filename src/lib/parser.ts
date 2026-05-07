
import * as cheerio from 'cheerio';
import { Violation, Category, Severity } from '@/types';

/**
 * Расчет потенциального штрафа на основе категории и контекста нарушения.
 */
function calculatePenalty(category: Category, issueType: string): string {
  switch (category) {
    case 'ADA':
      return "$4,000 - $25,000 (Statutory damages per NY/CA civil code)";
    case 'GDPR':
      return "До 4% годового оборота или €20 млн (ст. 83 GDPR)";
    case 'Privacy':
      if (issueType.includes('CCPA')) {
        return "До $7,500 за каждое умышленное нарушение (CCPA)";
      }
      return "До $2,500 - $7,500 за инцидент";
    default:
      return "Зависит от юрисдикции и масштаба утечки";
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

  // --- ADA Compliance (Accessibility) ---
  $('img:not([alt])').each((_, el) => {
    const snippet = $.html(el);
    violations.push({
      category: 'ADA',
      issue_type: 'MISSING_ALT_TEXT',
      severity: 'medium',
      evidence_html: snippet,
      description: 'Изображение без описания (alt-text).',
      explanation: 'Изображение недоступно для программ-экранного доступа (Screen Readers), что нарушает WCAG 2.1 и раздел 508 закона ADA. В штатах NY и CA это является основанием для гражданских исков.',
      potential_penalty: calculatePenalty('ADA', 'MISSING_ALT_TEXT'),
      recommendation: 'Добавьте атрибут alt="..." с кратким описанием смысла изображения.'
    });
  });

  // --- GDPR & Privacy ---
  
  // 3. Предзаполненные чекбоксы (Soft opt-in запрещен)
  $('input[type="checkbox"][checked]').each((_, el) => {
    violations.push({
      category: 'GDPR',
      issue_type: 'PREFILLED_CONSENT',
      severity: 'high',
      evidence_html: $.html(el),
      description: 'Обнаружен предзаполненный чекбокс согласия.',
      explanation: 'Согласно ст. 4(11) GDPR, согласие должно быть дано четким утвердительным действием. Предзаполненные поля не считаются добровольным согласием.',
      potential_penalty: calculatePenalty('GDPR', 'PREFILLED_CONSENT'),
      recommendation: 'Удалите атрибут "checked". Пользователь должен сам нажать на чекбокс.'
    });
  });

  // 6. Сбор через HTTP
  if (url.startsWith('http://')) {
    violations.push({
      category: 'GDPR',
      issue_type: 'UNSECURE_DATA_TRANSMISSION',
      severity: 'critical',
      evidence_html: 'Current Protocol: HTTP',
      description: 'Передача данных по незащищенному протоколу.',
      explanation: 'Отсутствие TLS-шифрования нарушает требование ст. 32 GDPR о безопасности обработки данных (Integrity and Confidentiality).',
      potential_penalty: calculatePenalty('GDPR', 'UNSECURE_DATA_TRANSMISSION'),
      recommendation: 'Установите SSL-сертификат и настройте редирект на HTTPS.'
    });
  }

  // Google Fonts IP Leak
  if (lowerHtml.includes('fonts.googleapis.com')) {
    violations.push({
      category: 'GDPR',
      issue_type: 'EXTERNAL_IP_LEAK_FONTS',
      severity: 'medium',
      evidence_html: 'Link to fonts.googleapis.com detected',
      description: 'Передача IP-адресов в Google через шрифты.',
      explanation: 'Загрузка шрифтов напрямую с серверов Google передает IP-адрес пользователя (персональные данные) третьей стороне без правового основания, что подтверждено решениями судов ЕС (например, LG München, 20.01.2022).',
      potential_penalty: calculatePenalty('GDPR', 'EXTERNAL_IP_LEAK_FONTS'),
      recommendation: 'Хостите шрифты локально на своем сервере.'
    });
  }

  return { 
    violations, 
    discoveredLinks: Array.from(new Set(discoveredLinks)).slice(0, 10) 
  };
}
