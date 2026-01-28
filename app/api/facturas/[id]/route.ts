import { NextRequest, NextResponse } from 'next/server'
import { getFacturaJsonById, getAllFacturasJson } from '@/lib/server/facturasJson'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID não fornecido' },
        { status: 400 }
      )
    }

    // 1. Buscar por ID exato no backup (facturas.json)
    let factura = await getFacturaJsonById(id)
    
    if (factura) {
      return NextResponse.json({ 
        success: true,
        factura,
        source: 'backup'
      })
    }

    // 2. Tentar buscar por submissionGUID, id ou requestID
    const allFacturas = await getAllFacturasJson()
    
    const byGuid = allFacturas.find((f: any) => 
      f.submissionGUID === id || 
      f.id === id ||
      f.requestID === id
    )
    
    if (byGuid) {
      return NextResponse.json({ 
        success: true,
        factura: byGuid,
        source: 'backup'
      })
    }

    // 3. Factura não encontrada
    return NextResponse.json(
      { success: false, error: 'Factura não encontrada' },
      { status: 404 }
    )
  } catch (error) {
    console.error('Erro ao buscar factura:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
