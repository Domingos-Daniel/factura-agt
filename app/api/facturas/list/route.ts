import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
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
  return {
    id: doc.id,
    submissionGUID: doc.id,
    taxRegistrationNumber: doc.customerTaxId || '',
    submissionTimeStamp: doc.documentDate || new Date().toISOString(),
    validationStatus: mapAppyPayStatus(doc.validationStatus || doc.documentStatus),
    validationResult: {
      status: doc.validationStatus === 'V' ? 'Validada' : 
              doc.validationStatus === 'I' ? 'Rejeitada' : 'Com Erros',
      qrCode: doc.qrCode,
      hash: doc.hash,
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
    case 'N':
    case 'PENDING':
    case 'PROCESSING':
      return 'P'
    case 'V':
    case 'SUCCESS':
    case 'COMPLETED':
      return 'V'
    case 'I':
    case 'FAILED':
    case 'REJECTED':
      return 'I'
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
    
    // Se AppyPay e pediu refresh, buscar da API
    if (activeProvider === 'appypay' && refresh) {
      try {
        const providerManager = new ProviderManager()
        const documents = await providerManager.listDocuments()
        
        const facturas = documents.map(mapAppyPayDocToFactura)
        
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
    const facturas: Factura[] = JSON.parse(fileContent)
    
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
