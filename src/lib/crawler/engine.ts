
'use server';

import { runCrawlTask } from './crawler';
import { 
  getBotStatus, 
  getNextQueueItem, 
  updateQueueStatus, 
  saveBotEvent, 
  testConnection
} from '@/lib/db';
import settings from '@/config/crawler-settings.json';
import { isUrlAllowed } from '@/config/robots-rules';
import { logger } from '../logger';
import * as nodemailer from 'nodemailer';
import { generatePdfReport } from '../report-generator';

const IDLE_WAIT = 15000;    

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.beget.com',
  port: parseInt(process.env.SMTP_PORT || '2525'), // UPDATED TO 2525
  secure: false, 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function handleAuditDelivery(domain: string, userEmail: string) {
  try {
    const pdfBuffer = await generatePdfReport(domain);
    if (!pdfBuffer) throw new Error("PDF failed");

    if (userEmail && userEmail.trim() !== '') {
      await transporter.sendMail({
        from: `"Humango Compliance" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject: `Audit Report: ${domain}`,
        text: `The statutory audit for ${domain} is complete. Attached is your PDF report.`,
        attachments: [{ filename: `Humango_Audit_${domain}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
      });
    }
    return true;
  } catch (error: any) {
    logger.error(`[Delivery Error] ${domain}: ${error.message}`);
    return false;
  }
}

async function runWorker(workerId: number) {
  while (true) {
    try {
      const active = await getBotStatus();
      if (!active) { await sleep(5000); continue; }

      const task = await getNextQueueItem();
      if (!task) { await sleep(IDLE_WAIT); continue; }

      const result = await runCrawlTask(task.url);
      if (result.status === 'success') {
        await handleAuditDelivery(new URL(task.url).hostname, task.user_email);
        await updateQueueStatus(task.id, 'completed');
      } else {
        await updateQueueStatus(task.id, 'failed');
      }
    } catch (error: any) {
      await sleep(10000);
    }
    await sleep(1000);
  }
}

export async function startEngine() {
  await testConnection();
  const concurrency = settings.maxConcurrency || 1;
  for (let i = 0; i < concurrency; i++) runWorker(i + 1);
}
