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

const THIRD_PARTY_DOMAINS = ['google.com', 'facebook.com', 'twitter.com', 'linkedin.com', 'sentry.io', 'segment.com', 'intercom.io', 'hubspot.com', 'meta.com'];
const LEGAL_MARKERS = ['privacy', 'policy', 'terms', 'gdpr', 'datenschutz', 'impressum'];

async function scrapeContactsWithContext(page: puppeteer.Page) {
  return await page.evaluate((thirdParty) => {
    const text = document.body.innerText;
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4,6}/g;

    const getContext = (match: string) => {
      const idx = text.indexOf(match);
      return text.substring(Math.max(0, idx - 150), Math.min(text.length, idx + match.length + 150)).replace(/\s+/g, ' ').trim();
    };

    const emails = [...new Set(text.match(emailRegex) || [])]
      .filter(e => !thirdParty.some(d => e.toLowerCase().includes(d)))
      .map(e => ({ value: e, context: getContext(e) }));

    const phones = [...new Set(text.match(phoneRegex) || [])]
      .map(p => ({ value: p, context: getContext(p) }));

    const links = Array.from(document.querySelectorAll('a[href]'))
      .map(a => (a as HTMLAnchorElement).href)
      .filter(h => h.toLowerCase().includes('contact') || h.toLowerCase().includes('impressum') || h.toLowerCase().includes('legal'));

    return { emails, phones, links: [...new Set(links)] };
  }, THIRD_PARTY_DOMAINS);
}

async function executeDeterministicAudit(taskId: number, url: string) {
  let browser: any = null;
  const networkUrls: string[] = [];
  const findings: any[] = [];
  let leadScore = 0;
  let emails = new Map();
  let phones = new Map();

  try {
    const executablePath = await getExecutablePath();
    browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    
    page.on('request', r => networkUrls.push(r.url().toLowerCase()));
    await page.setRequestInterception(true);
    page.on('request', r => r.continue());

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 40000 });
    
    const initial = await scrapeContactsWithContext(page);
    initial.emails.forEach(e => emails.set(e.value, e.context));
    initial.phones.forEach(p => phones.set(p.value, p.context));

    for (const link of initial.links.slice(0, 2)) {
      try {
        await page.goto(link, { waitUntil: 'networkidle2', timeout: 20000 });
        const deep = await scrapeContactsWithContext(page);
        deep.emails.forEach(e => emails.set(e.value, e.context));
        deep.phones.forEach(p => phones.set(p.value, p.context));
      } catch (e) {}
    }

    const legalText = await page.evaluate(() => document.body.innerText.toLowerCase());
    
    // 1. MISSING CORE
    if (!LEGAL_MARKERS.some(m => legalText.includes(m))) {
      leadScore += 100;
      findings.push({
        type: 'MISSING_CORE_FRAMEWORK',
        liability: 'Up to €20,000,000.',
        summary: 'No Privacy Policy or legal disclosure identified.',
        description: 'Site architecture lacks visible data processing terms.',
        recommendation: 'ACTION: Create a /privacy page immediately.'
      });
    } else {
      // 2. LEGAL BASES
      if (!['legal basis', 'article 6', 'legitimate interest', 'rechtsgrundlage'].some(kw => legalText.includes(kw))) {
        leadScore += 25;
        findings.push({ type: 'MISSING_LEGAL_BASES', liability: 'Up to 4% turnover.', summary: 'Absence of explicit legal bases.', description: 'Statutory grounds for processing are not declared.', recommendation: 'ACTION: Add Art. 6 legal grounds.' });
      }
      // 3. IP DATA
      if (/ip address(es)? (are|is) not personal/i.test(legalText)) {
        leadScore += 40;
        findings.push({ type: 'MISCLASSIFIED_PERSONAL_DATA', liability: 'Critical non-compliance.', summary: 'IP addresses falsely claimed as non-personal.', description: 'Misleading statement regarding technical identifiers.', recommendation: 'ACTION: Correct classification of IP addresses.' });
      }
      // 4. RETENTION
      if (['as long as', 'indefinitely', 'unbestimmte zeit'].some(kw => legalText.includes(kw))) {
        leadScore += 20;
        findings.push({ type: 'VAGUE_RETENTION_PERIOD', liability: 'Up to €20M.', summary: 'Unclear data retention periods.', description: 'Storage limitation principle violated.', recommendation: 'ACTION: Define specific periods (e.g. 24 months).' });
      }
      // 5. DPO
      if (!['dpo', 'data protection officer', 'datenschutzbeauftragter'].some(kw => legalText.includes(kw))) {
        leadScore += 15;
        findings.push({ type: 'MISSING_DPO_DETAILS', liability: 'Administrative fine.', summary: 'DPO contact details missing.', description: 'Failure to provide a statutory point of contact.', recommendation: 'ACTION: Add DPO email.' });
      }
      // 6. TRANSFERS
      const hasUS = networkUrls.some(u => u.includes('google') || u.includes('facebook') || u.includes('meta'));
      if (hasUS && !['standard contractual clauses', 'scc', 'data privacy framework'].some(kw => legalText.includes(kw))) {
        leadScore += 30;
        findings.push({ type: 'MISSING_INTERNATIONAL_TRANSFERS', liability: 'Suspension of data flows.', summary: 'Missing US data transfer declarations.', description: 'Google/Meta active without SCC declarations.', recommendation: 'ACTION: Add SCC declarations.' });
      }
    }

    const finalEmails = Array.from(emails.entries()).map(([v, c]) => ({ value: v, context: c }));
    const finalPhones = Array.from(phones.entries()).map(([v, c]) => ({ value: v, context: c }));

    // LEAD TRIAGE LOGIC
    let crmStatus = 'ready_for_sales';
    if (findings.length > 0 && finalEmails.length === 0) {
      crmStatus = 'needs_analyst';
    } else if (findings.length === 0) {
      crmStatus = 'compliant';
    }

    await pool.query(
      `UPDATE public.scan_queue 
       SET status = 'completed', 
           violations_count = $1, 
           audit_findings = $2,
           extracted_emails = $3,
           extracted_phones = $4,
           priority = $5,
           crm_status = $6
       WHERE id = $7`,
      [findings.length, JSON.stringify(findings), JSON.stringify(finalEmails), JSON.stringify(finalPhones), Math.max(1, leadScore), crmStatus, taskId]
    );

    console.log(`[Triage] ${url} -> ${crmStatus} (Score: ${leadScore})`);
  } catch (e: any) {
    console.error(`[Worker Error] Task ${taskId} failed:`, e.message);
    await pool.query("UPDATE public.scan_queue SET status = 'failed' WHERE id = $1", [taskId]);
  } finally {
    if (browser) await browser.close();
  }
}

async function startWorker() {
  console.log('[Worker] Starting Lead Triage Engine...');
  while (true) {
    try {
      await checkAndFeedQueue();
      const res = await pool.query("SELECT id, url FROM public.scan_queue WHERE status = 'pending' ORDER BY priority DESC, created_at ASC LIMIT 1");
      if (res.rows.length > 0) {
        const task = res.rows[0];
        await pool.query("UPDATE public.scan_queue SET status = 'processing' WHERE id = $1", [task.id]);
        await executeDeterministicAudit(task.id, task.url);
      } else {
        await new Promise(r => setTimeout(r, 10000));
      }
    } catch (e: any) {
      await new Promise(r => setTimeout(r, 15000));
    }
  }
}

startWorker();