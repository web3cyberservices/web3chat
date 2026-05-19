
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

    // 1. СЕТЕВОЙ ШПИОНАЖ
    await page.setRequestInterception(true);
    page.on('request', request => {
      networkUrls.push(request.url().toLowerCase());
      request.continue();
    });

    let cleanUrl = domainUrl.trim().toLowerCase();
    if (!cleanUrl.startsWith('http')) cleanUrl = `https://${cleanUrl}`;
    const urlObj = new URL(cleanUrl);
    const domainName = urlObj.hostname;
    const tld = domainName.split('.').pop() || '';

    console.log(`[Ultimate Scanner] Audit Start: ${domainName}`);
    
    await page.goto(urlObj.origin, { waitUntil: 'networkidle2', timeout: 35000 });
    
    // --- ОБЩЕЕВРОПЕЙСКИЙ АНАЛИЗ (GDPR) ---

    // A. Куки до согласия
    const cookies = await page.cookies();
    const forbiddenMarkers = ['_ga', '_gid', '_fbp', '_fr', 'ads', 'metrics', 'tt_pixel', 'hotjar'];
    const illegalCookies = cookies.filter(c => forbiddenMarkers.some(m => c.name.toLowerCase().includes(m)));

    if (illegalCookies.length > 0) {
      finalFindings.push({
        issue_type: 'COOKIE_CONSENT_VIOLATION',
        law_name: 'Art. 7 GDPR & ePrivacy Directive',
        description: `Found ${illegalCookies.length} tracking/marketing cookies set before any user consent was given.`,
        business_impact: 'High risk: Explicit violation of the Planet49 ruling. Triggers immediate regulatory attention.',
        potential_fine: FINE_GDPR,
        recommendation: 'Implement a hard-blocking mechanism to prevent any non-essential cookies from being stored before a valid consent event.'
      });
    }

    // B. Сетевой трафик до согласия
    const hasTrackingTraffic = networkUrls.some(url => 
      url.includes('google-analytics.com') || 
      url.includes('analytics.google') || 
      url.includes('connect.facebook.net') || 
      url.includes('facebook.com/tr') ||
      url.includes('tiktok.com/pixel')
    );

    if (hasTrackingTraffic) {
      finalFindings.push({
        issue_type: 'TRACKING_TRAFFIC_DETECTED',
        law_name: 'Art. 6(1)(a) GDPR',
        description: 'The system intercepted active marketing/analytical network requests initiated immediately upon page load without user authorization.',
        business_impact: 'Critical risk: Automated detection by regulators is common for this type of violation.',
        potential_fine: FINE_GDPR,
        recommendation: 'Configure your Tag Manager to withhold firing marketing tags until the consent signal is strictly recorded.'
      });
    }

    // C. Анализ текста политики
    const legalText = await page.evaluate(() => document.body.innerText);
    const textLower = legalText.toLowerCase();

    // Data Retention (Art. 13)
    const retentionMarkers = ['retention period', 'store for', 'stored for', 'months', 'years', 'period of', 'retain', 'storage duration'];
    if (!retentionMarkers.some(m => textLower.includes(m))) {
      finalFindings.push({
        issue_type: 'DATA_RETENTION_GAP',
        law_name: 'Art. 13(2)(a) GDPR',
        description: 'The Privacy Policy fails to define specific data retention periods for collected personal information.',
        business_impact: 'Compliance failure: Regulators demand transparency on how long data is kept.',
        potential_fine: FINE_GDPR,
        recommendation: 'Add a clear "Data Retention" section specifying the exact duration for each data category (e.g., "Customer data is stored for 24 months").'
      });
    }

    // DSAR & Withdrawal (Art. 15, 7)
    const dsarMarkers = ['withdraw consent', 'right to be forgotten', 'erasure', 'access your data', 'delete my account', 'opt-out'];
    if (!dsarMarkers.some(m => textLower.includes(m))) {
      finalFindings.push({
        issue_type: 'DSAR_ACCESS_GAP',
        law_name: 'Art. 15 & 7(3) GDPR',
        description: 'Missing explicit instructions on how users can exercise their right to access, delete, or withdraw consent.',
        business_impact: 'Legal risk: Failure to provide a "right to be forgotten" is a major GDPR penalty trigger.',
        potential_fine: FINE_GDPR,
        recommendation: 'Include a "User Rights" section with contact details (DPO email) for data access and deletion requests.'
      });
    }

    // Unsecured Financial (Art. 32)
    const financialMarkers = ['credit card', 'payment info', 'bank account', 'billing details', 'платежные данные'];
    const securityMarkers = ['stripe', 'paypal', 'pci-dss', 'encrypted provider', 'secure gateway', 'braintree'];
    if (financialMarkers.some(m => textLower.includes(m)) && !securityMarkers.some(m => textLower.includes(m))) {
      finalFindings.push({
        issue_type: 'UNSECURED_FINANCIAL_DECLARATION',
        law_name: 'Art. 32 GDPR',
        description: 'The site declares collection of financial/billing data but does not specify a secure third-party processing framework.',
        business_impact: 'Audit trigger: Lack of declared security measures for sensitive payment data.',
        potential_fine: FINE_GDPR,
        recommendation: 'State clearly that all payments are processed via an encrypted PCI-DSS compliant provider (e.g., Stripe/PayPal).'
      });
    }

    // --- НАЦИОНАЛЬНЫЕ ПРОВЕРКИ ---

    // 1. ГЕРМАНИЯ & АВСТРИЯ (.de, .at)
    if (tld === 'de' || tld === 'at' || textLower.includes('impressum')) {
      // Impressum validation
      const deKeywords = ['handelsregister', 'registernummer', 'ihk', 'steuer-id', 'ust-idnr', 'amtsgericht'];
      if (!deKeywords.some(kw => textLower.includes(kw))) {
        finalFindings.push({
          issue_type: 'GERMAN_IMPRESSUM_INCOMPLETE',
          law_name: '§ 5 DDG (Germany)',
          description: 'Mandatory German business registration details (VAT ID, Register Number, or IHK chamber) were not found in the Impressum.',
          business_impact: 'Critical risk of Abmahnung (legal warnings) from competitors and specialized lawyers. Up to €50,000 fine.',
          potential_fine: 'Up to €50,000.',
          recommendation: 'Update your Impressum page to include full registration details as required by the Digital Services Act (DDG).'
        });
      }

      // Google Fonts Leakage
      const hasGoogleFontsDirect = networkUrls.some(url => url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com'));
      if (hasGoogleFontsDirect) {
        finalFindings.push({
          issue_type: 'GOOGLE_FONTS_PRIVACY_VIOLATION',
          law_name: 'Munich Regional Court Ruling (Art. 6 GDPR)',
          description: 'Google Fonts are loaded directly from US servers, leaking user IP addresses without consent.',
          business_impact: 'High risk in DACH region: Subject to automated legal claims from individuals and consumer groups.',
          potential_fine: 'Up to €250,000 per violation claim.',
          recommendation: 'Self-host all web fonts locally on your server to prevent unauthorized data transfers to third-party US servers.'
        });
      }
    }

    // 2. ФРАНЦИЯ (.fr) - Cookie Wall check
    if (tld === 'fr' || textLower.includes('refuser tout')) {
      const hasRejectAll = textLower.includes('refuser tout') || textLower.includes('continuer sans accepter');
      if (!hasRejectAll && (hasTrackingTraffic || illegalCookies.length > 0)) {
        finalFindings.push({
          issue_type: 'CNIL_CONSENT_VIOLATION',
          law_name: 'CNIL Guidelines (France)',
          description: 'The cookie consent mechanism does not provide a "Reject All" option that is as visible and accessible as "Accept All".',
          business_impact: 'High penalty risk: The French regulator (CNIL) actively fines companies for non-symmetrical consent buttons.',
          potential_fine: 'Up to 2% of annual turnover (CNIL standard).',
          recommendation: 'Ensure your cookie banner has a clear "Refuse All" button next to "Accept All".'
        });
      }
    }

    // 3. ИТАЛИЯ (.it) - VAT ID in footer
    if (tld === 'it') {
      const vatRegex = /p\.iva|partita iva|iva\s\d{11}/i;
      if (!vatRegex.test(textLower)) {
        finalFindings.push({
          issue_type: 'ITALY_VAT_DISPLAY_VIOLATION',
          law_name: 'Garante Privacy (Italy)',
          description: 'The mandatory VAT ID (P.IVA) was not identified in the global site footer.',
          business_impact: 'Administrative risk: Italian law strictly requires VAT ID visibility on all commercial landing pages.',
          potential_fine: 'Up to €10,000 for administrative non-compliance.',
          recommendation: 'Add your Partita IVA (11 digits) clearly in the footer of your homepage.'
        });
      }
    }

    // 4. ИСПАНИЯ (.es) - Cookie Table
    if (tld === 'es') {
      const hasTable = await page.evaluate(() => document.querySelectorAll('table').length > 0);
      if (!hasTable) {
        finalFindings.push({
          issue_type: 'SPAIN_COOKIE_TRANSPARENCY',
          law_name: 'AEPD Cookie Guide (Spain)',
          description: 'The cookie policy lacks a detailed classification table (Owner, Purpose, Expiry).',
          business_impact: 'AEPD Audit trigger: Spanish regulators require a two-level notification with specific cookie data tables.',
          potential_fine: 'Up to €30,000.',
          recommendation: 'Implement a comprehensive cookie table in your policy listing each cookie\'s category, provider, and duration.'
        });
      }
    }

    // 5. ВЕЛИКОБРИТАНИЯ (.uk) - Children's Code
    if (tld.includes('uk') || textLower.includes('children') || textLower.includes('kids')) {
      const childrenMarkers = ['toys', 'games', 'cartoon', 'school', 'under 13', 'parental consent'];
      if (childrenMarkers.some(m => textLower.includes(m)) && !textLower.includes('age verification')) {
        finalFindings.push({
          issue_type: 'UK_ICO_CHILDREN_CODE',
          law_name: 'ICO Children\'s Code (UK)',
          description: 'The site contains children-oriented keywords but lacks explicit age verification or enhanced protection disclosures.',
          business_impact: 'Extremely high risk: The ICO prioritizes the safety of minors and issues the largest fines for Children\'s Code gaps.',
          potential_fine: 'Up to £17,500,000 or 4% of turnover.',
          recommendation: 'Implement Age Verification and ensure strict privacy-by-default settings for UK-based users under 18.'
        });
      }
    }

    // --- СОХРАНЕНИЕ И ДОСТАВКА ---

    // Clean old results
    await pool.query("DELETE FROM public.site_violations WHERE domain = $1", [domainName]);
    
    // Save new findings
    for (const f of finalFindings) {
      await pool.query(
        `INSERT INTO public.site_violations (domain, issue_type, severity, description, law_name, recommendation, potential_fine, business_impact) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [domainName, f.issue_type, 'high', f.description, f.law_name, f.recommendation, f.potential_fine, f.business_impact]
      );
    }

    // Update queue
    await pool.query(
      "UPDATE public.scan_queue SET status = 'completed', violations_count = $1 WHERE id = $2", 
      [finalFindings.length, taskId]
    );

    // Generate PDF & Send Email
    const pdfBuffer = await generatePdfReport(domainName, finalFindings);
    if (userEmail && pdfBuffer) {
      await transporter.sendMail({
        from: `"Humango Compliance" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject: `Audit Complete: ${domainName}`,
        text: `The pan-European statutory audit for ${domainName} is finished. Found ${finalFindings.length} violations across EU and national jurisdictions.`,
        attachments: [{ filename: `Humango_Audit_${domainName}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
      });
      console.log(`[Worker] Report delivered to ${userEmail}`);
    }

  } catch (err: any) {
    console.error(`[Worker Error] ${domainUrl}:`, err.message);
    await pool.query("UPDATE public.scan_queue SET status = 'failed' WHERE id = $1", [taskId]);
  } finally {
    if (browser) await browser.close();
  }
}

async function startWorker() {
  console.log('==================================================');
  console.log('   HUMANGO PAN-EUROPEAN AUDIT ENGINE START        ');
  console.log('==================================================');
  
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
