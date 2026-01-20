import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const delaySec = Number(url.searchParams.get('delay') || '10')
  
  console.log(`⏱️  Iniciando delay de ${delaySec} segundos...`)
  
  const start = Date.now()
  
  // Simular operação longa
  await new Promise(resolve => setTimeout(resolve, delaySec * 1000))
  
  const duration = ((Date.now() - start) / 1000).toFixed(2)
  
  console.log(`✅ Delay completado em ${duration}s`)
  
  return NextResponse.json({
    success: true,
    message: `Delay de ${delaySec}s completado com sucesso`,
    actualDuration: `${duration}s`
  }, { status: 200 })
}
