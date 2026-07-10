import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * @fileOverview Middleware для мульти-доменной маршрутизации.
 * build.web3cyberservices.xyz -> открывает конструктор (/builder)
 * chat.web3cyberservices.xyz -> открывает чат (/)
 */

export function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') || '';
  const url = req.nextUrl.clone();
  const { pathname } = url;

  // Логика для поддомена конструктора
  if (hostname.includes('build.web3cyberservices.xyz')) {
    // Если пользователь заходит на корень поддомена build, показываем конструктор
    if (pathname === '/') {
      url.pathname = '/builder';
      return NextResponse.rewrite(url);
    }
  }

  // Для остальных случаев (включая chat.*) отдаем стандартный маршрут
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Исключаем служебные пути и статику, чтобы не замедлять работу
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js).*)',
  ],
};