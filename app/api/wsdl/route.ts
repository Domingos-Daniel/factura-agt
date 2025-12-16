import { NextRequest, NextResponse } from 'next/server';
import { getBuiltWsdl } from '@/lib/wsdl';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const base = path.join(process.cwd(), 'public', 'wsdl');
    const candidates = [
      'AGT_FacturacaoElectronica_v1.wsdl',
      'AGT_FacturaService_v2.wsdl',
      'AGT_FacturaService.wsdl',
    ];

    for (const c of candidates) {
      const p = path.join(base, c);
      try {
        const content = await fs.readFile(p, 'utf-8');
        if (content && content.trim().length > 0) {
          return new NextResponse(content, {
            status: 200,
            headers: {
              'Content-Type': 'application/xml; charset=utf-8',
              'Content-Disposition': `inline; filename="${c}"`,
              'Cache-Control': 'public, max-age=3600',
              'X-AGT-WSDL-Source': c,
            },
          });
        }
      } catch (err) {
        // try next
      }
    }

    // Fallback to built-in WSDL from build-time
    const built = getBuiltWsdl();
    if (built && built.trim().length > 0) {
      return new NextResponse(built, {
        status: 200,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Content-Disposition': 'inline; filename="AGT_FacturacaoElectronica_v1.wsdl"',
          'Cache-Control': 'public, max-age=3600',
          'X-AGT-WSDL-Source': 'built-inline',
        },
      });
    }

    return new NextResponse('<error>WSDL não encontrado</error>', {
      status: 404,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  } catch (error) {
    console.error('GET /api/wsdl error:', (error as Error).message);
    return new NextResponse('<error>Erro interno a servir WSDL</error>', {
      status: 500,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }
}
