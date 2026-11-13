import { NextRequest, NextResponse } from 'next/server'
import { createAgtClient } from '@/lib/server/agtClient'
import { getAllFacturasJson, replaceAllFacturasJson } from '@/lib/server/facturasJson'
import { signJwsRS256 } from '@/lib/server/jws'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutos para permitir requisições longas à AGT

function getDefaultNif(): string {
  return (
    process.env.AGT_HML_NIF_TEST ||
    process.env.AGT_NIF_TEST ||
    process.env.AGT_PROD_NIF_TEST ||
    '5000413178'
  )
}

function mapAgtFacturaEntry(entry: any): any {
  // A resposta AGT v5 tem { documentEntryResult: { ... } }
  const doc = entry?.documentEntryResult || entry
  const docNo = doc?.documentNo || ''
  // Extrair tipo do documentNo (ex: "FT FT7826S1667N/11" -> "FT")
  const docType = docNo.trim().split(/\s+/)[0] || 'FT'
  
  return {
    id: `agt-${doc?.id || Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    schemaVersion: '1.2',
    submissionGUID: crypto.randomUUID(),
    taxRegistrationNumber: doc?.taxRegistrationNumber || getDefaultNif(),
    submissionTimeStamp: new Date(doc?.documentDate || Date.now()).toISOString(),
    requestID: doc?.id || '',
    softwareInfo: {
      softwareInfoDetail: {
        productId: process.env.AGT_SOFTWARE_PRODUCT_ID || 'SafeFacturas',
        productVersion: process.env.AGT_SOFTWARE_VERSION || '1.0.1',
        softwareValidationNumber: process.env.AGT_SOFTWARE_VALIDATION_NUMBER || 'FE/308/AGT/2026'
      }
    },
    documents: [{
      documentNo: docNo,
      documentStatus: (doc?.documentStatus || 'N') as 'N' | 'A' | 'R' | 'C' | 'S',
      documentDate: doc?.documentDate || new Date().toISOString().split('T')[0],
      documentType: docType as any,
      eacCode: doc?.eacCode || '',
      systemEntryDate: new Date().toISOString(),
      customerCountry: 'AO',
      customerTaxID: doc?.customerTaxID || '',
      companyName: doc?.companyName || doc?.documentStatusDescription || 'Cliente',
      lines: [],
      documentTotals: {
        netTotal: parseFloat(doc?.netTotal || '0'),
        taxPayable: parseFloat(doc?.taxPayable || '0'),
        grossTotal: parseFloat(doc?.grossTotal || doc?.netTotal || '0')
      }
    }],
    validationStatus: doc?.validationStatus,
    validationDate: doc?.validationDate,
    agtLastSyncAt: new Date().toISOString()
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const refresh = url.searchParams.get('refresh') === 'true'
  const debug = url.searchParams.get('debug') === 'true'
  const timeoutMs = Number(url.searchParams.get('timeoutMs') || '180000') // 3 minutos default
  
  const nif = getDefaultNif()
  
  // 1) Se não pediu refresh, retorna backup
  if (!refresh) {
    try {
      const backup = await getAllFacturasJson()
      if (backup.length > 0) {
        return NextResponse.json({ success: true, facturas: backup, source: 'backup' }, { status: 200 })
      }
    } catch (e: any) {
      console.error('Backup parse error ao listarFacturas:', e)
      // delete corrupted file and continue to AGT
      try {
        const { unlinkSync } = await import('fs')
        const { join } = await import('path')
        const p = join(process.cwd(), 'data', 'facturas.json')
        unlinkSync(p)
      } catch {}
      // allow execution to proceed to AGT block
    }
  }
  
  // 2) Tenta AGT - listar facturas do último mês
  try {
    console.log('🔄 Iniciando consulta AGT...')
    const client = createAgtClient()
    
    const endDate = new Date()
    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - 7) // Últimos 7 dias (mesmo período do script v5)
    
    const queryStartDate = startDate.toISOString().split('T')[0]
    const queryEndDate = endDate.toISOString().split('T')[0]
    
    console.log(`📅 Período: ${queryStartDate} a ${queryEndDate}`)
    console.log(`⏱️  Timeout: ${timeoutMs}ms (${(timeoutMs/1000).toFixed(0)}s)`)
    
    // Software info detail (formato v5)
    const softwareInfoDetail = {
      productId: process.env.AGT_SOFTWARE_PRODUCT_ID || 'SafeFacturas',
      productVersion: process.env.AGT_SOFTWARE_VERSION || '1.0.1',
      softwareValidationNumber: process.env.AGT_SOFTWARE_VALIDATION_NUMBER || 'FE/308/AGT/2026'
    }
    
    // Obter chaves privadas
    const producerPrivateKey = process.env.AGT_PRODUCER_PRIVATE_KEY
    const issuerPrivateKey = process.env.AGT_PRIVATE_KEY
    if (!producerPrivateKey) {
      throw new Error('AGT_PRODUCER_PRIVATE_KEY não configurada')
    }
    if (!issuerPrivateKey) {
      throw new Error('AGT_PRIVATE_KEY não configurada')
    }
    
    // Gerar assinaturas JWS (formato v5)
    // jwsSoftwareSignature: assinar com CHAVE DO PRODUTOR
    const jwsSoftwareSignature = signJwsRS256(softwareInfoDetail, producerPrivateKey)
    // jwsSignature: assinar com CHAVE DO EMISSOR
    const jwsSignature = signJwsRS256({ taxRegistrationNumber: nif }, issuerPrivateKey)
    
    const payload = {
      schemaVersion: '1.2',
      submissionGUID: crypto.randomUUID(),
      submissionTimeStamp: new Date().toISOString(),
      softwareInfo: {
        softwareInfoDetail,
        jwsSoftwareSignature
      },
      jwsSignature,
      taxRegistrationNumber: nif,
      queryStartDate,
      queryEndDate
    }
    
    console.log('📤 Enviando para AGT com NIF:', nif)
    console.log('📤 Payload enviado:', JSON.stringify(payload, null, 2))
    
    const requestStart = Date.now()
    const res: any = await (client.listarFacturasWithTimeout
      ? client.listarFacturasWithTimeout(payload, timeoutMs)
      : client.listarFacturas(payload))
    const requestDuration = ((Date.now() - requestStart) / 1000).toFixed(2)

    if (res && res.__agtRaw) {
      throw new Error(`AGT raw: ${res.__agtRaw}`)
    }
    
    console.log(`✅ Resposta AGT recebida em ${requestDuration}s:`, {
      hasStatusResult: !!res?.statusResult,
      hasResultEntryList: !!res?.statusResult?.resultEntryList,
      documentResultCount: res?.statusResult?.documentResultCount,
      resultEntryListIsArray: Array.isArray(res?.statusResult?.resultEntryList),
      resultEntryListLength: Array.isArray(res?.statusResult?.resultEntryList) ? res.statusResult.resultEntryList.length : 'N/A',
      firstEntryType: typeof res?.statusResult?.resultEntryList?.[0],
      firstEntryKeys: res?.statusResult?.resultEntryList?.[0] ? Object.keys(res.statusResult.resultEntryList[0]) : []
    })
    
    // DEBUG: Log the full response structure
    const debugInfo = {
      receivedStatus: res?.statusResult?.resultCode,
      statusKeys: Object.keys(res?.statusResult || {}),
      resultEntryListType: Array.isArray(res?.statusResult?.resultEntryList) ? 'array' : typeof res?.statusResult?.resultEntryList,
      resultEntryListLength: Array.isArray(res?.statusResult?.resultEntryList) ? res.statusResult.resultEntryList.length : 0,
      resultEntryListSample: res?.statusResult?.resultEntryList ? (Array.isArray(res.statusResult.resultEntryList) ? res.statusResult.resultEntryList[0] : res.statusResult.resultEntryList) : 'undefined'
    }
    console.log('🔍 DEBUG AGT Response:', JSON.stringify(debugInfo, null, 2))
    
    // Extrair lista da resposta (formato v5)
    // resultEntryList é um ARRAY onde cada item tem { documentEntryResult: {...} }
    const resultEntryList = res?.statusResult?.resultEntryList
    
    // Pode ser array ou objeto único
    const rawList = Array.isArray(resultEntryList) 
      ? resultEntryList 
      : resultEntryList ? [resultEntryList] : []
    
    console.log(`📊 Entradas na resposta: ${rawList.length}`)
    
    // Cada entrada pode ter { documentEntryResult: ... } ou ser direto
    const list = rawList.map((entry: any) => {
      const doc = entry?.documentEntryResult || entry
      if (debug) {
        console.log('🔍 Entry keys:', Object.keys(entry || {}))
        console.log('🔍 documentEntryResult keys:', Object.keys(entry?.documentEntryResult || {}))
        console.log('🔍 doc object:', doc)
      }
      return doc
    })
    
    console.log(`📋 Facturas para mapear: ${list.length}`)
    
    const mapped = list
      .map((entry: any) => mapAgtFacturaEntry(entry))
      .filter((f: any) => f?.documents?.[0]?.documentNo)
    
    const withMeta = mapped.map((f: any) => ({
      ...f,
      agtLastSyncAt: new Date().toISOString(),
    }))
    
    // Salvar no backup
    if (withMeta.length > 0) {
      await replaceAllFacturasJson(withMeta)
      console.log(`💾 Backup atualizado com ${withMeta.length} facturas`)
    }
    
    const response: any = { success: true, facturas: withMeta, source: 'agt' }
    if (debug) {
      response._debug = {
        rawListLength: rawList.length,
        listLength: list.length,
        mappedLength: mapped.length,
        filteredLength: withMeta.length,
        resultEntryListType: Array.isArray(resultEntryList) ? 'array' : typeof resultEntryList,
        firstRawEntry: rawList[0],
        firstListEntry: list[0],
        firstMappedEntry: mapped[0],
        agtStatusResult: res?.statusResult,
        agtFullResponse: res  // Full response for detailed inspection
      }
    }
    return NextResponse.json(response, { status: 200 })
  } catch (e: any) {
    console.error('❌ Erro ao consultar AGT:', e?.message || e)
    
    // only fall back if the caller specifically asked for backup (refresh=false)
    if (!refresh) {
      const backup = await getAllFacturasJson()
      if (backup.length > 0) {
        console.log(`📦 Retornando ${backup.length} facturas do backup`)
        return NextResponse.json(
          { success: true, facturas: backup, source: 'backup', warning: e?.message || 'Falha ao consultar AGT' },
          { status: 200 }
        )
      }
    }
    return NextResponse.json(
      { success: false, error: e?.message || 'Falha ao consultar AGT', agtError: e?.message, details: e },
      { status: 502 }
    )
  }
}
