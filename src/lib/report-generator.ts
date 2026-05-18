
import { pool } from './db';
import puppeteer from 'puppeteer';
import fs from 'fs';

const CHROME_PATHS = [
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/root/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
];

/**
 * PDF Generation Engine v5.1
 * - Fixed: Brand misspelling "humsango" removed.
 * - Added: Humango Limited operator identity.
 */
export async function generatePdfReport(domain: string, providedFindings?: any[]): Promise<Buffer | null> {
  let browser: any = null;
  try {
    const safeDomain = domain.toLowerCase().replace(/^https?:\/\//, '').split('/')[0].replace(/[^a-z0-9.]/gi, '');
    
    let findings = providedFindings || [];

    if (findings.length === 0 && !providedFindings) {
      const res = await pool.query(`
        SELECT issue_type, severity, description, law_name, recommendation 
        FROM site_violations 
        WHERE domain = $1 
        ORDER BY created_at DESC
      `, [safeDomain]);
      findings = res.rows;
    }

    // Logical intercept: if missing framework, clear secondary issues
    if (findings.some((f: any) => (f.type || f.issue_type || '').includes('MISSING_CORE_FRAMEWORK'))) {
      findings = findings.filter((f: any) => (f.type || f.issue_type || '').includes('MISSING_CORE_FRAMEWORK'));
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 50px; color: #1e293b; line-height: 1.6; background: #fff; }
          .header { border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
          .brand { font-size: 24px; font-weight: 900; color: #0f172a; }
          .brand span { color: #3b82f6; }
          .meta-info { text-align: right; font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
          .card { border: 1px solid #e2e8f0; border-radius: 16px; padding: 30px; margin-bottom: 30px; background: #fff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .severity { font-size: 10px; font-weight: 900; padding: 6px 12px; border-radius: 8px; text-transform: uppercase; background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; }
          .finding-title { font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 12px; }
          .recommendation-label { font-size: 11px; font-weight: 900; color: #3b82f6; text-transform: uppercase; margin-top: 25px; margin-bottom: 8px; }
          .recommendation-box { background: #f8fafc; padding: 20px; border-radius: 12px; font-family: 'Courier New', monospace; font-size: 12px; color: #334155; border: 1px solid #f1f5f9; line-height: 1.4; }
          .footer { position: fixed; bottom: 40px; left: 50px; right: 50px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; }
          .operator-info { margin-top: 60px; font-size: 10px; color: #94a3b8; line-height: 1.8; border-top: 1px solid #f1f5f9; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">Humango<span>Compliance</span></div>
          <div class="meta-info">Statutory Audit Report<br>${new Date().toLocaleDateString('en-GB')}</div>
        </div>

        <h1 style="font-size: 28px; font-weight: 900; margin-bottom: 10px;">Diagnostic Verdict</h1>
        <p style="color: #64748b; margin-bottom: 40px;">Infrastructure Audit for: <span style="color: #0f172a; font-weight: 700;">${safeDomain}</span></p>

        ${findings.length === 0 ? `
          <div class="card" style="text-align: center; padding: 60px 40px;">
            <div style="color: #10b981; font-size: 48px; margin-bottom: 20px;">✓</div>
            <h2 style="color: #10b981; margin-top: 0;">STATUS: COMPLIANT</h2>
            <p style="color: #64748b;">No statutory violations detected. All required legal frameworks identified.</p>
          </div>
        ` : findings.map((v: any) => `
          <div class="card">
            <div style="display:flex; justify-content:space-between; align-items: center; margin-bottom: 15px;">
              <div class="finding-title">${(v.type || v.issue_type || '').replace(/_/g, ' ')}</div>
              <span class="severity">CRITICAL</span>
            </div>
            <p style="font-size:14px; color: #475569;">${v.summary || v.description}</p>
            <div class="recommendation-label">Required Remediation:</div>
            <div class="recommendation-box">${(v.action || v.recommendation || '').replace(/'/g, '"')}</div>
          </div>
        `).join('')}

        <div class="operator-info">
          <strong>Operator:</strong> Humango Limited • 182-184 High Street North, London, England, E6 2JA • Company No: 16750477<br>
          <strong>Verification:</strong> This audit was conducted by HumangoBot/1.0 (+https://bot.humango.app) complying with RFC 9309.
        </div>

        <div class="footer">
          bot.humango.app • Statutory Compliance Verified • © ${new Date().getFullYear()} Humango Limited
        </div>
      </body>
      </html>
    `;

    const executablePath = CHROME_PATHS.find(p => fs.existsSync(p));
    browser = await puppeteer.launch({ 
      executablePath: executablePath || undefined, 
      headless: true, 
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    return await page.pdf({ format: 'A4', printBackground: true });
  } catch (error) {
    console.error('[PDF Gen Error]', error);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}
