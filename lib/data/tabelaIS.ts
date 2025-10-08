import { ISTax } from '../types';

// Tabela 3 - Imposto de Selo (IS)
// Baseado nas verbas aplicáveis em Angola

export const tabelaIS: ISTax[] = [
  // Verba 1 - Contratos
  { verba: '1.1', description: 'Contratos de compra e venda', taxRate: 0.1 },
  { verba: '1.2', description: 'Contratos de arrendamento (por ano)', taxRate: 0.5 },
  { verba: '1.3', description: 'Contratos de trabalho', fixedAmount: 1000 },
  { verba: '1.4', description: 'Contratos de prestação de serviços', taxRate: 0.2 },
  { verba: '1.5', description: 'Contratos de empreitada', taxRate: 0.3 },
  
  // Verba 2 - Operações Bancárias
  { verba: '2.1', description: 'Abertura de conta bancária', fixedAmount: 500 },
  { verba: '2.2', description: 'Cheques (por folha)', fixedAmount: 10 },
  { verba: '2.3', description: 'Cartões de crédito/débito (por ano)', fixedAmount: 200 },
  { verba: '2.4', description: 'Transferências bancárias', taxRate: 0.05 },
  { verba: '2.5', description: 'Empréstimos bancários', taxRate: 0.2 },
  
  // Verba 3 - Seguros
  { verba: '3.1', description: 'Seguros de vida', taxRate: 2 },
  { verba: '3.2', description: 'Seguros de automóvel', taxRate: 3 },
  { verba: '3.3', description: 'Seguros de imóveis', taxRate: 1.5 },
  { verba: '3.4', description: 'Outros seguros', taxRate: 2.5 },
  
  // Verba 4 - Operações Imobiliárias
  { verba: '4.1', description: 'Compra e venda de imóveis', taxRate: 0.5 },
  { verba: '4.2', description: 'Arrendamento de imóveis (por ano)', taxRate: 0.3 },
  { verba: '4.3', description: 'Hipotecas', taxRate: 0.4 },
  
  // Verba 5 - Documentos
  { verba: '5.1', description: 'Emissão de certidões', fixedAmount: 200 },
  { verba: '5.2', description: 'Reconhecimento de assinaturas', fixedAmount: 500 },
  { verba: '5.3', description: 'Autenticação de documentos', fixedAmount: 1000 },
  { verba: '5.4', description: 'Procurações', fixedAmount: 2000 },
  
  // Verba 6 - Veículos
  { verba: '6.1', description: 'Transferência de propriedade de veículos', taxRate: 1 },
  { verba: '6.2', description: 'Emissão de carta de condução', fixedAmount: 3000 },
  { verba: '6.3', description: 'Registo de veículos', fixedAmount: 5000 },
  
  // Verba 7 - Actos Notariais
  { verba: '7.1', description: 'Escrituras públicas', taxRate: 0.3 },
  { verba: '7.2', description: 'Testamentos', fixedAmount: 10000 },
  { verba: '7.3', description: 'Constituição de sociedades', fixedAmount: 15000 },
  
  // Verba 8 - Jogos e Apostas
  { verba: '8.1', description: 'Jogos de fortuna ou azar', taxRate: 10 },
  { verba: '8.2', description: 'Lotarias', taxRate: 5 },
  { verba: '8.3', description: 'Apostas desportivas', taxRate: 8 },
  
  // Verba 9 - Publicidade
  { verba: '9.1', description: 'Publicidade em televisão', taxRate: 3 },
  { verba: '9.2', description: 'Publicidade em rádio', taxRate: 2 },
  { verba: '9.3', description: 'Publicidade em jornais/revistas', taxRate: 1.5 },
  { verba: '9.4', description: 'Publicidade exterior (outdoors)', taxRate: 4 },
  
  // Verba 10 - Serviços Diversos
  { verba: '10.1', description: 'Serviços de consultoria', taxRate: 5 },
  { verba: '10.2', description: 'Serviços jurídicos', taxRate: 5 },
  { verba: '10.3', description: 'Serviços de auditoria', taxRate: 5 },
  { verba: '10.4', description: 'Serviços de contabilidade', taxRate: 5 },
];

// Função para obter IS por verba
export function obterISPorVerba(verba: string): ISTax | undefined {
  return tabelaIS.find((item) => item.verba === verba);
}

// Função para calcular IS
export function calcularIS(verba: string, valorBase: number): number {
  const imposto = obterISPorVerba(verba);
  if (!imposto) return 0;
  
  if (imposto.fixedAmount) {
    return imposto.fixedAmount;
  }
  
  if (imposto.taxRate) {
    return (valorBase * imposto.taxRate) / 100;
  }
  
  return 0;
}

// Função para verificar se operação está sujeita a IS
export function operacaoSujeitaIS(verba: string): boolean {
  return tabelaIS.some((item) => item.verba === verba);
}

// Função para buscar verbas por descrição
export function buscarVerbaIS(termo: string): ISTax[] {
  const termoLower = termo.toLowerCase();
  return tabelaIS.filter(
    (item) =>
      item.verba.includes(termo) ||
      item.description.toLowerCase().includes(termoLower)
  );
}
