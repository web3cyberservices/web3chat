
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * @fileOverview Middleware для мульти-доменной маршрутизации.
 * Безопасно обрабатывает поддомены, не блокируя локальную разработку и статику.
 */

export function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') || '';
  const url = req.nextUrl.clone();
  const { pathname } = url;

  // Исключаем внутренние запросы Next.js и статику из обработки
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Логика для поддомена конструктора (только для внешних хостов)
  if (hostname.startsWith('build.')) {
    if (pathname === '/') {
      url.pathname = '/builder';
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Обрабатываем все пути, кроме статических файлов и API
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js).*)',
  ],
};
