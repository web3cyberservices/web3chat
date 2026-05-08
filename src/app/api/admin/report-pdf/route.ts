
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

  if (!domain) {
    return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
  }

  let browser: any = null;

  try {
    const res = await pool.query(`
      SELECT page_url, issue_type, severity, explanation, fine_amount, law_name, created_at
      FROM site_violations 
      WHERE domain = $1
      ORDER BY created_at DESC
    `, [domain]);

    const violations = res.rows;
    
    if (violations.length === 0) {
      return NextResponse.json({ error: 'No violations found for this domain' }, { status: 404 });
    }

    // Группировка нарушений по типу для суммаризации
    const grouped = violations.reduce((acc: any, curr: any) => {
      const type = curr.issue_type;
      if (!acc[type]) {
        acc[type] = {
          type: type,
          severity: curr.severity,
          explanation: curr.explanation,
          fine: curr.fine_amount,
          law: curr.law_name,
          urls: []
        };
      }
      acc[type].urls.push(curr.page_url);
      return acc;
    }, {});

    const groupedArray = Object.values(grouped);

    // Загрузка логотипа
    let logoBase64 = '';
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo.png');
      const logoBuffer = fs.readFileSync(logoPath);
      logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    } catch (e) {
      console.warn('Logo file not found, skipping base64 conversion');
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica', sans-serif; color: #1e293b; padding: 40px; line-height: 1.5; background: #fff; }
          .header { border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
          .logo-container { display: flex; align-items: center; gap: 15px; }
          .logo-img { width: 48px; height: 48px; object-fit: contain; }
          .logo-text { font-size: 24px; font-weight: bold; color: #0f172a; }
          .company-info { font-size: 10px; color: #64748b; text-align: right; }
          .title-section { margin-bottom: 30px; }
          .title { font-size: 18px; font-weight: bold; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; margin: 0; }
          .domain-badge { background: #eff6ff; color: #3b82f6; padding: 4px 12px; border-radius: 4px; font-size: 14px; font-weight: bold; }
          
          .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 30px; }
          .summary-title { font-size: 14px; font-weight: bold; color: #334155; margin-bottom: 10px; text-transform: uppercase; }
          
          .violation-item { border: 1px solid #f1f5f9; border-radius: 8px; margin-bottom: 20px; overflow: hidden; page-break-inside: avoid; }
          .violation-header { background: #fdfdfd; padding: 15px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
          .violation-type { font-weight: bold; font-size: 14px; color: #0f172a; }
          .violation-count { background: #fee2e2; color: #ef4444; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold; }
          .violation-body { padding: 15px; }
          .severity-badge { font-size: 9px; font-weight: bold; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 10px; }
          .critical { background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; }
          .high { background: #fff7ed; color: #f97316; border: 1px solid #ffedd5; }
          
          .explanation-text { font-size: 12px; color: #475569; margin-bottom: 15px; }
          .law-note { font-size: 10px; color: #94a3b8; font-style: italic; }
          .fine-text { font-size: 12px; font-weight: bold; color: #ef4444; margin-top: 10px; }
          
          .url-list-title { font-size: 11px; font-weight: bold; color: #64748b; margin-top: 15px; margin-bottom: 5px; text-transform: uppercase; }
          .url-list { list-style: none; padding: 0; margin: 0; font-family: monospace; font-size: 10px; color: #3b82f6; }
          .url-list li { margin-bottom: 3px; word-break: break-all; }

          .warning-box { background: #fff7ed; border: 1px solid #ffedd5; padding: 20px; margin-top: 40px; border-radius: 8px; }
          .warning-title { color: #9a3412; font-weight: bold; font-size: 14px; margin-bottom: 10px; }
          .warning-text { font-size: 11px; color: #7c2d12; }
          
          .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; }
          .qr-placeholder { width: 60px; height: 60px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-container">
            ${logoBase64 ? `<img src="${logoBase64}" class="logo-img" alt="Logo">` : ''}
            <div>
              <div class="logo-text">HUMANGO BOT</div>
              <div style="font-size: 10px; color: #3b82f6; font-weight: bold;">Compliance & Security Systems</div>
            </div>
          </div>
          <div class="company-info">
            <strong>HUMANGO LIMITED</strong><br>
            182-184 High Street North, London<br>
            England, E6 2JA<br>
            Company No: 16750477
          </div>
        </div>

        <div class="title-section">
          <div class="title">Официальный отчет о выявленных нарушениях</div>
          <div style="margin-top: 10px;">
            Объект аудита: <span class="domain-badge">${domain}</span>
          </div>
          <div style="font-size: 10px; color: #94a3b8; margin-top: 5px;">
            Дата формирования: ${new Date().toLocaleDateString('ru-RU')} | ID: HB-${Math.floor(Math.random() * 900000 + 100000)}
          </div>
        </div>

        <div class="summary-card">
          <div class="summary-title">Результаты сканирования</div>
          <div style="font-size: 13px; color: #475569;">
            В ходе автоматизированного аудита на домене <strong>${domain}</strong> было обнаружено 
            <strong>${violations.length}</strong> нарушений, распределенных по <strong>${groupedArray.length}</strong> категориям.
          </div>
        </div>

        ${groupedArray.map((item: any) => `
          <div class="violation-item">
            <div class="violation-header">
              <span class="violation-type">${item.type}</span>
              <span class="violation-count">Инцидентов: ${item.urls.length}</span>
            </div>
            <div class="violation-body">
              <span class="severity-badge ${item.severity}">${item.severity} Risk</span>
              <div class="explanation-text">${item.explanation}</div>
              <div class="law-note">Правовое основание: ${item.law}</div>
              <div class="fine-text">Возможный штраф: ${item.fine}</div>
              
              <div class="url-list-title">Список целевых страниц (${item.urls.length}):</div>
              <ul class="url-list">
                ${item.urls.slice(0, 15).map((url: string) => `<li>${url}</li>`).join('')}
                ${item.urls.length > 15 ? `<li>... и еще ${item.urls.length - 15} страниц</li>` : ''}
              </ul>
            </div>
          </div>
        `).join('')}

        <div class="warning-box">
          <div class="warning-title">⚠️ Юридическое уведомление</div>
          <div class="warning-text">
            Выявленные ошибки влекут за собой административную ответственность согласно регламентам GDPR и локальному законодательству ЕС. 
            Данный отчет носит официальный уведомительный характер. 
            Вам необходимо устранить данные нарушения в кратчайшие сроки для предотвращения санкций со стороны надзорных органов. 
            Специалисты HUMANGO готовы провести повторный аудит после внесения правок.
          </div>
        </div>

        <div class="footer">
          <div>
            &copy; ${new Date().getFullYear()} Global Infrastructure Group | HUMANGO Compliance<br>
            Verification: bot.humango.app | Support: abuse@humango.app
          </div>
          <div class="qr-placeholder">
            <span style="font-size: 8px;">DIGITAL<br>SIGNATURE</span>
          </div>
        </div>
      </body>
      </html>
    `;

    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    if (!browser) throw new Error('Failed to launch browser for PDF');

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({ 
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });
    
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Humango_Audit_${domain}_${new Date().toISOString().split('T')[0]}.pdf`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });

  } catch (error: any) {
    console.error('[PDF Export Error]', error);
    return NextResponse.json({ error: 'Failed to generate PDF report' }, { status: 500 });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error('Error closing browser in PDF API:', e);
      }
    }
  }
}
