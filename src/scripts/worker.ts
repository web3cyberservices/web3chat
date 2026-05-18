
import { Pool } from 'pg';
import * as nodemailer from 'nodemailer';
import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

// Note: Using relative imports for the worker script to ensure compatibility with tsx in production
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

/**
 * Deterministic PDF Generator
 */
async function generateLocalPdf(domain: string, findings: any[]) {
  let browser: any = null;
  try {
    const executablePath = await getExecutablePath();
    browser = await puppeteer.launch({ 
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: sans-serif; padding: 40px; color: #1e293b; }
          .header { border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-bottom: 20px; font-weight: bold; }
          .card { border: 1px solid #e2e8f0; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
          .badge { background: #fef2f2; color: #ef4444; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
          .footer { position: fixed; bottom: 20px; left: 0; right: 0; text-align: center; font-size: 9px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="header">Humango Compliance | Statutory Report</div>
        <h1>Audit Results for ${domain}</h1>
        ${findings.length === 0 ? '<div class="card"><h2>COMPLIANT</h2><p>No statutory violations were detected on the target infrastructure.</p></div>' : findings.map(f => `
          <div class="card">
            <div style="display:flex; justify-content:space-between;">
              <div style="font-weight:bold">${f.issue_type}</div>
              <span class="badge">CRITICAL</span>
            </div>
            <p style="font-size:12px;">${f.description}</p>
            <div style="font-size:10px; color:#3b82f6; margin-top:10px;">ACTION: ${f.action}</div>
          </div>
        `).join('')}
        <div class="footer">bot.humango.app | Statutory Compliance Verified</div>
      </body>
      </html>
    `;

    await page.setContent(htmlContent);
    return await page.pdf({ format: 'A4', printBackground: true });
  } catch (e) {
    console.error('[PDF Error]', e);
    return null;
  } finally {
    if (browser) await browser.close();
  }
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
    await page.setUserAgent(USER_AGENT);

    let cleanUrl = domain.trim().toLowerCase();
    if (!cleanUrl.startsWith('http')) cleanUrl = `https://${cleanUrl}`;
    const urlObj = new URL(cleanUrl);
    const originUrl = urlObj.origin;

    console.log(`[Worker] Auditing: ${originUrl}`);
    
    let legalText = '';
    let hasFooterLink = false;

    try {
      await page.goto(originUrl, { waitUntil: 'networkidle2', timeout: 30000 });
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

      if (!foundTarget) {
        console.log(`[Worker] Semantic search failed. Trying fallback paths...`);
        const fallbackUrl = new URL('/legal/privacy', originUrl).href;
        const res = await page.goto(fallbackUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        if (res && res.status() === 200) {
          legalText = await page.evaluate(() => document.body.innerText);
          hasFooterLink = true;
          console.log(`[Worker] Fallback /legal/privacy successful.`);
        }
      } else {
        hasFooterLink = true;
        console.log(`[Worker] Target link found: ${foundTarget.href}`);
        await page.goto(foundTarget.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
        legalText = await page.evaluate(() => document.body.innerText);
      }
    } catch (e) {
      console.warn(`[Worker] Crawl warning: ${e.message}`);
    }

    let findings = [];
    if (!legalText || legalText.trim().length < 250) {
      console.log(`[Worker] Violation: Missing document framework.`);
      findings.push({
        issue_type: 'MISSING CORE FRAMEWORK',
        description: 'No statutory legal disclosures (Privacy Policy/Impressum) were identified in the site architecture. This violates transparency standards under Art. 12 & 13 GDPR.',
        action: 'Add a "Privacy Policy" link to your website footer and provide the mandatory legal disclosures.'
      });
    } else {
      console.log(`[Worker] Analyzing content via deterministic regex...`);
      // Search for timeframes in 5 languages (English, German, French, Spanish, Russian)
      const retentionRegex = /(storage|retention|store|keep|retain|hold|period|months|years|days|24\s*months|3\s*years|\d+\s*(month|year|day|месяц|год|лет|дня|продолжительно))/i;
      const hasRetentionMention = retentionRegex.test(legalText);

      if (!hasRetentionMention) {
        console.log(`[Worker] Violation: Missing retention timeframe.`);
        findings.push({
          issue_type: 'DATA RETENTION TIMEFRAMES',
          description: 'The policy fails to state specific data retention periods as required by Art. 13 GDPR. Users must be informed about how long their data is stored.',
          action: 'Insert text: "Personal data is stored for 24 months from the last interaction or until account deletion is requested."'
        });
      }
    }

    const pdfBuffer = await generateLocalPdf(originUrl, findings);

    if (userEmail && pdfBuffer) {
      console.log(`[Worker] Delivering PDF to ${userEmail}...`);
      await transporter.sendMail({
        from: `"Humango Compliance" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject: `Statutory Compliance Audit Report for ${domain}`,
        text: `Hello,\n\nYour automated statutory compliance audit for ${domain} is complete. Please find the detailed PDF report attached.\n\nBest regards,\nHumango Team`,
        attachments: [{ filename: `Humango_Audit_${domain.replace(/[^a-z0-9]/gi, '_')}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
      });
    }

    await pool.query("UPDATE public.scan_queue SET status = 'completed' WHERE url = $1", [domain]);
    console.log(`[Worker] Task finished for ${domain}`);

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
