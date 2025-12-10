/**
 * Mock AGT Client para desenvolvimento local
 * Retorna dados simulados sem fazer chamadas HTTP reais
 */

import 'server-only'
import { v4 as uuidv4 } from 'uuid'

type MockResponse = {
  requestID?: string
  resultCode?: number
  documentStatusList?: any[]
  seriesResultCount?: number
  seriesInfo?: any[]
  documentResultCount?: number
  documentResultList?: any[]
  errorList?: any[]
  [key: string]: any
}

class MockAgtClient {
  private delay(ms: number = 500): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async registarFactura<T extends { documents?: any[] }>(payload: T): Promise<MockResponse> {
    await this.delay(800)
    
    // Simula validação: 95% sucesso, 5% erro
    const hasError = Math.random() < 0.05
    
    if (hasError) {
      return {
        errorList: [
          {
            idError: 'E01',
            descriptionError: 'Campo obrigatório ausente: customerTaxID',
            documentNo: payload.documents?.[0]?.documentNo || 'N/A'
          }
        ]
      }
    }
    
    return {
      requestID: `AGT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${uuidv4().split('-')[0]}`
    }
  }

  async obterEstado<T extends { requestID?: string }>(payload: T): Promise<MockResponse> {
    await this.delay(400)
    
    // Simula processamento: 80% válida, 10% pendente, 10% inválida
    const rand = Math.random()
    
    if (rand < 0.1) {
      // Ainda em processamento
      return {
        requestID: payload.requestID || 'AGT-UNKNOWN',
        resultCode: 8, // Em curso
        documentStatusList: []
      }
    } else if (rand < 0.9) {
      // Válida
      return {
        requestID: payload.requestID || 'AGT-UNKNOWN',
        resultCode: 0, // Processado sem inválidas
        documentStatusList: [
          {
            documentNo: 'FT 2025/001',
            documentStatus: 'V', // Válida
            errorList: []
          }
        ]
      }
    } else {
      // Inválida
      return {
        requestID: payload.requestID || 'AGT-UNKNOWN',
        resultCode: 1, // Com inválidas
        documentStatusList: [
          {
            documentNo: 'FT 2025/001',
            documentStatus: 'I', // Inválida
            errorList: [
              {
                idError: 'E23',
                descriptionError: 'NIF do cliente não registado na AGT'
              }
            ]
          }
        ]
      }
    }
  }

  async listarFacturas<T extends { queryStartDate?: string; queryEndDate?: string }>(payload: T): Promise<MockResponse> {
    await this.delay(300)
    
    // IMPORTANTE: Em produção, o Mock deve retornar dados vazios 
    // porque listarFacturas é chamado via API route server-side
    // Os dados reais vêm do localStorage no cliente
    
    // Retorna estrutura AGT com lista vazia
    // O frontend usará getFacturas() do localStorage
    return {
      documentResultCount: 0,
      documentResultList: []
    }
  }

  async consultarFactura<T extends { documentNo?: string }>(payload: T): Promise<MockResponse> {
    await this.delay(500)
    
    return {
      documentNo: payload.documentNo || 'FT 2025/001',
      validationStatus: 'V',
      processingStatus: 'Processado',
      returnCode: '0000',
      returnMessage: 'Documento validado com sucesso',
      documents: [
        {
          documentNo: payload.documentNo || 'FT 2025/001',
          documentDate: '2025-10-01',
          documentType: 'FT',
          customerTaxID: '5000098765',
          companyName: 'Cliente Exemplo Lda',
          documentTotals: {
            netTotal: 100000.00,
            taxPayable: 14000.00,
            grossTotal: 114000.00
          }
        }
      ]
    }
  }

  async solicitarSerie<T extends { seriesCode?: string; seriesYear?: number; documentType?: string }>(payload: T): Promise<MockResponse> {
    await this.delay(600)
    
    // Simula validação: se código não contém ano, retorna erro
    if (payload.seriesCode && !/\d{2,4}/.test(payload.seriesCode)) {
      return {
        resultCode: 0, // Insucesso
        errorList: [
          {
            idError: 'E05',
            descriptionError: 'Código da série deve conter o ano (25 ou 2025)'
          }
        ]
      }
    }
    
    return {
      resultCode: 1, // Sucesso
      seriesCode: payload.seriesCode,
      seriesYear: payload.seriesYear,
      documentType: payload.documentType,
      message: 'Série criada com sucesso'
    }
  }

  async listarSeries<T extends { seriesCode?: string; documentType?: string }>(payload: T): Promise<MockResponse> {
    await this.delay(400)
    
    // IMPORTANTE: Em produção, o Mock deve retornar dados vazios
    // porque listarSeries é chamado via API route server-side
    // Os dados reais vêm do localStorage no cliente
    
    // Retorna estrutura AGT com lista vazia
    // O frontend usará getSeries() do localStorage
    return {
      seriesResultCount: 0,
      seriesInfo: []
    }
  }

  async validarDocumento<T extends { documentNo?: string; action?: string }>(payload: T): Promise<MockResponse> {
    await this.delay(500)
    
    const isConfirm = payload.action === 'C'
    
    return {
      actionResultCode: isConfirm ? 'C_OK' : 'R_OK',
      documentStatusCode: isConfirm ? 'S_C' : 'S_RJ',
      documentNo: payload.documentNo,
      message: isConfirm ? 'Documento confirmado' : 'Documento rejeitado',
      errorList: []
    }
  }
}

/**
 * Cria Mock AGT Client (para desenvolvimento)
 */
export function createMockAgtClient(): MockAgtClient {
  return new MockAgtClient()
}
