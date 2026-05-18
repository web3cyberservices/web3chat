
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
  port: 2525, 
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
  '/usr/bin/google-chrome-stable',
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
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
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
    const domainName = urlObj.hostname;

    console.log(`[Worker] Starting Audit: ${domainName}`);
    
    await page.goto(urlObj.origin, { waitUntil: 'networkidle2', timeout: 35000 });
    
    // 1. Network & Tracker Analysis
    const hasGoogleAnalytics = networkUrls.some(url => url.includes('google-analytics.com') || url.includes('analytics.google'));
    const hasFacebookPixel = networkUrls.some(url => url.includes('connect.facebook.net') || url.includes('facebook.com/tr'));
    const hasGoogleFontsDirect = networkUrls.some(url => url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com'));

    if (hasGoogleAnalytics || hasFacebookPixel) {
      finalFindings.push({
        issue_type: 'TRACKING_TRAFFIC_DETECTED',
        severity: 'critical',
        description: 'Marketing/Analytical scripts activated before user consent.',
        law_name: 'Art. 6 & 7 GDPR',
        potential_fine: FINE_GDPR,
        recommendation: 'Block analytical scripts until explicit user consent is given.'
      });
    }

    if (hasGoogleFontsDirect) {
      finalFindings.push({
        issue_type: 'GOOGLE_FONTS_PRIVACY_VIOLATION',
        severity: 'high',
        description: 'Google Fonts loaded directly from US servers, leaking user IP without consent.',
        law_name: 'Munich Regional Court Ruling',
        potential_fine: 'Up to €250,000 per violation claim.',
        recommendation: 'Self-host fonts locally to avoid external US server requests.'
      });
    }

    // 2. Cookie Analysis (Correct Puppeteer API)
    const cookies = await page.cookies();
    const forbiddenMarkers = ['_ga', '_gid', '_fbp', '_fr', 'ads', 'metrics'];
    const illegal = cookies.filter(c => forbiddenMarkers.some(m => c.name.toLowerCase().includes(m)));

    if (illegal.length > 0) {
      finalFindings.push({
        issue_type: 'COOKIE_CONSENT_VIOLATION',
        severity: 'critical',
        description: `Found ${illegal.length} non-essential cookies set before consent.`,
        law_name: 'ePrivacy Directive & Art. 7 GDPR',
        potential_fine: FINE_GDPR,
        recommendation: 'Implement a strict cookie blocking mechanism until consent is granted.'
      });
    }

    // 3. Impressum & Legal Content
    const content = await page.evaluate(() => document.body.innerText.toLowerCase());
    if (domainName.endsWith('.de') || content.includes('impressum')) {
      const deKeywords = ['handelsregister', 'registernummer', 'ihk', 'steuer-id'];
      if (!deKeywords.some(kw => content.includes(kw))) {
        finalFindings.push({
          issue_type: 'GERMAN_IMPRESSUM_INCOMPLETE',
          severity: 'high',
          description: 'Impressum is missing mandatory German business registration details.',
          law_name: '§ 5 DDG (Germany)',
          potential_fine: 'Up to €50,000 for administrative non-compliance.',
          recommendation: 'Include your Handelsregister number and supervising IHK chamber.'
        });
      }
    }

    // 4. Save results
    await pool.query("DELETE FROM public.site_violations WHERE domain = $1", [domainName]);
    for (const f of finalFindings) {
      await pool.query(
        `INSERT INTO public.site_violations (domain, issue_type, severity, description, law_name, recommendation, potential_fine) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [domainName, f.issue_type, f.severity, f.description, f.law_name, f.recommendation, f.potential_fine]
      );
    }

    await pool.query("UPDATE public.scan_queue SET status = 'completed', violations_count = $1 WHERE id = $2", [finalFindings.length, taskId]);

    // 5. Generate & Send PDF
    const pdfBuffer = await generatePdfReport(domainName, finalFindings);
    if (userEmail && pdfBuffer) {
      await transporter.sendMail({
        from: `"Humango Compliance" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject: `Audit Complete: ${domainName}`,
        text: `Statutory audit finished for ${domainName}. Found ${finalFindings.length} violations.`,
        attachments: [{ filename: `Humango_Audit_${domainName}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
      });
    }

  } catch (err: any) {
    console.error(`[Worker Error] ${domainUrl}:`, err.message);
    await pool.query("UPDATE public.scan_queue SET status = 'failed' WHERE id = $1", [taskId]);
  } finally {
    if (browser) await browser.close();
  }
}

async function startWorker() {
  console.log('[Worker] Monitoring Queue...');
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
        await new Promise(r => setTimeout(r, 5000));
      }
    } catch (e: any) {
      console.error("[Loop Error]", e.message);
      await new Promise(r => setTimeout(r, 10000));
    }
  }
}

startWorker();
