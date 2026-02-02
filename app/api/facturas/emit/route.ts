/**
 * API Endpoint: POST /api/facturas/emit
 * Emite uma factura usando o provedor fiscal activo (AGT ou AppyPay)
 * Esta rota unifica a emissão de documentos fiscais independente do provedor
 */

import { NextRequest, NextResponse } from 'next/server'
import { ProviderManager } from '@/lib/providers'
import type { UniversalInvoice, UniversalInvoiceLine } from '@/lib/providers/types'
import type { DocumentType } from '@/lib/types'
import { FacturaRepository } from '@/lib/server/facturaRepository'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Gerar UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

interface EmitRequest {
  // Dados básicos do documento
  documentType?: string
  seriesCode: string
  documentDate: string
  dueDate?: string
  
  // Dados do cliente
  customerTaxId: string
  customerName: string
  customerAddress?: string
  customerCountry?: string
  
  // Dados do vendedor/empresa
  sellerTaxId: string
  sellerName: string
  sellerAddress?: string
  
  // Linhas do documento
  lines: Array<{
    lineNumber?: number
    productCode?: string
    description: string
    quantity: number
    unitPrice: number
    discount?: number
    taxCode?: string
    taxRate?: number
  }>
  
  // Moeda e observações
  currency?: string
  notes?: string
  
  // Referência para notas de crédito
  referenceNo?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: EmitRequest = await request.json()
    
    // Validar campos obrigatórios
    if (!body.seriesCode) {
      return NextResponse.json(
        { success: false, error: 'Série do documento é obrigatória' },
        { status: 400 }
      )
    }
    
    if (!body.customerTaxId || !body.customerName) {
      return NextResponse.json(
        { success: false, error: 'NIF e nome do cliente são obrigatórios' },
        { status: 400 }
      )
    }
    
    if (!body.sellerTaxId || !body.sellerName) {
      return NextResponse.json(
        { success: false, error: 'NIF e nome do vendedor são obrigatórios' },
        { status: 400 }
      )
    }
    
    if (!body.lines || body.lines.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Documento deve conter pelo menos uma linha' },
        { status: 400 }
      )
    }

    // Calcular totais
    const lines: UniversalInvoiceLine[] = body.lines.map((line, idx) => {
      const quantity = line.quantity || 1
      const unitPrice = line.unitPrice || 0
      const discount = line.discount || 0
      const taxRate = line.taxRate || 14
      
      const lineTotal = quantity * unitPrice
      const lineDiscount = lineTotal * (discount / 100)
      const totalWithoutTax = lineTotal - lineDiscount
      const taxAmount = totalWithoutTax * (taxRate / 100)
      const total = totalWithoutTax + taxAmount
      
      return {
        lineNumber: line.lineNumber || idx + 1,
        productCode: line.productCode,
        description: line.description,
        quantity,
        unitPrice,
        discount: lineDiscount,
        totalWithoutTax,
        taxCode: line.taxCode || 'IVA',
        taxRate,
        taxAmount,
        total,
      }
    })
    
    const totalWithoutTax = lines.reduce((sum, l) => sum + l.totalWithoutTax, 0)
    const totalTax = lines.reduce((sum, l) => sum + l.taxAmount, 0)
    const totalWithTax = lines.reduce((sum, l) => sum + l.total, 0)
    
    // Criar UniversalInvoice
    const invoiceId = generateUUID()
    const docType = body.documentType as DocumentType | undefined
    const invoice: UniversalInvoice = {
      id: invoiceId,
      documentType: docType,
      seriesCode: body.seriesCode,
      number: 0, // Será atribuído pelo provedor
      date: body.documentDate || new Date().toISOString().split('T')[0],
      dueDate: body.dueDate,
      customer: {
        taxId: body.customerTaxId,
        name: body.customerName,
        address: body.customerAddress,
        country: body.customerCountry || 'AO',
      },
      seller: {
        taxId: body.sellerTaxId,
        name: body.sellerName,
        address: body.sellerAddress,
      },
      lines,
      currency: body.currency || 'AOA',
      totalWithoutTax,
      totalTax,
      totalWithTax,
      notes: body.notes,
      referenceNo: body.referenceNo,
      status: 'pending',
    }
    
    // Usar ProviderManager para emitir
    const providerManager = new ProviderManager()
    const activeProviderName = providerManager.getActiveProviderName()
    
    console.log(`📤 Emitindo factura via ${activeProviderName}:`, invoiceId)
    
    const result = await providerManager.createInvoice(invoice)
    
    console.log(`📥 Resultado da emissão:`, JSON.stringify(result, null, 2))
    
    // Salvar no repositório local
    const facturaToSave: Record<string, unknown> = {
      id: invoiceId,
      requestID: result.providerRequestId || result.documentId,
      taxRegistrationNumber: body.sellerTaxId,
      validationStatus: result.isAsync ? 'P' : (result.invoice?.status === 'completed' ? 'V' : 'P'),
      provider: activeProviderName,
    }
    
    if (activeProviderName === 'appypay') {
      facturaToSave.appyPayDocumentId = result.providerRequestId || result.documentId
    }
    
    if (result.invoice?.documentNumber) {
      facturaToSave.documentNumber = result.invoice.documentNumber
    }
    
    try {
      FacturaRepository.saveFacturaOperation(
        'api',
        invoice as any,
        result,
        (result.providerRequestId || result.documentId || invoiceId) as string
      )
    } catch (repoErr) {
      console.error('Erro ao salvar no repositório:', repoErr)
    }
    
    return NextResponse.json({
      success: true,
      provider: activeProviderName,
      invoiceId,
      requestId: result.providerRequestId || result.documentId,
      isAsync: result.isAsync || false,
      status: result.invoice?.status || result.processingStatus || 'pending',
      hash: result.invoice?.hash,
      qrCode: result.invoice?.qrCode,
      documentNumber: result.invoice?.documentNumber || result.documentNo,
      message: result.isAsync 
        ? `Documento enviado para processamento assíncrono via ${activeProviderName}. Use o endpoint de polling para verificar o status.`
        : `Documento emitido com sucesso via ${activeProviderName}.`,
    })
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('❌ Erro ao emitir factura:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        provider: 'unknown',
      },
      { status: 500 }
    )
  }
}

// GET para verificar status do endpoint
export async function GET() {
  const providerManager = new ProviderManager()
  const activeProvider = providerManager.getActiveProvider()
  
  return NextResponse.json({
    endpoint: '/api/facturas/emit',
    method: 'POST',
    activeProvider,
    description: 'Endpoint unificado para emissão de facturas fiscais usando o provedor activo (AGT ou AppyPay)',
  })
}
