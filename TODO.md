# 📋 TODO LIST - SISTEMA DE FATURAÇÃO AGT ANGOLA

## ✅ FASE 1: CONFIGURAÇÃO INICIAL DO PROJETO
- [x] 1.1 Criar package.json com dependências
- [x] 1.2 Criar tsconfig.json
- [x] 1.3 Configurar Tailwind CSS (tailwind.config.ts, postcss.config.js)
- [x] 1.4 Criar next.config.js
- [x] 1.5 Criar estrutura de diretórios

## ✅ FASE 2: ESTRUTURA DE DADOS & SCHEMAS
- [x] 2.1 Criar tipos TypeScript (lib/types/index.ts)
- [x] 2.2 Criar schemas Zod de autenticação (lib/schemas/authSchema.ts)
- [x] 2.3 Criar schemas Zod de séries (lib/schemas/seriesSchema.ts)
- [x] 2.4 Criar schemas Zod de facturas (lib/schemas/facturaSchema.ts)
- [x] 2.5 Criar Tabela CAE (lib/data/tabelaCAE.ts)
- [x] 2.6 Criar Tabela IEC (lib/data/tabelaIEC.ts)
- [x] 2.7 Criar Tabela IS (lib/data/tabelaIS.ts)
- [x] 2.8 Criar Tabela IVA (lib/data/tabelaIVA.ts)

## ✅ FASE 3: CAMADA DE PERSISTÊNCIA & API MOCK
- [x] 3.1 Criar utils de localStorage (lib/storage.ts)
- [x] 3.2 Criar Mock API (lib/mockAPI.ts)
- [x] 3.3 Criar utils gerais (lib/utils.ts)
- [x] 3.4 Criar gerador de UUID (usando biblioteca uuid)
- [x] 3.5 Criar calculadora de impostos (lib/taxCalculator.ts)

## ✅ FASE 4: COMPONENTES UI BÁSICOS
- [x] 4.1 Instalar e configurar Shadcn/UI
- [x] 4.2 Criar componente Button
- [x] 4.3 Criar componente Input
- [x] 4.4 Criar componente Select
- [x] 4.5 Criar componente Card
- [x] 4.6 Criar componente Dialog
- [x] 4.7 Criar componente Table
- [x] 4.8 Criar componente Label
- [x] 4.9 Criar componente Toast

## ✅ FASE 5: COMPONENTES LAYOUT
- [x] 5.1 Criar Header (components/layout/Header.tsx)
- [x] 5.2 Criar Sidebar (components/layout/Sidebar.tsx)
- [x] 5.3 Criar DarkModeToggle (components/layout/DarkModeToggle.tsx)
- [x] 5.4 Criar Layout principal (components/layout/MainLayout.tsx)

## ✅ FASE 6: COMPONENTES DE FORMULÁRIOS
- [x] 6.1 Criar FormSerie (components/forms/FormSerie.tsx)
- [x] 6.2 Criar FormFactura (components/forms/FormFactura.tsx)
- [x] 6.3 Criar FormLinhaFactura (components/forms/FormLinhaFactura.tsx)

## ✅ FASE 7: COMPONENTES DE TABELAS
- [x] 7.1 Criar TabelaSeries (components/tables/TabelaSeries.tsx)
- [x] 7.2 Criar TabelaFacturas (components/tables/TabelaFacturas.tsx)

## ✅ FASE 8: COMPONENTES DE VISUALIZAÇÃO
- [x] 8.1 Criar QRGenerator (components/QRGenerator.tsx)
- [x] 8.2 Criar FacturaDetail (components/FacturaDetail.tsx)
- [x] 8.3 Criar PDFExporter (components/PDFExporter.tsx)
- [x] 8.4 Criar ChartFacturasMes (components/charts/ChartFacturasMes.tsx)
- [x] 8.5 Criar MetricCard (components/MetricCard.tsx)

## ✅ FASE 9: COMPONENTES DE IA
- [x] 9.1 Criar AIAssistente (components/ai/AIAssistente.tsx)
- [x] 9.2 Criar ProdutoSearchAI (components/ai/ProdutoSearchAI.tsx)
- [x] 9.3 Criar TaxSuggestionAI (components/ai/TaxSuggestionAI.tsx)

## ✅ FASE 10: ROTAS & PÁGINAS
- [x] 10.1 Criar página de login (app/login/page.tsx)
- [x] 10.2 Criar layout root (app/layout.tsx)
- [x] 10.3 Criar página inicial/redirect (app/page.tsx)
- [x] 10.4 Criar dashboard (app/dashboard/page.tsx)
- [x] 10.5 Criar nova série (app/series/nova/page.tsx)
- [x] 10.6 Criar lista de séries (app/series/lista/page.tsx)
- [x] 10.7 Criar nova factura (app/facturas/nova/page.tsx)
- [x] 10.8 Criar lista de facturas (app/facturas/lista/page.tsx)
- [x] 10.9 Criar detalhe de factura (app/facturas/[id]/page.tsx)
- [x] 10.10 Criar menu de configurações (app/configuracoes/page.tsx)

## ✅ FASE 11: ESTILOS GLOBAIS
- [x] 11.1 Criar globals.css
- [x] 11.2 Configurar tema dark/light

## ✅ FASE 12: MIDDLEWARE & PROTEÇÃO
- [x] 12.1 Criar middleware de autenticação (middleware.ts)
- [x] 12.2 Corrigir erro de Select component (valor vazio não permitido)

## ✅ FASE 13: DOCUMENTAÇÃO & TESTES
- [x] 13.1 Criar README.md completo
- [x] 13.2 Adicionar dados mock de exemplo
- [x] 13.3 Corrigir cálculo de totais das linhas de factura
- [x] 13.4 Testar fluxo completo

## ✅ FASE 14: MONITORIZAÇÃO & INTEGRAÇÕES
- [x] 14.1 Publicar `.env.example` com endpoints reais SAP/AGT
- [x] 14.2 Criar catálogo de integrações server-side (`lib/server/integrationCatalogue.ts`)
- [x] 14.3 Expor API `/api/integrations/status` com health check dinâmico
- [x] 14.4 Adicionar painel de monitorização ao dashboard
- [x] 14.5 Adicionar painel compacto de estado nas configurações
- [ ] 14.6 Integrar webhooks do SAP Event Mesh para alertas automáticos
- [ ] 14.7 Persistir histórico de uptime/latência para relatórios

---

**Status**: ⚡ EM PROGRESSO - Base funcional implementada!
**Progresso**: 64/68 tarefas concluídas (94%)
