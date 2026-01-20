/**
 * API para listar facturas reais da AGT
 * - Carrega dados da AGT HML/Prod
 * - Faz cache em ficheiro JSON
 * - Usa módulo https nativo (mais compatível com AGT)
 */

import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'
import https from 'https'

export const dynamic = 'force-dynamic'
export const maxDuration = 180 // 3 minutos máximo

// Configurações
const CACHE_FILE = path.join(process.cwd(), 'data', 'facturas-agt-cache.json')
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutos de cache

interface AGTDocumentEntry {
  documentEntryResult: {
    id: string
    documentType: string
    documentNo: string
    documentDate: string
    documentStatus: string
    documentStatusDescription: string
    netTotal: string
  }
}

interface CacheData {
  timestamp: number
  facturas: any[]
}

function stripValidationFields(f: any): any {
  if (!f || typeof f !== 'object') return f
  const copy = { ...f }
  delete copy.validationStatus
  delete copy.validationDate
  delete copy.validationMessages
  delete copy.validationResult
  return copy
}

// Gerar UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Gerar assinatura JWS
function generateJWS(payload: any, privateKey: string): string {
  const header = { typ: 'JOSE', alg: 'RS256' }
  
  const base64urlEncode = (obj: any): string => {
    return Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }
  
  const headerB64 = base64urlEncode(header)
  const payloadB64 = base64urlEncode(payload)
  const signingInput = `${headerB64}.${payloadB64}`
  
  try {
    const sign = crypto.createSign('RSA-SHA256')
    sign.update(signingInput)
    const signature = sign.sign(privateKey, 'base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
    return `${headerB64}.${payloadB64}.${signature}`
  } catch (error) {
    console.error('❌ Erro ao assinar JWS:', error)
    return 'SIGNATURE_ERROR'
  }
}

// Carregar cache
async function loadCache(): Promise<CacheData | null> {
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return null
  }
}

// Salvar cache
async function saveCache(facturas: any[]): Promise<void> {
  try {
    const dir = path.dirname(CACHE_FILE)
    await fs.mkdir(dir, { recursive: true })
    
    const cacheData: CacheData = {
      timestamp: Date.now(),
      facturas: facturas.map(stripValidationFields)
    }
    await fs.writeFile(CACHE_FILE, JSON.stringify(cacheData, null, 2))
    console.log(`💾 Cache salvo: ${facturas.length} facturas`)
  } catch (error) {
    console.error('❌ Erro ao salvar cache:', error)
  }
}

// Mapear dados AGT para formato Factura
function mapAGTToFactura(entry: AGTDocumentEntry, index: number): any {
  const doc = entry.documentEntryResult
  const docNo = doc.documentNo || ''
  
  // Extrair tipo de documento do documentNo (ex: "FT FT7826S1502N/197" -> "FT")
  const docType = docNo.split(' ')[0] || 'FT'
  
  return {
    id: `agt-${doc.id || index}-${Date.now()}`,
    schemaVersion: '1.2',
    submissionGUID: generateUUID(),
    taxRegistrationNumber: process.env.AGT_HML_NIF_TEST || '5000413178',
    submissionTimeStamp: new Date(doc.documentDate || Date.now()).toISOString(),
    softwareInfo: {
      productId: process.env.AGT_SOFTWARE_PRODUCT_ID || 'ADDON SAFT B1 E-INVOICE',
      productVersion: process.env.AGT_SOFTWARE_VERSION || '1.0',
      softwareValidationNumber: process.env.AGT_SOFTWARE_VALIDATION_NUMBER || 'FE/81/AGT/2025',
      jwsSoftwareSignature: ''
    },
    documents: [{
      documentNo: docNo,
      documentStatus: (doc.documentStatus || 'N') as 'N' | 'A' | 'R' | 'C' | 'S',
      documentDate: doc.documentDate || new Date().toISOString().split('T')[0],
      documentType: docType as any,
      jwsDocumentSignature: '',
      eacCode: '',
      systemEntryDate: new Date().toISOString(),
      customerCountry: 'AO',
      customerTaxID: '',
      companyName: doc.documentStatusDescription || 'Cliente AGT',
      lines: [],
      documentTotals: {
        netTotal: parseFloat(doc.netTotal) || 0,
        taxPayable: 0,
        grossTotal: parseFloat(doc.netTotal) || 0
      }
    }],
    // Nota: listarFacturas não devolve estado de validação (obterEstado é a fonte correta).
    // Não marcar como "Válida" aqui para evitar inconsistência com o estado real.
    validationStatus: undefined,
    validationDate: undefined,
    source: 'AGT' // Marcador para identificar origem
  }
}

// Fazer uma única requisição à AGT
function makeAGTRequest(url: URL, bodyStr: string, auth: string, softwareInfoDetail: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${auth}`,
        'User-Agent': `${softwareInfoDetail.productId}/${softwareInfoDetail.productVersion}`,
        'Content-Length': Buffer.byteLength(bodyStr)
      },
      timeout: 150000 // 150 segundos
    }
    
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk: Buffer) => { data += chunk.toString() })
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, data })
      })
    })
    
    req.on('error', (error: Error) => reject(error))
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Timeout'))
    })
    
    req.write(bodyStr)
    req.end()
  })
}

// Buscar facturas da AGT com retry para 503
async function fetchFromAGT(startDate: string, endDate: string): Promise<any[]> {
  const baseUrl = process.env.AGT_ENVIRONMENT === 'hml' 
    ? (process.env.AGT_HML_BASE_URL || 'https://sifphml.minfin.gov.ao/sigt/fe/v1')
    : (process.env.AGT_PROD_BASE_URL || 'https://sifp.minfin.gov.ao/sigt/fe/v1')
  
  const username = process.env.AGT_HML_USERNAME
  const password = process.env.AGT_HML_PASSWORD
  const nif = process.env.AGT_HML_NIF_TEST || '5000413178'
  const privateKey = process.env.AGT_PRIVATE_KEY
  
  if (!username || !password || !privateKey) {
    throw new Error('Credenciais AGT não configuradas')
  }
  
  const softwareInfoDetail = {
    productId: process.env.AGT_SOFTWARE_PRODUCT_ID || 'ADDON SAFT B1 E-INVOICE',
    productVersion: process.env.AGT_SOFTWARE_VERSION || '1.0',
    softwareValidationNumber: process.env.AGT_SOFTWARE_VALIDATION_NUMBER || 'FE/81/AGT/2025'
  }
  
  const auth = Buffer.from(`${username}:${password}`).toString('base64')
  const url = new URL(`${baseUrl}/listarFacturas`)
  
  // Campos para assinatura (igual ao script que funciona)
  const signatureFields = { taxRegistrationNumber: nif }
  
  console.log(`🌐 Buscando facturas AGT: ${startDate} a ${endDate}`)
  console.log(`📍 URL: ${baseUrl}/listarFacturas`)
  
  // Retry com backoff para erros 503
  const MAX_RETRIES = 3
  const RETRY_DELAYS = [5000, 15000, 30000] // 5s, 15s, 30s
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Gerar novo GUID e timestamp para cada tentativa
    const payload = {
      schemaVersion: '1.2',
      submissionGUID: generateUUID(),
      submissionTimeStamp: new Date().toISOString(),
      softwareInfo: {
        softwareInfoDetail,
        jwsSoftwareSignature: generateJWS(softwareInfoDetail, privateKey)
      },
      jwsSignature: generateJWS(signatureFields, privateKey),
      taxRegistrationNumber: nif,
      queryStartDate: startDate,
      queryEndDate: endDate
    }
    
    const bodyStr = JSON.stringify(payload)
    
    if (attempt > 0) {
      console.log(`🔄 Tentativa ${attempt + 1}/${MAX_RETRIES + 1}...`)
    }
    console.log(`📡 Enviando requisição para ${url.hostname}${url.pathname}...`)
    
    try {
      const result = await makeAGTRequest(url, bodyStr, auth, softwareInfoDetail)
      
      console.log(`📥 Status: ${result.statusCode}`)
      
      // Se 503, tentar novamente
      if (result.statusCode === 503) {
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAYS[attempt]
          console.log(`⚠️ Servidor AGT indisponível (503), aguardando ${delay/1000}s antes de tentar novamente...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue // Próxima tentativa
        }
        throw new Error(`AGT indisponível após ${MAX_RETRIES + 1} tentativas (503)`)
      }
      
      if (result.statusCode !== 200) {
        throw new Error(`AGT retornou ${result.statusCode}: ${result.data.substring(0, 500)}`)
      }
      
      // Processar resposta
      const json = JSON.parse(result.data)
      console.log(`📥 Resposta AGT recebida`)
      
      // Extrair lista de facturas
      if (json.statusResult?.resultEntryList) {
        const entries = json.statusResult.resultEntryList
        
        // Pode ser array ou objeto único
        let entryList: AGTDocumentEntry[] = []
        
        if (entries.documentEntryResult) {
          entryList = Array.isArray(entries.documentEntryResult)
            ? entries.documentEntryResult.map((doc: any) => ({ documentEntryResult: doc }))
            : [{ documentEntryResult: entries.documentEntryResult }]
        } else if (Array.isArray(entries)) {
          entryList = entries
        }
        
        console.log(`📋 Total de entradas: ${entryList.length}`)
        return entryList.map((entry, index) => mapAGTToFactura(entry, index))
      }
      
      console.log(`⚠️ Nenhuma factura encontrada na resposta`)
      return []
      
    } catch (error: any) {
      if (error.message === 'Timeout') {
        throw new Error('Timeout: AGT não respondeu em 150 segundos')
      }
      
      // Se erro de conexão e ainda há tentativas, tentar novamente
      if (attempt < MAX_RETRIES && (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT')) {
        const delay = RETRY_DELAYS[attempt]
        console.log(`⚠️ Erro de conexão, aguardando ${delay/1000}s antes de tentar novamente...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      throw error
    }
  }
  
  throw new Error('Falha ao conectar à AGT após todas as tentativas')
}

// GET - Listar facturas com cache
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('refresh') === 'true'
    const days = parseInt(searchParams.get('days') || '7')
    
    // Verificar cache (se não forçar refresh)
    if (!forceRefresh) {
      const cache = await loadCache()
      if (cache) {
        const isFresh = (Date.now() - cache.timestamp) < CACHE_TTL_MS
        console.log(`📦 Cache encontrado (${cache.facturas.length} facturas, ${isFresh ? 'fresco' : 'antigo'})`)
        return NextResponse.json({
          success: true,
          source: isFresh ? 'cache' : 'cache-stale',
          count: cache.facturas.length,
          cacheAge: Math.round((Date.now() - cache.timestamp) / 1000),
          facturas: cache.facturas.map(stripValidationFields)
        })
      }
      
      // Se não há cache, retornar lista vazia (carregamento inicial rápido)
      console.log(`📭 Sem cache, retornando lista vazia (use refresh=true para carregar da AGT)`)
      return NextResponse.json({
        success: true,
        source: 'no-cache',
        count: 0,
        message: 'Clique em "Actualizar AGT" para carregar facturas',
        facturas: []
      })
    }
    
    // Calcular datas
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    const formatDate = (d: Date) => d.toISOString().split('T')[0]
    
    console.log(`🔄 Buscando dados frescos da AGT...`)
    
    // Buscar da AGT
    const facturas = await fetchFromAGT(formatDate(startDate), formatDate(endDate))
    
    // Salvar cache
    await saveCache(facturas)
    
    return NextResponse.json({
      success: true,
      source: 'agt',
      count: facturas.length,
      period: {
        start: formatDate(startDate),
        end: formatDate(endDate)
      },
      facturas
    })
    
  } catch (error: any) {
    console.error('❌ Erro ao listar facturas:', error)
    
    // Tentar retornar cache antigo em caso de erro
    const cache = await loadCache()
    if (cache) {
      console.log(`⚠️ Usando cache antigo devido a erro`)
      return NextResponse.json({
        success: true,
        source: 'cache-fallback',
        count: cache.facturas.length,
        cacheAge: Math.round((Date.now() - cache.timestamp) / 1000),
        error: error.message,
        facturas: cache.facturas.map(stripValidationFields)
      })
    }
    
    // Se não há cache, retornar lista vazia (não erro 500)
    // Isso permite que a página mostre dados locais
    return NextResponse.json({
      success: true,
      source: 'empty',
      count: 0,
      error: error.message,
      facturas: []
    })
  }
}
