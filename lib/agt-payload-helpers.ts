/**
 * FUNÇÕES HELPER PARA GERAÇÃO DE PAYLOADS AGT
 * Utilitários para cálculo de impostos, totais, geração de UUIDs e assinaturas
 */

import { v4 as uuidv4 } from 'uuid';
import {
  DocumentLine,
  DocumentTotals,
  Tax,
  Document,
  IVA_RATES,
  TaxType,
  TaxCode
} from './agt-payload-types';

/**
 * Gera UUID v4 conforme especificação AGT
 * Formato: xxxxxxxx-xxxx-4xxx-Nxxx-xxxxxxxxxxxx
 * 
 * @returns UUID v4 válido
 */
export function generateSubmissionGUID(): string {
  return uuidv4();
}

/**
 * Gera timestamp ISO 8601 conforme especificação AGT
 * Formato: YYYY-MM-DDTHH:mm:ss+HH:mm ou YYYY-MM-DDTHH:mm:ssZ
 * 
 * @param date Data opcional (default: now)
 * @returns String ISO 8601
 */
export function generateTimestamp(date: Date = new Date()): string {
  return date.toISOString(); // Formato: 2025-02-03T14:30:00.000Z
}

/**
 * Formata data para documentos (sem hora)
 * Formato: YYYY-MM-DD
 * 
 * @param date Data opcional (default: now)
 * @returns String no formato YYYY-MM-DD
 */
export function formatDocumentDate(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * Formata valor monetário para string com 2 decimais
 * AGT exige valores como strings com precisão decimal
 * 
 * @param value Valor numérico
 * @returns String formatada (ex: "1234.56")
 */
export function formatCurrency(value: number): string {
  return value.toFixed(2);
}

/**
 * Calcula IVA sobre um valor base
 * 
 * @param baseValue Valor base (sem IVA)
 * @param taxRate Taxa de IVA (ex: 14.0 para 14%)
 * @returns Valor do IVA
 */
export function calculateIVA(baseValue: number, taxRate: number): number {
  return (baseValue * taxRate) / 100;
}

/**
 * Calcula total de uma linha (com impostos)
 * 
 * @param quantity Quantidade
 * @param unitPrice Preço unitário
 * @param taxRate Taxa de imposto total (%)
 * @returns Objeto com subtotal, imposto e total
 */
export function calculateLineTotal(
  quantity: number,
  unitPrice: number,
  taxRate: number = 0
): { subtotal: number; taxAmount: number; total: number } {
  const subtotal = quantity * unitPrice;
  const taxAmount = calculateIVA(subtotal, taxRate);
  const total = subtotal + taxAmount;
  
  return {
    subtotal,
    taxAmount,
    total
  };
}

/**
 * Cria objeto Tax para IVA
 * 
 * @param baseValue Valor base de cálculo
 * @param taxRate Taxa de IVA (14.0, 0.0, etc)
 * @param taxCode Código do imposto (ISE, NOR, etc)
 * @param exemptionCode Código de isenção (opcional)
 * @returns Objeto Tax
 */
export function createIVATax(
  baseValue: number,
  taxRate: number = IVA_RATES.NORMAL,
  taxCode: string = TaxCode.NORMAL,
  exemptionCode?: string
): Tax {
  const taxAmount = calculateIVA(baseValue, taxRate);
  
  return {
    taxType: TaxType.IVA,
    taxCountryRegion: 'AO',
    taxCode: taxCode,
    taxBase: formatCurrency(baseValue),
    taxPercentage: formatCurrency(taxRate),
    taxAmount: formatCurrency(taxAmount),
    ...(exemptionCode && { taxExemptionCode: exemptionCode })
  };
}

/**
 * Cria objeto Tax para IEC (Imposto Especial de Consumo)
 * Usado em bebidas alcoólicas, tabacos, combustíveis
 * 
 * @param baseValue Valor base
 * @param taxRate Taxa do IEC
 * @param taxCode Código do imposto
 * @returns Objeto Tax
 */
export function createIECTax(
  baseValue: number,
  taxRate: number,
  taxCode: string = 'IEC'
): Tax {
  const taxAmount = calculateIVA(baseValue, taxRate);
  
  return {
    taxType: TaxType.IEC,
    taxCountryRegion: 'AO',
    taxCode: taxCode,
    taxBase: formatCurrency(baseValue),
    taxPercentage: formatCurrency(taxRate),
    taxAmount: formatCurrency(taxAmount)
  };
}

/**
 * Cria objeto Tax para Imposto de Selo
 * 
 * @param baseValue Valor base
 * @param taxRate Taxa do IS
 * @returns Objeto Tax
 */
export function createISTax(
  baseValue: number,
  taxRate: number
): Tax {
  const taxAmount = calculateIVA(baseValue, taxRate);
  
  return {
    taxType: TaxType.IS,
    taxCountryRegion: 'AO',
    taxCode: 'IS',
    taxBase: formatCurrency(baseValue),
    taxPercentage: formatCurrency(taxRate),
    taxAmount: formatCurrency(taxAmount)
  };
}

/**
 * Interface para resultado de cálculo de totais
 */
export interface CalculatedTotals {
  netTotal: number;      // Subtotal (soma das bases)
  taxPayable: number;    // Total de impostos
  grossTotal: number;    // Total final (netTotal + taxPayable)
}

/**
 * CALCULA TOTAIS DO DOCUMENTO
 * Soma todas as linhas e calcula totais finais
 * 
 * @param lines Array de linhas do documento
 * @returns Objeto DocumentTotals pronto para o payload
 */
export function calculateTotals(lines: DocumentLine[]): DocumentTotals {
  const totals: CalculatedTotals = lines.reduce(
    (acc, line) => {
      // Soma a base de cálculo (netTotal)
      const lineBase = parseFloat(line.taxes[0]?.taxBase || '0');
      
      // Soma todos os impostos da linha
      const lineTaxes = line.taxes.reduce(
        (taxAcc, tax) => taxAcc + parseFloat(tax.taxAmount),
        0
      );
      
      return {
        netTotal: acc.netTotal + lineBase,
        taxPayable: acc.taxPayable + lineTaxes,
        grossTotal: acc.grossTotal + parseFloat(line.settlementAmount)
      };
    },
    { netTotal: 0, taxPayable: 0, grossTotal: 0 }
  );

  return {
    taxPayable: formatCurrency(totals.taxPayable),
    netTotal: formatCurrency(totals.netTotal),
    grossTotal: formatCurrency(totals.grossTotal)
  };
}

/**
 * MOCK DE ASSINATURA DIGITAL (JWS)
 * Em produção, usar chave privada do certificado AGT
 * 
 * Processo real:
 * 1. Serializar payload em JSON canônico
 * 2. Gerar hash SHA-256
 * 3. Assinar com chave privada (RSA/ECDSA)
 * 4. Codificar em Base64
 * 
 * @param data Dados a assinar
 * @returns Assinatura mock (256 caracteres)
 */
export function signPayload(data: any): string {
  // MOCK: Em produção, implementar assinatura real com certificado
  const mockSignature = Buffer.from(
    JSON.stringify(data) + '_SIGNED_WITH_PRIVATE_KEY_' + Date.now()
  )
    .toString('base64')
    .substring(0, 256)
    .padEnd(256, '=');
  
  return mockSignature;
}

/**
 * Assina documento individual (jwsDocumentSignature)
 * 
 * @param document Documento a assinar
 * @returns Assinatura JWS (256 chars)
 */
export function signDocument(document: Omit<Document, 'jwsDocumentSignature'>): string {
  return signPayload({
    documentNo: document.documentNo,
    documentDate: document.documentDate,
    documentType: document.documentType,
    customerTaxID: document.customerTaxID,
    grossTotal: document.documentTotals.grossTotal
  });
}

/**
 * Assina software (jwsSoftwareSignature)
 * 
 * @param productId ID do produto
 * @param productVersion Versão
 * @param validationNumber Número de validação AGT
 * @returns Assinatura JWS (256 chars)
 */
export function signSoftware(
  productId: string,
  productVersion: string,
  validationNumber: string
): string {
  return signPayload({
    productId,
    productVersion,
    softwareValidationNumber: validationNumber,
    timestamp: generateTimestamp()
  });
}

/**
 * Gera número de documento sequencial
 * Formato: TIPO SÉRIE/NÚMERO
 * Ex: "FT A/001", "NC B/042"
 * 
 * @param documentType Tipo de documento (FT, NC, etc)
 * @param series Série (A, B, C, etc)
 * @param sequenceNumber Número sequencial
 * @returns Número do documento formatado
 */
export function generateDocumentNumber(
  documentType: string,
  series: string,
  sequenceNumber: number
): string {
  const paddedNumber = sequenceNumber.toString().padStart(6, '0');
  return `${documentType} ${series}/${paddedNumber}`;
}

/**
 * Valida NIF angolano
 * NIF deve ter 9 dígitos numéricos
 * 
 * @param nif NIF a validar
 * @returns true se válido
 */
export function validateNIF(nif: string): boolean {
  // NIF angolano: 9 dígitos
  // 999999999 = consumidor final (sem NIF)
  return /^\d{9}$/.test(nif);
}

/**
 * NIF para consumidor final (sem identificação fiscal)
 */
export const CONSUMIDOR_FINAL_NIF = '999999999';

/**
 * Gera NIF de teste (mock)
 * 
 * @returns NIF válido para testes
 */
export function generateTestNIF(): string {
  const digits = Array.from({ length: 9 }, () => 
    Math.floor(Math.random() * 10)
  ).join('');
  return digits;
}

/**
 * Códigos de Atividade Económica (CAE) comuns
 * Referência: Tabela 1 do decreto.md
 */
export const COMMON_CAE_CODES = {
  COMERCIO_GERAL: '47190',          // Comércio a retalho não especializado
  SERVICOS_TI: '62010',             // Programação informática
  RESTAURACAO: '56101',             // Restaurantes
  CONSULTORIA: '70220',             // Consultoria gestão
  CONSTRUCAO: '41200',              // Construção de edifícios
  TRANSPORTE: '49410',              // Transporte rodoviário
  EDUCACAO: '85590'                 // Outras atividades educativas
} as const;

/**
 * Motivos comuns para Nota de Crédito
 */
export const NC_REASONS = {
  DEVOLUCAO: 'Devolução de mercadoria',
  DESCONTO: 'Desconto comercial concedido',
  ERRO_FATURACAO: 'Correção de erro de facturação',
  ANULACAO_PARCIAL: 'Anulação parcial de factura'
} as const;

/**
 * Motivos comuns para Nota de Débito
 */
export const ND_REASONS = {
  JUROS_MORA: 'Juros de mora',
  CORRECAO_PRECO: 'Correção de preço (aumento)',
  SERVICOS_ADICIONAIS: 'Serviços adicionais não facturados',
  DESPESAS_EXTRAS: 'Despesas extras'
} as const;

/**
 * Tipos de retenção na fonte
 */
export const WITHHOLDING_TYPES = {
  IVA: 'IVA',                       // Retenção de IVA (6,5% sobre 14%)
  IR: 'IR',                          // Imposto de Renda
  IS: 'IS'                           // Imposto de Selo retido
} as const;

/**
 * Calcula retenção de IVA na fonte
 * Em Angola: 6,5% sobre os 14% de IVA (aprox 0,91% do valor)
 * 
 * @param ivaAmount Valor do IVA
 * @returns Valor retido
 */
export function calculateIVAWithholding(ivaAmount: number): number {
  return ivaAmount * 0.065; // 6,5% do IVA
}
