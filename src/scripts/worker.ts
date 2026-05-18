
import 'dotenv/config';
import { Pool } from 'pg';
import * as nodemailer from 'nodemailer';
import { chromium } from 'playwright';
import { generatePdfReport } from '../lib/report-generator';
import { saveAuditResults, saveBotEvent, testConnection, getBotStatus, getNextQueueItem, updateQueueStatus, normalizeUrl } from '../lib/db';
import settings from '../config/crawler-settings.json';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
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

async function executeDeterministicAudit(taskId: number, url: string, userEmail: string, workerId: number) {
  let browser;
  try {
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const context = await browser.newContext({ userAgent: settings.userAgent });
    const page = await context.newPage();

    let cleanUrl = url.trim().toLowerCase();
    if (!cleanUrl.startsWith('http')) cleanUrl = `https://${cleanUrl}`;
    const originUrl = new URL(cleanUrl).origin;
    const domain = new URL(cleanUrl).hostname;

    let finalFindings: any[] = [];
    let legalText = '';
    
    console.log(`[Worker ${workerId}] Starting Deterministic Scan: ${originUrl}`);
    await saveBotEvent('START', `Compliance Scan [Worker ${workerId}]: ${domain}`);

    // 1. Scan Homepage
    try {
      await page.goto(originUrl, { waitUntil: 'networkidle', timeout: 30000 });
    } catch (e) {
      console.log(`[Worker ${workerId}] Homepage unreachable, trying direct legal path...`);
    }

    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => ({
        href: (a as HTMLAnchorElement).href,
        text: a.textContent?.toLowerCase().trim() || ''
      }));
    });

    const legalKeywords = ['privacy', 'policy', 'legal', 'datenschutz', 'impressum', 'terms', 'confidentialite'];
    let foundTarget = links.find(link => 
      legalKeywords.some(keyword => link.href.includes(keyword) || link.text.includes(keyword))
    );

    // 2. Fallback check
    if (!foundTarget) {
      try {
        const fallbackUrl = normalizeUrl('/legal/privacy', originUrl);
        const testRes = await page.goto(fallbackUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        if (testRes && testRes.status() === 200) {
          legalText = await page.evaluate(() => document.body.innerText);
          console.log(`[Worker ${workerId}] Fallback success: ${fallbackUrl}`);
        }
      } catch (e) {}
    } else {
      try {
        await page.goto(foundTarget.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
        legalText = await page.evaluate(() => document.body.innerText);
      } catch (e) {}
    }

    // 3. Deterministic Audit (No AI)
    if (!legalText || legalText.trim().length < 250) {
      finalFindings.push({
        category: 'Privacy',
        report_type: 'SaaS',
        issue_type: 'MISSING CORE FRAMEWORK',
        severity: 'critical',
        evidence_html: originUrl,
        description: 'No statutory legal disclosure links or content (Privacy Policy/Impressum) were identified in the site architecture.',
        business_impact: 'Critical risk: Meta and Google advertising accounts may be suspended due to missing compliance signals.',
        law_name: 'Art. 12 & 13 GDPR',
        potential_fine: 'Up to €20,000,000 or 4% of global turnover.',
        explanation: 'The law requires a visible and accessible privacy policy on all commercial websites.',
        recommendation: 'ACTION: INSERT THIS HTML -> "<footer class=\\"legal-footer\\"><a href=\\"/privacy\\">Privacy Policy</a></footer>"',
        confidence_score: 1.0,
        verification_status: 'verified'
      });
    } else {
      const retentionRegex = /(storage|retention|store|keep|retain|hold|period|months|years|days|\d+\s*(month|year|day|месяц|год|лет|дня|продолжительно|conservation|durée|délai|conservación|almacenamiento|plazo))/i;
      if (!retentionRegex.test(legalText)) {
        finalFindings.push({
          category: 'Privacy',
          report_type: 'SaaS',
          issue_type: 'DATA_RETENTION_TIMEFRAMES',
          severity: 'high',
          evidence_html: originUrl,
          description: 'Your privacy policy fails to state specific data retention periods.',
          business_impact: 'High risk of regulatory fines and Art. 17 GDPR erasure lawsuits.',
          law_name: 'Art. 13(2)(a) GDPR',
          potential_fine: 'Up to €20,000,000 or 4% of global turnover.',
          explanation: 'Mandatory transparency requires informing users exactly how long their data will be stored.',
          recommendation: 'ACTION: INSERT THIS TEXT -> "Data Retention: We store your personal data for a period of 24 months from your last interaction or until account deletion is requested."',
          confidence_score: 1.0,
          verification_status: 'verified'
        });
      }
    }

    await saveAuditResults(domain, originUrl, finalFindings, 'basic');
    const pdfBuffer = await generatePdfReport(domain, finalFindings);

    if (userEmail && pdfBuffer) {
      await transporter.sendMail({
        from: `"Humango Compliance" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject: `Statutory Compliance Audit Report for ${domain}`,
        text: `Hello,\n\nYour automated statutory compliance audit for ${domain} is complete. Please find the detailed PDF report attached.\n\nBest regards,\nHumango Team`,
        attachments: [{ filename: `Humango_Audit_${domain}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
      });
    }

    await updateQueueStatus(taskId, 'completed');
    await saveBotEvent('SUCCESS', `Audit completed for ${domain}`);

  } catch (error: any) {
    console.error(`[Worker ${workerId}] Crash:`, error.message);
    await updateQueueStatus(taskId, 'failed');
    await saveBotEvent('ERROR', `Audit failed for ${url}: ${error.message}`);
  } finally {
    if (browser) await browser.close();
  }
}

async function runWorker(workerId: number) {
  while (true) {
    try {
      if (!(await getBotStatus())) {
        await sleep(5000);
        continue;
      }
      const task = await getNextQueueItem();
      if (!task) {
        await sleep(15000);
        continue;
      }
      await executeDeterministicAudit(task.id, task.url, task.user_email, workerId);
    } catch (error: any) {
      await sleep(10000);
    }
    await sleep(1000);
  }
}

async function bootstrap() {
  await testConnection();
  const concurrency = settings.maxConcurrency || 5;
  for (let i = 0; i < concurrency; i++) runWorker(i + 1);
}

bootstrap();
