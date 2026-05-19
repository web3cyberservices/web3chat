
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // 1. Domains Audited (sites with status 'completed' or 'done')
    const auditedRes = await pool.query(
      "SELECT COUNT(*) FROM public.scan_queue WHERE status IN ('completed', 'done', 'failed')"
    );
    
    // 2. Total Violations (sum of violations_count in scan_queue)
    const violationsRes = await pool.query(
      "SELECT SUM(violations_count) as total FROM public.scan_queue"
    );

    // 3. Active Managers (count unique manager names)
    const managersRes = await pool.query(
      "SELECT COUNT(DISTINCT manager_name) FROM public.scan_queue WHERE assigned_to IS NOT NULL"
    );

    return NextResponse.json({
      pagesScanned: parseInt(auditedRes.rows[0].count) || 0,
      issuesFound: parseInt(violationsRes.rows[0].total) || 0,
      activeManagers: parseInt(managersRes.rows[0].count) || 0,
      recentIssues: []
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error: any) {
    console.error('[Stats API Error]', error.message);
    return NextResponse.json({ error: 'Internal system error' }, { status: 500 });
  }
}
