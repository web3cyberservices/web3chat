
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

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

interface Finding {
  issue_type?: string;
  category?: string;
  severity: string;
  description?: string;
  law_name?: string;
  recommendation?: string;
  business_impact?: string;
  potential_fine?: string;
  country?: string;
}

export async function generatePdfReport(domain: string, findings: Finding[] = []): Promise<Buffer | null> {
  let browser: any = null;
  try {
    const safeDomain = domain.toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    const uniqueMap = new Map();
    findings.forEach(f => {
      const key = f.issue_type || 'GENERAL_ISSUE';
      if (!uniqueMap.has(key)) uniqueMap.set(key, f);
    });
    const cleanFindings = Array.from(uniqueMap.values());
    const isCompliant = cleanFindings.length === 0;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page { size: A4; margin: 0; }
          body { font-family: 'Inter', sans-serif; color: #1e293b; margin: 0; padding: 40px; background: #fff; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #3b82f6; padding-bottom: 24px; margin-bottom: 40px; }
          .logo-box { display: flex; align-items: center; gap: 8px; }
          .logo-symbol { width: 32px; height: 32px; background: #3b82f6; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; }
          .logo-text { font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
          .logo-text span { color: #3b82f6; }
          .company-details { text-align: right; font-size: 10px; color: #64748b; line-height: 1.6; }
          .report-meta { margin-bottom: 40px; }
          .report-title { font-size: 32px; font-weight: 900; color: #0f172a; margin: 0; letter-spacing: -0.04em; }
          .target-info { font-size: 13px; color: #64748b; margin-top: 10px; font-family: monospace; }
          .finding-card { border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-bottom: 24px; page-break-inside: avoid; background: #fff; }
          .card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
          .type-label { font-weight: 800; text-transform: uppercase; font-size: 13px; color: #0f172a; }
          .severity-badge { font-size: 9px; padding: 4px 12px; border-radius: 99px; font-weight: 800; text-transform: uppercase; border: 1px solid currentColor; }
          .sev-critical { background: #fee2e2; color: #dc2626; }
          .section-title { font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94a3b8; margin-bottom: 6px; letter-spacing: 0.05em; }
          .content-block { margin-bottom: 16px; }
          .desc-text { font-size: 13px; color: #334155; }
          .liability-box { background: #fff1f2; padding: 16px; border-radius: 12px; border: 1px solid #fecaca; margin-bottom: 16px; }
          .liability-text { color: #be123c; font-size: 13px; font-weight: 800; }
          .recommendation-box { background: #f8fafc; padding: 20px; border-radius: 12px; font-size: 12px; border-left: 4px solid #3b82f6; }
          .compliant-hero { text-align: center; padding: 80px 40px; border: 3px dashed #10b981; border-radius: 32px; background: #f0fdf4; }
          .footer-note { position: fixed; bottom: 30px; left: 40px; right: 40px; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-box">
            <div class="logo-symbol">H</div>
            <div class="logo-text">Humango<span>Compliance</span></div>
          </div>
          <div class="company-details">
            <strong>Humango Limited</strong> | Co. No: 16750477<br>
            182-184 High Street North, London, E6 2JA<br>
            abuse@humango.app | Statutory Audit Node
          </div>
        </div>

        <div class="report-meta">
          <h1 class="report-title">Statutory Audit Report</h1>
          <div class="target-info">AUDIT TARGET: ${safeDomain.toUpperCase()} | DATE: ${new Date().toLocaleDateString('en-GB')}</div>
        </div>

        ${isCompliant ? `
          <div class="compliant-hero">
            <h2 style="color:#065f46; margin:0; font-size: 28px;">STATUTORY COMPLIANCE VERIFIED</h2>
            <p style="color:#065f46; margin-top:16px; font-size: 14px;">No critical statutory violations or unauthorized data transfers were identified during this audit cycle.</p>
          </div>
        ` : cleanFindings.map(v => `
          <div class="finding-card">
            <div class="card-head">
              <span class="type-label">${(v.issue_type || 'Violation').replace(/_/g, ' ')}</span>
              <span class="severity-badge sev-critical">Critical Risk</span>
            </div>
            <div class="content-block"><div class="section-title">Detection Summary [${v.country || 'EU'}]</div><div class="desc-text">${v.description}</div></div>
            <div class="content-block"><div class="section-title">Legal Foundation</div><div class="desc-text" style="font-weight: 700;">${v.law_name || 'GDPR Art. 13'}</div></div>
            <div class="liability-box"><div class="section-title" style="color: #be123c;">Potential Statutory Liability</div><div class="liability-text">${v.potential_fine || 'Up to €20M'}</div></div>
            <div class="recommendation-box"><div class="section-title" style="color: #3b82f6;">Required Remediation</div><div style="font-weight: 700;">${v.recommendation}</div></div>
          </div>
        `).join('')}

        <div class="footer-note">
          humango.app | Statutory Compliance Verified | © 2026 Humango Limited
        </div>
      </body>
      </html>
    `;

    const executablePath = await getExecutablePath();
    browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    return await page.pdf({ format: 'A4', printBackground: true });
  } catch (error) {
    console.error('[PDF Error]', error);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}
