
import { NextResponse } from 'next/server';
import { getViolations } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Получаем последние 100 записей через ORDER BY created_at DESC в DB функции
    const violations = await getViolations(100);
    return NextResponse.json({ 
      success: true, 
      violations,
      _timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('[API Violations Error]', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch violations' }, { status: 500 });
  }
}
