import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

/**
 * Callback endpoint para receber notificações da AGT
 * sobre o status de validação das facturas
 */

interface AGTCallbackPayload {
  requestID: string
  status: 'V' | 'R' | 'E' // Validada, Rejeitada, Erro
  documentNo?: string
  validationDate?: string
  errors?: Array<{
    code: string
    message: string
    field?: string
  }>
  details?: {
    qrCode?: string
    hash?: string
    certificateNumber?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    // Log da requisição recebida
    console.log('🔔 Callback AGT recebido em:', new Date().toISOString())
    
    // Parse do body
    const payload: AGTCallbackPayload = await request.json()
    
    console.log('📦 Payload recebido:', JSON.stringify(payload, null, 2))

    // Validar campos obrigatórios
    if (!payload.requestID) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'requestID é obrigatório' 
        },
        { status: 400 }
      )
    }

    if (!payload.status || !['V', 'R', 'E'].includes(payload.status)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'status inválido (esperado: V, R ou E)' 
        },
        { status: 400 }
      )
    }

    // Atualizar factura no JSON
    const jsonPath = join(process.cwd(), 'data', 'facturas.json')
    
    if (existsSync(jsonPath)) {
      const content = readFileSync(jsonPath, 'utf-8')
      const facturas = JSON.parse(content)
      
      // Encontrar factura pelo requestID
      const facturaIndex = facturas.findIndex((f: any) => f.requestID === payload.requestID)
      
      if (facturaIndex !== -1) {
        // Atualizar status e dados
        facturas[facturaIndex].validationStatus = payload.status
        facturas[facturaIndex].validationDate = payload.validationDate || new Date().toISOString()
        
        if (payload.status === 'V') {
          // Factura validada com sucesso
          facturas[facturaIndex].validationResult = {
            status: 'Validada',
            qrCode: payload.details?.qrCode,
            hash: payload.details?.hash,
            certificateNumber: payload.details?.certificateNumber,
          }
          console.log(`✅ Factura ${payload.documentNo || payload.requestID} VALIDADA`)
        } else if (payload.status === 'R') {
          // Factura rejeitada
          facturas[facturaIndex].validationResult = {
            status: 'Rejeitada',
            errors: payload.errors,
          }
          console.log(`❌ Factura ${payload.documentNo || payload.requestID} REJEITADA`)
        } else if (payload.status === 'E') {
          // Factura com erros
          facturas[facturaIndex].validationResult = {
            status: 'Com Erros',
            errors: payload.errors,
          }
          console.log(`⚠️ Factura ${payload.documentNo || payload.requestID} COM ERROS`)
        }
        
        // Salvar de volta
        writeFileSync(jsonPath, JSON.stringify(facturas, null, 2), 'utf-8')
        
        console.log(`💾 Factura atualizada no JSON (ID: ${facturas[facturaIndex].id})`)
        
        return NextResponse.json({
          success: true,
          message: 'Callback processado com sucesso',
          requestID: payload.requestID,
          status: payload.status,
        })
      } else {
        console.warn(`⚠️ Factura não encontrada para requestID: ${payload.requestID}`)
        
        // Salvar callback em arquivo de log para referência
        const logPath = join(process.cwd(), 'data', 'agt-callbacks.log')
        const logEntry = `${new Date().toISOString()} - RequestID não encontrado: ${payload.requestID}\n${JSON.stringify(payload, null, 2)}\n\n`
        
        try {
          if (existsSync(logPath)) {
            const existing = readFileSync(logPath, 'utf-8')
            writeFileSync(logPath, existing + logEntry, 'utf-8')
          } else {
            writeFileSync(logPath, logEntry, 'utf-8')
          }
        } catch (logError) {
          console.error('Erro ao salvar log:', logError)
        }
        
        return NextResponse.json({
          success: false,
          message: 'Factura não encontrada',
          requestID: payload.requestID,
        }, { status: 404 })
      }
    } else {
      console.error('❌ Arquivo facturas.json não encontrado')
      return NextResponse.json({
        success: false,
        error: 'Arquivo de facturas não encontrado',
      }, { status: 500 })
    }
  } catch (error) {
    console.error('❌ Erro ao processar callback AGT:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao processar callback',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 })
  }
}

// Endpoint para testar o callback manualmente
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/agt/callback',
    method: 'POST',
    description: 'Endpoint para receber callbacks da AGT sobre status de validação de facturas',
    payload_example: {
      requestID: 'REQ-1234567890',
      status: 'V',
      documentNo: 'FT CI2000202503/3240000030',
      validationDate: '2026-01-16T10:30:00Z',
      details: {
        qrCode: 'https://agt.minfin.gov.ao/...',
        hash: 'ABC123...',
        certificateNumber: 'CERT-2026-001',
      },
    },
    status_codes: {
      V: 'Validada ✅',
      R: 'Rejeitada ❌',
      E: 'Com Erros ⚠️',
    },
  })
}
