
'use server';

import { pool, getManagersStats, updateTaskStatus } from '@/lib/db';
import { getSession } from './auth-actions';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const AssignTaskSchema = z.object({
  taskId: z.string(),
});

export async function assignTaskToManager(formData: FormData) {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized: No active management session');
  }

  const taskId = parseInt(formData.get('taskId') as string);
  const managerId = session.id;
  const managerEmail = session.email;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Atomic lock
    const checkRes = await client.query(
      'SELECT assigned_to, status FROM public.scan_queue WHERE id = $1 FOR UPDATE',
      [taskId]
    );

    if (checkRes.rows.length === 0) {
      throw new Error('Задача не найдена');
    }

    const task = checkRes.rows[0];
    if (task.assigned_to) {
      throw new Error('Ошибка: Задача уже занята другим сотрудником');
    }

    await client.query(
      `UPDATE public.scan_queue 
       SET status = 'in_work', assigned_to = $1, manager_name = $2, assigned_at = NOW() 
       WHERE id = $3`,
      [managerId, managerEmail, taskId]
    );

    await client.query('COMMIT');
    revalidatePath('/manager');
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    await client.query('ROLLBACK');
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

export async function updateTaskStatusAction(taskId: number, status: 'in_work' | 'done') {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  try {
    // Verify ownership
    const check = await pool.query(
      'SELECT assigned_to FROM public.scan_queue WHERE id = $1',
      [taskId]
    );
    
    if (check.rows[0]?.assigned_to !== session.id) {
      throw new Error('Access denied: Task owned by another manager');
    }

    await updateTaskStatus(taskId, status);
    revalidatePath('/manager');
    revalidatePath('/admin');
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

export async function getManagerTasks() {
  const session = await getSession();
  if (!session) return [];
  
  const res = await pool.query(
    'SELECT * FROM public.scan_queue WHERE assigned_to = $1 ORDER BY assigned_at DESC',
    [session.id]
  );
  return res.rows;
}

export async function getAvailableTasks() {
  const session = await getSession();
  if (!session) return [];

  const res = await pool.query(
    "SELECT * FROM public.scan_queue WHERE assigned_to IS NULL AND status IN ('completed', 'failed') ORDER BY created_at DESC"
  );
  return res.rows;
}
