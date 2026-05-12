
import { NextResponse } from 'next/server';
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
        fine_amount, law_name, recommendation, verification_method
      FROM site_violations 
      WHERE domain = $1 
      ORDER BY severity DESC, created_at DESC
    `, [domain]);

    if (res.rows.length === 0) return NextResponse.json({ error: 'Audit history not found for this target.' }, { status: 404 });

    // ULTIMATE CONSOLIDATION ENGINE
    const consolidatedFindings: Record<string, any> = {};
    
    res.rows.forEach(row => {
      const type = (row.issue_type || 'VIOLATION').trim().toUpperCase();
      const law = (row.law_name || 'GDPR').trim().toUpperCase();
      const cat = (row.category || 'GENERAL').trim().toUpperCase();
      
      // Use a consistent key for de-duplication
      const key = `${cat}_${type}_${law}`;

      if (!consolidatedFindings[key]) {
        consolidatedFindings[key] = {
          ...row,
          issue_type: type,
          affected_urls: new Set([row.page_url])
        };
      } else {
        consolidatedFindings[key].affected_urls.add(row.page_url);
        if (consolidatedFindings[key].verification_method !== row.verification_method) {
          consolidatedFindings[key].verification_method = 'Hybrid (Dynamic + Static)';
        }
      }
    });

    const allFindings = Object.values(consolidatedFindings);
    
    // CATEGORY GROUPING
    const coreViolations = allFindings.filter(v => 
      (v.category === 'PRIVACY' && v.issue_type.includes('CONTROLLER')) || 
      v.category === 'IMPRESSUM' || 
      v.category === 'COOKIES'
    );
    
    const processingOperations = allFindings.filter(v => 
      v.category === 'LEGAL_GROUNDS' || 
      v.issue_type.includes('PROCESSING') || 
      v.issue_type.includes('LEGAL BASES')
    );
    
    const transparencyFramework = allFindings.filter(v => 
      v.issue_type.includes('RIGHTS') || 
      v.issue_type.includes('RETENTION') || 
      v.issue_type.includes('DPO') || 
      v.issue_type.includes('TRANSPARENCY')
    );

    const technicalRisks = allFindings.filter(v => 
      v.category === 'SECURITY' || 
      v.category === 'TECHNICAL'
    );

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
          body { font-family: 'Helvetica', sans-serif; color: #1e293b; padding: 30px; line-height: 1.4; background: #ffffff; }
          .header { border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
          .logo-text { font-size: 20px; font-weight: bold; color: #0f172a; }
          .title-section { margin-bottom: 20px; }
          .title { font-size: 18px; font-weight: bold; color: #0f172a; border-left: 4px solid #3b82f6; padding-left: 10px; }
          .section-title { font-size: 12px; font-weight: bold; color: #3b82f6; margin-top: 25px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; page-break-after: avoid; }
          .domain-badge { background: #eff6ff; color: #3b82f6; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
          .violation-item { border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 15px; page-break-inside: avoid; background: #ffffff; overflow: hidden; }
          .violation-header { background: #f8fafc; padding: 8px 12px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
          .violation-type { font-weight: bold; font-size: 11px; color: #0f172a; text-transform: uppercase; }
          .violation-body { padding: 12px 15px; }
          .severity-badge { font-size: 7px; font-weight: bold; text-transform: uppercase; padding: 1px 5px; border-radius: 99px; display: inline-block; margin-bottom: 8px; }
          .CRITICAL { background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; }
          .HIGH { background: #fffbeb; color: #d97706; border: 1px solid #fef3c7; }
          .MEDIUM { background: #f0fdf4; color: #16a34a; border: 1px solid #dcfce7; }
          .label { font-size: 8px; font-weight: bold; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; display: block; }
          .fine { font-size: 10px; font-weight: bold; color: #ef4444; background: #fef2f2; padding: 8px; border-radius: 5px; margin-bottom: 10px; border-left: 3px solid #ef4444; }
          .resource-list { font-size: 8px; color: #64748b; background: #f1f5f9; padding: 8px; border-radius: 5px; margin-bottom: 10px; font-family: 'Courier New', monospace; word-break: break-all; }
          .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 8px; color: #64748b; }
          .explanation-text { font-size: 10px; margin-bottom: 10px; white-space: pre-line; }
          .blueprint-box { background:#f8fafc; border:1px solid #e2e8f0; padding:10px; border-radius:5px; color:#334155; font-size: 9px; font-weight: 500; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display:flex; align-items:center; gap:8px">
            ${logoBase64 ? `<img src="${logoBase64}" style="width:30px; height:30px">` : ''}
            <div class="logo-text">Humango Compliance</div>
          </div>
          <div style="text-align:right; font-size:8px; color:#64748b">
            Enterprise Audit Intelligence<br>Generated: ${new Date().toLocaleDateString('en-GB')}
          </div>
        </div>

        <div class="title-section">
          <div class="title">Statutory Compliance Assessment</div>
          <div style="margin-top:8px">Target: <span class="domain-badge">${domain}</span></div>
        </div>

        ${coreViolations.length > 0 ? `
          <div class="section-title">I. Core Legal Infrastructure (Art. 13(1)(a))</div>
          ${coreViolations.map(item => `
            <div class="violation-item">
              <div class="violation-header">
                <span class="violation-type">${item.issue_type}</span>
                <span style="font-size:7px; color:#64748b">${item.verification_method}</span>
              </div>
              <div class="violation-body">
                <span class="severity-badge ${item.severity.toUpperCase()}">${item.severity} Risk</span>
                
                <span class="label">Legal Basis & Liability</span>
                <div style="font-size:9px; font-weight:bold; margin-bottom:5px">${item.law_name}</div>
                <div class="fine">€20,000,000 or 4% of global turnover</div>
                
                <span class="label">Diagnostic Analysis</span>
                <div class="explanation-text">${item.explanation}</div>

                <span class="label">Targeted Resource(s)</span>
                <div class="resource-list">${Array.from(item.affected_urls).join('<br>')}</div>

                <span class="label">REMEDIATION BLUEPRINT</span>
                <div class="blueprint-box">${item.recommendation}</div>
              </div>
            </div>
          `).join('')}
        ` : ''}

        ${processingOperations.length > 0 ? `
          <div class="section-title">II. Processing Operations & Legal Grounds (Art. 13(1)(c))</div>
          ${processingOperations.map(item => `
            <div class="violation-item">
              <div class="violation-header">
                <span class="violation-type">${item.issue_type}</span>
                <span style="font-size:7px; color:#64748b">${item.verification_method}</span>
              </div>
              <div class="violation-body">
                <span class="severity-badge ${item.severity.toUpperCase()}">${item.severity} Risk</span>
                
                <span class="label">Statutory Accountability</span>
                <div style="font-size:9px; font-weight:bold; margin-bottom:5px">${item.law_name}</div>
                
                <span class="label">Purpose-to-Basis Audit</span>
                <div class="explanation-text">${item.explanation}</div>

                <span class="label">REMEDIATION BLUEPRINT</span>
                <div class="blueprint-box" style="border-left: 3px solid #f97316;">
                  ${item.recommendation}
                </div>
              </div>
            </div>
          `).join('')}
        ` : ''}

        ${transparencyFramework.length > 0 ? `
          <div class="section-title">III. Transparency Framework & Disclosure Summary</div>
          <div class="violation-item">
            <div class="violation-header">
              <span class="violation-type">Mandatory Transparency Clusters</span>
              <span style="font-size:7px; color:#64748b">Structural Analysis</span>
            </div>
            <div class="violation-body">
              <div class="explanation-text">The following clusters of Article 13/14 were evaluated for statutory compliance:</div>
              
              ${transparencyFramework.map(item => `
                <div style="border-left: 2px solid #e2e8f0; padding-left: 10px; margin-bottom: 12px;">
                  <span class="severity-badge ${item.severity.toUpperCase()}">${item.severity}</span>
                  <div style="font-size:10px; font-weight:bold;">${item.issue_type}</div>
                  <div class="explanation-text" style="font-size:9px; margin-top:3px">${item.explanation}</div>
                </div>
              `).join('')}

              <span class="label">Consolidated Remediation</span>
              <div class="blueprint-box" style="border-left: 3px solid #3b82f6;">
                Update the Privacy Policy document to include explicit, clearly labeled sections for Data Subject Rights, Retention Periods, and DPO Contact details as identified above.
              </div>
            </div>
          </div>
        ` : ''}

        ${technicalRisks.length > 0 ? `
          <div class="section-title">IV. Technical Audit Findings</div>
          ${technicalRisks.map(item => `
            <div class="violation-item">
              <div class="violation-header">
                <span class="violation-type">${item.issue_type}</span>
              </div>
              <div class="violation-body">
                <div class="explanation-text" style="font-size:9px">${item.explanation}</div>
                <div class="blueprint-box">${item.recommendation}</div>
              </div>
            </div>
          `).join('')}
        ` : ''}

        <div class="footer">
          <div>
            &copy; ${new Date().getFullYear()} Humango Limited • London • Policy v2.9<br>
            Verification: abuse@humango.app
          </div>
          ${logoBase64 ? `<img src="${logoBase64}" style="width:20px; opacity:0.3">` : ''}
        </div>
      </body>
      </html>
    `;

    browser = await puppeteer.launch({ 
      executable_path: CHROME_PATH, 
      headless: 'new', 
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] 
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ 
      format: 'A4', 
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
    });

    return new NextResponse(pdfBuffer, { 
      headers: { 
        'Content-Type': 'application/pdf', 
        'Content-Disposition': `attachment; filename=Humango_Audit_${domain.replace(/\./g, '_')}.pdf` 
      } 
    });
  } catch (error: any) {
    console.error('[PDF Generation Error]', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}
