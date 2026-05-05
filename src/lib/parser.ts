
import * as cheerio from 'cheerio';
import { ScanIssue } from '@/types';

/**
 * Логика обработки HTML. 
 * Сфокусирована на поиске технических уязвимостей без сбора PII.
 */
export function parseHtmlContent(html: string, url: string): ScanIssue[] {
  const $ = cheerio.load(html);
  const issues: ScanIssue[] = [];

  // 1. Проверка на формы без SSL (GDPR Critical)
  $('form').each((_, el) => {
    const action = $(el).attr('action') || '';
    if (!action.startsWith('https') && !url.startsWith('https:')) {
      issues.push({
        type: 'UNSECURE_DATA_TRANSMISSION',
        category: 'GDPR',
        severity: 'critical',
        description: 'Форма передачи данных обнаружена на незащищенном HTTP соединении.',
        impact: 'Высокий риск перехвата данных (MITM) и штрафов GDPR.',
        remediation: 'Переведите сайт на HTTPS и используйте защищенные экшены для форм.'
      });
    }
  });

  // 2. Проверка заголовков безопасности через мета-теги
  const hasCSP = $('meta[http-equiv="Content-Security-Policy"]').length > 0;
  if (!hasCSP) {
    issues.push({
      type: 'MISSING_CSP',
      category: 'Security',
      severity: 'medium',
      description: 'Отсутствует Content Security Policy (CSP).',
      impact: 'Уязвимость для XSS атак и инъекций вредоносного кода.',
      remediation: 'Настройте заголовок Content-Security-Policy на стороне сервера или через мета-теги.'
    });
  }

  // 3. Поиск потенциально опасных устаревших скриптов
  $('script').each((_, el) => {
    const src = $(el).attr('src') || '';
    if (src.includes('jquery/1.') || src.includes('vulnerable')) {
      issues.push({
        type: 'OUTDATED_LIBRARY',
        category: 'Security',
        severity: 'high',
        description: 'Обнаружена потенциально уязвимая версия библиотеки.',
        impact: 'Злоумышленники могут использовать известные эксплойты для компрометации сайта.',
        remediation: 'Обновите библиотеки до последних стабильных версий.'
      });
    }
  });

  return issues;
}
