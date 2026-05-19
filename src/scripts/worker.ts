
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
const FINE_GDPR = "Up to €20,000,000 or 4% of global annual turnover.";

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

    // Включаем шпионаж за сетевыми запросами
    await page.setRequestInterception(true);
    page.on('request', request => {
      networkUrls.push(request.url().toLowerCase());
      request.continue();
    });

    let cleanUrl = domainUrl.trim().toLowerCase();
    if (!cleanUrl.startsWith('http')) cleanUrl = `https://${cleanUrl}`;
    const urlObj = new URL(cleanUrl);
    const domainName = urlObj.hostname;
    const tld = domainName.split('.').pop()?.toLowerCase() || '';
    const countryCode = tld === 'com' || tld === 'net' ? 'EU' : tld.toUpperCase();

    console.log(`[Audit Hub] Running deep scan: ${domainName}`);
    
    await page.goto(urlObj.origin, { waitUntil: 'networkidle2', timeout: 35000 });
    
    // =========================================================================
    // БЛОК 1: СЕТЬ И КУКИ (Выполняется ВСЕГДА)
    // =========================================================================
    
    // 1.1. Проверка на трекеры и Google Fonts
    const hasGoogleFonts = networkUrls.some(url => url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com'));
    if (hasGoogleFonts) {
      finalFindings.push({
        type: 'GOOGLE_FONTS_PRIVACY_VIOLATION',
        basis: 'Art. 6(1)(a) GDPR & Munich Court Precedent',
        summary: 'External Google Fonts are loaded directly from US servers, transmitting user IP addresses without consent.',
        risk: 'Direct trigger for automated legal claims (Abmahnung) in EU.',
        liability: 'Up to €250,000 per claim or GDPR standard.',
        action: 'Self-host all fonts locally and remove external CSS calls to googleapis.com.',
        country: countryCode
      });
    }

    const hasAnalytics = networkUrls.some(url => url.includes('google-analytics.com') || url.includes('analytics.google'));
    const hasFacebook = networkUrls.some(url => url.includes('connect.facebook.net') || url.includes('facebook.com/tr'));
    if (hasAnalytics || hasFacebook) {
      finalFindings.push({
        type: 'TRACKING_TRAFFIC_DETECTED',
        basis: 'Art. 5(1)(a) & Art. 6 GDPR',
        summary: 'Active network traffic to advertising platforms detected immediately upon page load.',
        risk: 'Critical risk of heavy regulatory fines for illegal processing of tracking data.',
        liability: FINE_GDPR,
        action: 'Block tag manager initialization until user consent is recorded.',
        country: countryCode
      });
    }

    // 1.2. Проверка куки в хранилище
    const cookies = await page.cookies();
    const forbiddenMarkers = ['_ga', '_gid', '_fbp', '_fr', 'ads', 'metrics'];
    const illegalCookies = cookies.filter(c => forbiddenMarkers.some(m => c.name.toLowerCase().includes(m)));

    if (illegalCookies.length > 0) {
      finalFindings.push({
        type: 'COOKIE_CONSENT_VIOLATION',
        basis: 'Art. 6 & 7 GDPR (Planet49 Ruling)',
        summary: `Site placed ${illegalCookies.length} tracking cookies into the browser prior to any user interaction.`,
        risk: 'Direct non-compliance with EU case law.',
        liability: FINE_GDPR,
        action: 'Implement a hard-blocking mechanism for all marketing cookies until affirmative consent.',
        country: countryCode
      });
    }

    // =========================================================================
    // БЛОК 2: НАЛИЧИЕ ДОКУМЕНТА (Выполняется ВСЕГДА)
    // =========================================================================
    
    const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
    const legalText = pageText;

    if (!legalText || legalText.trim().length < 200) {
      finalFindings.push({
        type: 'MISSING_CORE_FRAMEWORK',
        basis: 'Art. 13 GDPR',
        summary: 'No statutory legal disclosures or accessible Privacy Policy found in the primary site architecture.',
        risk: 'Immediate trigger for regulatory sanctions and platform bans.',
        liability: FINE_GDPR,
        action: 'Create a visible /privacy page and link it prominently in your website footer.',
        country: countryCode
      });
    }

    // =========================================================================
    // БЛОК 3: АНАЛИЗ ТЕКСТА (Только если есть контент)
    // =========================================================================
    
    if (legalText && legalText.trim().length >= 200) {
      const textLower = legalText.toLowerCase();

      // 3.1. Сроки хранения
      const retentionMarkers = ['retention period', 'store for', 'stored for', 'months', 'years', 'period of', 'retain'];
      if (!retentionMarkers.some(m => textLower.includes(m))) {
        finalFindings.push({
          type: 'DATA_RETENTION_GAP',
          basis: 'Art. 13(2)(a) GDPR',
          summary: 'The privacy policy fails to state specific timeframes for how long user data is stored.',
          risk: 'Violation of the storage limitation principle.',
          liability: FINE_GDPR,
          action: 'Update policy with a table stating retention periods for each data category.',
          country: countryCode
        });
      }

      // 3.2. Национальные требования (Германия)
      if (countryCode === 'DE' || textLower.includes('impressum')) {
        const impressumKeywords = ['handelsregister', 'registernummer', 'ihk', 'steuer-id', 'ust-idnr', 'amtsgericht'];
        if (!impressumKeywords.some(kw => textLower.includes(kw))) {
          finalFindings.push({
            type: 'GERMAN_IMPRESSUM_INCOMPLETE',
            basis: '§ 5 DDG (Germany)',
            summary: 'The mandatory legal notice is missing critical business identifiers.',
            risk: 'Extremely high risk of Abmahnung (legal warning letters) from competitors.',
            liability: 'Up to €50,000.',
            action: 'Add Commercial Registry number and local court jurisdiction to the Impressum.',
            country: 'DE'
          });
        }
      }

      // 3.3. Финансы
      const finKeywords = ['credit card', 'payment info', 'bank account', 'billing details'];
      const secKeywords = ['stripe', 'paypal', 'pci-dss', 'encrypted', 'secure gateway'];
      if (finKeywords.some(kw => textLower.includes(kw)) && !secKeywords.some(kw => textLower.includes(kw))) {
        finalFindings.push({
          type: 'UNSECURED_FINANCIAL_DECLARATION',
          basis: 'Art. 32 GDPR',
          summary: 'Financial data collection declared without stating use of encrypted payment gateways.',
          risk: 'High priority audit risk by financial regulators.',
          liability: FINE_GDPR,
          action: 'Explicitly state that payments are handled by PCI-DSS compliant providers.',
          country: countryCode
        });
      }
    }

    // --- SAVE ---
    await pool.query("DELETE FROM public.site_violations WHERE domain = $1", [domainName]);
    for (const f of finalFindings) {
      await pool.query(
        `INSERT INTO public.site_violations (domain, issue_type, severity, description, law_name, recommendation, potential_fine, business_impact, country) 
         VALUES ($1, $2, 'high', $3, $4, $5, $6, $7, $8)`,
        [domainName, f.type, f.summary, f.basis, f.action, f.liability, f.risk, f.country]
      );
    }

    await pool.query("UPDATE public.scan_queue SET status = 'completed', violations_count = $1 WHERE id = $2", [finalFindings.length, taskId]);

    // --- DELIVER ---
    const pdfBuffer = await generatePdfReport(domainName, finalFindings);
    if (userEmail && pdfBuffer) {
      await transporter.sendMail({
        from: `"Humango Compliance" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject: `Statutory Audit Complete: ${domainName}`,
        text: `The statutory audit for ${domainName} is complete. Identified ${finalFindings.length} critical non-compliance issues.`,
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
      console.error('[Worker Loop Error]', e.message);
      await new Promise(r => setTimeout(r, 10000));
    }
  }
}

startWorker();
