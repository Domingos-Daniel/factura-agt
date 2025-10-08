import { IECTax } from '../types';

// Tabela 2 - Imposto Especial de Consumo (IEC)
// Baseado nas taxas aplicáveis em Angola

export const tabelaIEC: IECTax[] = [
  // Bebidas Alcoólicas
  { productCode: 'BEB001', productDescription: 'Cerveja (por litro)', taxRate: 0.30 },
  { productCode: 'BEB002', productDescription: 'Vinho (por litro)', taxRate: 0.50 },
  { productCode: 'BEB003', productDescription: 'Aguardente e licores (por litro)', taxRate: 1.50 },
  { productCode: 'BEB004', productDescription: 'Whisky (por litro)', taxRate: 2.00 },
  { productCode: 'BEB005', productDescription: 'Vodka (por litro)', taxRate: 1.80 },
  { productCode: 'BEB006', productDescription: 'Rum (por litro)', taxRate: 1.50 },
  { productCode: 'BEB007', productDescription: 'Gin (por litro)', taxRate: 1.80 },
  { productCode: 'BEB008', productDescription: 'Champanhe (por litro)', taxRate: 3.00 },
  
  // Bebidas Não Alcoólicas
  { productCode: 'BEB101', productDescription: 'Refrigerantes (por litro)', taxRate: 0.05 },
  { productCode: 'BEB102', productDescription: 'Sumos concentrados (por litro)', taxRate: 0.08 },
  { productCode: 'BEB103', productDescription: 'Bebidas energéticas (por litro)', taxRate: 0.15 },
  
  // Tabaco
  { productCode: 'TAB001', productDescription: 'Cigarros (por maço de 20)', taxRate: 50 },
  { productCode: 'TAB002', productDescription: 'Charutos (por unidade)', taxRate: 100 },
  { productCode: 'TAB003', productDescription: 'Tabaco de cachimbo (por 50g)', taxRate: 25 },
  { productCode: 'TAB004', productDescription: 'Tabaco de enrolar (por 50g)', taxRate: 30 },
  
  // Combustíveis
  { productCode: 'COMB01', productDescription: 'Gasolina (por litro)', taxRate: 0.20 },
  { productCode: 'COMB02', productDescription: 'Gasóleo (por litro)', taxRate: 0.15 },
  { productCode: 'COMB03', productDescription: 'GPL (por litro)', taxRate: 0.10 },
  { productCode: 'COMB04', productDescription: 'Querosene (por litro)', taxRate: 0.12 },
  
  // Veículos Automóveis
  { productCode: 'VEI001', productDescription: 'Automóvel ligeiro (cilindrada < 1500cc)', taxRate: 5 },
  { productCode: 'VEI002', productDescription: 'Automóvel ligeiro (cilindrada 1500-2000cc)', taxRate: 10 },
  { productCode: 'VEI003', productDescription: 'Automóvel ligeiro (cilindrada > 2000cc)', taxRate: 20 },
  { productCode: 'VEI004', productDescription: 'Motociclo (cilindrada < 250cc)', taxRate: 2 },
  { productCode: 'VEI005', productDescription: 'Motociclo (cilindrada > 250cc)', taxRate: 5 },
  
  // Produtos de Luxo
  { productCode: 'LUX001', productDescription: 'Jóias e pedras preciosas', taxRate: 15 },
  { productCode: 'LUX002', productDescription: 'Perfumes importados', taxRate: 10 },
  { productCode: 'LUX003', productDescription: 'Relógios de luxo', taxRate: 20 },
  { productCode: 'LUX004', productDescription: 'Artigos de couro de luxo', taxRate: 12 },
  
  // Telecomunicações
  { productCode: 'TEL001', productDescription: 'Serviços de telefonia móvel', taxRate: 5 },
  { productCode: 'TEL002', productDescription: 'Serviços de internet móvel', taxRate: 5 },
  
  // Produtos Eletrónicos
  { productCode: 'ELE001', productDescription: 'Televisores (> 42 polegadas)', taxRate: 8 },
  { productCode: 'ELE002', productDescription: 'Smartphones de gama alta', taxRate: 10 },
  { productCode: 'ELE003', productDescription: 'Consolas de jogos', taxRate: 12 },
];

// Função para obter taxa IEC por código de produto
export function obterTaxaIEC(productCode: string): number {
  const produto = tabelaIEC.find((item) => item.productCode === productCode);
  return produto?.taxRate || 0;
}

// Função para calcular IEC
export function calcularIEC(productCode: string, quantidade: number, precoUnitario: number): number {
  const taxa = obterTaxaIEC(productCode);
  if (taxa === 0) return 0;
  
  // IEC é calculado sobre o valor ou quantidade dependendo do produto
  if (productCode.startsWith('BEB') || productCode.startsWith('COMB')) {
    // Para bebidas e combustíveis: taxa por litro/unidade
    return quantidade * taxa;
  } else {
    // Para outros produtos: percentagem sobre o valor
    return (quantidade * precoUnitario * taxa) / 100;
  }
}

// Função para verificar se produto está sujeito a IEC
export function produtoSujeitoIEC(productCode: string): boolean {
  return tabelaIEC.some((item) => item.productCode === productCode);
}
