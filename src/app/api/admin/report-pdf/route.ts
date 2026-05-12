
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
        issue_type, page_url, severity, category, explanation, 
        fine_amount, law_name, recommendation, verification_method, description
      FROM site_violations 
      WHERE domain = $1 
      ORDER BY severity DESC, created_at DESC
    `, [domain]);

    if (res.rows.length === 0) return NextResponse.json({ error: 'Audit history not found.' }, { status: 404 });

    // SYSTEMIC NON-COMPLIANCE LOGIC (Compaction for minimalist sites)
    const isMinimalist = res.rows.length > 0 && new Set(res.rows.map(r => r.page_url)).size <= 2;
    
    const consolidated: Record<string, any> = {};
    res.rows.forEach(row => {
      const key = `${row.category}_${row.law_name}`.toUpperCase();
      if (!consolidated[key]) {
        consolidated[key] = {
          ...row,
          affected_urls: new Set([row.page_url])
        };
      } else {
        consolidated[key].affected_urls.add(row.page_url);
      }
    });

    const sections = Object.values(consolidated);

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
          body { font-family: 'Helvetica', sans-serif; color: #1e293b; padding: 30px; line-height: 1.4; background: #ffffff; font-size: 10px; }
          .header { border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
          .logo-text { font-size: 16px; font-weight: bold; color: #0f172a; }
          .section-header { background: #0f172a; color: #ffffff; padding: 10px 15px; font-size: 11px; font-weight: bold; text-transform: uppercase; margin-top: 25px; border-radius: 4px; }
          .violation-card { border: 1px solid #e2e8f0; border-radius: 6px; margin-top: 15px; background: #ffffff; page-break-inside: avoid; }
          .violation-head { background: #f8fafc; padding: 8px 15px; border-bottom: 1px solid #e2e8f0; font-weight: bold; }
          .violation-body { padding: 15px; }
          .severity-badge { font-size: 7px; font-weight: bold; padding: 2px 8px; border-radius: 99px; display: inline-block; margin-bottom: 10px; border: 1px solid; }
          .CRITICAL { background: #fef2f2; color: #ef4444; border-color: #fee2e2; }
          .HIGH { background: #fffbeb; color: #d97706; border-color: #fef3c7; }
          .label { font-size: 8px; font-weight: bold; color: #3b82f6; text-transform: uppercase; margin-top: 12px; display: block; margin-bottom: 4px; }
          .fine-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 8px; color: #ef4444; font-weight: bold; margin-bottom: 15px; font-size: 9px; }
          .url-list { font-size: 7px; color: #64748b; background: #f8fafc; padding: 8px; border-radius: 4px; margin-top: 5px; font-family: monospace; }
          .blueprint { background: #f0f9ff; border: 1px solid #bae6fd; padding: 10px; border-radius: 4px; color: #0369a1; font-size: 9px; margin-top: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display:flex; align-items:center; gap:10px">
            ${logoBase64 ? `<img src="${logoBase64}" style="width:25px; height:25px">` : ''}
            <div class="logo-text">Humango Compliance Audit</div>
          </div>
          <div style="text-align:right; font-size:8px; color:#64748b">Pan-European Engine v3.1<br>Target: ${domain}</div>
        </div>

        <h1 style="font-size:18px; color:#0f172a; margin-bottom:5px">Statutory Assessment Report</h1>
        <p style="color:#64748b; margin-bottom:20px">Unified compliance audit for EU digital endpoints.</p>

        ${isMinimalist ? `
          <div style="background:#fff7ed; border:1px solid #ffedd5; padding:15px; border-radius:6px; margin-bottom:25px">
            <h3 style="color:#9a3412; margin:0 0 5px 0; font-size:11px">SYSTEMIC NON-COMPLIANCE DETECTED</h3>
            <p style="color:#c2410c; margin:0; font-size:10px">The landing page is minimalist/empty but technically active. Under Art. 13 of GDPR, even minimalist sites must provide identity and data processing transparency. This report consolidates systemic failures into a unified audit trail.</p>
          </div>
        ` : ''}

        ${sections.map(s => `
          <div class="violation-card">
            <div class="violation-head">${s.issue_type}</div>
            <div class="violation-body">
              <span class="severity-badge ${s.severity.toUpperCase()}">${s.severity.toUpperCase()} RISK</span>
              <div class="fine-box">Administrative Liability: ${s.fine_amount}</div>
              
              <span class="label">STATUS / LEGAL BASIS</span>
              <div style="font-weight:bold">${s.law_name}</div>

              <span class="label">DIAGNOSTIC DESCRIPTION</span>
              <div style="color:#334155">${s.description}</div>

              <span class="label">Targeted Resource(s)</span>
              <div class="url-list">${Array.from(s.affected_urls).join('<br>')}</div>

              <span class="label">REMEDIATION BLUEPRINT</span>
              <div class="blueprint">${s.recommendation}</div>
            </div>
          </div>
        `).join('')}

        <div style="position:fixed; bottom:20px; left:0; right:0; text-align:center; font-size:8px; color:#94a3b8">
          Confidential Audit &bull; Generated by HumangoBot &bull; GDPR &bull; ePrivacy &bull; RFC 9309
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
