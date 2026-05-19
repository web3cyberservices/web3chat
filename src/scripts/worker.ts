import { Pool } from 'pg';
import puppeteer from 'puppeteer';
import * as fs from 'fs';
import path from 'path';
import { checkAndFeedQueue } from './autoSeeder';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
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

const THIRD_PARTY_DOMAINS = ['google.com', 'facebook.com', 'twitter.com', 'linkedin.com', 'sentry.io', 'segment.com', 'intercom.io', 'hubspot.com', 'meta.com', 'shopify.com'];
const CORPORATE_GIANTS = ['hubspot.com', 'salesforce.com', 'bambora.com', 'sap.com', 'oracle.com', 'microsoft.com'];
const LEGAL_MARKERS = ['privacy', 'policy', 'terms', 'gdpr', 'datenschutz', 'personal data', 'information we collect'];

/**
 * ЭТАЛОННАЯ ФУНКЦИЯ АУДИТА V5.0
 * Объединяет сетевой анализ, DOM-анализ, семантику и систему Lead Scoring.
 */
async function performAudit(page: puppeteer.Page, scanId: number, url: string) {
  const finalFindings: any[] = [];
  let extractedEmails: any[] = [];
  let extractedPhones: any[] = [];
  let hasUS_Trackers = false;
  let externalRequestCount = 0;
  let legalText = '';
  let leadScore = 0;

  try {
    // --- ШАГ 1: NETWORK & COOKIES (Сетевой аудит) ---
    await page.setRequestInterception(true);
    page.on('request', request => {
      const reqUrl = request.url().toLowerCase();
      const domain = new URL(url).hostname.toLowerCase();
      
      if (!reqUrl.includes(domain) && !reqUrl.startsWith('data:')) {
        externalRequestCount++;
      }

      if (reqUrl.includes('google-analytics') || reqUrl.includes('facebook.com/tr') || reqUrl.includes('doubleclick')) {
        hasUS_Trackers = true;
        if (!finalFindings.some(f => f.type === 'TRACKING_TRAFFIC_DETECTED')) {
          finalFindings.push({
            type: 'TRACKING_TRAFFIC_DETECTED',
            summary: 'Active background tracking detected.',
            description: 'The site transmits data to advertising pixels before/without explicit consent.',
            liability: 'Up to €20M or 4% of turnover.',
            recommendation: 'ACTION: Implement a strict blocking CMP.'
          });
        }
      }
      request.continue();
    });

    // 1. ПРОВЕРКА HTTPS
    if (!url.startsWith('https://')) {
      finalFindings.push({
        type: 'UNSECURED_CONNECTION',
        summary: 'Non-HTTPS Connection.',
        description: 'The site uses unencrypted HTTP protocol, exposing user data to interception.',
        liability: 'Violation of Art. 32 GDPR (Security of Processing).',
        recommendation: 'ACTION: Install an SSL certificate and force HTTPS.'
      });
      leadScore += 30;
    }

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    
    // 2. ПРОВЕРКА COOKIE БАННЕРА (DOM Анализ)
    const cookies = await page.cookies();
    const marketingCookies = cookies.filter(c => ['_ga', '_fbp', '_gcl_au', 'ads', 'personalization'].some(m => c.name.includes(m)));
    
    const hasCMP = await page.evaluate(() => {
      const cmpSelectors = ['#onetrust-consent-sdk', '#cookie-law-info-bar', '.cc-window', '[id*="cookie-banner"]', '[class*="cookie-banner"]', '.js-cookie-consent', '#usercentrics-root'];
      return cmpSelectors.some(s => document.querySelector(s) !== null);
    });

    if (!hasCMP && marketingCookies.length > 0) {
      finalFindings.push({
        type: 'MISSING_CMP_BANNER',
        summary: 'Marketing cookies without consent banner.',
        description: `Detected ${marketingCookies.length} tracking cookies, but no visible Consent Management Platform (CMP).`,
        liability: 'GDPR Art. 5(3) ePrivacy violation.',
        recommendation: 'ACTION: Install a GDPR-compliant cookie banner.'
      });
      leadScore += 50;
    }

    // 3. ПРОВЕРКА IMPRESSUM (DOM Анализ)
    const hasImpressum = await page.evaluate(() => {
      const markers = ['impressum', 'imprint', 'legal notice', 'mentions legales', 'kontakt'];
      const links = Array.from(document.querySelectorAll('a'));
      return links.some(a => markers.some(m => a.innerText.toLowerCase().includes(m) || a.href.toLowerCase().includes(m)));
    });

    if (!hasImpressum) {
      finalFindings.push({
        type: 'MISSING_IMPRESSUM',
        summary: 'No Legal Notice (Impressum) found.',
        description: 'Statutory operator information is missing from the navigation.',
        liability: 'Fine up to €50,000 under national laws (e.g., TMG/DDG).',
        recommendation: 'ACTION: Create an Impressum page with company registration details.'
      });
      leadScore += 40;
    }

    // --- ШАГ 2: STRICT DOCUMENT VALIDATION (Поиск Политики) ---
    const privacyLink = await page.evaluate((markers) => {
      const links = Array.from(document.querySelectorAll('a'));
      const found = links.find(a => markers.some(m => a.innerText.toLowerCase().includes(m)));
      return found ? found.href : null;
    }, ['privacy', 'datenschutz', 'legal', 'policy']);

    let targetLegalUrl = privacyLink || `${new URL(url).origin}/privacy`;
    
    try {
      await page.goto(targetLegalUrl, { waitUntil: 'networkidle2', timeout: 25000 });
      const rawText = await page.evaluate(() => document.body.innerText);
      const isActuallyLegal = LEGAL_MARKERS.some(m => rawText.toLowerCase().includes(m));

      if (rawText.length > 200 && isActuallyLegal) {
        legalText = rawText.toLowerCase();
      }
    } catch (e) {}

    if (!legalText || legalText.length < 200) {
      legalText = '';
      finalFindings.push({
        type: 'MISSING_CORE_FRAMEWORK',
        summary: 'No valid Privacy Policy identified.',
        description: 'The site architecture fails to provide a readable statutory disclosure document.',
        liability: 'Up to €20,000,000.',
        recommendation: 'ACTION: Create and link a /privacy page immediately.'
      });
      leadScore += 100;
    } else {
      // --- ШАГ 3: DEEP SEMANTIC ANALYSIS (Если текст есть) ---
      
      // 1. Financial
      if (['payment', 'credit card', 'billing'].some(kw => legalText.includes(kw)) && !['stripe', 'paypal', 'pci-dss'].some(kw => legalText.includes(kw))) {
        finalFindings.push({ type: 'UNSECURED_FINANCIAL_DECLARATION', summary: 'Missing payment processor transparency.', description: 'Financial terms found but no secure processor declared.', liability: 'High', recommendation: 'ACTION: Declare Stripe/PayPal integration.' });
      }

      // 2. GDPR Rights
      if (!['withdraw', 'erasure', 'right to be forgotten', 'löschung'].some(kw => legalText.includes(kw))) {
        finalFindings.push({ type: 'MISSING_GDPR_RIGHTS', summary: 'Individual rights not fully declared.', description: 'Missing mandatory clauses for data deletion/access.', liability: 'Up to 20M.', recommendation: 'ACTION: Add Art. 15-21 GDPR rights.' });
      }

      // 3. Legal Bases (Art. 6)
      if (!['legal basis', 'article 6', 'legitimate interest', 'rechtsgrundlage'].some(kw => legalText.includes(kw))) {
        finalFindings.push({ type: 'MISSING_LEGAL_BASES', summary: 'Art. 6 legal grounds missing.', description: 'The policy fails to state the legal basis for processing.', liability: 'Critical.', recommendation: 'ACTION: Explicitly cite Art. 6(1) grounds.' });
      }

      // 4. Misclassified Data
      if (/ip address(es)? (are|is) not personal/i.test(legalText)) {
        finalFindings.push({ type: 'MISCLASSIFIED_PERSONAL_DATA', summary: 'IP Address misclassification.', description: 'Incorrect claim that technical identifiers are non-personal.', liability: 'High.', recommendation: 'ACTION: Correct IP data classification.' });
      }

      // 5. Vague Retention
      if (['as long as', 'indefinitely', 'unbestimmte zeit'].some(kw => legalText.includes(kw)) || !/\d+ (month|year|monat|jahr)/i.test(legalText)) {
        finalFindings.push({ type: 'VAGUE_RETENTION_PERIOD', summary: 'Unclear storage limitation.', description: 'Vague terms regarding how long data is kept.', liability: 'Art. 5 violation.', recommendation: 'ACTION: Define exact periods (e.g. 24 months).' });
      }

      // 6. Right to Lodge Complaint
      if (!['supervisory authority', 'lodge a complaint', 'aufsichtsbehörde', 'beschwerde'].some(kw => legalText.includes(kw))) {
        finalFindings.push({ type: 'MISSING_SUPERVISORY_AUTHORITY', summary: 'Missing right to lodge complaint.', description: 'Failure to inform users about their right to contact a regulator.', liability: 'Art. 13(2)(d) violation.', recommendation: 'ACTION: Add information about the competent DPA.' });
      }

      // 7. Undeclared Third Parties
      if (externalRequestCount > 5 && !['third part', 'service provider', 'subprocessor', 'dritte', 'dienstleister'].some(kw => legalText.includes(kw))) {
        finalFindings.push({ type: 'UNDECLARED_THIRD_PARTIES', summary: 'Undeclared data subprocessors.', description: 'The site connects to external domains but doesn\'t list them in the policy.', liability: 'Transparency failure.', recommendation: 'ACTION: List all third-party tools (Analytics, CDNs, etc).' });
      }

      // 8. Int. Transfers
      if (hasUS_Trackers && !['standard contractual clauses', 'scc', 'adequacy decision', 'standardvertragsklauseln'].some(kw => legalText.includes(kw))) {
        finalFindings.push({ type: 'MISSING_INTERNATIONAL_TRANSFERS', summary: 'Illegal US data transfers.', description: 'Third-party US trackers active without SCC declarations.', liability: 'Suspension of data flows.', recommendation: 'ACTION: Add Standard Contractual Clauses.' });
      }
      
      leadScore += (finalFindings.length * 20);
    }

    // --- ШАГ 4: CONTACT SCRAPING (С контекстом) ---
    const scrapePageContacts = async (p: puppeteer.Page) => {
      return await p.evaluate((blacklist) => {
        const txt = document.body.innerText;
        const eRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const pRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4,6}/g;
        
        const getContext = (t: string, match: string) => {
          const idx = t.indexOf(match);
          return t.substring(Math.max(0, idx - 150), Math.min(t.length, idx + match.length + 150)).replace(/\s+/g, ' ').trim();
        };

        const foundEmails = Array.from(new Set(txt.match(eRegex) || []))
          .filter(e => !blacklist.some(d => e.toLowerCase().includes(d)))
          .map(e => ({ value: e, context: getContext(txt, e) }));

        const foundPhones = Array.from(new Set(txt.match(pRegex) || []))
          .map(ph => ({ value: ph, context: getContext(txt, ph) }));

        return { emails: foundEmails, phones: foundPhones };
      }, THIRD_PARTY_DOMAINS);
    };

    const mainContacts = await scrapePageContacts(page);
    extractedEmails.push(...mainContacts.emails);
    extractedPhones.push(...mainContacts.phones);

    // --- ШАГ 5: TRIAGE & DB UPDATE ---
    const domain = new URL(url).hostname.toLowerCase();
    if (CORPORATE_GIANTS.some(g => domain.includes(g))) leadScore -= 50;
    if (finalFindings.length === 1 && finalFindings[0].type.includes('FONTS')) leadScore = 10;

    let crmStatus = (finalFindings.length > 0) ? (extractedEmails.length > 0 ? 'ready_for_sales' : 'needs_analyst') : 'compliant';

    await pool.query(
      `UPDATE public.scan_queue 
       SET status = 'completed', 
           violations_count = $1, 
           audit_findings = $2,
           extracted_emails = $3,
           extracted_phones = $4,
           priority = $5,
           crm_status = $6,
           created_at = NOW()
       WHERE id = $7`,
      [finalFindings.length, JSON.stringify(finalFindings), JSON.stringify(extractedEmails), JSON.stringify(extractedPhones), Math.max(1, leadScore), crmStatus, scanId]
    );

    console.log(`[Audit V5.0] ${url} -> ${crmStatus} (Score: ${leadScore})`);

  } catch (err: any) {
    console.error(`[Worker Error] Task ${scanId} failed:`, err.message);
    await pool.query("UPDATE public.scan_queue SET status = 'failed' WHERE id = $1", [scanId]);
  }
}

async function startWorker() {
  const executablePath = await getExecutablePath();
  const browser = await puppeteer.launch({ 
    executablePath, headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
  });

  while (true) {
    try {
      await checkAndFeedQueue();
      const res = await pool.query("SELECT id, url FROM public.scan_queue WHERE status = 'pending' ORDER BY priority DESC, created_at ASC LIMIT 1");

      if (res.rows.length > 0) {
        const task = res.rows[0];
        await pool.query("UPDATE public.scan_queue SET status = 'processing' WHERE id = $1", [task.id]);
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
        await performAudit(page, task.id, task.url);
        await page.close();
      } else {
        await new Promise(r => setTimeout(r, 10000));
      }
    } catch (e: any) {
      console.error('[Worker Loop Error]:', e.message);
      await new Promise(r => setTimeout(r, 15000));
    }
  }
}

startWorker();
