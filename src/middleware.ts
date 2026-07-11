
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * @fileOverview Middleware для мульти-доменной маршрутизации.
 * Безопасно обрабатывает поддомены build.* и chat.*
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

  // Маршрутизация для поддомена конструктора
  if (hostname.startsWith('build.')) {
    if (pathname === '/') {
      url.pathname = '/builder';
      return NextResponse.rewrite(url);
    }
  }

  // Маршрутизация для поддомена чата
  if (hostname.startsWith('chat.')) {
    if (pathname === '/') {
      url.pathname = '/chat';
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js).*)',
  ],
};
