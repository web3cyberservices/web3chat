
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware для управления путями и защиты API.
 */
export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  
  // В Cloud Workstations поддомены через заголовки host могут работать нестабильно в dev-режиме.
  // Мы оставляем логику защиты API, но упрощаем логику поддоменов для предпросмотра.

  // 1. Защита API админки
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
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|logo.png|audit-scope.txt|bot-policy.txt).*)',
  ],
};
