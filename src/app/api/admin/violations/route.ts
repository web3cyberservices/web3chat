
import { NextResponse } from 'next/server';
import { getViolations } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const violations = await getViolations(100);
    return NextResponse.json({ 
      success: true, 
      violations 
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch violations' }, { status: 500 });
  }
}
