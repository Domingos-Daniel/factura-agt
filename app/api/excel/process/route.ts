/**
 * API Endpoint: POST /api/excel/process
 * Processa dados Excel e envia para AGT ou AppyPay via Provider Manager
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
import { FacturaRepository } from '@/lib/server/facturaRepository'
import { ProviderManager } from '@/lib/providers'
import type { UniversalInvoice } from '@/lib/providers/types'

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

    // Verificar provedor activo
    const providerManager = new ProviderManager()
    const activeProviderName = providerManager.getActiveProviderName()
    console.log(`📡 Provedor activo: ${activeProviderName}`)

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
          
          // Verificar se deve usar AppyPay
          if (activeProviderName === 'appypay') {
            console.log('📤 Enviando documento via AppyPay:', singleDoc.documentNo)
            
            // Converter para UniversalInvoice com campos corretos para AppyPay
            // Nota: customerTaxID (ID maiúsculo) é o formato correto
            const docType = singleDoc.documentType || 'FT'
            const universalInvoice: UniversalInvoice = {
              id: individualAgtDoc.submissionGUID,
              seriesCode: seriesCode || 'FT25',
              documentType: docType as UniversalInvoice['documentType'],
              documentDate: singleDoc.documentDate,
              number: parseInt(singleDoc.documentNo?.split('/').pop() || '1'),
              date: singleDoc.documentDate,
              dueDate: singleDoc.documentDate,
              // Campos obrigatórios AppyPay
              eacCode: singleDoc.eacCode || '47111', // Código de Atividade Económica
              customerTaxID: singleDoc.customerTaxID || '999999999', // NIF do cliente
              customerCountry: singleDoc.customerCountry || 'AO', // País do cliente
              companyName: singleDoc.companyName || 'Consumidor Final', // Nome da empresa emissora
              customer: {
                taxId: singleDoc.customerTaxID || '999999999',
                name: singleDoc.companyName || 'Consumidor Final',
                country: singleDoc.customerCountry || 'AO',
              },
              seller: {
                taxId: companyNIF,
                name: companyName,
              },
              lines: singleDoc.lines.map((line: any, idx: number) => {
                // Extrair taxa do array taxes ou usar debitAmount se disponível
                const taxPercentage = line.taxes?.[0]?.taxPercentage || line.taxRate || 14
                const quantity = line.quantity || 1
                const unitPrice = line.unitPrice || 0
                const debitAmount = line.debitAmount || (quantity * unitPrice)
                const taxAmount = line.taxes?.[0]?.taxAmount || (debitAmount * (taxPercentage / 100))
                
                return {
                  lineNumber: idx + 1,
                  operationType: line.operationType || 'SG',
                  productCode: line.productCode || 'PROD',
                  productDescription: line.productDescription || 'Produto',
                  description: line.productDescription || 'Produto',
                  quantity: quantity,
                  unitOfMeasure: line.unitOfMeasure || 'UN',
                  unitPrice: unitPrice,
                  unitPriceBase: line.unitPriceBase || unitPrice,
                  totalWithoutTax: debitAmount,
                  taxAmount: taxAmount,
                  total: debitAmount + taxAmount,
                  taxCode: line.taxes?.[0]?.taxCode || 'NOR',
                  taxRate: taxPercentage,
                  taxes: line.taxes || [{
                    taxCode: 'NOR',
                    taxType: 'IVA',
                    taxCountryRegion: 'AO',
                    taxPercentage: taxPercentage,
                  }],
                }
              }),
              currency: 'AOA',
              totalWithoutTax: singleDoc.documentTotals?.netTotal || 0,
              totalTax: singleDoc.documentTotals?.taxPayable || 0,
              totalWithTax: singleDoc.documentTotals?.grossTotal || 0,
              status: 'pending',
            }
            
            console.log('📋 UniversalInvoice para AppyPay:', JSON.stringify(universalInvoice, null, 2))
            
            // Usar ProviderManager para emitir
            const result = await providerManager.createInvoice(universalInvoice)
            
            const facturaToSave = {
              ...individualAgtDoc,
              id: individualAgtDoc.submissionGUID,
              requestID: result.providerRequestId || `REQ-${Date.now()}`,
              validationStatus: result.isAsync ? 'P' : 'V',
              appyPayDocumentId: result.isAsync ? result.providerRequestId : undefined,
              provider: 'appypay',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as unknown as Factura
            savedFacturas.push(facturaToSave)
            
            // Salvar factura no repositório persistente para manter os dados originais
            try {
              FacturaRepository.saveFacturaOperation(
                'direct', 
                individualAgtDoc as any, 
                { ...result, provider: 'appypay' } as any, 
                result.providerRequestId || individualAgtDoc.submissionGUID
              )
            } catch (repoErr) {
              console.error('Erro ao salvar operação AppyPay no repositório:', repoErr)
            }
            
            results.push({
              success: true,
              documentNo: singleDoc.documentNo,
              documentCount: 1,
              response: result,
              requestID: result.providerRequestId,
              facturaId: individualAgtDoc.submissionGUID,
              provider: 'appypay',
              isAsync: result.isAsync,
            })
          } else {
            // Usar AGT (comportamento original)
            console.log('📤 Enviando documento via AGT:', singleDoc.documentNo)

          const response = await agtClient.registarFactura(individualAgtDoc)
          console.log('📥 Resposta AGT:', JSON.stringify(response, null, 2))
          const requestID = response?.requestID || `REQ-${Date.now()}`
          console.log('🎫 Request ID obtido:', requestID)
          
          // Salvar factura no storage com requestID
          const facturaToSave = {
            ...individualAgtDoc,
            id: individualAgtDoc.submissionGUID,
            requestID: requestID,
            // Estado real vem de obterEstado; após registo o documento pode ficar pendente.
            validationStatus: 'P',
            provider: 'agt',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as unknown as Factura
          savedFacturas.push(facturaToSave)

          // Upsert no repositório persistente (data/storage/facturas.json)
          try {
            FacturaRepository.saveFacturaOperation('direct', individualAgtDoc as any, response as any, requestID)
          } catch (repoErr) {
            console.error('Erro ao salvar operação no repositório:', repoErr)
          }
          
          results.push({
            success: true,
            documentNo: singleDoc.documentNo,
            documentCount: 1,
            response: response,
            requestID: requestID,
            facturaId: individualAgtDoc.submissionGUID,
            provider: 'agt',
          })
          }
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
