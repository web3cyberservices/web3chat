
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';

/**
 * Middleware для защиты терминала и обработки путей.
 */
export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  
  // Разрешаем публичный доступ к PDF-отчетам
  const isReportPdf = url.pathname.startsWith('/api/admin/report-pdf');
  const isAdminPath = url.pathname.startsWith('/api/admin');
  
  // Проверка авторизации для админ-панели
  if (isAdminPath && !isReportPdf) {
    const isAdmin = request.cookies.get('admin_authenticated')?.value === 'true';
    
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized terminal access' },
        { status: 401 }
      );
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Исключаем все системные пути Next.js и статику из обработки middleware,
     * чтобы не вызывать 404 при загрузке чанков.
     */
    '/((?!_next/static|_next/image|favicon.ico|logo.png|audit-scope.txt|bot-policy.txt|robots.txt).*)',
  ],
};
