import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const url = req.nextUrl.clone();
  const { pathname } = url;

  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Очищаем hostname от порта для корректной работы в Firebase Studio
  const hostname = host.split(':')[0].toLowerCase();

  // Маршрутизация на основе ПОЛНОГО совпадения домена
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

  // Для всех остальных случаев (включая основной домен и локальные превью)
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js).*)',
  ],
};
