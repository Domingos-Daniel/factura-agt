/**
 * Excel Parser - Converte ficheiros Excel SAP para formato AGT
 * Suporta formatos: VBRK/VBRP (Facturas SAP)
 */

import * as XLSX from 'xlsx'
import { z } from 'zod'

// Schema para validação de linha Excel (formato AGT + SAP legado + modelo-2)
export const ExcelRowSchema = z.object({
  // Cabeçalho Documento AGT
  'V Schema': z.string().optional(), // Versão do schema
  'Identif': z.string().optional(), // GUID de submissão
  'TS Subm': z.string().or(z.number()).optional(), // Timestamp submissão
  'Nº Fiscal': z.string().optional(), // NIF da empresa emissora
  'A Softwa)': z.string().optional(), // Assinatura software
  'ID Produto': z.string().optional(), // ID do produto software
  'V Produto': z.string().optional(), // Versão do produto
  'Qnt Fact': z.string().or(z.number()).optional(), // Quantidade de facturas
  
  // Documento
  'Nº Docum': z.string().optional(), // Número do documento (ex: FT 2025/00001)
  'Nº Documento': z.string().optional(), // Variante (modelo-2)
  'Nº Cliente': z.string().optional(), // NIF do cliente
  'Status': z.string().optional(), // Status do documento (N=Normal, A=Anulado)
  'Raz Canc': z.string().optional(), // Razão de cancelamento
  'A Fatura': z.string().optional(), // Hash/Assinatura da factura
  'Data Doc': z.string().optional(), // Data do documento (pode ser dd.mm.yyyy)
  'Tipo Doc': z.string().optional(), // Tipo documento (FT, FS, NC, etc)
  'Cod A': z.string().optional(), // Código EAC
  'Dat E S': z.string().optional(), // Data entrada no sistema (pode ser yyyymmddhhmmss)
  'País cl': z.string().optional(), // País do cliente
  'Nome E': z.string().optional(), // Nome da empresa/cliente (pode ter espaços extras)
  
  // Secções complexas (JSON strings)
  'LINE': z.string().optional(), // Linhas do documento (JSON array)
  'PAYMENT_RECEIPT': z.string().optional(), // Recibos de pagamento (JSON)
  'DOCUMENT_TOTALS': z.string().optional(), // Totais do documento (JSON)
  'WITHHOLDING_TAX_LIST': z.string().optional(), // Lista de retenções (JSON)
  
  // Campos SAP legados (para compatibilidade com exemplo_facturas_sap.csv)
  VBELN: z.string().optional(), // Nº documento SAP
  FKART: z.string().optional(), // Tipo documento (F1=FT, F2=FS, RE=NC)
  FKDAT: z.string().optional(), // Data emissão (YYYYMMDD)
  KUNAG: z.string().optional(), // Código cliente SAP
  STCD1: z.string().optional(), // NIF Cliente
  NAME1: z.string().optional(), // Nome Cliente
  STRAS: z.string().optional(), // Endereço
  ORT01: z.string().optional(), // Cidade
  POSNR: z.string().optional(), // Nº linha
  MATNR: z.string().optional(), // Código produto
  ARKTX: z.string().optional(), // Descrição produto
  FKIMG: z.string().or(z.number()).optional(), // Quantidade
  VRKME: z.string().optional(), // Unidade medida
  NETWR: z.string().or(z.number()).optional(), // Valor líquido
  MWSBP: z.string().or(z.number()).optional(), // Taxa IVA
  MWSBK: z.string().or(z.number()).optional(), // Total IVA
})

export type ExcelRow = z.infer<typeof ExcelRowSchema>

export interface ParsedExcelData {
  success: boolean
  rows: ExcelRow[]
  errors: Array<{ row: number; field: string; error: string }>
  summary: {
    totalRows: number
    validRows: number
    errorRows: number
    documentTypes: { [key: string]: number }
    totalAmount: number
  }
}

/**
 * Parse ficheiro Excel
 */
export function parseExcelFile(file: File): Promise<ParsedExcelData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'array' })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        
        // Detectar formato modelo-2: ler amostra para ver se começa em B2
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][]
        
        let jsonData: any[] = []
        
        // Verificar se é formato modelo-2 (coluna A vazia, headers em B2)
        const isModelo2 = rawData.length >= 2 && 
                         rawData[1] && 
                         rawData[1][0] === '' && // Coluna A vazia
                         rawData[1][1] && // Coluna B tem conteúdo
                         typeof rawData[1][1] === 'string' &&
                         (rawData[1][1].includes('Schema') || rawData[1][1].includes('Identf'))
        
        if (isModelo2) {
          console.log('📋 Detectado formato modelo-2 (começa em B2)')
          
          // Ler com range específico: começa em B2
          // Row 2 = headers (índice 1), dados a partir de row 4 (índice 3)
          const headers = rawData[1].slice(1) // Remove coluna A, pega a partir de B
          const dataRows = rawData.slice(3) // Pula rows 1, 2, 3 (vazio, header, vazio)
          
          // Converter para formato de objetos
          jsonData = dataRows
            .filter(row => row && row.length > 1) // Filtrar linhas vazias
            .map(row => {
              const obj: any = {}
              const cells = row.slice(1) // Remove coluna A
              headers.forEach((header: string, idx: number) => {
                if (header && header.trim()) {
                  obj[header.trim()] = cells[idx] !== undefined ? cells[idx] : ''
                }
              })
              return obj
            })
            .filter(obj => Object.keys(obj).length > 0) // Remover objetos vazios
          
          console.log(`📊 Modelo-2: ${jsonData.length} linhas de dados processadas`)
        } else {
          // Formato padrão (AGT ou SAP legado) - começa em A1
          jsonData = XLSX.utils.sheet_to_json(worksheet)
        }

        const parsedData = parseJsonData(jsonData as ExcelRow[])
        resolve(parsedData)
      } catch (error) {
        reject(new Error(`Erro ao processar ficheiro Excel: ${error}`))
      }
    }

    reader.onerror = () => {
      reject(new Error('Erro ao ler ficheiro'))
    }

    reader.readAsArrayBuffer(file)
  })
}

/**
 * Parse dados JSON do Excel
 */
function parseJsonData(jsonData: ExcelRow[]): ParsedExcelData {
  const rows: ExcelRow[] = []
  const errors: Array<{ row: number; field: string; error: string }> = []
  const documentTypes: { [key: string]: number } = {}
  let totalAmount = 0

  jsonData.forEach((row, index) => {
    try {
      // Validar com Zod
      const validatedRow = ExcelRowSchema.parse(row)

      rows.push(validatedRow)

      // Contar tipos de documento (suporta ambos formatos: AGT e SAP)
      const docType = validatedRow['Tipo Doc'] || validatedRow.FKART
      if (docType) {
        documentTypes[docType] = (documentTypes[docType] || 0) + 1
      }

      // Somar totais (suporta ambos formatos)
      // Primeiro tenta campo SAP
      const netValue = validatedRow.NETWR
      if (netValue) {
        const amount = typeof netValue === 'string' 
          ? parseFloat(netValue) 
          : netValue
        totalAmount += amount || 0
      }
      
      // Depois tenta extrair totais do campo AGT DOCUMENT_TOTALS
      if (validatedRow['DOCUMENT_TOTALS']) {
        try {
          const totals = JSON.parse(validatedRow['DOCUMENT_TOTALS'])
          if (totals.netTotal) {
            totalAmount += parseFloat(totals.netTotal) || 0
          }
        } catch {
          // Ignorar erros de parse JSON
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push({
          row: index + 2, // +2 porque 1 é header, +1 para human-readable
          field: error.issues[0]?.path.join('.') || 'unknown',
          error: error.issues[0]?.message || 'Erro de validação',
        })
      }
    }
  })

  return {
    success: errors.length === 0,
    rows,
    errors,
    summary: {
      totalRows: jsonData.length,
      validRows: rows.length,
      errorRows: errors.length,
      documentTypes,
      totalAmount,
    },
  }
}
