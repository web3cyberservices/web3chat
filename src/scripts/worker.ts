
import { Pool } from 'pg';
import * as nodemailer from 'nodemailer';
import puppeteer from 'puppeteer';
import * as fs from 'fs';
import { generatePdfReport } from '../lib/report-generator';
import { checkAndFeedQueue } from './autoSeeder';

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

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "HumangoBot/1.0 (+https://bot.humango.app)"
];

const THIRD_PARTY_DOMAINS = [
  'google.com', 'facebook.com', 'twitter.com', 'linkedin.com', 'instagram.com', 
  'sentry.io', 'segment.com', 'intercom.io', 'crisp.chat', 'zendesk.com', 'drift.com',
  'hubspot.com', 'salesforce.com', 'shopify.com', 'wordpress.org', 'gravatar.com'
];

async function getExecutablePath() {
  for (const p of CHROME_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

const LEGAL_MARKERS = ['privacy', 'policy', 'terms', 'gdpr', 'datenschutz', 'personal data', 'information we collect', 'cookies', 'legal notice', 'impressum'];
const ENTERPRISE_MARKERS = ['enterprise', 'investors', 'shareholders', 'worldwide offices', 'global presence', 'fortune 500'];

async function randomDelay(min = 1000, max = 3000) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(r => setTimeout(r, ms));
}

async function scrapeContactsFromPage(page: puppeteer.Page) {
  return await page.evaluate((thirdPartyDomains) => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4,6}/g;
    const text = document.body.innerText;
    
    const getContext = (match: string, fullText: string) => {
      const idx = fullText.indexOf(match);
      if (idx === -1) return '';
      const start = Math.max(0, idx - 150);
      const end = Math.min(fullText.length, idx + match.length + 150);
      return fullText.substring(start, end).replace(/\s+/g, ' ').trim();
    };

    const foundEmails = [...new Set(text.match(emailRegex) || [])];
    const emailsWithContext = foundEmails
      .filter(email => {
        const domain = email.split('@')[1]?.toLowerCase();
        return !thirdPartyDomains.some(d => domain.includes(d));
      })
      .map(email => ({
        value: email,
        context: getContext(email, text)
      }));

    const foundPhones = [...new Set(text.match(phoneRegex) || [])];
    const phonesWithContext = foundPhones.map(phone => ({
      value: phone,
      context: getContext(phone, text)
    }));
    
    const links = Array.from(document.querySelectorAll('a[href]'))
      .map(a => (a as HTMLAnchorElement).href)
      .filter(href => {
        const h = href.toLowerCase();
        return h.includes('contact') || h.includes('impressum') || h.includes('about') || h.includes('legal');
      });

    return { emails: emailsWithContext, phones: phonesWithContext, deepLinks: [...new Set(links)] };
  }, THIRD_PARTY_DOMAINS);
}

async function executeDeterministicAudit(taskId: number, domainUrl: string, userEmail: string) {
  let browser: any = null;
  const networkUrls: string[] = [];
  const finalFindings: any[] = [];
  let leadScore = 0;
  let allExtractedEmails = new Map<string, string>();
  let allExtractedPhones = new Map<string, string>();
  
  try {
    const executablePath = await getExecutablePath();
    browser = await puppeteer.launch({ 
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    await page.setUserAgent(ua);

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

    console.log(`[Audit Engine] Analyzing: ${domainName}`);
    await page.goto(urlObj.origin, { waitUntil: 'networkidle2', timeout: 35000 });
    
    await page.mouse.wheel(0, 500);
    await randomDelay(1000, 2000);

    // --- CONTACT SCRAPING ---
    const initialContacts = await scrapeContactsFromPage(page);
    initialContacts.emails.forEach(e => allExtractedEmails.set(e.value, e.context));
    initialContacts.phones.forEach(p => allExtractedPhones.set(p.value, p.context));

    for (const link of initialContacts.deepLinks.slice(0, 2)) {
      try {
        await page.goto(link, { waitUntil: 'networkidle2', timeout: 20000 });
        const deepContacts = await scrapeContactsFromPage(page);
        deepContacts.emails.forEach(e => allExtractedEmails.set(e.value, e.context));
        deepContacts.phones.forEach(p => allExtractedPhones.set(p.value, p.context));
        await randomDelay(500, 1500);
      } catch (e) {}
    }

    // --- COMPLIANCE AUDIT ---
    const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
    
    // Enterprise Detection Penalty
    const isEnterprise = ENTERPRISE_MARKERS.some(m => pageText.includes(m));
    if (isEnterprise) leadScore -= 50;

    // --- BLOCK 1: NETWORK & COOKIES ---
    const hasGoogleFonts = networkUrls.some(url => url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com'));
    if (hasGoogleFonts) {
      leadScore += 5;
      finalFindings.push({
        type: 'GOOGLE_FONTS_PRIVACY_VIOLATION',
        basis: 'Art. 6(1)(a) GDPR',
        summary: 'External Google Fonts are loaded directly from US servers, transmitting user IP addresses without consent.',
        risk: 'High risk of automated legal warnings (Abmahnung) in DACH region.',
        liability: 'Up to €250,000 per claim.',
        action: 'Self-host fonts locally.',
        country: countryCode
      });
    }

    const hasAnalytics = networkUrls.some(url => url.includes('google-analytics.com') || url.includes('analytics.google'));
    if (hasAnalytics) {
      leadScore += 20;
      finalFindings.push({
        type: 'TRACKING_TRAFFIC_DETECTED',
        basis: 'Art. 6 GDPR',
        summary: 'Marketing scripts activated before user interaction.',
        risk: 'Critical violation of Planet49 ruling.',
        liability: 'Up to 4% turnover.',
        action: 'Block tracking scripts until opt-in.',
        country: countryCode
      });
    }

    // --- BLOCK 2: LEGAL DOCUMENT VALIDATION ---
    const markerMatchCount = LEGAL_MARKERS.filter(m => pageText.includes(m.toLowerCase())).length;
    let legalText = (pageText.length > 500 && markerMatchCount >= 2) ? pageText : '';

    if (!legalText) {
      leadScore += 100;
      finalFindings.push({
        type: 'MISSING_CORE_FRAMEWORK',
        basis: 'Art. 13 GDPR',
        summary: 'No valid Privacy Policy or legal disclosure identified.',
        risk: 'Immediate trigger for regulatory sanctions.',
        liability: 'Up to €20,000,000.',
        action: 'Create a dedicated /privacy page.',
        country: countryCode
      });
    } else {
      // --- BLOCK 3: ADVANCED TEXT ANALYSIS ---
      
      // 3.1: MISSING LEGAL BASES (Art. 6 GDPR)
      const basisKeywords = ['legal basis', 'article 6', 'legitimate interest', 'performance of a contract', 'consent', 'rechtsgrundlage', 'berechtigtes interesse', 'vertragserfüllung'];
      if (!basisKeywords.some(kw => legalText.includes(kw))) {
        leadScore += 25;
        finalFindings.push({
          type: 'MISSING_LEGAL_BASES',
          basis: 'Art. 6 GDPR',
          summary: 'Absence of explicit legal bases for data processing.',
          risk: 'Processing is legally unauthorized without defined bases.',
          liability: 'Up to €20,000,000.',
          action: 'Explicitly state legal bases (e.g., Legitimate Interest) for each processing activity.',
          country: countryCode
        });
      }

      // 3.2: MISCLASSIFIED PERSONAL DATA
      const ipRegex1 = /ip address(es)? (are|is) not personal/i;
      const ipRegex2 = /not personal data/i;
      const ipIdx = legalText.indexOf('ip');
      let foundIpMisclassification = ipRegex1.test(legalText);
      if (!foundIpMisclassification && ipIdx !== -1) {
        const snippet = legalText.substring(Math.max(0, ipIdx - 50), Math.min(legalText.length, ipIdx + 50));
        if (ipRegex2.test(snippet)) foundIpMisclassification = true;
      }
      
      if (foundIpMisclassification) {
        leadScore += 40;
        finalFindings.push({
          type: 'MISCLASSIFIED_PERSONAL_DATA',
          basis: 'ECJ Case C-582/14 (Breyer)',
          summary: 'Contradictory statement regarding IP addresses and personal data.',
          risk: 'Direct violation of established European case law.',
          liability: 'High risk of regulatory enforcement.',
          action: 'Update policy to correctly identify IP addresses as personal data.',
          country: countryCode
        });
      }

      // 3.3: VAGUE RETENTION PERIOD
      const vaguePhrases = ['as long as', 'indefinitely', 'until you request', 'solange sie', 'unbestimmte zeit'];
      if (vaguePhrases.some(v => legalText.includes(v))) {
        leadScore += 15;
        finalFindings.push({
          type: 'VAGUE_RETENTION_PERIOD',
          basis: 'Art. 5(1)(e) GDPR',
          summary: 'Unclear or indefinite data retention periods identified.',
          risk: 'Storage limitation principle violation.',
          liability: 'Up to €20M or 4% turnover.',
          action: 'Define specific storage timeframes or criteria (e.g., "stored for 24 months").',
          country: countryCode
        });
      }

      // 3.4: MISSING DPO (Art. 13(1)(b))
      const dpoKeywords = ['dpo', 'data protection officer', 'datenschutzbeauftragter'];
      if (!dpoKeywords.some(kw => legalText.includes(kw))) {
        leadScore += 10;
        finalFindings.push({
          type: 'MISSING_DPO_DETAILS',
          basis: 'Art. 13(1)(b) GDPR',
          summary: 'Failure to provide Data Protection Officer contact details.',
          risk: 'Incomplete statutory information disclosure.',
          liability: 'Administrative fines.',
          action: 'Add contact details of your DPO or dedicated privacy point of contact.',
          country: countryCode
        });
      }

      // 3.5: MISSING INTERNATIONAL TRANSFERS
      const usTrackers = networkUrls.some(url => url.includes('google') || url.includes('facebook') || url.includes('meta') || url.includes('hotjar'));
      const transferMechanisms = ['standard contractual clauses', 'scc', 'adequacy decision', 'chapter v', 'standardvertragsklauseln', 'us data privacy framework'];
      if (usTrackers && !transferMechanisms.some(kw => legalText.includes(kw))) {
        leadScore += 30;
        finalFindings.push({
          type: 'MISSING_INTERNATIONAL_TRANSFERS',
          basis: 'Schrems II / Chapter V GDPR',
          summary: 'Failing to declare international data transfer mechanisms for US services.',
          risk: 'Unlawful transfer of personal data to third countries.',
          liability: 'Suspension of data flows + high fines.',
          action: 'Incorporate Standard Contractual Clauses (SCCs) and US Data Privacy Framework declarations.',
          country: countryCode
        });
      }

      // 3.6: FINANCIAL DATA CHECK
      const financeKeywords = ['credit card', 'payment', 'billing', 'transaction', 'bank', 'wallet', 'purchases', 'checkout'];
      const securityKeywords = ['stripe', 'paypal', 'pci-dss', 'secure gateway', 'encrypted payment'];
      if (financeKeywords.some(kw => legalText.includes(kw)) && !securityKeywords.some(skw => legalText.includes(skw))) {
        leadScore += 35;
        finalFindings.push({
          type: 'UNSECURED_FINANCIAL_DECLARATION',
          basis: 'Art. 32 GDPR / e-Commerce Directive',
          summary: 'Financial transactions detected without explicit security gateway declarations.',
          risk: 'Insecure billing infrastructure risk.',
          liability: 'High liability for data breaches.',
          action: 'Mention your PCI-compliant payment providers (e.g., Stripe/PayPal) in the policy.',
          country: countryCode
        });
      }

      // 3.7: DSAR RIGHTS CHECK
      const rightsKeywords = ['withdraw', 'right to access', 'erasure', 'right to be forgotten', 'delete account'];
      if (!rightsKeywords.some(kw => legalText.includes(kw))) {
        leadScore += 25;
        finalFindings.push({
          type: 'MISSING_GDPR_RIGHTS',
          basis: 'Art. 15-21 GDPR',
          summary: 'Missing explicit user rights (Access, Erasure, Withdrawal).',
          risk: 'Fundamental transparency failure.',
          liability: 'High risk of user complaints to DPA.',
          action: 'Add a section detailing user rights: Access, Rectification, Erasure, and Objection.',
          country: countryCode
        });
      }
    }

    const emailsJson = Array.from(allExtractedEmails.entries()).map(([v, c]) => ({ value: v, context: c }));
    const phonesJson = Array.from(allExtractedPhones.entries()).map(([v, c]) => ({ value: v, context: c }));

    await pool.query(
      `UPDATE public.scan_queue 
       SET status = 'completed', 
           violations_count = $1, 
           audit_findings = $2,
           extracted_emails = $3,
           extracted_phones = $4,
           priority = $5,
           crm_status = CASE WHEN $1 > 0 THEN 'free' ELSE 'completed' END
       WHERE id = $6`,
      [
        finalFindings.length, 
        JSON.stringify(finalFindings), 
        JSON.stringify(emailsJson), 
        JSON.stringify(phonesJson), 
        Math.max(1, leadScore), 
        taskId
      ]
    );

    console.log(`[Worker] Audit finished for ${domainName}. Score: ${leadScore}. Findings: ${finalFindings.length}`);

  } catch (err: any) {
    console.error(`[Worker Error] Task ${taskId} failed:`, err.message);
    await pool.query("UPDATE scan_queue SET status = 'failed' WHERE id = $1", [taskId]);
  } finally {
    if (browser) await browser.close();
  }
}

async function executeCatalogScrape(taskId: number, url: string) {
  let browser: any = null;
  try {
    const executablePath = await getExecutablePath();
    browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENTS[0]);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href*="http"]'));
      return anchors.map(a => (a as HTMLAnchorElement).href);
    });

    const blacklist = ['google.', 'facebook.', 'linkedin.', 'youtube.', 'twitter.', 'instagram.', 'yelp.', 'sentry.', 'hubspot.'];
    const filtered = [...new Set(links)]
      .filter(l => {
        try {
          const host = new URL(l).hostname.toLowerCase();
          return !blacklist.some(b => host.includes(b));
        } catch { return false; }
      })
      .map(l => { try { return new URL(l).origin; } catch { return null; } })
      .filter(Boolean);

    for (const site of filtered.slice(0, 15)) {
      await pool.query(
        "INSERT INTO public.scan_queue (url, status, job_type, priority) VALUES ($1, 'pending', 'audit', 1) ON CONFLICT (url) DO NOTHING",
        [site]
      );
    }
    await pool.query("UPDATE scan_queue SET status = 'completed' WHERE id = $1", [taskId]);
  } catch (e) {
    await pool.query("UPDATE scan_queue SET status = 'failed' WHERE id = $1", [taskId]);
  } finally {
    if (browser) await browser.close();
  }
}

async function executeDorkSearch(taskId: number, dork: string) {
  let browser: any = null;
  try {
    const executablePath = await getExecutablePath();
    browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENTS[0]);
    
    const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(dork)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 45000 });

    const links = await page.evaluate(() => {
      const results = Array.from(document.querySelectorAll('a.result__a'));
      return results.map(a => (a as HTMLAnchorElement).href);
    });

    for (const site of links.slice(0, 10)) {
      try {
        const origin = new URL(site).origin;
        await pool.query(
          "INSERT INTO public.scan_queue (url, status, job_type, priority) VALUES ($1, 'pending', 'audit', 5) ON CONFLICT (url) DO NOTHING",
          [origin]
        );
      } catch {}
    }
    await pool.query("UPDATE scan_queue SET status = 'completed' WHERE id = $1", [taskId]);
  } catch (e) {
    await pool.query("UPDATE scan_queue SET status = 'failed' WHERE id = $1", [taskId]);
  } finally {
    if (browser) await browser.close();
  }
}

async function startWorker() {
  console.log('[Worker] Starting autonomous compliance engine...');
  while (true) {
    try {
      await checkAndFeedQueue();

      const res = await pool.query(
        "SELECT id, url, user_email, job_type FROM public.scan_queue WHERE status = 'pending' ORDER BY priority DESC, created_at ASC LIMIT 1"
      );

      if (res.rows.length > 0) {
        const task = res.rows[0];
        await pool.query("UPDATE scan_queue SET status = 'processing' WHERE id = $1", [task.id]);
        
        if (task.job_type === 'catalog_scrape') {
          await executeCatalogScrape(task.id, task.url);
        } else if (task.job_type === 'dork_search') {
          await executeDorkSearch(task.id, task.url);
        } else {
          await executeDeterministicAudit(task.id, task.url, task.user_email);
        }
      } else {
        await new Promise(r => setTimeout(r, 10000));
      }
    } catch (e: any) {
      console.error('[Worker Loop Error]', e.message);
      await new Promise(r => setTimeout(r, 15000));
    }
  }
}

startWorker();
