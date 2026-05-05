
import { RobotsRule } from '@/types';

/**
 * Список правил и логика проверки robots.txt.
 * Сопоставление со стандартами безопасности RFC 9309.
 */
const DEFAULT_RULES: RobotsRule = {
  userAgent: 'HumangoBot',
  allow: ['/'],
  disallow: ['/admin', '/private', '/config', '/api/internal'],
  crawlDelay: 1.5
};

export async function isUrlAllowed(urlStr: string): Promise<{allowed: boolean, reason?: string}> {
  try {
    const url = new URL(urlStr);
    
    // Имитация проверки robots.txt
    // В реальной системе здесь был бы fetch(origin + "/robots.txt")
    const isDisallowed = DEFAULT_RULES.disallow.some(path => url.pathname.startsWith(path));
    
    if (isDisallowed) {
      return { 
        allowed: false, 
        reason: 'Путь находится в списке Disallow (RFC 9309 compliance)' 
      };
    }

    return { allowed: true };
  } catch (e) {
    return { allowed: false, reason: 'Invalid URL structure' };
  }
}

export function getCrawlDelay(): number {
  return DEFAULT_RULES.crawlDelay || 1.5;
}
