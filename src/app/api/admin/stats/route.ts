
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auditedRes = await pool.query("SELECT COUNT(*) FROM public.scan_queue WHERE status IN ('completed', 'done')");
    const violationsRes = await pool.query("SELECT SUM(violations_count) as total FROM public.scan_queue");
    const managersRes = await pool.query("SELECT COUNT(DISTINCT manager_name) FROM public.scan_queue WHERE assigned_to IS NOT NULL");

    return NextResponse.json({
      pagesScanned: parseInt(auditedRes.rows[0].count) || 0,
      issuesFound: parseInt(violationsRes.rows[0].total) || 0,
      activeManagers: parseInt(managersRes.rows[0].count) || 0
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
