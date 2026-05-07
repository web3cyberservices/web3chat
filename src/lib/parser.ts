
import * as cheerio from 'cheerio';
import { Violation, Category, Severity } from '@/types';

/**
 * Эвристическая проверка: нужен ли запуск браузера (Deep Scan).
 * Ищем признаки динамических систем, ИИ-ботов и трекеров.
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
 * Основной экспертный парсер для глубокого аудита по реестру из 40 пунктов.
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

  // --- А. Сбор данных и согласия (Consent) ---
  
  // 3. Предзаполненные чекбоксы (Soft opt-in запрещен)
  $('input[type="checkbox"][checked]').each((_, el) => {
    violations.push({
      category: 'GDPR',
      issue_type: 'PREFILLED_CONSENT',
      severity: 'high',
      evidence_html: $.html(el),
      description: 'Обнаружен предзаполненный чекбокс согласия.',
      recommendation: 'Удалите атрибут "checked". Пользователь должен дать согласие активным действием.'
    });
  });

  // 5. Отсутствие ссылки на Privacy Policy рядом с кнопками форм
  $('form').each((_, el) => {
    const formHtml = $(el).html()?.toLowerCase() || '';
    if (!formHtml.includes('privacy') && !formHtml.includes('policy') && !formHtml.includes('политика')) {
      violations.push({
        category: 'GDPR',
        issue_type: 'FORM_WITHOUT_PRIVACY_LINK',
        severity: 'medium',
        evidence_html: $.html(el).substring(0, 300),
        description: 'Форма сбора данных не содержит прямой ссылки на Политику конфиденциальности.',
        recommendation: 'Разместите текст "Я согласен с Политикой конфиденциальности" со ссылкой непосредственно над кнопкой отправки.'
      });
    }
  });

  // 6. Сбор через HTTP
  if (url.startsWith('http://')) {
    violations.push({
      category: 'GDPR',
      issue_type: 'UNSECURE_DATA_TRANSMISSION',
      severity: 'critical',
      evidence_html: 'Current URL: ' + url,
      description: 'Сайт работает по незащищенному протоколу HTTP.',
      recommendation: 'Немедленно установите SSL-сертификат. Сбор данных без шифрования — грубое нарушение GDPR.'
    });
  }

  // --- Б. Прозрачность и документы (Transparency) ---

  const hasPrivacy = lowerHtml.includes('privacy policy') || lowerHtml.includes('политика конфиденциальности');
  if (!hasPrivacy) {
    violations.push({
      category: 'Privacy',
      issue_type: 'MISSING_PRIVACY_POLICY',
      severity: 'high',
      evidence_html: 'Full Page Audit',
      description: 'Страница или ссылка на Privacy Policy не найдена.',
      recommendation: 'Создайте страницу Политики конфиденциальности и разместите ссылку в футере.'
    });
  }

  const hasCookiePolicy = lowerHtml.includes('cookie policy') || lowerHtml.includes('политика использования куки');
  if (lowerHtml.includes('cookie') && !hasCookiePolicy) {
     violations.push({
      category: 'Privacy',
      issue_type: 'MISSING_COOKIE_POLICY',
      severity: 'medium',
      evidence_html: 'Cookie Keyword Detection',
      description: 'Используются куки, но отдельная политика или раздел Cookie Policy не найден.',
      recommendation: 'Выделите правила использования файлов cookie в отдельный документ или четкий раздел в основной политике.'
    });
  }

  // --- В. Инструменты ИИ и автоматизация (AI & Profiling) ---

  const aiIndicators = ['intercom', 'crisp', 'drift', 'chatbot', 'chat-bot', 'чат-бот'];
  if (aiIndicators.some(ind => lowerHtml.includes(ind))) {
    violations.push({
      category: 'AI',
      issue_type: 'AI_CHAT_TRANSPARENCY',
      severity: 'medium',
      evidence_html: 'Chatbot Script Detection',
      description: 'Обнаружен чат-бот, но уведомление о сборе истории переписки не выявлено.',
      recommendation: 'Добавьте в окно чата уведомление: "Используя чат, вы соглашаетесь на обработку переписки согласно Политике".'
    });
  }

  // --- Г. Интернет-магазины и транзакции ---

  if (url.includes('checkout') || url.includes('cart') || url.includes('корзина')) {
    if (lowerHtml.includes('register') || lowerHtml.includes('регистрация')) {
      violations.push({
        category: 'Transactional',
        issue_type: 'FORCED_REGISTRATION',
        severity: 'low',
        evidence_html: 'Checkout Context',
        description: 'Принудительная регистрация при покупке может нарушать принцип минимизации данных.',
        recommendation: 'Разрешите "Покупку в 1 клик" или "Гостевой заказ" без создания аккаунта.'
      });
    }
  }

  // --- Д. Технические ошибки ---

  // 35. Google Fonts / Gravatar
  if (lowerHtml.includes('fonts.googleapis.com') || lowerHtml.includes('gravatar.com')) {
    violations.push({
      category: 'Security',
      issue_type: 'EXTERNAL_IP_LEAK',
      severity: 'medium',
      evidence_html: 'External Asset Detection',
      description: 'Использование внешних шрифтов или аватаров передает IP пользователя в Google/Automattic без согласия.',
      recommendation: 'Хостите шрифты локально. Это предотвратит несанкционированную передачу метаданных третьим лицам.'
    });
  }

  // --- Е. Специфические риски (HR и Образование) ---
  if (lowerHtml.includes('hr') || lowerHtml.includes('vacancy') || lowerHtml.includes('вакансия') || lowerHtml.includes('resume')) {
    violations.push({
      category: 'HR_Edu',
      issue_type: 'RECRUITMENT_DATA_RISK',
      severity: 'medium',
      evidence_html: 'Recruitment Context',
      description: 'Обнаружен раздел рекрутинга. Необходимы четкие сроки удаления резюме.',
      recommendation: 'Укажите в Политике, что резюме отклоненных кандидатов хранятся не более 6 месяцев.'
    });
  }

  // --- ADA Compliance ---
  $('img:not([alt])').each((_, el) => {
    violations.push({
      category: 'ADA',
      issue_type: 'MISSING_ALT_TEXT',
      severity: 'medium',
      evidence_html: $.html(el),
      description: 'Изображение без описания (alt).',
      recommendation: 'Добавьте атрибут alt для поддержки программ экранного доступа.'
    });
  });

  return { 
    violations, 
    discoveredLinks: Array.from(new Set(discoveredLinks)).slice(0, 10) 
  };
}
