
import { NextResponse, NextRequest } from 'next/server';
import { generatePdfReport } from '@/lib/report-generator';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DomainSchema = z.string().min(3).max(255);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawDomain = searchParams.get('domain');
  
  const validation = DomainSchema.safeParse(rawDomain);
  if (!validation.success) {
    return NextResponse.json({ error: 'Valid domain required' }, { status: 400 });
  }

  const domain = validation.data.toLowerCase().replace(/^https?:\/\//, '').split('/')[0];

  try {
    const pdfBuffer = await generatePdfReport(domain);
    
    if (!pdfBuffer) {
      return NextResponse.json({ error: 'Audit data not found for this domain.' }, { status: 404 });
    }

    return new NextResponse(pdfBuffer, { 
      headers: { 
        'Content-Type': 'application/pdf', 
        'Content-Disposition': `attachment; filename=Humango_Audit_${domain}.pdf` 
      } 
    });
  } catch (error: any) {
    console.error('[PDF API ERROR]', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
