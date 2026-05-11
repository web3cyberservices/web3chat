
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for path management and API protection.
 * Updated to ensure /api/admin/report-pdf is strictly public for audit users.
 */
export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  
  // 1. Admin API Protection
  // We explicitly permit /api/admin/report-pdf so public users can download their results.
  // All other /api/admin/* routes require 'admin_authenticated' cookie.
  const isReportPdf = url.pathname === '/api/admin/report-pdf';
  const isAdminPath = url.pathname.startsWith('/api/admin');
  
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
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|logo.png|audit-scope.txt|bot-policy.txt).*)',
  ],
};
