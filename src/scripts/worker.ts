
import { Pool } from 'pg';
import puppeteer from 'puppeteer';
import * as dotenv from 'dotenv';
import { checkAndFeedQueue } from './autoSeeder';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * @fileOverview Localized GDPR Audit Engine v6.0
 * Integrated Jurisdiction detection, Semantic AI, and Triage Routing.
 */

interface JurisdictionRule {
  lang: string[];
  requiredLinks: string[];
  requiredTokens: string[];
  findingPrefix: string;
}

const JURISDICTION_RULES: Record<string, JurisdictionRule> = {
  'de': { 
    lang: ['datenschutz', 'impressum'], 
    requiredLinks: ['impressum', 'legal notice'], 
    requiredTokens: ['handelsregister', 'umsatzsteuer', 'ust-idnr'], 
    findingPrefix: 'DE_AT' 
  },
  'at': { 
    lang: ['datenschutz', 'impressum'], 
    requiredLinks: ['impressum'], 
    requiredTokens: ['firmenbuch', 'uid-nummer'], 
    findingPrefix: 'DE_AT' 
  },
  'fr': { 
    lang: ['confidentialité', 'mentions légales'], 
    requiredLinks: ['mentions légales', 'politique de confidentialité'], 
    requiredTokens: ['siret', 'r.c.s', 'cnil'], 
    findingPrefix: 'FR' 
  },
  'es': { 
    lang: ['privacidad', 'aviso legal'], 
    requiredLinks: ['aviso legal', 'política de privacidad'], 
    requiredTokens: ['cif', 'nif', 'registro mercantil'], 
    findingPrefix: 'ES' 
  },
  'it': { 
    lang: ['privacy', 'note legali'], 
    requiredLinks: ['note legali', 'informativa privacy'], 
    requiredTokens: ['partita iva', 'p.iva', 'codice fiscale'], 
    findingPrefix: 'IT' 
  },
  'nl': { 
    lang: ['privacybeleid', 'colofon'], 
    requiredLinks: ['colofon', 'privacy policy'], 
    requiredTokens: ['kvk-nummer', 'btw-nummer'], 
    findingPrefix: 'NL' 
  },
  'pl': { 
    lang: ['prywatności', 'regulamin'], 
    requiredLinks: ['regulamin', 'polityka prywatności'], 
    requiredTokens: ['nip', 'krs', 'regon'], 
    findingPrefix: 'PL' 
  }
};

async function performAudit(page: puppeteer.Page, scanId: number, url: string) {
  const finalFindings: any[] = [];
  let extractedEmails: any[] = [];
  let extractedPhones: any[] = [];
  let hasUS_Trackers = false;
  let legalText = '';
  let leadScore = 0;

  try {
    const domain = new URL(url).hostname.toLowerCase();
    const tld = domain.split('.').pop() || 'com';
    const localRule = JURISDICTION_RULES[tld] || null;

    // --- ШАГ 1: NETWORK & COOKIES ---
    await page.setRequestInterception(true);
    page.on('request', req => {
      const rUrl = req.url().toLowerCase();
      if (rUrl.includes('google-analytics') || rUrl.includes('facebook.com/tr') || rUrl.includes('doubleclick')) {
        hasUS_Trackers = true;
        if (!finalFindings.some(f => f.type === 'TRACKING_TRAFFIC_DETECTED')) {
          finalFindings.push({
            type: 'TRACKING_TRAFFIC_DETECTED',
            summary: 'Illegal pre-consent tracking.',
            description: 'The site transmits data to US advertising pixels before explicit consent.',
            liability: 'Up to €20,000,000 or 4% of turnover.',
            recommendation: 'ACTION: Implement strict prior-blocking CMP.'
          });
        }
      }
      req.continue();
    });

    if (!url.startsWith('https://')) {
      finalFindings.push({ type: 'UNSECURED_CONNECTION', summary: 'Non-HTTPS Protocol.', description: 'Site uses HTTP, exposing data to MITM attacks.', liability: 'Art. 32 GDPR violation.', recommendation: 'ACTION: Force SSL/TLS.' });
      leadScore += 30;
    }

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 40000 });

    // --- ШАГ 2: JURISDICTION SPECIFIC CHECKS ---
    if (localRule) {
      const pageHtml = (await page.content()).toLowerCase();
      const hasImpressumLink = await page.evaluate((markers) => {
        return Array.from(document.querySelectorAll('a')).some(a => markers.some(m => a.innerText.toLowerCase().includes(m)));
      }, localRule.requiredLinks);

      if (!hasImpressumLink) {
        finalFindings.push({
          type: `MISSING_LOCALIZED_DISCLOSURE_${localRule.findingPrefix}`,
          summary: `Missing mandatory ${localRule.requiredLinks[0]} link.`,
          description: `Sites in .${tld} jurisdiction must have a clearly visible link to owner identity.`,
          liability: 'Administrative fines up to €50,000.',
          recommendation: `ACTION: Create a /legal page with company registration details.`
        });
        leadScore += 50;
      }

      const missingTokens = localRule.requiredTokens.filter(t => !pageHtml.includes(t));
      if (missingTokens.length > 1) {
        finalFindings.push({
          type: `INCOMPLETE_TRADER_DATA_${localRule.findingPrefix}`,
          summary: 'Missing statutory identification data.',
          description: `Mandatory identifiers (${missingTokens.join(', ')}) were not identified on the page.`,
          liability: 'Consumer protection violation.',
          recommendation: 'ACTION: Update footer/contacts with VAT ID and Registry number.'
        });
        leadScore += 40;
      }
    }

    // --- ШАГ 3: STRICT DOCUMENT VALIDATION ---
    const privacyLink = await page.evaluate(() => {
      const markers = ['privacy', 'datenschutz', 'confidentialité', 'privacidad', 'prywatności', 'legal'];
      const found = Array.from(document.querySelectorAll('a')).find(a => markers.some(m => a.innerText.toLowerCase().includes(m)));
      return found ? found.href : null;
    });

    let targetLegalUrl = privacyLink || `${new URL(url).origin}/privacy`;
    try {
      await page.goto(targetLegalUrl, { waitUntil: 'networkidle2', timeout: 25000 });
      const rawText = await page.evaluate(() => document.body.innerText);
      const markers = ['privacy', 'policy', 'datenschutz', 'confidentialité', 'privacidad', 'personal data'];
      if (rawText.length > 250 && markers.some(m => rawText.toLowerCase().includes(m))) {
        legalText = rawText.toLowerCase();
      }
    } catch (e) {}

    if (!legalText) {
      finalFindings.push({ type: 'MISSING_CORE_FRAMEWORK', summary: 'Critical Transparency Failure.', description: 'No valid Privacy Policy document found.', liability: 'Maximum GDPR fine.', recommendation: 'ACTION: Create and link a /privacy page.' });
      leadScore += 100;
    } else {
      // --- ШАГ 4: DEEP SEMANTIC ANALYSIS ---
      if (!['legal basis', 'article 6', 'legitimate interest', 'rechtsgrundlage', 'base légale'].some(kw => legalText.includes(kw))) {
        finalFindings.push({ type: 'MISSING_LEGAL_BASES', summary: 'No explicit legal basis.', description: 'The policy fails to declare Article 6 processing grounds.', liability: 'Art. 13(1)(c) violation.', recommendation: 'ACTION: Explicitly cite processing grounds.' });
      }
      if (/ip address(es)? (are|is) not personal/i.test(legalText)) {
        finalFindings.push({ type: 'MISCLASSIFIED_PERSONAL_DATA', summary: 'IP Address misclassification.', description: 'Site falsely claims IP addresses are non-personal.', liability: 'High risk of litigation.', recommendation: 'ACTION: Correct IP data classification.' });
      }
      if (['as long as', 'indefinitely', 'unbestimmte zeit', 'tiempo indefinido'].some(kw => legalText.includes(kw))) {
        finalFindings.push({ type: 'VAGUE_RETENTION_PERIOD', summary: 'Vague data retention terms.', description: 'Document uses non-specific storage periods.', liability: 'Art. 5(1)(e) violation.', recommendation: 'ACTION: Define exact periods (e.g. 24 months).' });
      }
      if (hasUS_Trackers && !['standard contractual clauses', 'scc', 'adequacy decision', 'standardvertragsklauseln'].some(kw => legalText.includes(kw))) {
        finalFindings.push({ type: 'MISSING_INTERNATIONAL_TRANSFERS', summary: 'Illegal US data transfers.', description: 'US trackers active without SCC safeguards.', liability: 'Invalid data flows.', recommendation: 'ACTION: Add SCC clauses to policy.' });
      }
      if (!['withdraw', 'erasure', 'right to be forgotten', 'löschung', 'effacement'].some(kw => legalText.includes(kw))) {
        finalFindings.push({ type: 'MISSING_GDPR_RIGHTS', summary: 'Individual rights not declared.', description: 'Missing mandatory clauses for data deletion/access.', liability: 'Transparency failure.', recommendation: 'ACTION: Add Art. 15-21 rights section.' });
      }
    }

    // --- ШАГ 5: CONTACT SCRAPING ---
    const extractContacts = async (p: puppeteer.Page) => {
      return await p.evaluate(() => {
        const text = document.body.innerText;
        const eRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const pRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4,6}/g;
        
        const getCtx = (t: string, m: string) => {
          const i = t.indexOf(m);
          return t.substring(Math.max(0, i - 150), Math.min(t.length, i + m.length + 150)).replace(/\s+/g, ' ').trim();
        };

        const emails = Array.from(new Set(text.match(eRegex) || []))
          .filter(e => !['sentry', 'google', 'facebook', 'example'].some(d => e.toLowerCase().includes(d)))
          .map(e => ({ value: e, context: getCtx(text, e) }));

        const phones = Array.from(new Set(text.match(pRegex) || []))
          .map(ph => ({ value: ph, context: getCtx(text, ph) }));

        return { emails, phones };
      });
    };

    const mainContacts = await extractContacts(page);
    extractedEmails = mainContacts.emails;
    extractedPhones = mainContacts.phones;

    // Fallback to Contact/Impressum pages
    if (extractedEmails.length === 0) {
      const fallbackUrl = await page.evaluate(() => {
        const markers = ['contact', 'impressum', 'contacto', 'contatti', 'kontakt', 'about'];
        const link = Array.from(document.querySelectorAll('a')).find(a => markers.some(m => a.innerText.toLowerCase().includes(m)));
        return link ? link.href : null;
      });
      if (fallbackUrl) {
        await page.goto(fallbackUrl, { waitUntil: 'networkidle2', timeout: 20000 });
        const secondContacts = await extractContacts(page);
        extractedEmails = [...new Set([...extractedEmails, ...secondContacts.emails])];
        extractedPhones = [...new Set([...extractedPhones, ...secondContacts.phones])];
      }
    }

    // --- ШАГ 6: TRIAGE & DB UPDATE ---
    let crmStatus = 'compliant';
    if (finalFindings.length > 0) {
      crmStatus = (extractedEmails.length > 0 || extractedPhones.length > 0) ? 'ready_for_sales' : 'needs_analyst';
    }

    await pool.query(
      `UPDATE public.scan_queue 
       SET status = 'completed', 
           crm_status = $1, 
           violations_count = $2, 
           audit_findings = $3, 
           extracted_emails = $4, 
           extracted_phones = $5, 
           priority = $6,
           created_at = NOW()
       WHERE id = $7`,
      [crmStatus, finalFindings.length, JSON.stringify(finalFindings), JSON.stringify(extractedEmails), JSON.stringify(extractedPhones), Math.max(1, leadScore), scanId]
    );

    console.log(`[Worker] ${url} -> ${crmStatus} (Score: ${leadScore})`);

  } catch (err: any) {
    console.error(`[Worker Error] Task ${scanId} failed:`, err.message);
    await pool.query("UPDATE public.scan_queue SET status = 'failed' WHERE id = $1", [scanId]);
  }
}

async function startWorker() {
  console.log('==============================================');
  console.log('   HUMANGO LOCALIZED AUDIT ENGINE v6.0        ');
  console.log('==============================================');

  const browser = await puppeteer.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] 
  });

  while (true) {
    try {
      await checkAndFeedQueue(pool);
      
      const res = await pool.query(
        "SELECT id, url FROM public.scan_queue WHERE status IN ('pending', 'processing') AND (status != 'processing' OR updated_at < NOW() - INTERVAL '10 minutes') ORDER BY priority DESC, created_at ASC LIMIT 1"
      );

      if (res.rows.length > 0) {
        const task = res.rows[0];
        await pool.query("UPDATE public.scan_queue SET status = 'processing', updated_at = NOW() WHERE id = $1", [task.id]);
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
        
        await performAudit(page, task.id, task.url);
        await page.close();
      } else {
        await new Promise(r => setTimeout(r, 10000));
      }
    } catch (e: any) {
      console.error('[Main Loop Crash]:', e.message);
      await new Promise(r => setTimeout(r, 15000));
    }
  }
}

startWorker();
