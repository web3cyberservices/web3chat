
import { pool } from '@/lib/db';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const CHROME_PATHS = [
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/usr/lib/chromium/chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
];

export async function generatePdfReport(domain: string, providedFindings?: any[]): Promise<Buffer | null> {
  let browser: any = null;
  try {
    const DOMPurify = (await import('isomorphic-dompurify')).default;
    const safeDomain = DOMPurify.sanitize(domain.toLowerCase().replace(/^https?:\/\//, '').split('/')[0]);
    const otherDomain = safeDomain.startsWith('www.') ? safeDomain.replace('www.', '') : `www.${safeDomain}`;

    let rawFindings = providedFindings;

    if (!rawFindings) {
      const res = await pool.query(`
        SELECT 
          issue_type, page_url, severity, category, description, business_impact,
          fine_amount, law_name, recommendation, explanation, report_type,
          verification_method, created_at
        FROM site_violations 
        WHERE domain = $1 OR domain = $2
        ORDER BY 
          CASE severity 
            WHEN 'critical' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            ELSE 4 
          END ASC,
          created_at ASC
      `, [safeDomain, otherDomain]);
      rawFindings = res.rows;
    }

    if (!rawFindings || rawFindings.length === 0) {
      const scanCheck = await pool.query('SELECT created_at FROM audit_logs WHERE domain = $1 OR domain = $2 LIMIT 1', [safeDomain, otherDomain]);
      if (scanCheck.rows.length === 0 && (!providedFindings || providedFindings.length === 0)) {
        return null;
      }
    }

    const consolidated = new Map();
    rawFindings.forEach(row => {
      const key = row.law_name || row.issue_type; 
      if (!consolidated.has(key)) {
        const urls = (row.page_url || '').split(',').map((u: string) => u.trim());
        let cleanRec = (row.recommendation || '').replace(/[']/g, '"');
        if (!cleanRec.startsWith('ACTION:')) {
            cleanRec = `ACTION: INSERT THIS TEXT -> "${cleanRec}"`;
        }
        consolidated.set(key, { ...row, recommendation: cleanRec, urls: new Set(urls) });
      }
    });

    const findings = Array.from(consolidated.values());
    const isClean = findings.length === 0;

    let logoBase64 = '';
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo.png');
      if (fs.existsSync(logoPath)) logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
    } catch (e) {}

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { margin: 0; }
          body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1e293b; padding: 40px; line-height: 1.5; background: #ffffff; font-size: 11px; }
          .header { border-bottom: 3px solid ${isClean ? '#10b981' : '#3b82f6'}; padding-bottom: 15px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
          .logo-text { font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
          .operator-block { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; margin-bottom: 25px; font-family: monospace; font-size: 9px; color: #475569; }
          .section-title { font-size: 13px; font-weight: 800; text-transform: uppercase; color: ${isClean ? '#10b981' : '#3b82f6'}; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin: 40px 0 20px 0; letter-spacing: 1px; }
          .violation-card { border: 1px solid #e2e8f0; border-radius: 12px; margin-top: 15px; background: #ffffff; page-break-inside: avoid; overflow: hidden; }
          .violation-head { background: #0f172a; color: #ffffff; padding: 10px 20px; font-weight: 800; font-size: 10px; display: flex; justify-content: space-between; align-items: center; }
          .violation-body { padding: 20px; }
          .label { font-size: 8px; font-weight: 800; color: #3b82f6; text-transform: uppercase; margin-top: 15px; display: block; margin-bottom: 4px; }
          .risk-badge { font-size: 8px; font-weight: 800; padding: 2px 8px; border-radius: 99px; background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; }
          .action-box { background: #f0f9ff; border: 1px solid #bae6fd; padding: 15px; border-radius: 8px; color: #0369a1; font-size: 10px; font-family: monospace; border-left: 4px solid #3b82f6; }
          .footer-note { position: fixed; bottom: 20px; left: 0; right: 0; text-align: center; font-size: 8px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display:flex; align-items:center; gap:12px">
            ${logoBase64 ? `<img src="${logoBase64}" style="width:30px; height:30px">` : ''}
            <div class="logo-text">Humango Compliance Engine</div>
          </div>
          <div style="text-align:right; font-size:8px; color:#64748b;">Node: ${safeDomain} | bot.humango.app</div>
        </div>
        <div class="operator-block">
          <strong>Operator:</strong> Humango Limited | Co. No: 16750477<br>
          <strong>Address:</strong> 182-184 High Street North, London, E6 2JA<br>
          <strong>Verification:</strong> RFC 9309 Statutory Audit Node | <a href="mailto:abuse@humango.app" style="color:#3b82f6; text-decoration:none;">abuse@humango.app</a>
        </div>
        <h1 style="font-size:20px; color:#0f172a; font-weight:800">${isClean ? 'Compliance Certificate' : 'Statutory Compliance Audit'}</h1>
        ${findings.map(v => `
          <div class="violation-card">
            <div class="violation-head"><span>${DOMPurify.sanitize(v.issue_type)}</span><span class="risk-badge">${v.severity.toUpperCase()} RISK</span></div>
            <div class="violation-body">
              <span class="label">STATUTORY BASIS</span><div>${DOMPurify.sanitize(v.law_name || 'GDPR')}</div>
              <span class="label">SUMMARY</span><div>${DOMPurify.sanitize(v.description)}</div>
              <span class="label">CORRECTIVE ACTION</span><div class="action-box">${DOMPurify.sanitize(v.recommendation).replace(/[']/g, '"')}</div>
            </div>
          </div>
        `).join('')}
        <div class="footer-note">bot.humango.app | Statutory Compliance Verified</div>
      </body>
      </html>
    `;

    const executablePath = CHROME_PATHS.find(p => fs.existsSync(p));
    browser = await puppeteer.launch({ executablePath: executablePath || undefined, headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    return await page.pdf({ format: 'A4', printBackground: true });
  } catch (error) {
    return null;
  } finally {
    if (browser) await browser.close();
  }
}
