import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID não fornecido' },
        { status: 400 }
      )
    }

    // Tentar ler do arquivo JSON
    const jsonPath = join(process.cwd(), 'data', 'facturas.json')
    
    if (existsSync(jsonPath)) {
      const content = readFileSync(jsonPath, 'utf-8')
      const facturas = JSON.parse(content)
      
      const factura = facturas.find((f: any) => f.id === id)
      
      if (factura) {
        return NextResponse.json({ 
          factura,
          source: 'json'
        })
      }
    }

    // Factura não encontrada
    return NextResponse.json(
      { error: 'Factura não encontrada' },
      { status: 404 }
    )
  } catch (error) {
    console.error('Erro ao buscar factura:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
