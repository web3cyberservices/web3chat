
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  try {
    // Выбираем только необходимые колонки согласно запросу пользователя
    const res = await pool.query(`
      SELECT page_url, issue_type, severity, snippet, fine_amount, explanation 
      FROM site_violations 
      ORDER BY created_at DESC
    `);
    
    // Заголовки для CSV
    const headers = [
      "Violation Link", 
      "Type", 
      "Risk", 
      "Code Evidence", 
      "Potential Fine", 
      "Legal Explanation"
    ];

    // Формируем строки с экранированием кавычек для корректности формата CSV
    const rows = res.rows.map(r => [
      r.page_url,
      r.issue_type,
      r.severity,
      `"${(r.snippet || '').replace(/"/g, '""')}"`,
      r.fine_amount,
      `"${(r.explanation || '').replace(/"/g, '""')}"`
    ]);

    // Сборка контента
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=humango_audit_report_${new Date().toISOString().split('T')[0]}.csv`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error: any) {
    console.error('[Export API Error]', error);
    return NextResponse.json({ success: false, error: 'Failed to generate export' }, { status: 500 });
  }
}
