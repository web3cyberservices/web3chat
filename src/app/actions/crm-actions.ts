
'use server';

import { pool } from '@/lib/db';
import { cookies } from 'next/headers';
import { z } from 'zod';

const AssignTaskSchema = z.object({
  taskId: z.string(),
  managerId: z.string(),
  managerEmail: z.string().email(),
});

async function verifySession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('admin_authenticated')?.value;
  
  if (sessionCookie !== 'true') {
    throw new Error('Unauthorized: No active management session');
  }
  return true;
}

export async function assignTaskToManager(formData: FormData) {
  await verifySession();

  const taskId = parseInt(formData.get('taskId') as string);
  const managerId = formData.get('managerId') as string;
  const managerEmail = formData.get('managerEmail') as string;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Atomic check and update using SQL
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
    return { success: true };
  } catch (error: any) {
    await client.query('ROLLBACK');
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

export async function getManagerTasks(managerId: string) {
  await verifySession();
  
  const res = await pool.query(
    'SELECT * FROM public.scan_queue WHERE assigned_to = $1 ORDER BY assigned_at DESC',
    [managerId]
  );
  return res.rows;
}

export async function getAvailableTasks() {
  await verifySession();

  const res = await pool.query(
    "SELECT * FROM public.scan_queue WHERE assigned_to IS NULL AND status IN ('completed', 'failed') ORDER BY created_at DESC"
  );
  return res.rows;
}
