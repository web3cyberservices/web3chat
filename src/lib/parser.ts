
import * as cheerio from 'cheerio';
import { Violation, ReportType } from '@/types';

const LEGAL_KEYWORDS: Record<string, string[]> = {
  privacy: ['privacy', 'datenschutz', 'confidentialite', 'privacidad', 'confidenzialita', 'politika privatnosti', 'privacy policy'],
  cookies: ['cookie', 'cookies', 'galletas', 'biscotti', 'cookie policy'],
  terms: ['terms', 'tos', 'conditions', 'bedingungen', 'condiciones', 'termini', 'terms of service'],
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
  contacts: ['contact', 'email', 'address', 'controller', 'dpo', 'datenschutzbeauftragter'],
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

function getLawContext(domain: string) {
  const d = domain.toLowerCase();
  if (d.endsWith('.de')) return { law: 'BITV 2.0 / GDPR / TMG', fine: 'до €50,000 / 4% оборота' };
  if (d.endsWith('.fr')) return { law: 'RGAA / GDPR / LIL', fine: 'до €20 млн / 4% оборота' };
  return { law: 'EU GDPR / ePrivacy', fine: 'до €20 млн или 4% оборота' };
}

export function parseHtmlContent(html: string, url: string, headers: any = {}, screenshot?: string): { violations: Violation[], discoveredLinks: string[] } {
  const $ = cheerio.load(html);
  const violations: Violation[] = [];
  const discoveredLinks: string[] = [];
  const currentUrl = new URL(url);
  const domain = currentUrl.hostname.toLowerCase();
  const lawContext = getLawContext(domain);
  
  const pageTitle = $('title').text() || $('h1').first().text();
  const bodyText = $('body').text().toLowerCase();
  const siteLang = $('html').attr('lang')?.toLowerCase()?.split('-')[0] || detectLanguage(bodyText);

  // 1. Link Discovery (Deep Crawl)
  $('a[href]').each((_, el) => {
    try {
      const href = $(el).attr('href');
      if (!href || href.startsWith('javascript:') || href.startsWith('mailto:')) return;
      const absoluteUrl = new URL(href, url);
      if (absoluteUrl.hostname === domain) discoveredLinks.push(absoluteUrl.href);
    } catch (e) {}
  });

  // 2. Manual/Technical Checks (Manual Report)
  if (!url.startsWith('https:')) {
    violations.push({
      category: 'Security',
      report_type: 'Manual',
      issue_type: 'Отсутствие HTTPS',
      severity: 'critical',
      evidence_html: url,
      description: 'Site is running over unencrypted HTTP.',
      law_name: 'GDPR Art. 32',
      potential_fine: lawContext.fine,
      explanation: 'Отсутствие шифрования ставит под угрозу данные пользователей.',
      recommendation: 'Настройте SSL и редирект на HTTPS.'
    });
  }

  // 3. Document Discovery & SaaS Content Audit
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

  // Missing Documents (SaaS Report)
  const mandatoryDocs = ['privacy', 'cookies', 'terms'];
  mandatoryDocs.forEach(doc => {
    if (!docsFound[doc]) {
      violations.push({
        category: 'Legal_Content',
        report_type: 'SaaS',
        issue_type: `Документ отсутствует: ${doc.toUpperCase()}`,
        severity: 'critical',
        evidence_html: url,
        description: `Mandatory ${doc} document not found on the website.`,
        law_name: 'GDPR Art. 13',
        potential_fine: lawContext.fine,
        explanation: 'Отсутствие обязательной юридической информации является грубым нарушением прозрачности.',
        recommendation: `Создайте и опубликуйте документ ${doc}.`
      });
    }
  });

  // Content Audit of existing docs
  if (bodyText.includes('policy') || bodyText.includes('datenschutz') || bodyText.includes('privacy')) {
    // Language Check
    const docLang = detectLanguage(bodyText);
    if (docLang !== siteLang && bodyText.length > 500) {
      violations.push({
        category: 'Legal_Content',
        report_type: 'SaaS',
        issue_type: 'Нет локального языка',
        severity: 'medium',
        evidence_html: url,
        description: `Policy is in ${docLang} but site is in ${siteLang}.`,
        law_name: 'GDPR Art. 12 (Transparency)',
        potential_fine: 'до €20 млн',
        explanation: 'Юридические документы должны быть понятны пользователю на его языке.',
        recommendation: 'Переведите юридические документы на язык интерфейса сайта.'
      });
    }

    // Completeness (SaaS Report)
    const missingBlocks = [];
    if (!CONTENT_MARKERS.data_categories.some(m => bodyText.includes(m))) missingBlocks.push('Категории данных');
    if (!CONTENT_MARKERS.retention.some(m => bodyText.includes(m))) missingBlocks.push('Сроки хранения');
    if (!CONTENT_MARKERS.rights.some(m => bodyText.includes(m))) missingBlocks.push('Права субъектов');
    if (!CONTENT_MARKERS.contacts.some(m => bodyText.includes(m))) missingBlocks.push('Контакты контроллера');

    if (missingBlocks.length > 0 && bodyText.length > 300) {
      violations.push({
        category: 'Legal_Content',
        report_type: 'SaaS',
        issue_type: 'Неполный документ',
        severity: 'high',
        evidence_html: screenshot ? `data:image/jpeg;base64,${screenshot}` : url,
        snippet: `Missing blocks: ${missingBlocks.join(', ')}`,
        description: 'Privacy document is missing mandatory GDPR clauses.',
        law_name: 'GDPR Art. 13/14',
        potential_fine: lawContext.fine,
        explanation: 'В документе отсутствуют критически важные сведения о правах или сроках хранения.',
        recommendation: 'Добавьте недостающие разделы в текст документа.'
      });
    }

    // Recency Check
    const dateRegex = /(?:last updated|stand|updated|fecha|дата):?\s*(\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{4}|\w+\s\d{1,2},?\s\d{4})/gi;
    const dateMatch = dateRegex.exec(bodyText);
    if (dateMatch) {
      try {
        const updateDate = new Date(dateMatch[1]);
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        if (updateDate < oneYearAgo) {
          violations.push({
            category: 'Legal_Content',
            report_type: 'SaaS',
            issue_type: 'Устаревший документ',
            severity: 'medium',
            evidence_html: url,
            description: 'Document has not been updated for over 12 months.',
            law_name: 'GDPR Art. 5 (Transparency)',
            potential_fine: 'до €20 млн',
            explanation: 'Документы должны отражать актуальные процессы обработки данных.',
            recommendation: 'Проведите ежегодный аудит и обновите дату документа.'
          });
        }
      } catch (e) {}
    }
  }

  // Internal Broken Link Check (Manual Report)
  $('a').each((_, el) => {
    const href = $(el).attr('href');
    if (href && href.startsWith('#')) return; // ignore anchors
    // Note: Actual 404 check happens in the crawler task, 
    // here we just gather candidates for manual review if needed.
  });

  return { violations, discoveredLinks: Array.from(new Set(discoveredLinks)).slice(0, 50) };
}
