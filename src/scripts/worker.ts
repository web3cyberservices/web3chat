'use server';

import { Pool } from 'pg';
import puppeteer from 'puppeteer';
import * as dotenv from 'dotenv';
import { checkAndFeedQueue } from './autoSeeder';
import { generatePdfReport } from '../lib/report-generator';
import * as nodemailer from 'nodemailer';

dotenv.config();

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
  tls: { rejectUnauthorized: false }
});

const JURISDICTION_RULES: Record<string, any> = {
  'de': { lang: ['datenschutz', 'impressum'], requiredLinks: ['impressum'], tokens: ['handelsregister', 'ust-idnr'], prefix: 'DE_AT' },
  'at': { lang: ['datenschutz', 'impressum'], requiredLinks: ['impressum'], tokens: ['firmenbuch', 'uid-nummer'], prefix: 'DE_AT' },
  'fr': { lang: ['confidentialité', 'mentions légales'], requiredLinks: ['mentions légales'], tokens: ['siret', 'r.c.s'], prefix: 'FR' },
  'es': { lang: ['privacidad', 'aviso legal'], requiredLinks: ['aviso legal'], tokens: ['cif', 'nif'], prefix: 'ES' },
  'it': { lang: ['privacy', 'note legali'], requiredLinks: ['note legali'], tokens: ['partita iva', 'p.iva'], prefix: 'IT' },
  'nl': { lang: ['privacybeleid', 'colofon'], requiredLinks: ['colofon'], tokens: ['kvk-nummer'], prefix: 'NL' }
};

async function performAudit(page: puppeteer.Page, scanId: number, url: string, userEmail?: string) {
  const finalFindings: any[] = [];
  let extractedEmails: any[] = [];
  let extractedPhones: any[] = [];
  let hasUS_Trackers = false;
  let legalText = '';
  let leadScore = 0;

  try {
    const domain = new URL(url).hostname.toLowerCase();
    const tld = domain.split('.').pop() || 'com';
    const localRule = JURISDICTION_RULES[tld];

    // --- STEP 1: NETWORK & COOKIES ---
    await page.setRequestInterception(true);
    page.on('request', req => {
      const rUrl = req.url().toLowerCase();
      if (rUrl.includes('google-analytics') || rUrl.includes('facebook.com/tr') || rUrl.includes('doubleclick')) {
        hasUS_Trackers = true;
        if (!finalFindings.some(f => f.type === 'TRACKING_TRAFFIC_DETECTED')) {
          finalFindings.push({
            type: 'TRACKING_TRAFFIC_DETECTED',
            summary: 'Illegal pre-consent tracking.',
            liability: 'Up to €20,000,000 or 4% of turnover.',
            recommendation: 'ACTION: Implement strict prior-blocking CMP.'
          });
        }
      }
      req.continue();
    });

    if (!url.startsWith('https://')) {
      finalFindings.push({ type: 'UNSECURED_CONNECTION', summary: 'Non-HTTPS Protocol.', liability: 'Art. 32 GDPR violation.', recommendation: 'ACTION: Force SSL/TLS.' });
      leadScore += 30;
    }

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 40000 });

    // --- STEP 2: JURISDICTION DETECTION ---
    if (localRule) {
      const pageHtml = (await page.content()).toLowerCase();
      const hasLegalLink = await page.evaluate((markers) => {
        return Array.from(document.querySelectorAll('a')).some(a => markers.some(m => a.innerText.toLowerCase().includes(m)));
      }, localRule.requiredLinks);

      if (!hasLegalLink) {
        finalFindings.push({
          type: `MISSING_LOCALIZED_DISCLOSURE_${localRule.prefix}`,
          summary: `Missing mandatory ${localRule.requiredLinks[0]} link.`,
          liability: 'Administrative fines up to €50,000.',
          recommendation: `ACTION: Create a /legal page with operator identity.`
        });
        leadScore += 50;
      }
    }

    // --- STEP 3: DOCUMENT VALIDATION ---
    const privacyLink = await page.evaluate(() => {
      const markers = ['privacy', 'datenschutz', 'confidentialité', 'privacidad', 'prywatности'];
      const found = Array.from(document.querySelectorAll('a')).find(a => markers.some(m => a.innerText.toLowerCase().includes(m)));
      return found ? found.href : null;
    });

    let targetLegalUrl = privacyLink || `${new URL(url).origin}/privacy`;
    try {
      await page.goto(targetLegalUrl, { waitUntil: 'networkidle2', timeout: 25000 });
      const rawText = await page.evaluate(() => document.body.innerText);
      if (rawText.length > 300 && ['privacy', 'policy', 'datenschutz', 'personal data'].some(m => rawText.toLowerCase().includes(m))) {
        legalText = rawText.toLowerCase();
      }
    } catch (e) {}

    if (!legalText) {
      finalFindings.push({ type: 'MISSING_CORE_FRAMEWORK', summary: 'Critical Transparency Failure.', liability: 'Maximum GDPR fine.', recommendation: 'ACTION: Create and link a /privacy page.' });
      leadScore += 100;
    } else {
      // --- STEP 4: SEMANTIC ANALYSIS ---
      if (!['legal basis', 'article 6', 'rechtsgrundlage', 'base légale'].some(kw => legalText.includes(kw))) {
        finalFindings.push({ type: 'MISSING_LEGAL_BASES', summary: 'No explicit legal basis declared.', liability: 'Art. 13(1)(c) violation.', recommendation: 'ACTION: Explicitly cite processing grounds.' });
      }
      if (/ip address(es)? (are|is) not personal/i.test(legalText)) {
        finalFindings.push({ type: 'MISCLASSIFIED_PERSONAL_DATA', summary: 'IP Address misclassification.', liability: 'High risk of litigation.', recommendation: 'ACTION: Correct IP data classification.' });
      }
      if (['as long as', 'indefinitely', 'unbestimmte zeit'].some(kw => legalText.includes(kw))) {
        finalFindings.push({ type: 'VAGUE_RETENTION_PERIOD', summary: 'Vague data retention terms.', liability: 'Art. 5(1)(e) violation.', recommendation: 'ACTION: Define exact periods (e.g. 24 months).' });
      }
    }

    // --- STEP 5: CONTACT SCRAPING WITH CONTEXT ---
    const extractContacts = async (p: puppeteer.Page) => {
      return await p.evaluate(() => {
        const text = document.body.innerText;
        const eRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        
        const getCtx = (t: string, m: string) => {
          const i = t.indexOf(m);
          const start = Math.max(0, i - 150);
          const end = Math.min(t.length, i + m.length + 150);
          return t.substring(start, end).replace(/\s+/g, ' ').trim();
        };

        const emails = Array.from(new Set(text.match(eRegex) || []))
          .filter(e => !['sentry', 'google', 'facebook', 'example'].some(d => e.toLowerCase().includes(d)))
          .map(e => ({ value: e, context: getCtx(text, e) }));

        return { emails, phones: [] };
      });
    };

    const contacts = await extractContacts(page);
    extractedEmails = contacts.emails;

    // --- STEP 6: TRIAGE & DELIVERY ---
    let crmStatus = 'compliant';
    if (finalFindings.length > 0) {
      crmStatus = (extractedEmails.length > 0) ? 'ready_for_sales' : 'needs_analyst';
    }

    await pool.query(
      `UPDATE public.scan_queue 
       SET status = 'completed', crm_status = $1, violations_count = $2, 
           audit_findings = $3, extracted_emails = $4, priority = $5, updated_at = NOW()
       WHERE id = $6`,
      [crmStatus, finalFindings.length, JSON.stringify(finalFindings), JSON.stringify(extractedEmails), leadScore, scanId]
    );

    // MANUAL DELIVERY: If user requested scan from home page, send PDF now
    if (userEmail && userEmail.length > 5) {
       const pdfBuffer = await generatePdfReport(domain, finalFindings);
       if (pdfBuffer) {
         await transporter.sendMail({
           from: `"Humango Compliance" <${process.env.SMTP_USER}>`,
           to: userEmail,
           subject: `Statutory Audit Report: ${domain}`,
           text: `Audit for ${domain} is complete. Find your report attached.`,
           attachments: [{ filename: `Audit_${domain}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
         });
       }
    }

    console.log(`[Worker] Done: ${domain} -> ${crmStatus}`);
  } catch (err: any) {
    console.error(`[Worker Error] Task ${scanId} failed:`, err.message);
    await pool.query("UPDATE public.scan_queue SET status = 'failed' WHERE id = $1", [scanId]);
  }
}

async function startWorker() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  while (true) {
    try {
      await checkAndFeedQueue(pool);
      const res = await pool.query(
        "SELECT id, url, user_email FROM public.scan_queue WHERE status IN ('pending', 'processing') ORDER BY priority DESC, created_at ASC LIMIT 1"
      );

      if (res.rows.length > 0) {
        const task = res.rows[0];
        await pool.query("UPDATE public.scan_queue SET status = 'processing', updated_at = NOW() WHERE id = $1", [task.id]);
        const page = await browser.newPage();
        await performAudit(page, task.id, task.url, task.user_email);
        await page.close();
      } else {
        await new Promise(r => setTimeout(r, 10000));
      }
    } catch (e: any) { console.error(e.message); await new Promise(r => setTimeout(r, 15000)); }
  }
}

startWorker();
