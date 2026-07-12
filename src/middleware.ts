import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const url = req.nextUrl.clone();
  const { pathname } = url;

  // Игнорируем статические файлы, API и ресурсы Next.js
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Очищаем hostname от порта для корректной работы в Firebase Studio/Cloud Workstations
  const hostname = host.split(':')[0].toLowerCase();

  // Маршрутизация на основе поддоменов
  if (hostname === 'build.web3cyberservices.xyz') {
    if (pathname === '/') {
      url.pathname = '/builder';
      return NextResponse.rewrite(url);
    }
  }

  if (hostname === 'chat.web3cyberservices.xyz') {
    if (pathname === '/') {
      url.pathname = '/chat';
      return NextResponse.rewrite(url);
    }
  }

  // По умолчанию для основного домена или локального окружения
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js).*)',
  ],
};
