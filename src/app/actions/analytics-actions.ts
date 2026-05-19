'use server';

import { pool } from '@/lib/db';
import { getSession } from './auth-actions';
import { revalidatePath } from 'next/cache';

/**
 * @fileOverview Analytics Actions - Data Enrichment (Needs Analyst -> Ready for Sales)
 */

export async function getTasksForReview() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const res = await pool.query(`
    SELECT * FROM public.scan_queue 
    WHERE crm_status = 'needs_analyst' 
    ORDER BY priority DESC, created_at DESC
  `);
  return res.rows;
}

export async function updateAndReleaseTask(taskId: number, emails: any[], phones: any[], notes: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  try {
    await pool.query(
      `UPDATE public.scan_queue 
       SET extracted_emails = $1, 
           extracted_phones = $2, 
           analyst_notes = $3,
           crm_status = 'ready_for_sales',
           manager_name = 'Verified by Analyst'
       WHERE id = $4`,
      [JSON.stringify(emails), JSON.stringify(phones), notes, taskId]
    );

    revalidatePath('/analytics');
    revalidatePath('/manager');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteTaskAction(taskId: number) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  await pool.query('DELETE FROM public.scan_queue WHERE id = $1', [taskId]);
  revalidatePath('/analytics');
  return { success: true };
}