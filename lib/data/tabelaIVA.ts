import { IVAExemption, TaxExemptionCode } from '../types';

// Tabela 4-6 - Isenções de IVA
// Baseado no Código do IVA de Angola

export const tabelaIVA: IVAExemption[] = [
  {
    code: 'I01',
    description: 'Isenção de IVA - Exportação de bens',
    legalReference: 'Artigo 9.º, n.º 1, alínea a) do Código do IVA',
  },
  {
    code: 'I02',
    description: 'Isenção de IVA - Imunidade (Estado, autarquias, instituições religiosas)',
    legalReference: 'Artigo 9.º, n.º 1, alínea b) do Código do IVA',
  },
  {
    code: 'I03',
    description: 'Isenção de IVA - Não sujeição (actividades não comerciais)',
    legalReference: 'Artigo 2.º do Código do IVA',
  },
  {
    code: 'I04',
    description: 'Isenção de IVA - Regime de exclusão (pequenos retalhistas)',
    legalReference: 'Artigo 53.º do Código do IVA',
  },
  {
    code: 'I05',
    description: 'Isenção de IVA - Regime de não sujeição (importações de uso pessoal)',
    legalReference: 'Artigo 9.º, n.º 1, alínea c) do Código do IVA',
  },
  {
    code: 'I06',
    description: 'Isenção de IVA - Prestações de serviços médicos e sanitários',
    legalReference: 'Artigo 9.º, n.º 1, alínea d) do Código do IVA',
  },
  {
    code: 'I07',
    description: 'Isenção de IVA - Prestações de serviços de educação',
    legalReference: 'Artigo 9.º, n.º 1, alínea e) do Código do IVA',
  },
  {
    code: 'I08',
    description: 'Isenção de IVA - Regime transitório (operações anteriores à entrada em vigor)',
    legalReference: 'Disposições transitórias do Código do IVA',
  },
  {
    code: 'I09',
    description: 'Isenção de IVA - Regime de margem (bens em segunda mão)',
    legalReference: 'Artigo 60.º do Código do IVA',
  },
  {
    code: 'I10',
    description: 'Isenção de IVA - Operações triangulares intracomunitárias',
    legalReference: 'Artigo 9.º, n.º 1, alínea f) do Código do IVA',
  },
  {
    code: 'I11',
    description: 'Isenção de IVA - Inversão do sujeito passivo (aquisição de serviços no exterior)',
    legalReference: 'Artigo 18.º do Código do IVA',
  },
  {
    code: 'I12',
    description: 'Isenção de IVA - Autoliquidação (importações por sujeitos passivos)',
    legalReference: 'Artigo 20.º do Código do IVA',
  },
  {
    code: 'I13',
    description: 'Isenção de IVA - Regime de caixa (pagamento diferido)',
    legalReference: 'Artigo 9.º, n.º 1, alínea g) do Código do IVA',
  },
  {
    code: 'I14',
    description: 'Isenção de IVA - Operações financeiras e seguros',
    legalReference: 'Artigo 9.º, n.º 1, alínea h) do Código do IVA',
  },
  {
    code: 'I15',
    description: 'Isenção de IVA - Regime especial de bens em segunda mão, objectos de arte, de colecção e antiguidades',
    legalReference: 'Artigo 60.º a 62.º do Código do IVA',
  },
  {
    code: 'I16',
    description: 'Isenção de IVA - Regime especial de agências de viagens e organizadores de circuitos turísticos',
    legalReference: 'Artigo 63.º do Código do IVA',
  },
];

// Taxa normal de IVA em Angola
export const IVA_TAXA_NORMAL = 14; // 14%

// Função para obter isenção por código
export function obterIsencaoIVA(code: TaxExemptionCode): IVAExemption | undefined {
  return tabelaIVA.find((item) => item.code === code);
}

// Função para calcular IVA
export function calcularIVA(valorBase: number, isencao?: TaxExemptionCode): number {
  if (isencao) {
    return 0; // Se há isenção, IVA é zero
  }
  return Math.ceil((valorBase * IVA_TAXA_NORMAL) / 100); // Arredondamento por excesso
}

// Função para verificar se há isenção aplicável
export function temIsencaoIVA(code?: TaxExemptionCode): boolean {
  if (!code) return false;
  return tabelaIVA.some((item) => item.code === code);
}

// Função para buscar isenções por descrição
export function buscarIsencaoIVA(termo: string): IVAExemption[] {
  const termoLower = termo.toLowerCase();
  return tabelaIVA.filter(
    (item) =>
      item.code.toLowerCase().includes(termoLower) ||
      item.description.toLowerCase().includes(termoLower) ||
      item.legalReference.toLowerCase().includes(termoLower)
  );
}
