
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Возвращаем стабильный мок-объект, чтобы предотвратить падение фронтенда
    return NextResponse.json({
      pagesScanned: 1240,
      issuesFound: 86,
      recentIssues: []
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error: any) {
    console.error('[Stats API Error]', error);
    return NextResponse.json({ error: 'Internal system error' }, { status: 500 });
  }
}
