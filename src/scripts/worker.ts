
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
  port: parseInt(process.env.SMTP_PORT || '2525'),
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

async function executeDeterministicAudit(taskId: number, domainUrl: string, userEmail: string) {
  let browser: any = null;
  const networkUrls: string[] = [];
  const findings: any[] = [];
  
  try {
    const executablePath = await getExecutablePath();
    browser = await puppeteer.launch({ 
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);

    // 1. Сбор сетевых запросов
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

    console.log(`[Audit Engine] Analyzing domain: ${originUrl}`);
    
    // 2. Загрузка страницы
    await page.goto(originUrl, { waitUntil: 'networkidle2', timeout: 35000 });
    
    // 3. ПРОВЕРКА SSL
    if (!cleanUrl.startsWith('https')) {
      findings.push({
        category: 'Security',
        issue_type: 'MISSING_SSL_SECURITY',
        severity: 'critical',
        description: 'The website is operating over an insecure HTTP connection. This allows for data interception and violates Art. 32 GDPR regarding data security.',
        law_name: 'Art. 32 GDPR',
        business_impact: 'Immediate risk of data breaches and loss of trust. Browsers mark the site as "Not Secure", hurting conversion.',
        recommendation: 'Install an SSL certificate and force redirect all traffic to HTTPS.'
      });
    }

    // 4. ПРОВЕРКА ТРЕКЕРОВ (СЕТЬ)
    const hasGA = networkUrls.some(url => url.includes('google-analytics.com') || url.includes('analytics.google'));
    const hasFB = networkUrls.some(url => url.includes('connect.facebook.net') || url.includes('facebook.com/tr'));

    if (hasGA || hasFB) {
      findings.push({
        category: 'Privacy',
        issue_type: 'TRACKING_TRAFFIC_DETECTED',
        severity: 'critical',
        description: 'Marketing tracking traffic (Google Analytics or Meta Pixel) was detected firing immediately upon page load without prior user consent.',
        law_name: 'Art. 6 & Art. 7 GDPR',
        business_impact: 'High risk of administrative fines. European DPAs (CNIL, DSB) strictly prohibit tracking before explicit "Accept" action.',
        recommendation: 'Use a Consent Management Platform (CMP) to block all tracking scripts until the user gives affirmative consent.'
      });
    }

    // 5. ПРОВЕРКА КУКИ
    const activeCookies = await page.cookies();
    const trackingMarkers = ['_ga', '_gid', '_fbp', '_fr', 'ads', 'metrics', 'targeting'];
    const illegalCookies = activeCookies.filter(c => trackingMarkers.some(m => c.name.toLowerCase().includes(m)));

    if (illegalCookies.length > 0) {
      findings.push({
        category: 'Privacy',
        issue_type: 'COOKIE_CONSENT_VIOLATION',
        severity: 'critical',
        description: `Found ${illegalCookies.length} marketing/analytical cookies set in the browser storage before any interaction with a consent banner.`,
        law_name: 'ePrivacy Directive (Cookie Law)',
        business_impact: 'Non-compliance with the Planet49 ruling. Subject to fines and legal challenges.',
        recommendation: 'Configure your site to withhold non-essential cookies until the user clicks "Accept".'
      });
    }

    // 6. СБОР КОНТАКТОВ
    const extracted = await page.evaluate(() => {
      const text = document.body.innerText;
      const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
      const phones = text.match(/(?:\+?\d{1,3}[ -]?)?\(?\d{3}\)?[ -]?\d{3}[ -]?\d{4}/g) || [];
      return { emails: [...new Set(emails)], phones: [...new Set(phones)] };
    });

    // 7. ПОИСК ЛЕГАЛЬНЫХ ССЫЛОК
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => ({
        href: a.href,
        text: a.textContent?.toLowerCase().trim() || ''
      }));
    });

    const findLink = (keys: string[]) => links.find(l => keys.some(k => (l.href || '').includes(k) || (l.text || '').includes(k)));
    
    const privacyLink = findLink(['privacy', 'datenschutz', 'confidentialite', 'privacidad', 'privacy-policy']);
    const impressumLink = findLink(['impressum', 'legal-notice', 'identification', 'mentions-legales']);
    const termsLink = findLink(['terms', 'conditions', 'agb', 'tos']);

    // 8. ПРОВЕРКА ОТСУТСТВИЯ ДОКУМЕНТОВ
    if (!privacyLink) {
      findings.push({
        category: 'Legal',
        issue_type: 'MISSING_PRIVACY_POLICY',
        severity: 'critical',
        description: 'No Privacy Policy link was found in the website navigation. This is a primary requirement for any website collecting user data (including IP addresses).',
        law_name: 'Art. 13 GDPR',
        business_impact: 'High visibility violation. Advertising platforms like Google/Meta will suspend accounts without a policy link.',
        recommendation: 'Immediately create and link a compliant Privacy Policy in the website footer.'
      });
    }

    if (!impressumLink) {
      findings.push({
        category: 'Legal',
        issue_type: 'MISSING_IMPRESSUM',
        severity: 'high',
        description: 'No Impressum (Legal Notice) link found. Mandatory for all commercial entities operating or targeting the EU market.',
        law_name: 'e-Commerce Directive (2000/31/EC)',
        business_impact: 'Legal vulnerability, especially in DACH region (Germany, Austria, Switzerland) where "Abmahnung" warnings are common.',
        recommendation: 'Add a "Legal Notice" or "Impressum" with company name, address, and registration details.'
      });
    }

    // 9. ГЛУБОКИЙ АНАЛИЗ ТЕКСТА (Если есть политика)
    let legalText = '';
    if (privacyLink) {
      try {
        await page.goto(privacyLink.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
        legalText = await page.evaluate(() => document.body.innerText);
      } catch (e) {}
    }

    if (legalText) {
      const textLower = legalText.toLowerCase();

      // Проверка сроков хранения
      const storageKeywords = ['storage', 'retention', 'period', 'months', 'years', 'days', 'retain', 'duration'];
      if (!storageKeywords.some(k => textLower.includes(k))) {
        findings.push({
          category: 'Privacy',
          issue_type: 'DATA_RETENTION_MISSING',
          severity: 'high',
          description: 'The Privacy Policy fails to mention the duration of data storage or criteria for determining it.',
          law_name: 'Art. 13(2)(a) GDPR',
          business_impact: 'Transparency failure. Regulatory authorities prioritize this during audits.',
          recommendation: 'Specify retention periods for each data category (e.g., "Customer data is kept for 7 years for tax purposes").'
        });
      }

      // Проверка контактов DPO/Email
      const emailInText = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g.test(textLower);
      if (!emailInText) {
        findings.push({
          category: 'Privacy',
          issue_type: 'DPO_CONTACT_MISSING',
          severity: 'medium',
          description: 'No contact email address was identified within the legal texts for data protection inquiries.',
          law_name: 'Art. 13(1)(a) GDPR',
          business_impact: 'Prevents users from exercising their rights (Art. 15-22), leading to potential complaints.',
          recommendation: 'Include a dedicated email address (e.g., privacy@domain.com) for data requests.'
        });
      }

      // Проверка НДС (VAT ID)
      if (!textLower.includes('vat') && !textLower.includes('ust-id') && !textLower.includes('uid')) {
        findings.push({
          category: 'Legal',
          issue_type: 'VAT_ID_MISSING',
          severity: 'medium',
          description: 'The statutory VAT Identification number was not found in the legal documentation.',
          law_name: 'Art. 22 e-Commerce Directive',
          business_impact: 'Regulatory non-compliance for commercial websites.',
          recommendation: 'Add your official VAT/Tax ID to your Legal Notice.'
        });
      }

      // Проверка финансовых данных
      const financialKeywords = ['credit card', 'payment info', 'bank account', 'billing details', 'банковская карта'];
      const secureKeywords = ['stripe', 'paypal', 'pci-dss', 'encrypted', 'secure gateway', 'зашифрованный шлюз'];
      if (financialKeywords.some(kw => textLower.includes(kw)) && !secureKeywords.some(kw => textLower.includes(kw))) {
        findings.push({
          category: 'Security',
          issue_type: 'UNSECURED_FINANCIAL_DECLARATION',
          severity: 'high',
          description: 'Policy mentions financial data collection but does not declare secure processing via certified vendors.',
          law_name: 'Art. 32 GDPR (Security of Processing)',
          business_impact: 'High risk perception. May cause banking providers to flag your merchant account.',
          recommendation: 'Disclose that payments are handled by PCI-DSS compliant providers like Stripe or PayPal.'
        });
      }
    }

    // 10. СОХРАНЕНИЕ В БАЗУ
    console.log(`[Audit Complete] Found ${findings.length} violations for ${domainName}`);
    
    // Очистка старых данных перед записью новых (чтобы избежать дублей при перескане)
    await pool.query("DELETE FROM public.site_violations WHERE domain = $1", [domainName]);

    for (const f of findings) {
      await pool.query(
        `INSERT INTO public.site_violations (
          domain, url, page_url, category, issue_type, severity, description, law_name, recommendation, business_impact, report_type, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
        [domainName, originUrl, cleanUrl, f.category, f.issue_type, f.severity, f.description, f.law_name, f.recommendation, f.business_impact, 'SaaS']
      );
    }

    // Обновляем очередь
    await pool.query(
      `UPDATE public.scan_queue 
       SET status = 'completed', 
           violations_count = $1, 
           contacts = $2,
           crm_status = 'free'
       WHERE id = $3`,
      [findings.length, JSON.stringify(extracted), taskId]
    );

    // 11. ОТПРАВКА ОТЧЕТА
    const pdfBuffer = await generatePdfReport(domainName, findings);
    if (userEmail && pdfBuffer) {
      await transporter.sendMail({
        from: `"Humango Compliance" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject: `Statutory Audit Complete: ${domainName}`,
        text: `Your automated audit for ${domainName} is complete. Total violations identified: ${findings.length}. Please see the attached diagnostic report.`,
        attachments: [{ filename: `Humango_Audit_${domainName}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
      });
    }

  } catch (err: any) {
    console.error(`[Worker Fatal Error]`, err.message);
    await pool.query("UPDATE public.scan_queue SET status = 'failed' WHERE id = $1", [taskId]);
  } finally {
    if (browser) await browser.close();
  }
}

async function startWorker() {
  console.log("==================================================");
  console.log("   HUMANGO COMPLIANCE HUB : DEEP AUDIT ENGINE     ");
  console.log("==================================================");
  
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
      console.error("[Worker Loop Error]", e.message);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}

startWorker();
