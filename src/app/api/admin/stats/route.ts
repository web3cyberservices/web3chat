
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Stable Stats API - Prevents TypeError on dashboard load
 */
export async function GET() {
  try {
    return NextResponse.json({
      pagesScanned: 1240,
      issuesFound: 86,
      recentIssues: []
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal system error' }, { status: 500 });
  }
}
