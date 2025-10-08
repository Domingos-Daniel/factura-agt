# 🧾 Sistema de Faturação Eletrónica AGT Angola

Protótipo funcional de aplicação web de faturação eletrónica em conformidade com as especificações da **AGT (Administração Geral Tributária de Angola)**, baseado no documento "ESTRUTURA DE DADOS DE SOFTWARE, MODELO DE FACTURAÇÃO ELECTRÓNICA, ESPECIFICAÇÕES TÉCNICAS E PROCEDIMENTAIS" de Agosto de 2025.

## ✨ Características

- ✅ **Next.js 14+** com App Router
- ✅ **TypeScript** para type-safety
- ✅ **Tailwind CSS** para estilização moderna
- ✅ **Shadcn/UI** componentes UI elegantes
- ✅ **Zod** para validação de schemas
- ✅ **Recharts** para gráficos e visualizações
- ✅ **LocalStorage** para persistência de dados (sem backend)
- ✅ **Mock API** com delays realistas
- ✅ **Dark Mode** suportado
- ✅ **Tema AGT** (azul e branco)
- ✅ **Português de Angola** em toda a UI

## 🚀 Começar

### Pré-requisitos

- Node.js 18+ instalado
- npm ou yarn

### Instalação

```bash
# 1. Instalar dependências
npm install

# 2. Executar em modo de desenvolvimento
npm run dev

# 3. Abrir no navegador
# http://localhost:3000
```

### Build para Produção

```bash
npm run build
npm start
```

## 🔐 Credenciais de Teste

Use estas credenciais para fazer login no sistema:

- **NIF**: `123456789`
- **Senha**: `admin123`

**OU**

- **NIF**: `987654321`
- **Senha**: `senha123`

## 📋 Funcionalidades Implementadas

### ✅ Autenticação
- [x] Login simulado com validação
- [x] Armazenamento de token em localStorage
- [x] Proteção de rotas
- [x] Logout

### ✅ Dashboard
- [x] Métricas (total de facturas, séries ativas, facturas do mês, receita total)
- [x] Gráfico de facturas por mês (Recharts)
- [x] Ações rápidas
- [x] Dark mode toggle

### ✅ Séries de Numeração
- [x] Criar nova série (solicitarSerie)
- [x] Listar séries com filtros por status (A/U/F)
- [x] Validações Zod (seriesCode, seriesYear, documentType, firstDocumentNumber)
- [x] Tipos de documento: FT, FR, FA, NC, ND, AR, RC, RG

### 🚧 Facturas (Em Implementação)
- [ ] Formulário completo de criação de factura
- [ ] Campos conformes ao schema AGT (schemaVersion, submissionGUID, etc.)
- [ ] Adição/remoção dinâmica de linhas de produtos
- [ ] Cálculo automático de impostos (IVA 14%, IS, IEC)
- [ ] Dropdown de códigos CAE com 300+ opções
- [ ] Geração de QR Code (Model 2, versão 4, erro M)
- [ ] Botão "Enviar para AGT" (mock)
- [ ] Lista de facturas com filtros
- [ ] Detalhe de factura
- [ ] Validação como adquirente
- [ ] Exportação para PDF
- [ ] Polling de status

### 🤖 Recursos de IA (Planejados)
- [ ] Busca inteligente de produtos (Fuse.js)
- [ ] Sugestões de isenções fiscais
- [ ] Assistente IA para criação de facturas

## 📁 Estrutura do Projeto

```
factura-agt/
├── app/                      # Rotas Next.js (App Router)
│   ├── login/               # Página de login
│   ├── dashboard/           # Dashboard principal
│   ├── series/              # Gestão de séries
│   │   ├── nova/           # Criar série
│   │   └── lista/          # Listar séries
│   ├── facturas/            # Gestão de facturas (em progresso)
│   │   ├── nova/
│   │   ├── lista/
│   │   └── [id]/
│   └── globals.css          # Estilos globais
├── components/              # Componentes React
│   ├── ui/                 # Componentes Shadcn/UI
│   └── layout/             # Layout (Header, Sidebar)
├── lib/                     # Lógica de negócio
│   ├── data/               # Tabelas (CAE, IEC, IS, IVA)
│   ├── schemas/            # Schemas Zod
│   ├── types/              # Tipos TypeScript
│   ├── storage.ts          # Utils localStorage
│   ├── mockAPI.ts          # API mock
│   ├── taxCalculator.ts    # Calculadora de impostos
│   └── utils.ts            # Utilitários gerais
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## 🎨 Tecnologias Utilizadas

| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| Next.js | 14.2+ | Framework React |
| TypeScript | 5.4+ | Linguagem |
| Tailwind CSS | 3.4+ | Estilização |
| Shadcn/UI | Latest | Componentes UI |
| Zod | 3.23+ | Validação |
| React Hook Form | 7.51+ | Gestão de formulários |
| Recharts | 2.12+ | Gráficos |
| UUID | 9.0+ | Geração de GUIDs |
| Lucide React | 0.376+ | Ícones |

## 📊 Tabelas de Dados

O sistema inclui tabelas mock conformes ao documento AGT:

- **Tabela CAE**: 300+ códigos de atividade económica
- **Tabela IEC**: Imposto Especial de Consumo (bebidas, tabaco, combustíveis, etc.)
- **Tabela IS**: Imposto de Selo (verbas 1.1 a 10.4)
- **Tabela IVA**: 16 códigos de isenção (I01 a I16)

## 🔧 Configuração

### Dark Mode

O tema é detectado automaticamente do sistema, mas pode ser alternado manualmente no header (ícone de lua/sol).

### LocalStorage Keys

- `factura-agt-auth`: Token de autenticação
- `factura-agt-facturas`: Facturas registadas
- `factura-agt-series`: Séries de numeração
- `factura-agt-config`: Configurações gerais
- `factura-agt-theme`: Tema (light/dark)

## 📝 TODO List

Consulte o arquivo `TODO.md` para ver o progresso detalhado da implementação.

**Progresso Atual**: ~40% concluído

- ✅ Configuração inicial
- ✅ Schemas e tipos
- ✅ Persistência e API mock
- ✅ Componentes UI básicos
- ✅ Layout e navegação
- ✅ Autenticação
- ✅ Dashboard
- ✅ Séries (criar e listar)
- 🚧 Facturas (em progresso)
- ⏳ Recursos de IA (planejado)
- ⏳ QR Code e PDF (planejado)

## 🐛 Problemas Conhecidos

- [ ] Dependências ainda a instalar (npm install em curso)
- [ ] Páginas de facturas não implementadas
- [ ] Componentes de IA não implementados
- [ ] QR Code generator não implementado
- [ ] PDF export não implementado

## 🤝 Contribuir

Este é um protótipo de demonstração. Para melhorias:

1. Implementar backend real (API REST ou GraphQL)
2. Substituir localStorage por base de dados
3. Integrar assinatura digital real (JWS/JWT)
4. Conectar à API real da AGT
5. Adicionar testes (Jest, Cypress)
6. Implementar recursos de IA com APIs reais

## 📄 Licença

Protótipo para fins educacionais e demonstração.

## 👨‍💻 Autor

Desenvolvido como protótipo funcional conforme especificações AGT Angola.

---

**Nota**: Este é um protótipo que simula o sistema de faturação eletrónica. Para uso em produção, é necessário integração com a API oficial da AGT e cumprimento de todos os requisitos legais e de segurança.
