import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync, unlinkSync } from 'fs'
import { join } from 'path'
import { Factura } from '@/lib/types'
import { ProviderManager } from '@/lib/providers'

export const dynamic = 'force-dynamic'

// Determinar provider activo
function getActiveProvider(): 'agt' | 'appypay' {
  return (process.env.FISCAL_PROVIDER as 'agt' | 'appypay') || 'agt'
}

// Mapear documento AppyPay para formato Factura
function mapAppyPayDocToFactura(doc: any): Partial<Factura> {
  // Determinar status real: validationStatus tem prioridade
  const validationStatus = doc.validationStatus || doc.documentStatus;
  const mappedStatus = mapAppyPayStatus(validationStatus);
  
  return {
    id: doc.id,
    submissionGUID: doc.id,
    taxRegistrationNumber: doc.customerTaxId || '',
    submissionTimeStamp: doc.documentDate || new Date().toISOString(),
    validationStatus: mappedStatus,
    validationResult: {
      status: mappedStatus === 'V' ? 'Validada' : 
              mappedStatus === 'I' ? 'Rejeitada' : 
              mappedStatus === 'P' ? 'Pendente' : 'Com Erros',
      qrCode: doc.qrCode,
      hash: doc.hash,
      errors: doc.providerResultDescription ? [doc.providerResultDescription] : undefined,
    },
    requestID: doc.providerRequestId,
    documents: [{
      documentNo: doc.documentNo,
      documentType: doc.documentType || 'FT',
      documentDate: doc.documentDate,
      customerTaxID: doc.customerTaxId,
      companyName: doc.companyName,
      documentStatus: doc.documentStatus,
      documentTotals: {
        netTotal: doc.netTotal || 0,
        taxPayable: doc.taxPayable || 0,
        grossTotal: doc.grossTotal || 0,
      },
      lines: [],
    }] as any,
    schemaVersion: '1.2',
    softwareInfo: {} as any,
    createdAt: doc.createdDate || new Date().toISOString(),
    updatedAt: doc.updatedDate || new Date().toISOString(),
  } as any
}

function mapAppyPayStatus(status: string): 'P' | 'V' | 'I' | 'R' | 'E' {
  switch (status?.toUpperCase()) {
    // AppyPay validationStatus:
    case 'N': // N = Novo/Aprovado (documento válido esperando processamento)
      return 'V'
    case 'V': // V = Validado pela AGT
    case 'SUCCESS':
    case 'COMPLETED':
      return 'V'
    case 'I': // I = Inválido/Rejeitado pela AGT
    case 'FAILED':
    case 'REJECTED':
      return 'I'
    // AppyPay documentStatus:
    case 'PENDING':
    case 'PROCESSING':
      return 'P'
    case 'R':
      return 'R'
    case 'E':
      return 'E'
    default:
      return 'P'
  }
}

export async function GET(request: NextRequest) {
  try {
    const activeProvider = getActiveProvider()
    const url = new URL(request.url)
    const refresh = url.searchParams.get('refresh') === 'true'
    const reset = url.searchParams.get('reset') === '1'

    // allow resetting local backup
    if (reset) {
      const jsonPath = join(process.cwd(), 'data', 'facturas.json')
      try { if (existsSync(jsonPath)) { unlinkSync(jsonPath) } } catch {} // ignore
      return NextResponse.json({ success: true })
    }

    // Se AppyPay e pediu refresh, buscar da API
    if (activeProvider === 'appypay' && refresh) {
      try {
        console.log('[API /facturas/list] 🔄 Buscando documentos da AppyPay...');
        const providerManager = new ProviderManager()
        const documents = await providerManager.listDocuments()
        
        console.log(`[API /facturas/list] 📦 ProviderManager retornou: ${documents.length} documentos`);
        console.log(`[API /facturas/list] 📋 IDs dos documentos:`, documents.map(d => d.id || d.documentNo));
        
        const facturas = documents.map(mapAppyPayDocToFactura)
        
        console.log(`[API /facturas/list] ✅ Mapeados: ${facturas.length} facturas`);
        
        return NextResponse.json({ 
          facturas,
          count: facturas.length,
          provider: 'appypay',
          source: 'appypay'
        })
      } catch (e: any) {
        console.error('[AppyPay] Erro ao listar documentos:', e)
        // Fallback para backup local
      }
    }
    
    // Carregar do backup local
    const jsonPath = join(process.cwd(), 'data', 'facturas.json')
    
    if (!existsSync(jsonPath)) {
      return NextResponse.json({ 
        facturas: [],
        provider: activeProvider 
      })
    }
    
    const fileContent = readFileSync(jsonPath, 'utf-8')
    let facturas: Factura[] = []
    try {
      facturas = JSON.parse(fileContent)
    } catch (parseErr) {
      console.error('Backup JSON parse error:', parseErr)
      // corruption detected – delete file so subsequent reads start fresh
      try { unlinkSync(jsonPath) } catch {}
      return NextResponse.json(
        { 
          facturas: [],
          count: 0,
          provider: activeProvider,
          source: 'backup',
          warning: 'Backup local corrompido e apagado'
        },
        { status: 200 }
      )
    }
    
    return NextResponse.json({ 
      facturas,
      count: facturas.length,
      provider: activeProvider,
      source: 'backup'
    })
  } catch (error) {
    console.error('Erro ao carregar facturas:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar facturas', facturas: [] },
      { status: 500 }
    )
  }
}
