
import { pool } from './db'; // Используем относительный путь
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
    
    let findings = providedFindings || [];

    if (findings.length === 0) {
      const res = await pool.query(`
        SELECT issue_type, severity, description, law_name, recommendation 
        FROM site_violations 
        WHERE domain = $1 
        ORDER BY created_at DESC
      `, [safeDomain]);
      findings = res.rows;
    }

    // Логическая очистка
    if (findings.some((f: any) => (f.issue_type || '').toUpperCase().includes('MISSING CORE FRAMEWORK'))) {
      findings = findings.filter((f: any) => (f.issue_type || '').toUpperCase().includes('MISSING CORE FRAMEWORK'));
    }

    // Нормализация кавычек
    findings = findings.map((v: any) => ({
      ...v,
      recommendation: (v.recommendation || v.action || '').replace(/[']/g, '"')
    }));

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
          .header { border-bottom: 2px solid #3b82f6; padding-bottom: 15px; margin-bottom: 30px; display: flex; align-items: center; justify-content: space-between; }
          .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px; background: #fff; }
          .severity-badge { font-size: 10px; font-weight: bold; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; }
          .footer { position: fixed; bottom: 30px; left: 40px; right: 40px; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 10px; }
          .recommendation-box { background: #f8fafc; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 11px; color: #334155; border: 1px solid #f1f5f9; word-break: break-all; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="font-size: 16px; font-weight: 800;">Humango<span style="color:#3b82f6">Compliance</span></div>
          <div style="text-align:right; font-size:10px; color:#64748b">STATUTORY REPORT</div>
        </div>

        <h1>Diagnostic Analysis</h1>
        <p>Infrastructure: <strong>${safeDomain}</strong></p>

        ${findings.length === 0 ? `
          <div class="card" style="text-align:center;"><h2>No Violations Detected</h2></div>
        ` : findings.map((v: any) => `
          <div class="card">
            <div style="display:flex; justify-content:space-between; margin-bottom: 10px;">
              <div style="font-weight:bold;">${v.issue_type || v.type}</div>
              <span class="severity-badge">CRITICAL</span>
            </div>
            <p style="font-size:13px;">${v.description || v.summary}</p>
            <div style="font-size:10px; font-weight:bold; color:#3b82f6; margin-bottom:5px;">ACTION:</div>
            <div class="recommendation-box">${v.recommendation || v.action}</div>
          </div>
        `).join('')}

        <div class="footer">
          bot.humango.app | Statutory Compliance Verified | Generated on ${new Date().toLocaleDateString()}
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
    console.error('PDF Generation Error:', error);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}
