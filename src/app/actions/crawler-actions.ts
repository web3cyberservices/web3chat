
'use server';

import { queueTask, getTaskStatus, normalizeUrl } from '@/lib/db';
import { z } from 'zod';

const StartScanSchema = z.object({
  url: z.string().min(3),
  email: z.string().email()
});

/**
 * Isolated server action for starting the crawl.
 */
export async function startCrawlAction(rawUrl: string, rawEmail: string) {
  const validation = StartScanSchema.safeParse({ url: rawUrl, email: rawEmail });
  if (!validation.success) {
    return { status: 'failed', reason: 'Invalid target domain or email address.' };
  }

  let { url, email } = validation.data;
  const cleanUrl = normalizeUrl(url);
  
  try {
    const queuedUrl = await queueTask(cleanUrl, email, 10);
    return { 
      status: 'success', 
      url: queuedUrl,
      message: 'Audit added to priority queue. Processing...' 
    };
  } catch (e: any) {
    console.error('[Action Error] startCrawlAction failed:', e.message);
    return { status: 'failed', reason: 'Internal system error while queuing audit.' };
  }
}

export async function checkAuditStatus(url: string) {
  try {
    const status = await getTaskStatus(url);
    return { success: true, status: status?.status || 'unknown' };
  } catch (e) {
    return { success: false };
  }
}
