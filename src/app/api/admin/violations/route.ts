import { NextResponse } from 'next/server';
import { getViolations } from '@/lib/db';

export async function GET() {
  try {
    const violations = await getViolations();
    return NextResponse.json({ success: true, violations });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch violations' }, { status: 500 });
  }
}