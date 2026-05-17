
'use server';

import { runCrawlTask } from './crawler';
import { 
  getBotStatus, 
  getNextQueueItem, 
  updateQueueStatus, 
  saveBotEvent, 
  testConnection,
  pool
} from '@/lib/db';
import settings from '@/config/crawler-settings.json';
import { isUrlAllowed } from '@/config/robots-rules';
import { logger } from '../logger';
import * as nodemailer from 'nodemailer';
import { generatePdfReport } from '../report-generator';

const IDLE_WAIT = 15000;    

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function handleAuditDelivery(domain: string, userEmail: string) {
  try {
    logger.info(`[Worker] Starting PDF generation for ${domain}...`);
    const pdfBuffer = await generatePdfReport(domain);
    
    if (!pdfBuffer) {
      throw new Error("PDF generator returned null buffer");
    }

    if (userEmail && userEmail.trim() !== '') {
      logger.info(`[Worker] Sending PDF report to: ${userEmail}`);
      await transporter.sendMail({
        from: '"Humango Compliance" <abuse@humango.app>',
        to: userEmail,
        subject: `Statutory Compliance Audit Report for ${domain}`,
        text: `Hello,\n\nYour automated statutory compliance audit for ${domain} is complete. Please find your detailed PDF diagnostic report attached to this email.\n\nBest regards,\nHumango Limited`,
        attachments: [
          {
            filename: `Humango_Audit_${domain}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      });
      logger.info(`[Worker] Email sent successfully to ${userEmail}`);
    }
    return true;
  } catch (error: any) {
    logger.error(`[Worker Delivery Error] ${domain}: ${error.message}`);
    return false;
  }
}

async function runWorker(workerId: number) {
  logger.info(`[Worker ${workerId}] Priority Engine Active.`);
  
  while (true) {
    let currentTaskId: number | null = null;
    let currentDomain: string = 'unknown';

    try {
      const active = await getBotStatus();
      if (!active) {
        await sleep(5000);
        continue;
      }

      const task = await getNextQueueItem();
      if (!task) {
        await sleep(IDLE_WAIT); 
        continue;
      }

      currentTaskId = task.id;
      const urlStr = task.url;
      const userEmail = task.user_email;
      
      try {
        const url = new URL(urlStr);
        currentDomain = url.hostname.toLowerCase();
      } catch (e: any) {
        await updateQueueStatus(task.id, 'failed');
        continue;
      }
      
      const robotsCheck = await isUrlAllowed(urlStr);
      if (!robotsCheck.allowed) {
        await updateQueueStatus(task.id, 'failed');
        continue;
      }

      logger.info(`[Worker ${workerId}] Auditing: ${currentDomain}`);
      await saveBotEvent('START', `Compliance Scan [Worker ${workerId}]: ${currentDomain}`);
      
      const result = await runCrawlTask(task.url);
      
      if (result.status === 'success') {
        const deliverySuccess = await handleAuditDelivery(currentDomain, userEmail);
        
        if (deliverySuccess) {
          await updateQueueStatus(task.id, 'completed');
          await saveBotEvent('SUCCESS', `Audit completed and sent for ${currentDomain}`);
        } else {
          // Even if email fails, the audit is technically done, but for user feedback we might mark failed if it's a priority task
          await updateQueueStatus(task.id, 'failed');
          await saveBotEvent('ERROR', `Audit completed but delivery failed for ${currentDomain}`);
        }
      } else {
        await updateQueueStatus(task.id, 'failed');
        await saveBotEvent('ERROR', `Crawl failed for ${currentDomain}: ${result.reason}`);
      }

    } catch (error: any) {
      logger.error(`[Worker ${workerId}] Engine Loop Error: ${error.message}`);
      if (currentTaskId) {
        await updateQueueStatus(currentTaskId, 'failed').catch(() => {});
      }
      await sleep(10000);
    }
    await sleep(1000);
  }
}

export async function startEngine() {
  try {
    await testConnection();
    await saveBotEvent('SUCCESS', `Engine started with ${settings.maxConcurrency} workers.`);
  } catch (err: any) {
    logger.error(`FATAL: Database unreachable: ${err.message}`);
    return;
  }

  const concurrency = settings.maxConcurrency || 1;
  const workers = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(runWorker(i + 1));
  }
  await Promise.all(workers);
}
