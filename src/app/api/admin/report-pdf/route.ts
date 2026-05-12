
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
        issue_type, page_url, severity, category, description, business_impact,
        fine_amount, law_name, recommendation, explanation, report_type,
        verification_method
      FROM site_violations 
      WHERE domain = $1 
      ORDER BY 
        CASE 
          WHEN issue_type LIKE '%SYSTEMIC%' THEN 1 
          WHEN issue_type LIKE '%IDENTITY%' THEN 2 
          WHEN issue_type LIKE '%PROCESSING%' THEN 3 
          ELSE 4 
        END,
        severity DESC
    `, [domain]);

    if (res.rows.length === 0) return NextResponse.json({ error: 'Audit history not found.' }, { status: 404 });

    // Hard Merge by Article (Issue Type)
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
    const criticalRisks = findings.filter(f => f.severity === 'critical' || f.severity === 'high');

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
          .violation-card { border: 1px solid #e2e8f0; border-radius: 14px; margin-top: 20px; background: #ffffff; page-break-inside: avoid; overflow: hidden; }
          .violation-head { background: #0f172a; color: #ffffff; padding: 12px 20px; font-weight: 800; font-size: 11px; display: flex; justify-content: space-between; }
          .violation-body { padding: 20px; }
          .label { font-size: 8px; font-weight: 800; color: #3b82f6; text-transform: uppercase; margin-top: 15px; display: block; margin-bottom: 4px; }
          .risk-badge { font-size: 9px; font-weight: 800; padding: 3px 10px; border-radius: 99px; background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; }
          .impact-box { background: #fff7ed; border-left: 4px solid #f97316; padding: 12px; color: #9a3412; font-weight: 600; font-size: 10px; margin: 12px 0; }
          .blueprint { background: #f0f9ff; border: 1px solid #bae6fd; padding: 15px; border-radius: 8px; color: #0369a1; font-size: 10px; }
          .url-list { font-size: 9px; color: #64748b; background: #f8fafc; padding: 10px; border-radius: 6px; font-family: monospace; border: 1px solid #e2e8f0; margin-top: 5px; list-style: none; }
          .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin-bottom: 30px; }
          .grade-circle { width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; border: 4px solid #3b82f6; color: #3b82f6; }
          .footer-note { position: fixed; bottom: 30px; left: 0; right: 0; text-align: center; font-size: 9px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display:flex; align-items:center; gap:12px">
            ${logoBase64 ? `<img src="${logoBase64}" style="width:35px; height:35px">` : ''}
            <div class="logo-text">Humango Compliance Audit Engine</div>
          </div>
          <div style="text-align:right; font-size:9px; color:#64748b; font-weight:600">
            Professional Audit Node<br>Target Environment: ${domain}
          </div>
        </div>

        <div class="summary-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <h1 style="font-size:24px; color:#0f172a; margin:0 0 5px 0; font-weight:800">Executive Audit Summary</h1>
              <p style="color:#64748b; margin:0; font-size:11px">Statutory compliance assessment of global data processing operations.</p>
            </div>
            <div class="grade-circle">${findings.length > 2 ? 'F' : findings.length > 0 ? 'D' : 'A'}</div>
          </div>
          <div style="margin-top:20px;">
            <span class="label">Primary Risk Factors:</span>
            <div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:8px">
              ${criticalRisks.map(r => `<span class="risk-badge">${r.issue_type}</span>`).join('')}
            </div>
          </div>
        </div>

        <div class="section-title">Legal Diagnostic Findings</div>
        ${findings.map(v => `
          <div class="violation-card">
            <div class="violation-head">
              <span>${v.issue_type}</span>
              <span class="risk-badge">${v.severity.toUpperCase()} RISK</span>
            </div>
            <div class="violation-body">
              <span class="label">STATUS / LEGAL BASIS</span>
              <div style="font-weight:800; font-size:10px; color:#0f172a">${v.law_name}</div>

              <span class="label">DIAGNOSTIC DESCRIPTION</span>
              <div style="color:#334155; font-size:10px;">${v.description}</div>

              <span class="label">BUSINESS IMPACT</span>
              <div class="impact-box">${v.business_impact || 'Lack of statutory compliance exposes the entity to regulatory enforcement and civil liability claims.'}</div>

              <span class="label">POTENTIAL LIABILITY</span>
              <div style="color:#ef4444; font-weight:700; font-size:10px;">${v.fine_amount || 'Up to €20,000,000 or 4% of annual global turnover'}</div>

              <span class="label">TARGETED RESOURCE(S)</span>
              <ul class="url-list">
                ${Array.from(v.urls).map(u => `<li>&bull; ${u}</li>`).join('')}
              </ul>

              <span class="label">REMEDIATION BLUEPRINT</span>
              <div class="blueprint">${v.recommendation.replace(/\n/g, '<br>')}</div>
            </div>
          </div>
        `).join('')}

        <div class="footer-note">
          Confidential Legal Audit &bull; Humango Compliance Audit Engine &bull; EU Statutory Compliance Framework
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
