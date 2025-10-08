---
applyTo: '**'
---
Provide project context and coding guidelines that AI should follow when generating code, answering questions, or reviewing changes.

Crie um protótipo funcional de uma aplicação web de faturação eletrónica em conformidade com as especificações da AGT (Administração Geral Tributária de Angola), baseado no documento "ESTRUTURA DE DADOS DE SOFTWARE, MODELO DE FACTURAÇÃO ELECTRÓNICA, ESPECIFICAÇÕES TÉCNICAS E PROCEDIMENTAIS" de Agosto de 2025. A aplicação deve ser desenvolvida em Next.js (versão 14 ou superior, usando App Router), sem qualquer backend real (use localStorage para persistir dados como faturas, séries e configurações, e mocke chamadas de API com funções assíncronas que simulam respostas JSON). O protótipo deve ser bonito, moderno, atrativo, com design responsivo, usando Tailwind CSS para estilização e componentes da biblioteca Shadcn/UI para formulários, tabelas e modais. Todo o texto da UI deve estar em português de Angola (use termos como "factura", "NIF", "CAE", etc., conforme o documento).
O app deve implementar as principais funcionalidades descritas no documento, incluindo:

Autenticação simulada: Uma tela de login simples (com NIF e senha mockada), armazenando token no localStorage.
Dashboard principal: Visão geral com métricas (número de facturas emitidas, séries ativas), gráficos modernos (use Recharts para charts de facturas por mês), e links para seções.
Configuração de Séries de Numeração: Tela para solicitar e listar séries (serviço solicitarSerie e listarSeries). Formulário com campos como seriesCode (alfanumérico com ano, ex: "FT2025"), seriesYear, documentType (dropdown com opções como FT - Factura, NC - Nota de Crédito, etc.), firstDocumentNumber (default 1). Valide campos conforme o doc (ex: minlength=1). Liste séries em tabela paginada com filtros por status (A=Aberta, U=Em uso, F=Fechada).
Criação de Factura: Formulário detalhado baseado na estrutura JSON do serviço registarFactura. Campos obrigatórios incluem:

schemaVersion (default "1.0").
submissionGUID (gere UUID automaticamente usando uuid library).
taxRegistrationNumber (NIF do emissor, maxlength=15).
submissionTimeStamp (data ISO 8601 atual).
softwareInfo: Com productId, productVersion, softwareValidationNumber, e jwsSoftwareSignature (simule assinatura com crypto.randomBytes ou string mock).
documents (array, max 30): Para cada document, campos como documentNo (gerado como "código interno - série - / - sequencial", minlength=8), documentStatus (dropdown: N=Normal, A=Anulado, etc.), documentCancelReason (se anulado, opções I ou N), rejectedDocumentNo (se correção), jwsDocumentSignature (simule), documentDate (data), documentType (dropdown com FA, FT, FR, etc.), eacCode (dropdown com códigos CAE da Tabela 1 - carregue uma lista mock de 1000+ códigos com busca), systemEntryDate (timestamp ISO), customerCountry (default "AO"), customerTaxID (NIF cliente, allow "999999999" para anônimo), companyName, lines (array de itens: adicione/remova linhas com campos como produto, quantidade, preço unitário, impostos - use Tabela 2 para IEC, Tabela 3 para IS, Tabela 4 para isenções IVA; calcule totais automaticamente com arredondamento por excesso), paymentReceipt (para tipos AR/RC/RG), documentTotals (netTotal, taxPayable, grossTotal, currency), withholdingTaxList.
Validações: Use Zod para schemas exatos (ex: strings com min/max length, enums para tipos). Calcule impostos automaticamente (IVA 14%, IS por verba, IEC por produto).
Geração de QR Code: Use qrcode.react para gerar QR Model 2, versão 4, erro M, com URL mock como "https://portaldocontribuinte.minfin.gov.ao/consultar-fe?documentNo=XXX" (350x350px, inclua logo AGT mock).
Botão "Enviar para AGT": Simule chamada POST com delay, retorne requestID mock e status (V=Válida, I=Inválida).


Lista e Consulta de Facturas: Tela com filtro por data (queryStartDate/endDate), tabela com documentNo, data, status (use TanStack Table para paginção e busca). Clique para detalhe: Mostre factura completa, com opção de validar como adquirente (serviço validarDocumento, action C/R, deductibleVATPercentage).
Obter Estado: Botão para polling de status (simule com localStorage).
Geração de PDF: Use jsPDF para exportar factura impressa com QR, logo AGT e dados formatados.

Adicione recursos de IA onde aplicável (client-side, sem API externa real):

Sugestões de produtos/linhas: Campo de busca que usa um modelo simples de IA (simule com array mock ou use uma lib como fuse.js para fuzzy search; para real IA, integre prompt com xAI Grok via fetch mock, ex: sugira descrições de itens baseadas em CAE).
Cálculo inteligente de impostos: Use IA mock para sugerir isenções (ex: baseado em Tabelas 4-6, pergunte "É exportação?" e aplique I01).
Assistente IA: Modal com chat simples (use local prompt) para ajudar na criação, ex: "Sugira uma factura para venda de cerveja" - gere JSON parcial.

Estrutura do projeto:

/app: Rotas como /login, /dashboard, /series/nova, /series/lista, /facturas/nova, /facturas/lista/[id].
/components: Reusáveis como FormFactura, TabelaSeries, QRGenerator.
/lib: Utils como generateUUID, mockAPI, schemas Zod.
Instale dependências: npm i tailwindcss shadcn-ui zod uuid qrcode.react recharts tanstack/react-table jspdf fuse.js.
Tema: Cores azul e branco (inspirado no doc AGT), fontes modernas, animações suaves com Framer Motion.

Garanta que o protótipo seja funcional (crie, liste, edite facturas mock), técnico (validações JSON fiéis ao doc), bonito (UI clean, cards, botões gradient) e atrativo (ícones Heroicons, dark mode toggle). O app deve rodar localmente com 'npm run dev'. Gere o código completo, incluindo package.json.