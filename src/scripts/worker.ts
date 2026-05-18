
import { Pool } from 'pg';
import * as nodemailer from 'nodemailer';
import { chromium } from 'playwright';
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

async function executeDeterministicAudit(domain: string, userEmail: string) {
  let browser: any = null;
  try {
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    let cleanUrl = domain.trim().toLowerCase();
    if (!cleanUrl.startsWith('http')) cleanUrl = `https://${cleanUrl}`;
    const urlObj = new URL(cleanUrl);
    const originUrl = urlObj.origin;

    let finalFindings = [];
    let legalText = '';
    let hasFooterLink = false;

    console.log(`[Worker] Auditing: ${originUrl}`);
    
    try {
      await page.goto(originUrl, { waitUntil: 'networkidle', timeout: 30000 });

      // 1. Semantic Link Discovery
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

      // 2. Fallback Logic for humango.app specifically
      if (!foundTarget) {
        console.log(`[Worker] Auto-discovery failed. Trying forced fallback...`);
        try {
          const fallbackUrl = new URL('/legal/privacy', originUrl).href;
          const testRes = await page.goto(fallbackUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
          if (testRes && testRes.status() === 200) {
            legalText = await page.evaluate(() => document.body.innerText);
            hasFooterLink = true;
            console.log(`[Worker] Fallback success: content pulled from /legal/privacy`);
          }
        } catch (e) {}
      } else {
        hasFooterLink = true;
        console.log(`[Worker] Found semantic link: ${foundTarget.href}`);
        await page.goto(foundTarget.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
        legalText = await page.evaluate(() => document.body.innerText);
      }
    } catch (pageErr) {
      console.error(`[Worker] Navigation error:`, pageErr);
    }

    // ==========================================
    // DETERMINISTIC AUDIT LOGIC (NO AI)
    // ==========================================

    if (!legalText || legalText.trim().length < 250) {
      console.log(`[Violation] MISSING_CORE_FRAMEWORK identified.`);
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
      console.log(`[Status] Content found (${legalText.length} chars). Running regex audits...`);

      // CHECK: Data Retention
      const retentionRegex = /(storage|retention|store|keep|retain|hold|period|months|years|days|\d+\s*(month|year|day|месяц|год|лет|дня|продолжительно))/i;
      if (!retentionRegex.test(legalText)) {
        console.log(`[Violation] DATA_RETENTION_TIMEFRAMES identified.`);
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

    // 3. PDF Generation
    const pdfBuffer = await generatePdfReport(originUrl, finalFindings);

    // 4. Email Delivery
    if (userEmail && pdfBuffer) {
      console.log(`[SMTP] Delivering report to ${userEmail}...`);
      await transporter.sendMail({
        from: `"Humango Compliance" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject: `Statutory Compliance Audit Report for ${domain}`,
        text: `Hello,\n\nYour automated statutory compliance audit for ${domain} is complete. Please find the detailed PDF report attached.\n\nBest regards,\nHumango Team`,
        attachments: [{ filename: `Humango_Audit_${domain.replace(/[^a-z0-9]/gi, '_')}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
      });
    }

    await pool.query("UPDATE public.scan_queue SET status = 'completed' WHERE url = $1", [domain]);
    await pool.query("INSERT INTO bot_events (type, message) VALUES ($1, $2)", ['SUCCESS', `Audit finished for ${domain}. Found ${finalFindings.length} issues.`]);

  } catch (err: any) {
    console.error(`[Worker Fatal]`, err.message);
    await pool.query("UPDATE public.scan_queue SET status = 'failed' WHERE url = $1", [domain]);
  } finally {
    if (browser) await browser.close();
  }
}

async function startWorker() {
  console.log("==================================================");
  console.log("[Deterministic Engine] Active and listening...");
  console.log("==================================================");
  
  while (true) {
    try {
      const res = await pool.query(
        "SELECT id, url, user_email FROM public.scan_queue WHERE status = 'pending' ORDER BY priority DESC, created_at ASC LIMIT 1"
      );

      if (res.rows.length > 0) {
        const task = res.rows[0];
        await pool.query("UPDATE public.scan_queue SET status = 'processing' WHERE id = $1", [task.id]);
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
