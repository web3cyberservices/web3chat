
import { NextResponse, NextRequest } from 'next/server';
import { pool } from '@/lib/db';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
const CHROME_PATH = '/root/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain');
  if (!domain) return NextResponse.json({ error: 'Domain is required' }, { status: 400 });

  let browser: any = null;
  try {
    const res = await pool.query(`
      SELECT 
        issue_type, page_url, severity, category, description, 
        fine_amount, law_name, recommendation, explanation, report_type,
        verification_method
      FROM site_violations 
      WHERE domain = $1 
      ORDER BY 
        CASE 
          WHEN issue_type LIKE '%SYSTEMIC%' THEN 1 
          WHEN issue_type LIKE '%CONTROLLER%' THEN 2 
          WHEN issue_type LIKE '%PROCESSING%' THEN 3 
          ELSE 4 
        END,
        severity DESC
    `, [domain]);

    if (res.rows.length === 0) return NextResponse.json({ error: 'Audit history not found.' }, { status: 404 });

    // HARD MERGE BY ISSUE_TYPE (GDPR Article)
    const consolidated = new Map();
    res.rows.forEach(row => {
      const key = row.issue_type.toUpperCase();
      if (!consolidated.has(key)) {
        consolidated.set(key, { ...row, urls: new Set([row.page_url]) });
      } else {
        consolidated.get(key).urls.add(row.page_url);
      }
    });

    const findings = Array.from(consolidated.values());
    const sectionA = findings.filter(v => !v.category.includes('IMPRESSUM'));
    const sectionB = findings.filter(v => v.category.includes('IMPRESSUM'));

    let logoBase64 = '';
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo.png');
      logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
    } catch (e) {}

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { margin: 0; }
          body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1e293b; padding: 45px; line-height: 1.5; background: #ffffff; font-size: 11px; }
          .header { border-bottom: 3px solid #3b82f6; padding-bottom: 12px; margin-bottom: 35px; display: flex; justify-content: space-between; align-items: flex-end; }
          .logo-text { font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
          .section-title { font-size: 15px; font-weight: 800; text-transform: uppercase; color: #3b82f6; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin: 45px 0 25px 0; letter-spacing: 1px; }
          .violation-card { border: 1px solid #e2e8f0; border-radius: 14px; margin-top: 25px; background: #ffffff; page-break-inside: avoid; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .violation-head { background: #0f172a; color: #ffffff; padding: 15px 25px; font-weight: 800; font-size: 12px; display: flex; justify-content: space-between; align-items: center; }
          .violation-body { padding: 25px; }
          .label { font-size: 9px; font-weight: 800; color: #3b82f6; text-transform: uppercase; margin-top: 20px; display: block; margin-bottom: 6px; letter-spacing: 0.5px; }
          .risk-badge { font-size: 9px; font-weight: 800; padding: 4px 12px; border-radius: 99px; background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; }
          .fine-box { background: #fef2f2; border-left: 5px solid #ef4444; padding: 15px; color: #ef4444; font-weight: 800; margin: 20px 0; font-size: 10px; }
          .blueprint { background: #f0f9ff; border: 1px solid #bae6fd; padding: 18px; border-radius: 10px; color: #0369a1; font-size: 10px; line-height: 1.6; }
          .url-list { font-size: 9px; color: #64748b; background: #f8fafc; padding: 12px; border-radius: 8px; font-family: 'Courier', monospace; border: 1px solid #e2e8f0; margin-top: 8px; list-style: none; }
          .footer-note { position: fixed; bottom: 35px; left: 0; right: 0; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; font-weight: 500; }
          .summary-table { width: 100%; border-collapse: collapse; margin-top: 15px; border-radius: 10px; overflow: hidden; }
          .summary-table th { background: #f8fafc; text-align: left; padding: 12px; border: 1px solid #e2e8f0; font-size: 9px; color: #475569; }
          .summary-table td { padding: 12px; border: 1px solid #e2e8f0; font-size: 9px; vertical-align: top; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display:flex; align-items:center; gap:14px">
            ${logoBase64 ? `<img src="${logoBase64}" style="width:40px; height:40px">` : ''}
            <div class="logo-text">Humango Compliance Audit Engine</div>
          </div>
          <div style="text-align:right; font-size:10px; color:#64748b; font-weight:600">
            Professional Audit Node v20.0<br>Target Environment: ${domain}
          </div>
        </div>

        <h1 style="font-size:28px; color:#0f172a; margin-bottom:10px; font-weight:800; letter-spacing:-1px">Statutory Assessment Report</h1>
        <p style="color:#64748b; margin-bottom:45px; font-size:12px; font-weight:500">
          Consolidated legal diagnostic mapping technical infrastructure and data processing activities to mandatory GDPR and Pan-European statutory requirements.
        </p>

        <div class="section-title">SECTION A: UNIVERSAL GDPR REQUIREMENTS</div>
        ${sectionA.map(v => `
          <div class="violation-card">
            <div class="violation-head">
              <span>${v.issue_type}</span>
              <span class="risk-badge">${v.severity.toUpperCase()} RISK</span>
            </div>
            <div class="violation-body">
              <span class="label">STATUS / LEGAL BASIS</span>
              <div style="font-weight:800; font-size:11px; color:#0f172a">${v.law_name}</div>

              <span class="label">DIAGNOSTIC DESCRIPTION</span>
              <div style="color:#334155; font-size:10px; font-weight:500">${v.description}</div>

              <div class="fine-box">Potential Liability: ${v.fine_amount || 'Up to €20,000,000 or 4% of global turnover'}</div>

              <span class="label">TARGETED RESOURCE(S)</span>
              <ul class="url-list">
                ${Array.from(v.urls).map(u => `<li>&bull; ${u}</li>`).join('')}
              </ul>

              <span class="label">REMEDIATION BLUEPRINT</span>
              <div class="blueprint">${v.recommendation}</div>
            </div>
          </div>
        `).join('')}

        ${sectionB.length > 0 ? `
          <div class="section-title" style="page-break-before: always;">SECTION B: COUNTRY-SPECIFIC SUPPLEMENTS</div>
          ${sectionB.map(v => `
            <div class="violation-card">
              <div class="violation-head">
                <span>${v.issue_type}</span>
                <span class="risk-badge">${v.severity.toUpperCase()} RISK</span>
              </div>
              <div class="violation-body">
                <span class="label">STATUS / LEGAL BASIS</span>
                <div style="font-weight:800; font-size:11px; color:#0f172a">${v.law_name}</div>

                <span class="label">DIAGNOSTIC DESCRIPTION</span>
                <div style="color:#334155; font-size:10px; font-weight:500">${v.description}</div>

                <div class="fine-box">Potential Liability: ${v.fine_amount || 'Up to €20,000,000 or 4% of global turnover'}</div>

                <span class="label">REMEDIATION BLUEPRINT</span>
                <div class="blueprint">${v.recommendation}</div>
              </div>
            </div>
          `).join('')}
        ` : ''}

        <div class="footer-note">
          Confidential Legal Audit &bull; Generated by Humango Compliance Audit Engine &bull; Expert Node V20 &bull; EU-wide Coverage
        </div>
      </body>
      </html>
    `;

    browser = await puppeteer.launch({ 
      executable_path: CHROME_PATH, 
      headless: 'new', 
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ 
      format: 'A4', 
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' }
    });

    return new NextResponse(pdfBuffer, { 
      headers: { 
        'Content-Type': 'application/pdf', 
        'Content-Disposition': `attachment; filename=Humango_Audit_${domain}.pdf` 
      } 
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}
