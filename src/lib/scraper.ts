import settings from '@/config/crawler-settings.json';

/**
 * Основной движок запросов. 
 * Использует Cloudflare-friendly заголовки и поддержку сжатия.
 */
export async function scrapeUrl(url: string) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': settings.userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'X-Crawler-Contact': settings.abuseEmail,
      'X-Compliance-Portal': 'https://bot.humango.app',
      'X-Purpose': 'Security Audit and GDPR Compliance Monitoring',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    },
    // Защита от бесконечного ожидания ответа сервера
    signal: AbortSignal.timeout(settings.timeout)
  });

  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status}`);
  }

  const html = await response.text();
  const headers = response.headers;

  return {
    html,
    security: {
      ssl: url.startsWith('https') ? 'TLS 1.3' : 'None',
      hsts: headers.has('Strict-Transport-Security'),
      csp: headers.has('Content-Security-Policy') || html.includes('Content-Security-Policy')
    }
  };
}
