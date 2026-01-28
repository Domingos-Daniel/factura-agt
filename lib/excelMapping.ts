/**
 * Excel Mapping - Converte dados SAP (Excel) para formato AGT
 */

import { ExcelRow } from './excelParser'

/**
 * Gera UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Mapeamento de tipos de documento SAP → AGT
const SAP_TO_AGT_DOCUMENT_TYPE: { [key: string]: string } = {
  'F1': 'FT',  // Factura
  'F2': 'FS',  // Factura Simplificada
  'RE': 'NC',  // Nota de Crédito
  'ZA': 'FA',  // Factura Adiantamento
  'ZC': 'AC',  // Aviso Cobrança
  'ZR': 'AR',  // Recibo
}

// Mapeamento de unidades de medida
const UNIT_MAPPING: { [key: string]: string } = {
  'EA': 'UN',
  'PC': 'UN',
  'Peça': 'UN',
  'KG': 'KG',
  'L': 'L',
  'H': 'HOR',
  'DAY': 'DIA',
}

/**
 * Converte tipo documento SAP para AGT
 */
export function mapDocumentType(sapType?: string): string {
  if (!sapType) return 'FT'
  return SAP_TO_AGT_DOCUMENT_TYPE[sapType.toUpperCase()] || 'FT'
}

/**
 * Converte data SAP (YYYYMMDD) para ISO8601
 */
export function mapDate(sapDate?: string): string {
  if (!sapDate || sapDate.length !== 8) {
    return new Date().toISOString().split('T')[0]
  }
  
  const year = sapDate.substring(0, 4)
  const month = sapDate.substring(4, 6)
  const day = sapDate.substring(6, 8)
  
  return `${year}-${month}-${day}`
}

/**
 * Converte unidade de medida
 */
export function mapUnit(sapUnit?: string): string {
  if (!sapUnit) return 'UN'
  return UNIT_MAPPING[sapUnit] || sapUnit
}

/**
 * Formata número com 2 casas decimais
 */
export function formatDecimal(value: string | number | undefined): number {
  if (!value) return 0
  const num = typeof value === 'string' ? parseFloat(value) : value
  return Math.round(num * 100) / 100
}

/**
 * Converte linha Excel para formato AGT
 */
export interface AGTLine {
  lineNumber: number
  productCode: string
  productDescription: string
  quantity: number
  unitOfMeasure: string
  unitPrice: number
  unitPriceBase: number
  debitAmount: number
  taxes: Array<{
    taxType: 'IVA' | 'IS' | 'IEC' | 'NS'
    taxCountryRegion: string
    taxCode: string
    taxPercentage: number
    taxAmount: number
    taxContribution: number
  }>
  settlementAmount: number
}

/**
 * Converte linha Excel para formato AGT
 * Suporta tanto formato AGT direto quanto SAP legado
 * 
 * REGRAS AGT OBRIGATÓRIAS:
 * - referenceInfo: NÃO incluir para FT/FS/FR, só para NC
 * - taxes.taxContribution: opcional mas recomendado
 */
export function mapExcelRowToAGTLine(
  row: ExcelRow,
  lineNumber: number,
  ivaPercentage: number = 14,
  documentType: string = 'FT'
): AGTLine {
  // Detectar se é formato AGT (tem campo LINE com JSON) ou SAP legado
  const isAGTFormat = row['LINE'] !== undefined
  const isNotaCredito = documentType === 'NC'
  
  if (isAGTFormat && row['LINE']) {
    // Parse JSON do campo LINE
    try {
      const lines = JSON.parse(row['LINE'])
      if (Array.isArray(lines) && lines.length > 0) {
        // Retornar a primeira linha (ou a linha correspondente ao lineNumber)
        const line = lines[lineNumber - 1] || lines[0]
        const result: AGTLine = {
          lineNumber: line.lineNumber || lineNumber,
          productCode: line.productCode || 'GEN001',
          productDescription: line.productDescription || 'Produto/Serviço',
          quantity: line.quantity || 1,
          unitOfMeasure: line.unitOfMeasure || 'UN',
          unitPrice: line.unitPrice || 0,
          unitPriceBase: line.unitPriceBase || line.unitPrice || 0,
          debitAmount: line.debitAmount || 0,
          taxes: line.taxes || [],
          settlementAmount: line.settlementAmount || 0,
        }
        // referenceInfo só para NC
        if (isNotaCredito && line.referenceInfo?.reference) {
          (result as any).referenceInfo = line.referenceInfo
        }
        return result
      }
    } catch (e) {
      // Se falhar o parse, continua com lógica SAP
    }
  }
  
  // Formato SAP legado
  const quantity = formatDecimal(row.FKIMG || 1)
  const unitPrice = formatDecimal(row.NETWR || 0) / Math.max(quantity, 1)
  const debitAmount = formatDecimal(row.NETWR || 0)
  
  // Calcular imposto
  const ivaAmount = formatDecimal((debitAmount * ivaPercentage) / 100)

  return {
    lineNumber,
    productCode: row.MATNR || 'GEN001',
    productDescription: row.ARKTX || 'Produto/Serviço',
    quantity,
    unitOfMeasure: mapUnit(row.VRKME),
    unitPrice,
    unitPriceBase: unitPrice,
    debitAmount,
    taxes: [
      {
        taxType: 'IVA',
        taxCountryRegion: 'AO',
        taxCode: 'NOR',
        taxPercentage: ivaPercentage,
        taxAmount: ivaAmount,
        taxContribution: ivaAmount,
      },
    ],
    settlementAmount: 0,
    // NÃO incluir referenceInfo para FT/FS/FR
  }
}

/**
 * Converte documento Excel completo para formato AGT
 * 
 * REGRAS AGT OBRIGATÓRIAS:
 * 1. eacCode: mínimo 5 caracteres (ex: '47410' = comércio computadores)
 * 2. currency: objeto com currencyCode, currencyAmount e exchangeRate
 * 3. referenceInfo: só para NC (Nota de Crédito)
 */
export interface AGTDocument {
  schemaVersion: string
  submissionGUID: string
  taxRegistrationNumber: string
  submissionTimeStamp: string
  softwareInfo: {
    softwareInfoDetail: {
      productId: string
      productVersion: string
      softwareValidationNumber: string
    }
    jwsSoftwareSignature: string
  }
  numberOfEntries: number
  documents: Array<{
    documentNo: string
    documentStatus: string
    documentType: string
    documentDate: string
    eacCode: string  // OBRIGATÓRIO - mínimo 5 caracteres
    systemEntryDate: string
    customerCountry: string
    customerTaxID: string
    companyName: string
    lines: AGTLine[]
    documentTotals: {
      netTotal: number
      taxPayable: number
      grossTotal: number
      currency: {  // OBRIGATÓRIO - deve ser objeto
        currencyCode: string
        currencyAmount: number
        exchangeRate: number
      }
    }
  }>
}

/**
 * Converte data dd.mm.yyyy para yyyy-mm-dd
 */
export function parseDateModelo2(dateStr?: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0]
  
  // Se já está em formato yyyy-mm-dd ou yyyy-mm-ddThh:mm:ss
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
    return dateStr.split('T')[0]
  }
  
  // Formato dd.mm.yyyy
  if (dateStr.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
    const [day, month, year] = dateStr.split('.')
    return `${year}-${month}-${day}`
  }
  
  // Formato yyyymmdd
  if (dateStr.match(/^\d{8}$/)) {
    return mapDate(dateStr)
  }
  
  return new Date().toISOString().split('T')[0]
}

/**
 * Limpa nome com espaços extras
 */
function cleanName(name?: string): string {
  if (!name) return 'Cliente Genérico'
  return name.trim().replace(/\s+/g, ' ')
}

/**
 * Converte grupo de linhas (factura) para documento AGT
 * Suporta: AGT completo, SAP legado, modelo-2 e modelo-3
 */
export function groupExcelRowsToAGTDocuments(
  excelRows: ExcelRow[],
  companyNIF: string,
  companyName: string,
  seriesCode: string
): AGTDocument[] {
  // Detectar formato pelos campos presentes
  const firstRow = excelRows[0] || {}
  
  // Formato modelo-3: tem campos expandidos (TAX TYPE, LINE_NO, etc)
  const isModelo3 = firstRow['TAX TYPE'] !== undefined || 
                    firstRow['LINE_NO'] !== undefined ||
                    firstRow['T PAYABLE'] !== undefined ||
                    firstRow['WITH T AM'] !== undefined
  
  // Formato AGT: tem 'Nº Docum' ou 'LINE' ou 'DOCUMENT_TOTALS' (JSON strings)
  const isAGTFormat = firstRow['LINE'] !== undefined ||
                      firstRow['DOCUMENT_TOTALS'] !== undefined
  
  // Formato modelo-2: tem 'Nº Documento' (com espaço) e 'Qnt Fact'
  const isModelo2 = firstRow['Nº Documento'] !== undefined && 
                    firstRow['Qnt Fact'] !== undefined
  
  if (isModelo3) {
    // Processar formato modelo-3 (campos expandidos por linha)
    return processModelo3Format(excelRows, companyNIF, companyName, seriesCode)
  } else if (isModelo2) {
    // Processar formato modelo-2 (SAP simplificado)
    return processModelo2Format(excelRows, companyNIF, companyName, seriesCode)
  } else if (isAGTFormat) {
    // Processar formato AGT completo (JSON strings)
    return processAGTFormat(excelRows, companyNIF, companyName, seriesCode)
  } else {
    // Processar formato SAP legado
    return processSAPFormat(excelRows, companyNIF, companyName, seriesCode)
  }
}

/**
 * Processa formato AGT completo do Excel
 */
function processAGTFormat(
  excelRows: ExcelRow[],
  companyNIF: string,
  companyName: string,
  seriesCode: string
): AGTDocument[] {
  const agtDocuments: AGTDocument['documents'] = []

  excelRows.forEach((row) => {
    try {
      // Parse campos JSON
      const lines = row['LINE'] ? JSON.parse(row['LINE']) : []
      const documentTotals = row['DOCUMENT_TOTALS'] ? JSON.parse(row['DOCUMENT_TOTALS']) : null
      
      agtDocuments.push({
        documentNo: row['Nº Docum'] || `${row['Tipo Doc']} ${seriesCode}/00000`,
        documentStatus: row['Status'] || 'N',
        documentType: row['Tipo Doc'] || 'FT',
        documentDate: row['Data Doc'] || new Date().toISOString().split('T')[0],
        eacCode: row['Cod A'] && String(row['Cod A']).length >= 5 ? String(row['Cod A']) : '47410',
        systemEntryDate: row['Dat E S'] || new Date().toISOString(),
        customerCountry: row['País cl'] || 'AO',
        customerTaxID: row['Nº Cliente'] || '999999999',
        companyName: row['Nome E'] || 'Cliente Genérico',
        lines: lines.map((line: any, idx: number) => {
          const result: any = {
            lineNumber: line.lineNumber || idx + 1,
            productCode: line.productCode || 'GEN001',
            productDescription: line.productDescription || 'Produto',
            quantity: line.quantity || 1,
            unitOfMeasure: line.unitOfMeasure || 'UN',
            unitPrice: line.unitPrice || 0,
            unitPriceBase: line.unitPriceBase || line.unitPrice || 0,
            debitAmount: line.debitAmount || 0,
            taxes: line.taxes || [],
            settlementAmount: line.settlementAmount || 0,
          }
          // NÃO incluir referenceInfo a menos que seja NC
          if ((row['Tipo Doc'] || 'FT') === 'NC' && line.referenceInfo?.reference) {
            result.referenceInfo = line.referenceInfo
          }
          return result
        }),
        documentTotals: {
          netTotal: documentTotals?.netTotal || 0,
          taxPayable: documentTotals?.taxPayable || 0,
          grossTotal: documentTotals?.grossTotal || 0,
          currency: {
            currencyCode: 'AOA',
            currencyAmount: documentTotals?.grossTotal || 0,
            exchangeRate: 1.0
          }
        },
      })
    } catch (e) {
      console.error('Erro ao processar linha AGT:', e)
    }
  })

  return [{
    schemaVersion: '1.2',
    submissionGUID: generateUUID(),
    taxRegistrationNumber: companyNIF,
    submissionTimeStamp: new Date().toISOString(),
    softwareInfo: {
      softwareInfoDetail: {
        productId: 'FacturAGT',
        productVersion: '1.0.0',
        softwareValidationNumber: 'AGT-2025-001',
      },
      jwsSoftwareSignature: 'placeholder',
    },
    numberOfEntries: agtDocuments.length,
    documents: agtDocuments,
  }]
}

/**
 * Processa formato modelo-2 (SAP simplificado)
 */
function processModelo2Format(
  excelRows: ExcelRow[],
  companyNIF: string,
  companyName: string,
  seriesCode: string
): AGTDocument[] {
  // Agrupar por 'Nº Documento'
  const groupedByDoc = new Map<string, ExcelRow[]>()
  
  excelRows.forEach(row => {
    const docNo = row['Nº Documento'] || row['A Fatura'] || 'UNKNOWN'
    if (!groupedByDoc.has(docNo)) {
      groupedByDoc.set(docNo, [])
    }
    groupedByDoc.get(docNo)!.push(row)
  })

  const agtDocuments: any[] = []

  groupedByDoc.forEach((docRows, docNo) => {
    const firstRow = docRows[0]
    
    // Extrair campos do modelo-2
    const documentNo = firstRow['Nº Documento'] || firstRow['A Fatura'] || docNo
    
    // Tipo documento: tentar obter do campo, senão extrair do número do documento
    let documentType = firstRow['Tipo Doc'] || 'FT'
    if (!documentType || documentType.trim() === '') {
      // Extrair tipo do início do número do documento (ex: "FT CI2000..." -> "FT")
      const match = documentNo.match(/^([A-Z]{2})\s/)
      if (match) {
        documentType = match[1]
      }
    }
    
    const documentDate = parseDateModelo2(firstRow['Data Doc'] as string)
    const clientName = cleanName(firstRow['Nome E'] as string)
    const clientNIF = firstRow['Nº Fiscal'] || firstRow['Nº Cliente'] || '999999999'
    const clientCountry = firstRow['País cl'] || 'AO'
    
    // Parse timestamp formato yyyymmddhhmmss
    let systemEntryDate = new Date().toISOString()
    const datES = firstRow['Dat E S']
    if (datES && typeof datES === 'string' && datES.length === 14) {
      // yyyymmddhhmmss -> yyyy-mm-ddThh:mm:ssZ
      const year = datES.substring(0, 4)
      const month = datES.substring(4, 6)
      const day = datES.substring(6, 8)
      const hour = datES.substring(8, 10)
      const minute = datES.substring(10, 12)
      const second = datES.substring(12, 14)
      systemEntryDate = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`
    }

    // Criar linhas do documento (cada linha da planilha é uma linha)
    const lines = docRows.map((row, idx) => {
      const productCode = row['ID Produto'] || row['Identif'] || 'GEN001'
      const productDesc = cleanName(row['V Produto'] as string) || 'Produto Genérico'
      const quantity = Number(row['Qnt Fact'] || 1)
      const unitPrice = 1000 // Valor padrão
      
      return {
        lineNumber: idx + 1,
        productCode,
        productDescription: productDesc,
        quantity,
        unitOfMeasure: 'UN',
        unitPrice,
        unitPriceBase: unitPrice,
        debitAmount: quantity * unitPrice,
        taxes: [{
          taxType: 'IVA',
          taxCountryRegion: 'AO',
          taxCode: 'NOR',
          taxPercentage: 14,
          taxAmount: (quantity * unitPrice) * 0.14,
        }],
        settlementAmount: 0,
      }
    })

    // Calcular totais
    const netTotal = lines.reduce((sum, line) => sum + line.debitAmount, 0)
    const taxPayable = lines.reduce((sum, line) => 
      sum + line.taxes.reduce((t, tax) => t + tax.taxAmount, 0), 0)
    const grossTotal = netTotal + taxPayable

    agtDocuments.push({
      documentNo,
      documentStatus: firstRow['Status'] || 'N',
      documentType,
      documentDate,
      eacCode: firstRow['Cod A'] && String(firstRow['Cod A']).length >= 5 ? String(firstRow['Cod A']) : '47410',
      systemEntryDate,
      customerCountry: clientCountry,
      customerTaxID: clientNIF,
      companyName: clientName,
      lines,
      documentTotals: {
        netTotal,
        taxPayable,
        grossTotal,
        currency: {
          currencyCode: 'AOA',
          currencyAmount: grossTotal,
          exchangeRate: 1.0
        }
      },
    })
  })

  return [{
    schemaVersion: '1.2',
    submissionGUID: generateUUID(),
    taxRegistrationNumber: companyNIF,
    submissionTimeStamp: new Date().toISOString(),
    softwareInfo: {
      softwareInfoDetail: {
        productId: 'FacturAGT',
        productVersion: '1.0.0',
        softwareValidationNumber: 'AGT-2025-001',
      },
      jwsSoftwareSignature: 'placeholder',
    },
    numberOfEntries: agtDocuments.length,
    documents: agtDocuments,
  }]
}

/**
 * Processa formato modelo-3 (campos expandidos por linha de produto)
 * Cada linha Excel representa um item/produto da factura
 * Agrupa por 'Nº Docum' para criar documentos completos
 */
function processModelo3Format(
  excelRows: ExcelRow[],
  companyNIF: string,
  companyName: string,
  seriesCode: string
): AGTDocument[] {
  // Agrupar por 'Nº Docum' (número do documento)
  const groupedByDoc = new Map<string, ExcelRow[]>()
  
  excelRows.forEach(row => {
    const docNo = row['Nº Docum'] || row['A Fatura'] || 'UNKNOWN'
    if (!groupedByDoc.has(docNo)) {
      groupedByDoc.set(docNo, [])
    }
    groupedByDoc.get(docNo)!.push(row)
  })

  console.log(`📋 Modelo-3: Agrupados ${groupedByDoc.size} documentos de ${excelRows.length} linhas`)

  const agtDocuments: any[] = []

  groupedByDoc.forEach((docRows, docNo) => {
    const firstRow = docRows[0]
    
    // Extrair campos de cabeçalho do documento (primeira linha)
    const documentNo = firstRow['Nº Docum'] || docNo
    const documentType = firstRow['Tipo Doc'] || 'FT'
    const documentDate = parseDateModelo2(firstRow['Data Doc'] as string)
    const clientName = cleanName(firstRow['Nome E'] as string)
    const clientNIF = firstRow['Nº Cliente'] || '999999999'
    const clientCountry = firstRow['País cl'] || 'AO'
    const eacCode = firstRow['Cod A'] && String(firstRow['Cod A']).length >= 5 
      ? String(firstRow['Cod A']) 
      : '47410'
    
    // Parse timestamp formato yyyymmddhhmmss
    let systemEntryDate = new Date().toISOString()
    const datES = firstRow['Dat E S']
    if (datES && typeof datES === 'string' && datES.length === 14) {
      const year = datES.substring(0, 4)
      const month = datES.substring(4, 6)
      const day = datES.substring(6, 8)
      const hour = datES.substring(8, 10)
      const minute = datES.substring(10, 12)
      const second = datES.substring(12, 14)
      systemEntryDate = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`
    }

    // Criar linhas do documento (cada linha Excel = uma linha do documento)
    const lines = docRows.map((row, idx) => {
      // Campos da linha
      const lineNo = Number(row['LINE_NO']) || (idx + 1)
      const debitAmount = Number(row['DE_AMOUNT']) || Number(row['GR TOTAL']) || 0
      const creditAmount = Number(row['CR_AMOUNT']) || 0
      
      // Calcular valores
      const quantity = 1 // Modelo-3 normalmente tem quantidade implícita
      const unitPrice = debitAmount
      
      // Campos de imposto
      const taxType = (row['TAX TYPE'] as string) || 'IVA'
      const taxPercentage = Number(row['T PERC']) || 14
      const taxAmount = Number(row['T AMOUNT']) || (debitAmount * taxPercentage / 100)
      const taxCode = (row['TAX COD'] as string) || 'NOR'
      const taxCountryRegion = (row['T COUN_R'] as string) || 'AO'
      
      return {
        lineNumber: lineNo,
        productCode: row['ID Produto'] || row['Identf'] || `PROD${String(lineNo).padStart(3, '0')}`,
        productDescription: cleanName(row['V Produto'] as string) || `Produto linha ${lineNo}`,
        quantity,
        unitOfMeasure: 'UN',
        unitPrice,
        unitPriceBase: unitPrice,
        debitAmount,
        taxes: [{
          taxType: taxType as 'IVA' | 'IS' | 'IEC' | 'NS',
          taxCountryRegion,
          taxCode,
          taxPercentage,
          taxAmount,
          taxContribution: taxAmount,
        }],
        settlementAmount: creditAmount,
      }
    })

    // Calcular totais (usar valores agregados se disponíveis, senão calcular)
    const netTotal = Number(firstRow['N_TOTAL']) || 
                     lines.reduce((sum, line) => sum + line.debitAmount, 0)
    const taxPayable = Number(firstRow['T PAYABLE']) || 
                       lines.reduce((sum, line) => 
                         sum + line.taxes.reduce((t, tax) => t + tax.taxAmount, 0), 0)
    const grossTotal = Number(firstRow['GR TOTAL']) || (netTotal + taxPayable)

    // Moeda
    const currencyCode = (firstRow['CUR COD'] as string) || 'AOA'
    const currencyAmount = Number(firstRow['C_AMOUNT']) || grossTotal
    const exchangeRate = Number(firstRow['EX_RATE']) || 1.0

    agtDocuments.push({
      documentNo,
      documentStatus: firstRow['Status'] || 'N',
      documentType,
      documentDate,
      eacCode,
      systemEntryDate,
      customerCountry: clientCountry,
      customerTaxID: clientNIF,
      companyName: clientName,
      lines,
      documentTotals: {
        netTotal,
        taxPayable,
        grossTotal,
        currency: {
          currencyCode,
          currencyAmount,
          exchangeRate
        }
      },
    })
  })

  console.log(`✅ Modelo-3: Processados ${agtDocuments.length} documentos com total de ${excelRows.length} linhas`)

  return [{
    schemaVersion: '1.2',
    submissionGUID: generateUUID(),
    taxRegistrationNumber: companyNIF,
    submissionTimeStamp: new Date().toISOString(),
    softwareInfo: {
      softwareInfoDetail: {
        productId: 'FacturAGT',
        productVersion: '1.0.0',
        softwareValidationNumber: 'AGT-2025-001',
      },
      jwsSoftwareSignature: 'placeholder',
    },
    numberOfEntries: agtDocuments.length,
    documents: agtDocuments,
  }]
}

/**
 * Processa formato SAP legado do Excel
 */
function processSAPFormat(
  excelRows: ExcelRow[],
  companyNIF: string,
  companyName: string,
  seriesCode: string
): AGTDocument[] {
  // Agrupar por VBELN (número documento SAP)
  const groupedByDocument = new Map<string, ExcelRow[]>()

  excelRows.forEach((row) => {
    const docKey = row.VBELN || `DOC_${Date.now()}`
    if (!groupedByDocument.has(docKey)) {
      groupedByDocument.set(docKey, [])
    }
    groupedByDocument.get(docKey)!.push(row)
  })

  // Converter cada grupo para documento AGT
  const agtDocuments: AGTDocument['documents'] = []
  let docNumberCounter = 1

  groupedByDocument.forEach((rowsInDoc, sapDocNumber) => {
    if (rowsInDoc.length === 0) return

    const firstRow = rowsInDoc[0]
    const agtDocNo = `${mapDocumentType(firstRow.FKART)} ${seriesCode}/${String(docNumberCounter).padStart(5, '0')}`
    
    // Converter linhas
    const lines = rowsInDoc.map((row, idx) =>
      mapExcelRowToAGTLine(row, idx + 1, 14)
    )

    // Calcular totais
    const netTotal = formatDecimal(
      lines.reduce((sum, line) => sum + line.debitAmount, 0)
    )
    const taxPayable = formatDecimal(
      lines.reduce((sum, line) => sum + line.taxes[0].taxContribution, 0)
    )
    const grossTotal = formatDecimal(netTotal + taxPayable)

    agtDocuments.push({
      documentNo: agtDocNo,
      documentStatus: 'N', // Normal
      documentType: mapDocumentType(firstRow.FKART),
      documentDate: mapDate(firstRow.FKDAT),
      eacCode: '47410', // Padrão para comércio (mínimo 5 caracteres obrigatório)
      systemEntryDate: new Date().toISOString(),
      customerCountry: 'AO',
      customerTaxID: firstRow.STCD1 || '999999999',
      companyName: firstRow.NAME1 || 'Cliente Genérico',
      lines,
      documentTotals: {
        netTotal,
        taxPayable,
        grossTotal,
        currency: {
          currencyCode: 'AOA',
          currencyAmount: grossTotal,
          exchangeRate: 1.0
        }
      },
    })

    docNumberCounter++
  })

  // Criar documento AGT completo
  const document: AGTDocument = {
    schemaVersion: '1.2',
    submissionGUID: generateUUID(),
    taxRegistrationNumber: companyNIF,
    submissionTimeStamp: new Date().toISOString(),
    softwareInfo: {
      softwareInfoDetail: {
        productId: 'FacturAGT',
        productVersion: '1.0.0',
        softwareValidationNumber: 'AGT-2025-001',
      },
      jwsSoftwareSignature: 'placeholder', // Será assinado no middleware
    },
    numberOfEntries: agtDocuments.length,
    documents: agtDocuments,
  }

  return [document] // Retorna array com um documento
}
