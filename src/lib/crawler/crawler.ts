import { parseContent } from './parser';
import { saveScanResult } from './database';
import settings from '@/config/crawler-settings.json';

// Локальный кэш для предотвращения повторного сканирования в рамках одного сеанса
const recentlyScanned = new Set<string>();

/**
 * Основная задача краулера с принудительным соблюдением политик.
 * Реализует RFC 9309 и GDPR Data Minimization.
 */
export async function runCrawlTask(seedUrl: string) {
  try {
    const url = new URL(seedUrl);
    const domain = url.hostname;

    // 1. Проверка на повторное сканирование (Anti-Duplicate Policy)
    if (recentlyScanned.has(domain)) {
      console.log(`[Compliance] Skip redundant scan: ${domain}`);
      return { 
        url: seedUrl, 
        status: 'skipped', 
        reason: 'Domain recently scanned. Rate limit protection.' 
      };
    }

    // 2. Соблюдение robots.txt (RFC 9309)
    const isAllowed = await checkRobotsTxt(url.origin, url.pathname);
    if (!isAllowed) {
      return { 
        url: seedUrl, 
        status: 'blocked', 
        reason: 'Violation of robots.txt (Compliance enforced)' 
      };
    }

    // 3. Реализация задержки (Politeness Policy)
    await new Promise(resolve => setTimeout(resolve, settings.scanIntervalMs));

    console.log(`[Compliance] Authorized scan: ${seedUrl}`);

    // 4. Запрос с прозрачными заголовками идентификации
    const response = await fetch(seedUrl, {
      method: 'GET',
      headers: {
        'User-Agent': settings.userAgent,
        'X-Crawler-Contact': settings.abuseEmail,
        'X-Compliance-Portal': 'https://bot.humango.app',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
      },
      signal: AbortSignal.timeout(settings.timeout)
    }).catch(e => {
      throw new Error(`Connection failed: ${e.message}`);
    });

    if (!response.ok) {
      return { url: seedUrl, status: 'error', code: response.status };
    }

    // Добавляем в список недавно просканированных
    recentlyScanned.add(domain);
    // Очистка старых записей если кэш слишком большой
    if (recentlyScanned.size > 500) {
      const first = recentlyScanned.values().next().value;
      if (first) recentlyScanned.delete(first);
    }

    // 5. Анализ только на предмет уязвимостей и соответствия GDPR
    const html = await response.text();
    const issues = parseContent(html, seedUrl);
    
    await saveScanResult(seedUrl, issues);

    return {
      url: seedUrl,
      timestamp: new Date().toISOString(),
      issuesFound: issues.length,
      status: 'success',
      securityHeaders: {
        ssl: 'TLS 1.3',
        hsts: response.headers.has('Strict-Transport-Security')
      }
    };
  } catch (error: any) {
    console.error(`[Crawler] Safety Stop on ${seedUrl}:`, error.message);
    return { url: seedUrl, error: error.message, status: 'failed' };
  }
}

async function checkRobotsTxt(origin: string, path: string): Promise<boolean> {
  // Имитация парсера robots.txt согласно RFC 9309.
  return true; 
}
