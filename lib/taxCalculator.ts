// Calculadora de impostos conforme especificações AGT Angola

import { TaxLine, TaxExemptionCode, ProductLine } from './types';
import { calcularIVA, IVA_TAXA_NORMAL } from './data/tabelaIVA';
import { calcularIS } from './data/tabelaIS';
import { calcularIEC } from './data/tabelaIEC';

export interface TaxCalculation {
  baseAmount: number;
  ivaAmount: number;
  isAmount: number;
  iecAmount: number;
  totalTax: number;
  grossAmount: number;
}

/**
 * Calcula todos os impostos para uma linha de produto
 */
export function calculateLineTaxes(
  quantity: number,
  unitPrice: number,
  productCode?: string,
  isVerba?: string,
  ivaExemption?: TaxExemptionCode
): { taxes: TaxLine[]; totals: TaxCalculation } {
  const baseAmount = quantity * unitPrice;
  const taxes: TaxLine[] = [];
  
  let ivaAmount = 0;
  let isAmount = 0;
  let iecAmount = 0;
  
  // 1. Calcular IEC (se aplicável)
  if (productCode) {
    iecAmount = calcularIEC(productCode, quantity, unitPrice);
    if (iecAmount > 0) {
      taxes.push({
        taxType: 'IEC',
        taxCountryRegion: 'AO',
        taxCode: 'IEC001',
        taxPercentage: 0, // IEC pode ser taxa fixa
        taxBase: baseAmount,
        taxAmount: Math.ceil(iecAmount), // Arredondamento por excesso
        taxContribution: Math.ceil(iecAmount),
      });
    }
  }
  
  // 2. Calcular IS (se aplicável)
  if (isVerba) {
    isAmount = calcularIS(isVerba, baseAmount);
    if (isAmount > 0) {
      taxes.push({
        taxType: 'IS',
        taxCountryRegion: 'AO',
        taxCode: isVerba,
        taxPercentage: 0,
        taxBase: baseAmount,
        taxAmount: Math.ceil(isAmount), // Arredondamento por excesso
        taxContribution: Math.ceil(isAmount),
      });
    }
  }
  
  // 3. Calcular IVA
  // Base de cálculo do IVA = valor base + IEC + IS
  const ivaBase = baseAmount + iecAmount + isAmount;
  
  if (ivaExemption && ivaExemption.trim() !== '') {
    // Se há isenção, IVA é zero mas ainda registamos a linha
    taxes.push({
      taxType: 'IVA',
      taxCountryRegion: 'AO',
      taxCode: 'ISE',
      taxPercentage: 0,
      taxBase: ivaBase,
      taxAmount: 0,
      taxContribution: 0,
      taxExemptionCode: ivaExemption,
    });
  } else {
    ivaAmount = calcularIVA(ivaBase);
    taxes.push({
      taxType: 'IVA',
      taxCountryRegion: 'AO',
      taxCode: 'NOR',
      taxPercentage: IVA_TAXA_NORMAL,
      taxBase: ivaBase,
      taxAmount: Math.ceil(ivaAmount),
      taxContribution: Math.ceil(ivaAmount),
    });
  }
  
  const totalTax = ivaAmount + isAmount + iecAmount;
  const grossAmount = baseAmount + totalTax;
  
  return {
    taxes,
    totals: {
      baseAmount: Math.ceil(baseAmount),
      ivaAmount: Math.ceil(ivaAmount),
      isAmount: Math.ceil(isAmount),
      iecAmount: Math.ceil(iecAmount),
      totalTax: Math.ceil(totalTax),
      grossAmount: Math.ceil(grossAmount),
    },
  };
}

/**
 * Calcula os totais de um documento a partir das linhas
 */
export function calculateDocumentTotals(lines: ProductLine[]): {
  netTotal: number;
  taxPayable: number;
  grossTotal: number;
} {
  let netTotal = 0;
  let taxPayable = 0;
  
  lines.forEach((line) => {
    const lineAmount = line.quantity * line.unitPrice;
    netTotal += lineAmount;
    
    line.taxes.forEach((tax) => {
      taxPayable += (tax.taxContribution ?? tax.taxAmount);
    });
  });
  
  const grossTotal = netTotal + taxPayable;
  
  return {
    netTotal: Math.ceil(netTotal), // Arredondamento por excesso
    taxPayable: Math.ceil(taxPayable),
    grossTotal: Math.ceil(grossTotal),
  };
}

/**
 * Calcula impostos com sugestões de IA
 */
export function suggestTaxExemption(
  customerCountry: string,
  productDescription: string,
  eacCode: string
): TaxExemptionCode | undefined {
  // IA mock: Sugestões baseadas em regras
  
  // Exportação
  if (customerCountry !== 'AO') {
    return 'I01'; // Exportação
  }
  
  // Serviços médicos
  if (
    productDescription.toLowerCase().includes('médic') ||
    productDescription.toLowerCase().includes('saúde') ||
    productDescription.toLowerCase().includes('hospital') ||
    eacCode.startsWith('86')
  ) {
    return 'I06'; // Prestações de serviços médicos
  }
  
  // Serviços educacionais
  if (
    productDescription.toLowerCase().includes('ensino') ||
    productDescription.toLowerCase().includes('educação') ||
    productDescription.toLowerCase().includes('escola') ||
    eacCode.startsWith('85')
  ) {
    return 'I07'; // Prestações de serviços de educação
  }
  
  // Serviços financeiros
  if (
    productDescription.toLowerCase().includes('banco') ||
    productDescription.toLowerCase().includes('seguro') ||
    productDescription.toLowerCase().includes('financ') ||
    eacCode.startsWith('64') ||
    eacCode.startsWith('65')
  ) {
    return 'I14'; // Operações financeiras e seguros
  }
  
  return undefined; // Sem isenção
}
