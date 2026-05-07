
import { NextResponse } from 'next/server';
import { getBotEvents } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const logs = await getBotEvents(50);
    return NextResponse.json({ success: true, logs }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch system logs' }, { status: 500 });
  }
}
