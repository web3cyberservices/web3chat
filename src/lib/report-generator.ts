
import { pool } from '@/lib/db';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const CHROME_PATHS = [
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/root/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
];

export async function generatePdfReport(domain: string, providedFindings?: any[]): Promise<Buffer | null> {
  let browser: any = null;
  try {
    const DOMPurify = (await import('isomorphic-dompurify')).default;
    const safeDomain = DOMPurify.sanitize(domain.toLowerCase().replace(/^https?:\/\//, '').split('/')[0]);
    const otherDomain = safeDomain.startsWith('www.') ? safeDomain.replace('www.', '') : `www.${safeDomain}`;

    let findings = providedFindings || [];

    if (findings.length === 0) {
      const res = await pool.query(`
        SELECT issue_type, severity, description, law_name, recommendation 
        FROM site_violations 
        WHERE domain = $1 OR domain = $2
        ORDER BY created_at DESC
      `, [safeDomain, otherDomain]);
      findings = res.rows;
    }

    // Логический фильтр: убираем противоречия
    if (findings.some((f: any) => f.issue_type === 'MISSING CORE FRAMEWORK')) {
      findings = findings.filter((f: any) => f.issue_type === 'MISSING CORE FRAMEWORK');
    }

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
          body { font-family: sans-serif; padding: 40px; color: #1e293b; }
          .header { border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
          .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px; page-break-inside: avoid; }
          .severity { font-size: 10px; font-weight: bold; padding: 2px 8px; border-radius: 4px; background: #fee2e2; color: #ef4444; }
          .footer { position: fixed; bottom: 20px; width: 100%; text-align: center; font-size: 10px; color: #94a3b8; }
          .recommendation { background: #f0f9ff; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 11px; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          ${logoBase64 ? `<img src="${logoBase64}" width="30">` : ''}
          <div style="font-size: 18px; font-weight: bold;">Humango Compliance Audit</div>
        </div>
        <h1>Audit Results for ${safeDomain}</h1>
        ${findings.map((v: any) => `
          <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center">
              <strong style="font-size:14px">${v.issue_type}</strong>
              <span class="severity">${v.severity?.toUpperCase() || 'HIGH'}</span>
            </div>
            <p style="font-size:12px; margin: 10px 0">${v.description}</p>
            <div style="font-size:10px; color:#64748b">Basis: ${v.law_name}</div>
            <div class="recommendation">${(v.recommendation || '').replace(/[']/g, '"')}</div>
          </div>
        `).join('')}
        <div class="footer">bot.humango.app | Statutory Compliance Verified</div>
      </body>
      </html>
    `;

    const executablePath = CHROME_PATHS.find(p => fs.existsSync(p));
    browser = await puppeteer.launch({ executablePath: executablePath || undefined, headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    return await page.pdf({ format: 'A4', printBackground: true });
  } catch (error) {
    console.error('PDF Generation Error:', error);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}
