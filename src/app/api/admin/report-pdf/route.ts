
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
    const res = await pool.query(`
      SELECT 
        issue_type, page_url, severity, category, explanation, 
        fine_amount, law_name, recommendation, verification_method
      FROM site_violations 
      WHERE domain = $1 
      ORDER BY severity DESC, created_at DESC
    `, [domain]);

    if (res.rows.length === 0) return NextResponse.json({ error: 'Audit history not found for this target.' }, { status: 404 });

    // ENHANCED HYBRID CONSOLIDATION ENGINE
    // Groups violations by type, category, and law to eliminate page duplicates
    const consolidatedFindings: Record<string, any> = {};
    
    res.rows.forEach(row => {
      const type = (row.issue_type || 'VIOLATION').trim().toUpperCase();
      const law = (row.law_name || 'GDPR').trim().toUpperCase();
      const cat = (row.category || 'GENERAL').trim();
      const key = `${cat}_${type}_${law}`;

      if (!consolidatedFindings[key]) {
        consolidatedFindings[key] = {
          ...row,
          issue_type: type,
          affected_urls: new Set([row.page_url])
        };
      } else {
        consolidatedFindings[key].affected_urls.add(row.page_url);
        // Mark as Hybrid if methods differ
        if (consolidatedFindings[key].verification_method !== row.verification_method) {
          consolidatedFindings[key].verification_method = 'Hybrid (Dynamic + Static)';
        }
      }
    });

    const allFindings = Object.values(consolidatedFindings);
    
    // Split findings into dense thematic sections
    const coreViolations = allFindings.filter(v => ['PRIVACY', 'IMPRESSUM', 'COOKIES'].includes(v.category) && !v.issue_type.includes('TRANSPARENCY'));
    const processingOperations = allFindings.filter(v => v.category === 'LEGAL_GROUNDS' || v.issue_type.includes('PROCESSING'));
    const transparencyFramework = allFindings.filter(v => v.issue_type.includes('TRANSPARENCY'));

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
          body { font-family: 'Helvetica', sans-serif; color: #1e293b; padding: 40px; line-height: 1.5; background: #ffffff; }
          .header { border-bottom: 2px solid #3b82f6; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end; }
          .logo-text { font-size: 22px; font-weight: bold; color: #0f172a; }
          .title-section { margin-bottom: 25px; }
          .title { font-size: 20px; font-weight: bold; color: #0f172a; border-left: 4px solid #3b82f6; padding-left: 12px; }
          .section-title { font-size: 14px; font-weight: bold; color: #3b82f6; margin-top: 30px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
          .domain-badge { background: #eff6ff; color: #3b82f6; padding: 3px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; }
          .violation-item { border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 20px; page-break-inside: avoid; background: #ffffff; overflow: hidden; }
          .violation-header { background: #f8fafc; padding: 12px 15px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
          .violation-type { font-weight: bold; font-size: 13px; color: #0f172a; text-transform: uppercase; }
          .violation-body { padding: 15px 20px; }
          .severity-badge { font-size: 8px; font-weight: bold; text-transform: uppercase; padding: 2px 6px; border-radius: 99px; display: inline-block; margin-bottom: 10px; }
          .critical { background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; }
          .high { background: #fffbeb; color: #d97706; border: 1px solid #fef3c7; }
          .low { background: #f0fdf4; color: #16a34a; border: 1px solid #dcfce7; }
          .label { font-size: 9px; font-weight: bold; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; display: block; }
          .fine { font-size: 11px; font-weight: bold; color: #ef4444; background: #fef2f2; padding: 10px; border-radius: 6px; margin-bottom: 12px; border-left: 3px solid #ef4444; }
          .resource-list { font-size: 9px; color: #64748b; background: #f1f5f9; padding: 10px; border-radius: 6px; margin-bottom: 12px; font-family: 'Courier New', monospace; word-break: break-all; }
          .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 15px; display: flex; justify-content: space-between; align-items: center; font-size: 8px; color: #64748b; }
          .contact-link { color: #3b82f6; font-weight: bold; text-decoration: none; }
          .explanation-text { font-size: 11px; margin-bottom: 12px; white-space: pre-line; }
          .blueprint-box { background:#ecfdf5; border:1px solid #d1fae5; padding:12px; border-radius:6px; color:#065f46; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display:flex; align-items:center; gap:8px">
            ${logoBase64 ? `<img src="${logoBase64}" style="width:35px; height:35px">` : ''}
            <div class="logo-text">Humango Compliance</div>
          </div>
          <div style="text-align:right; font-size:9px; color:#64748b">
            Enterprise Audit Intelligence<br>Generated: ${new Date().toLocaleDateString('en-GB')}
          </div>
        </div>

        <div class="title-section">
          <div class="title">Compliance Assessment Report</div>
          <div style="margin-top:12px">Target: <span class="domain-badge">${domain}</span></div>
        </div>

        ${coreViolations.length > 0 ? `
          <div class="section-title">Core Legal Infrastructure</div>
          ${coreViolations.map(item => `
            <div class="violation-item">
              <div class="violation-header">
                <span class="violation-type">${item.issue_type}</span>
                <span style="font-size:8px; color:#64748b">${item.verification_method}</span>
              </div>
              <div class="violation-body">
                <span class="severity-badge ${item.severity}">${item.severity} Risk</span>
                
                <span class="label">Diagnostic Explanation</span>
                <div class="explanation-text">${item.explanation}</div>
                
                <span class="label">Statutory Basis</span>
                <div style="font-size:10px; font-weight:bold; margin-bottom:12px; color:#0f172a">${item.law_name}</div>
                
                <span class="label">Liability (Art. 83 GDPR)</span>
                <div class="fine">${item.fine_amount || '€20,000,000 or 4% of global turnover'}</div>
                
                <span class="label">Targeted Resource(s)</span>
                <div class="resource-list">${Array.from(item.affected_urls).join('<br>')}</div>

                <span class="label">REMEDIATION BLUEPRINT</span>
                <div class="blueprint-box">${item.recommendation}</div>
              </div>
            </div>
          `).join('')}
        ` : ''}

        ${processingOperations.length > 0 ? `
          <div class="section-title">Processing Operations & Legal Grounds</div>
          ${processingOperations.map(item => `
            <div class="violation-item">
              <div class="violation-header">
                <span class="violation-type">${item.issue_type}</span>
                <span style="font-size:8px; color:#64748b">${item.verification_method}</span>
              </div>
              <div class="violation-body">
                <span class="severity-badge ${item.severity}">${item.severity} Risk</span>
                
                <span class="label">Purpose-to-Basis Mapping Diagnostic</span>
                <div class="explanation-text">${item.explanation}</div>
                
                <span class="label">Statutory Accountability</span>
                <div style="font-size:10px; font-weight:bold; margin-bottom:12px; color:#0f172a">${item.law_name}</div>
                
                <span class="label">Administrative Liability</span>
                <div class="fine">€20,000,000 or 4% of global turnover</div>

                <span class="label">Targeted Resource(s)</span>
                <div class="resource-list">${Array.from(item.affected_urls).join('<br>')}</div>

                <span class="label">REMEDIATION BLUEPRINT</span>
                <div class="blueprint-box" style="background:#fff7ed; border-color:#ffedd5; color:#9a3412;">
                  ${item.recommendation}
                </div>
              </div>
            </div>
          `).join('')}
        ` : ''}

        ${transparencyFramework.length > 0 ? `
          <div class="section-title">Transparency Framework & Disclosure</div>
          ${transparencyFramework.map(item => `
            <div class="violation-item">
              <div class="violation-header">
                <span class="violation-type">${item.issue_type}</span>
                <span style="font-size:8px; color:#64748b">${item.verification_method}</span>
              </div>
              <div class="violation-body">
                <span class="severity-badge ${item.severity}">${item.severity} Risk</span>
                
                <span class="label">Structural Analysis</span>
                <div class="explanation-text">${item.explanation}</div>
                
                <span class="label">Statutory Grounds</span>
                <div style="font-size:10px; font-weight:bold; margin-bottom:12px; color:#0f172a">${item.law_name}</div>
                
                <span class="label">Liability</span>
                <div class="fine">${item.fine_amount || '€20,000,000 or 4% of global turnover'}</div>

                <span class="label">REMEDIATION BLUEPRINT</span>
                <div class="blueprint-box" style="background:#f0f9ff; border-color:#e0f2fe; color:#0369a1;">
                  ${item.recommendation}
                </div>
              </div>
            </div>
          `).join('')}
        ` : ''}

        <div class="footer">
          <div>
            &copy; ${new Date().getFullYear()} Humango Limited • London • Policy v2.9<br>
            Verification: <a href="mailto:abuse@humango.app" class="contact-link">abuse@humango.app</a>
          </div>
          ${logoBase64 ? `<img src="${logoBase64}" style="width:25px; opacity:0.3">` : ''}
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
      margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' }
    });

    return new NextResponse(pdfBuffer, { 
      headers: { 
        'Content-Type': 'application/pdf', 
        'Content-Disposition': `attachment; filename=Humango_Audit_${domain.replace(/\./g, '_')}.pdf` 
      } 
    });
  } catch (error: any) {
    console.error('[PDF Generation Error]', error);
    return NextResponse.json({ error: 'Failed to generate report', message: error.message }, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}
