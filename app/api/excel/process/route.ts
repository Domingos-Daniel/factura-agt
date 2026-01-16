/**
 * API Endpoint: POST /api/excel/process
 * Processa dados Excel e envia para AGT via middleware
 */

import { NextRequest, NextResponse } from 'next/server'
import { ExcelRow } from '@/lib/excelParser'
import {
  groupExcelRowsToAGTDocuments,
} from '@/lib/excelMapping'
import { createAgtClient } from '@/lib/server/agtClient'
import { Factura } from '@/lib/types'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

// Gerar UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      rows,
      companyNIF,
      companyName,
      seriesCode,
    } = body as {
      rows: ExcelRow[]
      companyNIF: string
      companyName: string
      seriesCode: string
    }

    // Validar entrada
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma linha para processar' },
        { status: 400 }
      )
    }

    if (!companyNIF || !companyName) {
      return NextResponse.json(
        { error: 'NIF e nome da empresa são obrigatórios' },
        { status: 400 }
      )
    }

    // Converter para documentos AGT
    const agtDocuments = groupExcelRowsToAGTDocuments(
      rows,
      companyNIF,
      companyName,
      seriesCode || 'FT25'
    )

    if (agtDocuments.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum documento para processar' },
        { status: 400 }
      )
    }

    // Processar cada documento
    const agtClient = createAgtClient()
    console.log('📡 AGT Client criado:', agtClient.constructor.name)
    // Nota: assinaturas JWS são geradas pelo agtTransformer (dummy signatures para HML)
    const results = []
    const savedFacturas: Factura[] = []
    
    for (const agtDoc of agtDocuments) {
      // Para cada AGTDocument, processar cada factura (document) individualmente
      for (const singleDoc of agtDoc.documents) {
        try {
          // Criar um AGTDocument separado para cada factura
          const individualAgtDoc = {
            ...agtDoc,
            submissionGUID: generateUUID(),
            numberOfEntries: 1,
            documents: [singleDoc],
          }
          
          // As assinaturas JWS são geradas automaticamente pelo agtTransformer.ts
          // quando o payload passa por transformToAGTFormat()
          console.log('📤 Enviando documento:', singleDoc.documentNo)

          const response = await agtClient.registarFactura(individualAgtDoc)
          console.log('📥 Resposta AGT:', JSON.stringify(response, null, 2))
          const requestID = response?.requestID || `REQ-${Date.now()}`
          console.log('🎫 Request ID obtido:', requestID)
          
          // Salvar factura no storage com requestID
          const facturaToSave = {
            ...individualAgtDoc,
            id: individualAgtDoc.submissionGUID,
            requestID: requestID,
            validationStatus: 'V',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as unknown as Factura
          savedFacturas.push(facturaToSave)
          
          results.push({
            success: true,
            documentNo: singleDoc.documentNo,
            documentCount: 1,
            response: response,
            requestID: requestID,
            facturaId: individualAgtDoc.submissionGUID,
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
          results.push({
            success: false,
            documentNo: singleDoc.documentNo,
            documentCount: 1,
            error: errorMessage,
          })
        }
      }
    }
    
    // Salvar todas as facturas no arquivo JSON
    if (savedFacturas.length > 0) {
      try {
        const jsonPath = join(process.cwd(), 'data', 'facturas.json')
        const dirPath = join(process.cwd(), 'data')
        
        // Criar diretório se não existir
        if (!existsSync(dirPath)) {
          const { mkdirSync } = require('fs')
          mkdirSync(dirPath, { recursive: true })
        }
        
        // Ler facturas existentes
        let existingFacturas: Factura[] = []
        if (existsSync(jsonPath)) {
          const fileContent = readFileSync(jsonPath, 'utf-8')
          existingFacturas = JSON.parse(fileContent)
        }
        
        // Adicionar novas facturas
        const allFacturas = [...existingFacturas, ...savedFacturas]
        writeFileSync(jsonPath, JSON.stringify(allFacturas, null, 2))
        
        console.log(`✅ Salvou ${savedFacturas.length} facturas em data/facturas.json`)
      } catch (saveError) {
        console.error('Erro ao salvar facturas no JSON:', saveError)
      }
    }

    // Verificar se todos foram bem-sucedidos
    const allSuccess = results.every((r) => r.success)

    return NextResponse.json(
      {
        success: allSuccess,
        processed: rows.length,
        documents: agtDocuments.length,
        results,
      },
      { status: allSuccess ? 200 : 207 } // 207 Multi-Status se houver alguns erros
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro ao processar'
    
    console.error('Excel processing error:', error)
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
