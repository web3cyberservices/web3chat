
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

    // 1. Включаем шпионаж за сетевыми запросами до перехода на сайт
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

    console.log(`[Advanced Scanner] Запуск глубокого анализа: ${originUrl}`);
    
    // 2. Открываем сайт, но абсолютно ничего НЕ кликаем на баннерах куки
    await page.goto(originUrl, { waitUntil: 'networkidle2', timeout: 35000 });
    
    // 3. ПРОВЕРКА АНАЛИТИЧЕСКИХ ТРЕКЕРОВ В СЕТИ
    const hasGoogleAnalytics = networkUrls.some(url => url.includes('google-analytics.com') || url.includes('analytics.google'));
    const hasFacebookPixel = networkUrls.some(url => url.includes('connect.facebook.net') || url.includes('facebook.com/tr'));

    if (hasGoogleAnalytics || hasFacebookPixel) {
      console.log(`[Violation] Скрипты слежки активированы автоматически до согласия.`);
      findings.push({
        category: 'Privacy',
        issue_type: 'TRACKING_TRAFFIC_DETECTED',
        severity: 'critical',
        description: 'The system detected active network traffic to marketing/analytical platforms (Google Analytics or Meta Pixel) immediately upon page load, without prior user consent.',
        law_name: 'Art. 5(1)(a) & Art. 6 GDPR',
        business_impact: 'Critical risk of heavy regulatory fines. European authorities strictly forbid firing advertising or analytical scripts before the user explicitly clicks "Accept" on a cookie banner.',
        recommendation: 'Configure your tag manager (e.g., Google Tag Manager) or cookie consent plug-in to block the initialization of Google Analytics and Meta Pixel scripts until the user fires a valid consent event.'
      });
    }

    // 4. ПРОВЕРКА ХРАНИЛИЩА КУКИ (COOKIE INSPECTION)
    const activeCookies = await page.cookies();
    const forbiddenCookieMarkers = ['_ga', '_gid', '_fbp', '_fr', 'ads', 'metrics'];

    const hasIllegalCookies = activeCookies.some(cookie => 
      forbiddenCookieMarkers.some(marker => cookie.name.toLowerCase().includes(marker))
    );

    if (hasIllegalCookies) {
      console.log(`[Violation] Обнаружены незаконные куки в хранилище браузера.`);
      findings.push({
        category: 'GDPR',
        issue_type: 'COOKIE_CONSENT_VIOLATION',
        severity: 'critical',
        description: 'The website placed non-essential tracking/marketing cookies into the user\'s browser storage prior to any explicit interaction with the consent banner.',
        law_name: 'ePrivacy Directive & Art. 7 GDPR',
        business_impact: 'Direct non-compliance with the landmark Planet49 EU court ruling. High vulnerability during routine data protection audits.',
        recommendation: 'Implement a hard-blocking cookie mechanism. All analytical and tracking cookies must be completely withheld from the browser storage until affirmative consent is given.'
      });
    }

    // 5. СБОР КОНТАКТОВ ДЛЯ CRM
    const extracted = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const phoneRegex = /(?:\+?\d{1,3}[ -]?)?\(?\d{3}\)?[ -]?\d{3}[ -]?\d{4}/g;
      return {
        emails: Array.from(new Set(bodyText.match(emailRegex) || [])),
        phones: Array.from(new Set(bodyText.match(phoneRegex) || []))
      };
    });

    // 6. ПОИСК И АНАЛИЗ ПОЛИТИКИ
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

    let legalText = '';
    let foundUrl = originUrl;

    if (foundTarget) {
      try {
        await page.goto(foundTarget.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
        legalText = await page.evaluate(() => document.body.innerText);
        foundUrl = foundTarget.href;
      } catch (e) {}
    }

    // 7. ПРОВЕРКА ФИНАНСОВЫХ ДАННЫХ И ХРАНЕНИЯ
    if (!legalText || legalText.trim().length < 400) {
      findings.push({
        category: 'GDPR',
        issue_type: 'MISSING_CORE_FRAMEWORK',
        severity: 'critical',
        description: 'Mandatory legal disclosures (Privacy Policy or Legal Notice) were not identified in the primary site architecture.',
        law_name: 'Art. 13 GDPR',
        business_impact: 'Critical non-compliance. Site is vulnerable to immediate administrative action.',
        recommendation: 'ACTION: Implement a legal footer with direct links to mandatory documents.'
      });
    } else {
      const textLower = legalText.toLowerCase();
      
      // Сроки хранения
      const retentionRegex = /(storage|retention|store|keep|retain|period|months|years|days|24\s*months|3\s*years)/i;
      if (!retentionRegex.test(textLower)) {
        findings.push({
          category: 'Privacy',
          issue_type: 'DATA_RETENTION_MISSING',
          severity: 'high',
          description: 'The privacy statement fails to specify statutory data retention periods.',
          law_name: 'Art. 13(2)(a) GDPR',
          business_impact: 'Non-compliance with the principle of transparency.',
          recommendation: 'Add a clause: "Data is stored for a period of 24 months or until the user requests deletion."'
        });
      }

      // ПРОВЕРКА БЕЗОПАСНОСТИ СБОРА ФИНАНСОВЫХ ДАННЫХ
      const financialKeywords = ['credit card', 'payment info', 'bank account', 'billing details', 'платежные данные', 'банковская карта'];
      const secureKeywords = ['stripe', 'paypal', 'pci-dss', 'encrypted provider', 'secure gateway', 'зашифрованный шлюз'];
      
      const hasFinancialInfo = financialKeywords.some(kw => textLower.includes(kw));
      const hasSecureMention = secureKeywords.some(kw => textLower.includes(kw));

      if (hasFinancialInfo && !hasSecureMention) {
        console.log(`[Violation] Декларация финансовых данных не защищена в тексте.`);
        findings.push({
          category: 'Security',
          issue_type: 'UNSECURED_FINANCIAL_DECLARATION',
          severity: 'high',
          description: 'Your policy declares the collection or processing of financial information (such as credit card or billing details) but fails to state that this processing is delegated to a certified third-party vendor.',
          law_name: 'Art. 5(1)(c) & Art. 32 GDPR',
          business_impact: 'Triggers high-priority audits by financial regulators and data protection authorities due to perceived lack of data security frameworks.',
          recommendation: 'Insert this disclosure: "Payment Processing: All financial transactions are handled securely via encrypted, PCI-DSS compliant payment gateways (such as Stripe or PayPal). We do not store payment card numbers on our servers."'
        });
      }
    }

    // СОХРАНЕНИЕ РЕЗУЛЬТАТОВ
    for (const finding of findings) {
      await pool.query(
        `INSERT INTO public.site_violations (
          domain, url, page_url, category, issue_type, severity, description, law_name, recommendation, business_impact, report_type, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
        [domainName, originUrl, foundUrl, finding.category, finding.issue_type, finding.severity, finding.description, finding.law_name, finding.recommendation, finding.business_impact, 'SaaS']
      );
    }

    await pool.query(
      `UPDATE public.scan_queue 
       SET status = 'completed', 
           violations_count = $1, 
           contacts = $2,
           crm_status = 'free'
       WHERE id = $3`,
      [findings.length, JSON.stringify(extracted), taskId]
    );

    // ОТПРАВКА PDF
    const pdfBuffer = await generatePdfReport(domainName, findings);
    if (userEmail && pdfBuffer) {
      await transporter.sendMail({
        from: `"Humango Compliance" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject: `Compliance Audit Results for ${domainName}`,
        text: `The audit for ${domainName} is complete. Found ${findings.length} violations. See the attached report.`,
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
  console.log("[Deep Audit Worker] Logic: Network + Storage");
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
