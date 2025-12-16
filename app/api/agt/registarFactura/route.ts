import { NextResponse } from 'next/server'
import { createAgtClient } from '@/lib/server/agtClient'
import { makeDocumentSignature, makeSoftwareInfoSignature } from '@/lib/server/jws'
import { registarFacturaRequest, zodToErrorList } from '@/lib/schemas/agtSchemas'
import { ZodError } from 'zod'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const payload = await req.json()
    // Validate with the formal schema and return AGT-style errorList on validation errors
    try {
      registarFacturaRequest.parse(payload)
    } catch (e: any) {
      if (e instanceof ZodError) {
        return NextResponse.json({ errorList: zodToErrorList(e) }, { status: 400 })
      }
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    }
    const privKey = process.env.AGT_PRIVATE_KEY
    if (privKey && payload?.softwareInfo && payload?.documents) {
      try {
        payload.softwareInfo.jwsSoftwareSignature = makeSoftwareInfoSignature(payload.softwareInfo, privKey)
        payload.documents = payload.documents.map((doc: any) => {
          const jws = makeDocumentSignature({
            documentNo: doc.documentNo,
            taxRegistrationNumber: payload.taxRegistrationNumber,
            documentType: doc.documentType,
            documentDate: doc.documentDate,
            customerTaxID: doc.customerTaxID,
            customerCountry: doc.customerCountry,
            companyName: doc.companyName,
            documentTotals: doc.documentTotals,
          }, privKey)
          return { ...doc, jwsDocumentSignature: jws }
        })
      } catch {}
    }

    // Comprehensive guardrails aligned with AGT spec and Zod schema
    const receiptTypes = new Set(['AR','RC','RG'])
    for (const d of payload?.documents || []) {
      // Receipt-specific validations
      if (receiptTypes.has(d.documentType)) {
        if (!d.paymentReceipt) {
          return NextResponse.json({ error: 'Recibos (AR/RC/RG) requerem paymentReceipt' }, { status: 400 })
        }
        if (d.lines && d.lines.length > 0) {
          return NextResponse.json({ error: 'Recibos (AR/RC/RG) não devem ter linhas' }, { status: 400 })
        }
        if (!d.paymentReceipt.sourceDocuments || d.paymentReceipt.sourceDocuments.length === 0) {
          return NextResponse.json({ error: 'paymentReceipt deve conter sourceDocuments' }, { status: 400 })
        }
      } else {
        // Non-receipt documents require lines
        if (!d.lines || d.lines.length === 0) {
          return NextResponse.json({ error: `Documento ${d.documentType} requer pelo menos uma linha` }, { status: 400 })
        }
      }

      // NC-specific validations
      if (d.documentType === 'NC') {
        if (!d.referenceInfo || !d.referenceInfo.referenceNo) {
          return NextResponse.json({ error: 'Nota de Crédito requer referenceInfo com referenceNo' }, { status: 400 })
        }
      }

      // Line-level validations
      for (const l of d.lines || []) {
        if (typeof l.unitPrice === 'number' && l.unitPrice < 0) {
          return NextResponse.json({ error: `Preço unitário inválido (negativo) na linha ${l.lineNo}` }, { status: 400 })
        }
        if (typeof l.settlementAmount === 'number' && l.settlementAmount < 0) {
          return NextResponse.json({ error: `Desconto inválido (negativo) na linha ${l.lineNo}` }, { status: 400 })
        }
        if (typeof l.settlementAmount === 'number' && typeof l.unitPrice === 'number' && typeof l.quantity === 'number') {
          const lineTotal = l.unitPrice * l.quantity
          const maxDiscount = lineTotal + (d.documentTotals?.taxPayable || 0)
          if (l.settlementAmount > maxDiscount) {
            return NextResponse.json({ error: `settlementAmount excede total permitido na linha ${l.lineNo}` }, { status: 400 })
          }
        }
        if (typeof l.unitPriceBase === 'number' && typeof l.unitPrice === 'number' && l.unitPriceBase > l.unitPrice) {
          return NextResponse.json({ error: `Preço base superior ao unitário na linha ${l.lineNo}` }, { status: 400 })
        }
        if (typeof l.quantity === 'number' && l.quantity <= 0) {
          return NextResponse.json({ error: `Quantidade inválida na linha ${l.lineNo}` }, { status: 400 })
        }
      }

      // Document totals validations
      if (!d.documentTotals) {
        return NextResponse.json({ error: 'documentTotals obrigatório' }, { status: 400 })
      }
      if (d.documentTotals.grossTotal == null || d.documentTotals.netTotal == null) {
        return NextResponse.json({ error: 'documentTotals deve conter grossTotal e netTotal' }, { status: 400 })
      }
    }
    const client = createAgtClient()
    try {
      const res = await client.registarFactura(payload)
      return NextResponse.json(res, { status: 200 })
    } catch (e: any) {
      const msg: string = e?.message || ''
      if (msg.includes('429')) {
        return NextResponse.json({ error: 'E98: Muitas solicitações. Aguarde e tente novamente.' }, { status: 429 })
      }
      if (msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('abort')) {
        return NextResponse.json({ error: 'E97: Timeout na comunicação com AGT.' }, { status: 504 })
      }
      if (msg.includes('400')) {
        return NextResponse.json({ error: 'E95: Pedido inválido. Verifique os dados da factura.' }, { status: 400 })
      }
      if (msg.includes('401') || msg.includes('403')) {
        return NextResponse.json({ error: 'E94: Não autorizado. Verifique credenciais.' }, { status: 401 })
      }
      return NextResponse.json({ error: 'E96: Erro inesperado na integração AGT.' }, { status: 502 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro na chamada ao serviço AGT' }, { status: 400 })
  }
}
