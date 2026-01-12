import { NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { Factura } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const jsonPath = join(process.cwd(), 'data', 'facturas.json')
    
    if (!existsSync(jsonPath)) {
      return NextResponse.json({ facturas: [] })
    }
    
    const fileContent = readFileSync(jsonPath, 'utf-8')
    const facturas: Factura[] = JSON.parse(fileContent)
    
    return NextResponse.json({ 
      facturas,
      count: facturas.length 
    })
  } catch (error) {
    console.error('Erro ao carregar facturas:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar facturas', facturas: [] },
      { status: 500 }
    )
  }
}
