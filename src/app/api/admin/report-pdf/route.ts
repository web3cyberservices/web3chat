
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import puppeteer from 'puppeteer';

export const dynamic = 'force-dynamic';

const CHROME_PATH = '/root/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain');

  if (!domain) {
    return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
  }

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

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica', sans-serif; color: #1e293b; padding: 40px; line-height: 1.5; }
          .header { border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
          .logo-text { font-size: 24px; font-weight: bold; color: #0f172a; }
          .company-info { font-size: 10px; color: #64748b; text-align: right; }
          .title { font-size: 18px; font-weight: bold; margin-bottom: 20px; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
          .domain-badge { background: #eff6ff; color: #3b82f6; padding: 4px 12px; border-radius: 4px; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #f8fafc; text-align: left; padding: 12px; font-size: 10px; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
          td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 11px; vertical-align: top; }
          .severity { font-weight: bold; text-transform: uppercase; font-size: 9px; }
          .critical { color: #ef4444; }
          .high { color: #f97316; }
          .warning-box { background: #fff7ed; border: 1px solid #ffedd5; padding: 20px; margin-top: 40px; border-radius: 8px; }
          .warning-title { color: #9a3412; font-weight: bold; font-size: 14px; margin-bottom: 10px; }
          .warning-text { font-size: 11px; color: #7c2d12; }
          .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; }
          .qr-placeholder { width: 60px; height: 60px; background: #f1f5f9; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 8px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo-text">HUMANGO BOT</div>
            <div style="font-size: 10px; color: #3b82f6;">Compliance & Security Auditing Systems</div>
          </div>
          <div class="company-info">
            <strong>HUMANGO LIMITED</strong><br>
            182-184 High Street North, London<br>
            England, E6 2JA<br>
            Company No: 16750477
          </div>
        </div>

        <div class="title">Официальный отчет о выявленных нарушениях</div>
        <div style="margin-bottom: 30px;">
          Целевой домен: <span class="domain-badge">${domain}</span><br>
          <small style="color: #94a3b8;">Дата аудита: ${new Date().toLocaleDateString('ru-RU')} | Отчет ID: HB-${Math.floor(Math.random() * 900000 + 100000)}</small>
        </div>

        <table>
          <thead>
            <tr>
              <th width="20%">Тип нарушения</th>
              <th width="10%">Риск</th>
              <th width="40%">Правовое обоснование</th>
              <th width="15%">Штраф</th>
              <th width="15%">URL</th>
            </tr>
          </thead>
          <tbody>
            ${violations.map(v => `
              <tr>
                <td style="font-weight: bold;">${v.issue_type}</td>
                <td class="severity ${v.severity}">${v.severity}</td>
                <td>${v.explanation}<br><small style="color: #64748b; font-style: italic;">Закон: ${v.law_name}</small></td>
                <td style="color: #ef4444; font-weight: bold;">${v.fine_amount}</td>
                <td style="font-size: 9px; color: #3b82f6; word-break: break-all;">${v.page_url}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="warning-box">
          <div class="warning-title">⚠️ Юридическое уведомление</div>
          <div class="warning-text">
            Выявленные ошибки влекут за собой административную ответственность согласно регламентам GDPR и локальному законодательству ЕС. 
            Данный отчет носит ознакомительный характер на основе автоматического аудита технических заголовков и структуры сайта.
            Вы можете устранить данные нарушения самостоятельно или обратиться к нашим специалистам для проведения глубокого технического консалтинга. 
            Также доступна подписка на ежемесячный мониторинг соблюдения комплаенс-стандартов.
          </div>
        </div>

        <div class="footer">
          <div>
            &copy; ${new Date().getFullYear()} Global Infrastructure Group | HUMANGO Compliance<br>
            Contact: abuse@humango.app | Verification: bot.humango.app
          </div>
          <div class="qr-placeholder">
            QR CODE<br>VERIFICATION
          </div>
        </div>
      </body>
      </html>
    `;

    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent);
    const pdfBuffer = await page.pdf({ 
      format: 'A4',
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    });
    
    await browser.close();

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Humango_Audit_${domain}_${new Date().toISOString().split('T')[0]}.pdf`,
      },
    });

  } catch (error: any) {
    console.error('[PDF Export Error]', error);
    return NextResponse.json({ error: 'Failed to generate PDF report' }, { status: 500 });
  }
}
