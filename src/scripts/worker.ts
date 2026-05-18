
import { Pool } from 'pg';
import * as nodemailer from 'nodemailer';
import puppeteer from 'puppeteer';
import * as fs from 'fs';
import { generatePdfReport } from '../lib/report-generator';

/**
 * DETERMINISTIC WORKER V5.2
 * - No AI dependency to avoid Quota Exceeded.
 * - Robust Puppeteer discovery.
 * - Multi-language Regex detection for Data Retention.
 */

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

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

const CHROME_PATHS = [
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/root/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
];

async function getExecutablePath() {
  for (const p of CHROME_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

const USER_AGENT = "HumangoBot/1.0 (+https://bot.humango.app)";

async function executeDeterministicAudit(domain: string, userEmail: string) {
  let browser: any = null;
  try {
    const executablePath = await getExecutablePath();
    browser = await puppeteer.launch({ 
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);

    let cleanUrl = domain.trim().toLowerCase();
    if (!cleanUrl.startsWith('http')) cleanUrl = `https://${cleanUrl}`;
    const originUrl = new URL(cleanUrl).origin;

    console.log(`[Worker] Auditing: ${originUrl}`);
    
    let legalText = '';
    let hasFoundDoc = false;

    try {
      // 1. Scan Homepage for links
      await page.goto(originUrl, { waitUntil: 'networkidle2', timeout: 35000 });
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a')).map(a => ({
          href: (a as HTMLAnchorElement).href,
          text: a.textContent?.toLowerCase().trim() || ''
        }));
      });

      const legalKeywords = ['privacy', 'policy', 'legal', 'datenschutz', 'impressum', 'terms', 'confidentialite'];
      let foundTarget = links.find(link => 
        legalKeywords.some(keyword => (link.href || '').includes(keyword) || (link.text || '').includes(keyword))
      );

      // 2. Fallback check for known paths if semantic search fails
      if (!foundTarget) {
        console.log(`[Worker] No links found on homepage. Trying direct fallback...`);
        const fallbackUrl = new URL('/legal/privacy', originUrl).href;
        const res = await page.goto(fallbackUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        if (res && res.status() === 200) {
          legalText = await page.evaluate(() => document.body.innerText);
          hasFoundDoc = true;
        }
      } else {
        hasFoundDoc = true;
        console.log(`[Worker] Found doc link: ${foundTarget.href}`);
        await page.goto(foundTarget.href, { waitUntil: 'domcontentloaded', timeout: 35000 });
        legalText = await page.evaluate(() => document.body.innerText);
      }
    } catch (e: any) {
      console.warn(`[Worker] Scan Warning for ${originUrl}: ${e.message}`);
    }

    let findings = [];

    // DETERMINISTIC EVALUATION
    if (!legalText || legalText.trim().length < 250) {
      console.log(`[Worker] Violation Confirmed: MISSING_CORE_FRAMEWORK`);
      findings.push({
        type: 'MISSING_CORE_FRAMEWORK',
        summary: 'No statutory legal disclosures (Privacy Policy/Impressum) were identified in the site architecture. This violates transparency standards under Art. 12 & 13 GDPR.',
        action: 'Add a "Privacy Policy" link to your website footer and provide the mandatory legal disclosures.',
        basis: 'Art. 13 GDPR',
        risk: 'High risk of ad account suspension and regulatory fines.'
      });
    } else {
      console.log(`[Worker] Content Found (${legalText.length} chars). Checking Retention...`);
      // Regex for data retention periods (EN, DE, RU)
      const retentionRegex = /(storage|retention|store|keep|retain|hold|period|months|years|days|24\s*months|3\s*years|\d+\s*(month|year|day|месяц|год|лет|дня|продолжительно))/i;
      const hasRetention = retentionRegex.test(legalText);

      if (!hasRetention) {
        console.log(`[Worker] Violation Confirmed: DATA_RETENTION_TIMEFRAMES`);
        findings.push({
          type: 'DATA_RETENTION_TIMEFRAMES',
          summary: 'The policy fails to state specific data retention periods as required by Art. 13 GDPR. Users must be informed about how long their data is stored.',
          action: 'INSERT THIS TEXT > "Personal data is stored for a period of 24 months from the last interaction or until account deletion is requested."',
          basis: 'Art. 13(2)(a) GDPR',
          risk: 'Non-compliance with transparency duties.'
        });
      }
    }

    // Generate PDF directly from worker findings
    const pdfBuffer = await generatePdfReport(originUrl, findings);

    if (userEmail && pdfBuffer) {
      console.log(`[Worker] Sending report to ${userEmail}...`);
      await transporter.sendMail({
        from: `"Humango Compliance" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject: `Statutory Compliance Audit Report for ${domain}`,
        text: `Hello,\n\nYour automated statutory compliance audit for ${domain} is complete. Please find the detailed PDF report attached.\n\nBest regards,\nHumango Team`,
        attachments: [{ filename: `Humango_Audit_${domain.replace(/[^a-z0-9]/gi, '_')}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
      });
    }

    // Update DB status
    await pool.query("UPDATE public.scan_queue SET status = 'completed' WHERE url = $1", [domain]);

  } catch (err: any) {
    console.error(`[Worker Fatal Error]`, err.message);
    await pool.query("UPDATE public.scan_queue SET status = 'failed' WHERE url = $1", [domain]);
  } finally {
    if (browser) await browser.close();
  }
}

async function startWorker() {
  console.log("==================================================");
  console.log("[Deterministic Worker] Service active.");
  console.log("[User-Agent] " + USER_AGENT);
  console.log("==================================================");
  
  while (true) {
    try {
      const res = await pool.query(
        "SELECT id, url, user_email FROM public.scan_queue WHERE status = 'pending' ORDER BY priority DESC, created_at ASC LIMIT 1"
      );

      if (res.rows.length > 0) {
        const task = res.rows[0];
        await pool.query("UPDATE scan_queue SET status = 'processing' WHERE id = $1", [task.id]);
        await executeDeterministicAudit(task.url, task.user_email);
      } else {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (e: any) {
      console.error("[Worker Loop Error]", e.message);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}

startWorker();
