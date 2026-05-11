
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
const CHROME_PATH = '/root/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain');
  if (!domain) return NextResponse.json({ error: 'Domain is required' }, { status: 400 });

  let browser: any = null;
  try {
    const colCheck = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'site_violations'`);
    const cols = colCheck.rows.map(r => r.column_name);
    
    const hasLaw = cols.includes('law_name');
    const hasFine = cols.includes('fine_amount');
    const hasRec = cols.includes('recommendation');
    const hasMethod = cols.includes('verification_method');

    // Fetch all violations for grouping
    const res = await pool.query(`
      SELECT 
        issue_type, page_url, severity, explanation, 
        ${hasFine ? 'fine_amount' : "'' as fine_amount"}, 
        ${hasLaw ? 'law_name' : "'GDPR' as law_name"}, 
        ${hasRec ? 'recommendation' : "'Remediation required' as recommendation"},
        ${hasMethod ? 'verification_method' : "'Static' as verification_method"}
      FROM site_violations 
      WHERE domain = $1 
      ORDER BY severity DESC, created_at DESC
    `, [domain]);

    if (res.rows.length === 0) return NextResponse.json({ error: 'Audit history not found for this target.' }, { status: 404 });

    // IRIS FIX: Deduplicate and Group by issue_type to prevent 14-page reports
    const groupedViolations: Record<string, any> = {};
    res.rows.forEach(row => {
      const key = row.issue_type;
      if (!groupedViolations[key]) {
        groupedViolations[key] = {
          ...row,
          affected_urls: new Set([row.page_url])
        };
      } else {
        groupedViolations[key].affected_urls.add(row.page_url);
      }
    });

    // LIMIT TO TOP 5 TO PREVENT ERROR 500
    const violations = Object.values(groupedViolations).slice(0, 5);

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
          body { font-family: 'Helvetica', sans-serif; color: #1e293b; padding: 40px; line-height: 1.5; }
          .header { border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
          .logo-text { font-size: 24px; font-weight: bold; color: #0f172a; }
          .title-section { margin-bottom: 30px; }
          .title { font-size: 22px; font-weight: bold; color: #0f172a; border-left: 4px solid #3b82f6; padding-left: 15px; }
          .domain-badge { background: #eff6ff; color: #3b82f6; padding: 4px 12px; border-radius: 4px; font-size: 14px; font-weight: bold; }
          .violation-item { border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 25px; page-break-inside: avoid; }
          .violation-header { background: #f8fafc; padding: 15px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
          .violation-type { font-weight: bold; font-size: 14px; color: #0f172a; }
          .violation-body { padding: 20px; }
          .severity-badge { font-size: 9px; font-weight: bold; text-transform: uppercase; padding: 3px 8px; border-radius: 99px; display: inline-block; margin-bottom: 12px; }
          .critical { background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; }
          .high { background: #fffbeb; color: #d97706; border: 1px solid #fef3c7; }
          .label { font-size: 10px; font-weight: bold; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; display: block; }
          .fine { font-size: 12px; font-weight: bold; color: #ef4444; background: #fef2f2; padding: 12px; border-radius: 6px; margin-bottom: 15px; border-left: 4px solid #ef4444; }
          .resource-list { font-size: 10px; color: #64748b; background: #f1f5f9; padding: 10px; border-radius: 6px; margin-bottom: 15px; font-family: monospace; word-break: break-all; }
          .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #64748b; }
          .contact-link { color: #3b82f6; font-weight: bold; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display:flex; align-items:center; gap:10px">
            ${logoBase64 ? `<img src="${logoBase64}" style="width:40px; height:40px">` : ''}
            <div class="logo-text">Humango Compliance</div>
          </div>
          <div style="text-align:right; font-size:10px; color:#64748b">
            Official Audit Report<br>Generated: ${new Date().toLocaleDateString('en-GB')}
          </div>
        </div>

        <div class="title-section">
          <div class="title">Enterprise Compliance Assessment</div>
          <div style="margin-top:15px">Audit Target: <span class="domain-badge">${domain}</span></div>
        </div>

        ${violations.map(item => `
          <div class="violation-item">
            <div class="violation-header">
              <span class="violation-type">${item.issue_type}</span>
              <span style="font-size:9px; color:#64748b">${item.verification_method}</span>
            </div>
            <div class="violation-body">
              <span class="severity-badge ${item.severity}">${item.severity} Risk</span>
              
              <span class="label">Diagnostic Explanation</span>
              <div style="font-size:12px; margin-bottom:15px">${item.explanation}</div>
              
              <span class="label">Legal Basis</span>
              <div style="font-size:11px; font-weight:bold; margin-bottom:15px">${item.law_name}</div>
              
              <span class="label">Potential Administrative Liability (Art. 83 GDPR)</span>
              <div class="fine">${item.fine_amount || 'Up to €20,000,000 or 4% of annual global turnover.'}</div>
              
              <span class="label">Affected Resource(s)</span>
              <div class="resource-list">
                ${Array.from(item.affected_urls).join('<br>')}
              </div>

              <span class="label">Corrective Action Template</span>
              <div style="background:#ecfdf5; border:1px solid #d1fae5; padding:15px; border-radius:8px; color:#065f46; font-size:11px">
                <strong>Remediation:</strong> ${item.recommendation}
              </div>
            </div>
          </div>
        `).join('')}

        <div class="footer">
          <div>
            &copy; ${new Date().getFullYear()} Humango Limited • London • E6 2JA<br>
            Verification: <a href="mailto:abuse@humango.app" class="contact-link">abuse@humango.app</a>
          </div>
          ${logoBase64 ? `<img src="${logoBase64}" style="width:30px; opacity:0.3">` : ''}
        </div>
      </body>
      </html>
    `;

    browser = await puppeteer.launch({ 
      executablePath: CHROME_PATH, 
      headless: 'new', 
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] 
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ 
      format: 'A4', 
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' }
    });

    return new NextResponse(pdfBuffer, { 
      headers: { 
        'Content-Type': 'application/pdf', 
        'Content-Disposition': `attachment; filename=Humango_Audit_${domain.replace(/\./g, '_')}.pdf` 
      } 
    });
  } catch (error: any) {
    console.error('[PDF Error]', error);
    return NextResponse.json({ error: 'Failed to generate report', message: error.message }, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}
