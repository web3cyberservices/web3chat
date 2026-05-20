'use server';

import { pool, getManagersStats } from '@/lib/db';
import { getSession } from './auth-actions';
import { revalidatePath } from 'next/cache';

/**
 * @fileOverview CRM Server Actions - Sales Qualified Leads Logic
 */

export async function takeTaskInWork(taskId: number) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const checkRes = await client.query(
      'SELECT crm_status, assigned_to FROM public.scan_queue WHERE id = $1 FOR UPDATE',
      [taskId]
    );

    if (checkRes.rows.length === 0) throw new Error("Task not found");

    const task = checkRes.rows[0];
    if (task.crm_status === 'in_progress' || task.assigned_to !== null) {
      return { success: false, error: "Task already assigned" };
    }

    await client.query(
      `UPDATE public.scan_queue 
       SET crm_status = 'in_progress', 
           status = 'in_progress', 
           assigned_to = $1, 
           manager_name = $2, 
           assigned_at = NOW() 
       WHERE id = $3`,
      [session.id, session.email, taskId]
    );

    await client.query('COMMIT');
    revalidatePath('/manager');
    return { success: true };
  } catch (error: any) {
    await client.query('ROLLBACK');
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

export async function updateTaskStatusAction(taskId: number, status: string, closingPrice?: number) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  try {
    if (status === 'won') {
        if (!closingPrice || closingPrice <= 0) return { success: false, error: "Closing price is required for won deals." };
        await pool.query(
            'UPDATE public.scan_queue SET status = \'completed\', crm_status = \'won\', closing_price = $1 WHERE id = $2',
            [closingPrice, taskId]
        );
    } else {
        const crmStatus = (status === 'lost') ? 'lost' : 'in_progress';
        await pool.query(
            'UPDATE public.scan_queue SET status = $1, crm_status = $2 WHERE id = $3',
            [status, crmStatus, taskId]
        );
    }

    revalidatePath('/manager');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getManagerStatsAction() {
  const session = await getSession();
  if (!session) return [];
  return await getManagersStats();
}

export async function getAvailableTasks() {
  const session = await getSession();
  if (!session) return [];

  const res = await pool.query(`
    SELECT * FROM public.scan_queue 
    WHERE crm_status = 'ready_for_sales' 
      AND (assigned_to IS NULL OR assigned_to = 0)
    ORDER BY priority DESC, created_at DESC
  `);
  return res.rows;
}

export async function getMyTasks() {
  const session = await getSession();
  if (!session) return [];

  const res = await pool.query(
    'SELECT * FROM public.scan_queue WHERE assigned_to = $1 ORDER BY assigned_at DESC',
    [session.id]
  );
  return res.rows;
}
