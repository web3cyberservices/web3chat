
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
    
    // Load Logo as Base64
    const logoPath = path.join(process.cwd(), 'public', 'logo.png');
    let logoBase64 = '';
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    }

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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          @page { size: A4; margin: 0; }
          body { 
            font-family: 'Inter', sans-serif; 
            color: #1e293b; 
            margin: 0; 
            padding: 50px; 
            background: #fff; 
            line-height: 1.6;
            -webkit-print-color-adjust: exact;
          }
          .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            border-bottom: 3px solid #3b82f6; 
            padding-bottom: 30px; 
            margin-bottom: 40px; 
          }
          .logo-box { 
            display: flex; 
            align-items: center; 
            gap: 12px; 
          }
          .logo-img {
            width: 48px;
            height: 48px;
            object-fit: contain;
          }
          .logo-text { 
            font-size: 24px; 
            font-weight: 900; 
            color: #0f172a; 
            letter-spacing: -0.03em; 
          }
          .logo-text span { 
            color: #3b82f6; 
          }
          .company-details { 
            text-align: right; 
            font-size: 11px; 
            color: #0f172a; 
            line-height: 1.6;
            font-weight: 500;
          }
          .company-details a {
            color: #3b82f6;
            text-decoration: none;
            font-weight: 700;
          }
          .report-meta { 
            margin-bottom: 50px; 
            border-left: 4px solid #3b82f6;
            padding-left: 20px;
          }
          .report-title { 
            font-size: 36px; 
            font-weight: 900; 
            color: #0f172a; 
            margin: 0; 
            letter-spacing: -0.04em; 
            text-transform: uppercase;
          }
          .target-info { 
            font-size: 14px; 
            color: #3b82f6; 
            margin-top: 8px; 
            font-family: monospace; 
            font-weight: 700;
          }
          .finding-card { 
            border: 1px solid #e2e8f0; 
            border-radius: 20px; 
            padding: 30px; 
            margin-bottom: 30px; 
            page-break-inside: avoid; 
            background: #f8fafc; 
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          }
          .card-head { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin-bottom: 20px; 
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 15px;
          }
          .type-label { 
            font-weight: 800; 
            text-transform: uppercase; 
            font-size: 14px; 
            color: #0f172a; 
          }
          .severity-badge { 
            font-size: 10px; 
            padding: 6px 16px; 
            border-radius: 99px; 
            font-weight: 800; 
            text-transform: uppercase; 
            background: #fee2e2; 
            color: #dc2626;
            border: 1px solid #fecaca;
          }
          .section-title { 
            font-size: 10px; 
            font-weight: 800; 
            text-transform: uppercase; 
            color: #64748b; 
            margin-bottom: 8px; 
            letter-spacing: 0.1em; 
          }
          .content-block { 
            margin-bottom: 20px; 
          }
          .desc-text { 
            font-size: 14px; 
            color: #334155; 
            font-weight: 400;
          }
          .liability-box { 
            background: #fff1f2; 
            padding: 20px; 
            border-radius: 14px; 
            border: 1px solid #fecaca; 
            margin-bottom: 20px; 
          }
          .liability-text { 
            color: #be123c; 
            font-size: 14px; 
            font-weight: 800; 
          }
          .recommendation-box { 
            background: #eff6ff; 
            padding: 25px; 
            border-radius: 14px; 
            font-size: 13px; 
            border-left: 6px solid #3b82f6; 
          }
          .compliant-hero { 
            text-align: center; 
            padding: 100px 50px; 
            border: 4px dashed #10b981; 
            border-radius: 40px; 
            background: #f0fdf4; 
          }
          .footer-note { 
            position: fixed; 
            bottom: 40px; 
            left: 50px; 
            right: 50px; 
            text-align: center; 
            font-size: 10px; 
            color: #94a3b8; 
            border-top: 1px solid #f1f5f9; 
            padding-top: 25px; 
            font-weight: 500;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-box">
            ${logoBase64 ? `<img src="${logoBase64}" class="logo-img" alt="Humango">` : `<div style="width:40px;height:40px;background:#3b82f6;border-radius:10px;"></div>`}
            <div class="logo-text">Humango<span>Compliance</span></div>
          </div>
          <div class="company-details">
            <strong>Humango Limited</strong> | UK Co. No: 16750477<br>
            182-184 High Street North, London, E6 2JA<br>
            <a href="mailto:abuse@humango.app">abuse@humango.app</a> | Compliance Node
          </div>
        </div>

        <div class="report-meta">
          <h1 class="report-title">Statutory Audit Report</h1>
          <div class="target-info">AUDIT TARGET: ${safeDomain.toUpperCase()} | DATE: ${new Date().toLocaleDateString('en-GB')}</div>
        </div>

        ${isCompliant ? `
          <div class="compliant-hero">
            <h2 style="color:#065f46; margin:0; font-size: 32px; font-weight: 900;">STATUTORY COMPLIANCE VERIFIED</h2>
            <p style="color:#065f46; margin-top:20px; font-size: 16px; font-weight: 500;">No critical statutory violations or unauthorized data transfers were identified during this automated audit cycle.</p>
          </div>
        ` : cleanFindings.map(v => `
          <div class="finding-card">
            <div class="card-head">
              <span class="type-label">${(v.issue_type || 'Violation').replace(/_/g, ' ')}</span>
              <span class="severity-badge">Critical Risk</span>
            </div>
            <div class="content-block">
              <div class="section-title">Detection Summary [${v.country || 'EU'}]</div>
              <div class="desc-text">${v.description}</div>
            </div>
            <div class="content-block">
              <div class="section-title">Legal Foundation</div>
              <div class="desc-text" style="font-weight: 700; color: #0f172a;">${v.law_name || 'GDPR Art. 13'}</div>
            </div>
            <div class="liability-box">
              <div class="section-title" style="color: #be123c;">Potential Statutory Liability</div>
              <div class="liability-text">${v.potential_fine || 'Up to €20,000,000 or 4% of annual turnover'}</div>
            </div>
            <div class="recommendation-box">
              <div class="section-title" style="color: #3b82f6;">Required Remediation</div>
              <div style="font-weight: 800; color: #1e3a8a; font-size: 14px;">${v.recommendation}</div>
            </div>
          </div>
        `).join('')}

        <div class="footer-note">
          humango.app | Official Statutory Compliance Evidence | © 2026 Humango Limited
        </div>
      </body>
      </html>
    `;

    const executablePath = await getExecutablePath();
    browser = await puppeteer.launch({ 
      executablePath, 
      headless: true, 
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--font-render-hinting=none'
      ] 
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    return await page.pdf({ 
      format: 'A4', 
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    });
  } catch (error) {
    console.error('[PDF Error]', error);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}
