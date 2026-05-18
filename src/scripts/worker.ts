
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
const FINE_GDPR = "Administrative fines up to €20,000,000 or 4% of global annual turnover under Art. 83 GDPR.";

async function executeDeterministicAudit(taskId: number, domainUrl: string, userEmail: string) {
  let browser: any = null;
  const networkUrls: string[] = [];
  const finalFindings: any[] = [];
  
  try {
    const executablePath = await getExecutablePath();
    browser = await puppeteer.launch({ 
      executablePath,
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage'
      ]
    });
    
    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);

    await page.setRequestInterception(true);
    page.on('request', request => {
      networkUrls.push(request.url().toLowerCase());
      request.continue();
    });

    let cleanUrl = domainUrl.trim().toLowerCase();
    if (!cleanUrl.startsWith('http')) cleanUrl = `https://${cleanUrl}`;
    const urlObj = new URL(cleanUrl);
    const originUrl = urlObj.origin;
    const domainName = urlObj.hostname;

    console.log(`[Compliance Engine] Auditing: ${originUrl}`);
    
    await page.goto(originUrl, { waitUntil: 'networkidle2', timeout: 35000 });
    
    // 1. NETWORK ANALYSIS (TRACKERS & FONTS)
    const hasGoogleAnalytics = networkUrls.some(url => url.includes('google-analytics.com') || url.includes('analytics.google'));
    const hasFacebookPixel = networkUrls.some(url => url.includes('connect.facebook.net') || url.includes('facebook.com/tr'));
    const hasGoogleFonts = networkUrls.some(url => url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com'));

    if (hasGoogleAnalytics || hasFacebookPixel) {
      finalFindings.push({
        category: 'Privacy',
        issue_type: 'TRACKING_TRAFFIC_DETECTED',
        severity: 'critical',
        description: 'Marketing tracking (Google/Facebook) was detected firing automatically upon page load without prior user consent.',
        law_name: 'Art. 6 & Art. 7 GDPR',
        potential_fine: FINE_GDPR,
        business_impact: 'High risk of regulatory intervention. EU law strictly requires "Opt-in" before tracking.',
        recommendation: 'ACTION: Configure your consent tool to block Google/Meta scripts until the user clicks "Accept".'
      });
    }

    if (hasGoogleFonts) {
      finalFindings.push({
        category: 'Privacy',
        issue_type: 'GOOGLE_FONTS_PRIVACY_VIOLATION',
        severity: 'high',
        description: 'The website loads Google Fonts directly from US servers, transmitting user IP addresses without consent.',
        law_name: 'Art. 6(1)(a) GDPR & Munich Regional Court Ruling',
        potential_fine: "Up to €250,000 per violation (per claim).",
        business_impact: 'Primary target for "Abmahnung" legal warnings in Germany.',
        recommendation: 'ACTION: Self-host fonts on your server and remove external Google API requests.'
      });
    }

    // 2. COOKIE INSPECTION
    const activeCookies = await page.cookies();
    const illegalCookies = activeCookies.filter(c => ['_ga', '_gid', '_fbp', 'ads'].some(m => c.name.toLowerCase().includes(m)));

    if (illegalCookies.length > 0) {
      finalFindings.push({
        category: 'Privacy',
        issue_type: 'COOKIE_CONSENT_VIOLATION',
        severity: 'critical',
        description: `Detected ${illegalCookies.length} tracking cookies placed before user consent.`,
        law_name: 'ePrivacy Directive & Art. 7 GDPR',
        potential_fine: FINE_GDPR,
        business_impact: 'Non-compliance with Planet49 EU court ruling.',
        recommendation: 'ACTION: Implement a hard-blocking mechanism for all non-essential cookies.'
      });
    }

    // 3. LEGAL TEXT ANALYSIS
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => ({
        href: a.href,
        text: a.textContent?.toLowerCase().trim() || ''
      }));
    });

    const findLink = (keys: string[]) => links.find(l => keys.some(k => (l.href || '').includes(k) || (l.text || '').includes(k)));
    const privacyLink = findLink(['privacy', 'datenschutz', 'policy']);
    const impressumLink = findLink(['impressum', 'legal-notice']);

    if (!privacyLink) {
      finalFindings.push({
        category: 'Privacy',
        issue_type: 'MISSING_PRIVACY_POLICY',
        severity: 'critical',
        description: 'No visible Privacy Policy link found on the homepage.',
        law_name: 'Art. 13 GDPR',
        potential_fine: FINE_GDPR,
        business_impact: 'Direct violation of mandatory transparency rules.',
        recommendation: 'ACTION: Create and link a dedicated Privacy Policy page in the footer.'
      });
    }

    if (domainName.endsWith('.de') && !impressumLink) {
      finalFindings.push({
        category: 'Legal',
        issue_type: 'MISSING_IMPRESSUM',
        severity: 'high',
        description: 'A German domain (.de) must have a visible Impressum link.',
        law_name: '§ 5 DDG (TDDG)',
        potential_fine: "Up to €50,000.",
        business_impact: 'Extremely high risk of Abmahnung.',
        recommendation: 'ACTION: Add a "Legal Notice / Impressum" link to your footer.'
      });
    }

    // 4. SAVE & NOTIFY
    await pool.query("DELETE FROM public.site_violations WHERE domain = $1", [domainName]);
    for (const f of finalFindings) {
      await pool.query(
        `INSERT INTO public.site_violations (
          domain, url, page_url, category, issue_type, severity, description, law_name, recommendation, business_impact, potential_fine, report_type, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
        [domainName, originUrl, cleanUrl, f.category, f.issue_type, f.severity, f.description, f.law_name, f.recommendation, f.business_impact, f.potential_fine, 'SaaS']
      );
    }

    await pool.query(
      `UPDATE public.scan_queue SET status = 'completed', violations_count = $1, crm_status = 'free' WHERE id = $2`,
      [finalFindings.length, taskId]
    );

    // GENERATE PDF
    const pdfBuffer = await generatePdfReport(domainName, finalFindings);
    if (userEmail && pdfBuffer) {
      await transporter.sendMail({
        from: `"Humango Compliance" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject: `Statutory Audit Complete: ${domainName}`,
        text: `Your automated statutory audit for ${domainName} is complete. Found violations: ${finalFindings.length}.`,
        attachments: [{ filename: `Humango_Audit_${domainName}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
      });
    }

  } catch (err: any) {
    console.error(`[Worker Error] ${domainUrl}:`, err.message);
    await pool.query("UPDATE public.scan_queue SET status = 'failed' WHERE id = $1", [taskId]);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

async function startWorker() {
  while (true) {
    try {
      const res = await pool.query(
        "SELECT id, url, user_email FROM public.scan_queue WHERE status = 'pending' ORDER BY priority DESC, created_at ASC LIMIT 1"
      );

      if (res.rows.length > 0) {
        const task = res.rows[0];
        await pool.query("UPDATE scan_queue SET status = 'processing' WHERE id = $1", [task.id]);
        await executeDeterministicAudit(task.id, task.url, task.user_email);
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
