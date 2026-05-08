
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware для управления поддоменами и защиты API.
 * Поддерживает:
 * 1. bot.humango.app (основной домен)
 * 2. sfcc.humango.app (лендинг для e-commerce)
 */
export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // 1. Обработка поддомена SFCC
  // Если заходим через sfcc.humango.app, показываем страницу /sfcc как главную
  if (hostname.startsWith('sfcc.')) {
    // Если пользователь на корневом пути, перенаправляем на /sfcc
    if (url.pathname === '/') {
      return NextResponse.rewrite(new URL('/sfcc', request.url));
    }
  }

  // 2. Защита API админки (только для основного домена)
  if (url.pathname.startsWith('/api/admin')) {
    const isAdmin = request.cookies.get('admin_authenticated')?.value === 'true';
    
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized access' },
        { status: 401 }
      );
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files like logo.png)
     */
    '/((?!_next/static|_next/image|favicon.ico|logo.png|bot-policy.txt).*)',
  ],
};
