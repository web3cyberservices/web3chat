
import { Pool } from 'pg';
import * as nodemailer from 'nodemailer';
import puppeteer from 'puppeteer';
import * as fs from 'fs';
import { generatePdfReport } from '../lib/report-generator';

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

async function executeDeterministicAudit(domain: string, userEmail: string) {
  let browser: any = null;
  try {
    const executablePath = await getExecutablePath();
    browser = await puppeteer.launch({ 
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    let cleanUrl = domain.trim().toLowerCase();
    if (!cleanUrl.startsWith('http')) cleanUrl = `https://${cleanUrl}`;
    const urlObj = new URL(cleanUrl);
    const originUrl = urlObj.origin;

    let finalFindings = [];
    let legalText = '';
    let hasFooterLink = false;

    console.log(`[Worker] Auditing: ${originUrl}`);
    
    try {
      await page.goto(originUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a')).map(a => ({
          href: (a as HTMLAnchorElement).href,
          text: a.textContent?.toLowerCase().trim() || ''
        }));
      });

      const legalKeywords = ['privacy', 'policy', 'legal', 'datenschutz', 'impressum', 'terms', 'confidentialite', 'privacidad'];
      let foundTarget = links.find(link => 
        legalKeywords.some(keyword => link.href.includes(keyword) || link.text.includes(keyword))
      );

      if (!foundTarget) {
        console.log(`[Worker] Auto-discovery failed. Trying forced fallback...`);
        try {
          const fallbackUrl = new URL('/legal/privacy', originUrl).href;
          const testRes = await page.goto(fallbackUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
          if (testRes && testRes.status() === 200) {
            legalText = await page.evaluate(() => document.body.innerText);
            hasFooterLink = true;
          }
        } catch (e) {}
      } else {
        hasFooterLink = true;
        await page.goto(foundTarget.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
        legalText = await page.evaluate(() => document.body.innerText);
      }
    } catch (pageErr) {
      console.error(`[Worker] Navigation error:`, pageErr);
    }

    if (!legalText || legalText.trim().length < 250) {
      finalFindings.push({
        type: 'MISSING_CORE_FRAMEWORK',
        issue_type: 'MISSING CORE FRAMEWORK',
        severity: 'critical',
        law_name: 'Art. 12 & 13 GDPR',
        description: 'No statutory legal disclosure links or content (Privacy Policy/Impressum) were identified in the site architecture.',
        business_impact: 'Critical risk: Ad accounts (Meta/Google) may be suspended due to missing compliance signals.',
        recommendation: 'ACTION: INSERT THIS HTML -> "<footer class=\\"legal-footer\\"><a href=\\"/privacy\\">Privacy Policy</a></footer>"'
      });
    } else {
      const retentionRegex = /(storage|retention|store|keep|retain|hold|period|months|years|days|\d+\s*(month|year|day|месяц|год|лет|дня|продолжительно))/i;
      if (!retentionRegex.test(legalText)) {
        finalFindings.push({
          type: 'DATA_RETENTION_TIMEFRAMES',
          issue_type: 'DATA RETENTION TIMEFRAMES',
          severity: 'critical',
          law_name: 'Art. 13(2)(a) GDPR',
          description: 'The policy fails to state specific data retention periods or criteria used to determine that period.',
          business_impact: 'Direct vulnerability to regulatory audits and Art. 17 data erasure lawsuits.',
          recommendation: 'ACTION: INSERT THIS TEXT -> "Data is stored for 24 months from the last interaction or until account deletion."'
        });
      }
    }

    const pdfBuffer = await generatePdfReport(originUrl, finalFindings);

    if (userEmail && pdfBuffer) {
      await transporter.sendMail({
        from: `"Humango Compliance" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject: `Statutory Compliance Audit Report for ${domain}`,
        text: `Hello,\n\nYour automated statutory compliance audit for ${domain} is complete.\n\nBest regards,\nHumango Team`,
        attachments: [{ filename: `Humango_Audit_${domain.replace(/[^a-z0-9]/gi, '_')}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
      });
    }

    await pool.query("UPDATE public.scan_queue SET status = 'completed' WHERE url = $1", [domain]);

  } catch (err: any) {
    console.error(`[Worker Fatal]`, err.message);
    await pool.query("UPDATE public.scan_queue SET status = 'failed' WHERE url = $1", [domain]);
  } finally {
    if (browser) await browser.close();
  }
}

async function startWorker() {
  console.log("==================================================");
  console.log("[Deterministic Worker] Active using Puppeteer...");
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
      console.error("[Loop Error]", e.message);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}

startWorker();
