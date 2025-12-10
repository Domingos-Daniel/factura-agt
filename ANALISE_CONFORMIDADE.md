# 📋 ANÁLISE DE CONFORMIDADE - PROTÓTIPO vs ESPECIFICAÇÕES AGT

**Data da Análise**: 08 de Outubro de 2025  
**Documento de Referência**: ESTRUTURA DE DADOS DE SOFTWARE MODELO DE FACTURAÇÃO ELECTRÓNICA - ESPECIFICAÇÕES TÉCNICAS E PROCEDIMENTAIS (003)

---

## ✅ IMPLEMENTADO CONFORME ESPECIFICAÇÕES

### 1. Estrutura de Dados XML (Parcial)

#### ✅ Campos Implementados:
- `schemaVersion` - Versão do esquema
- `submissionGUID` - GUID único da submissão
- `taxRegistrationNumber` - NIF do emitente
- `submissionTimeStamp` - Data/hora de submissão
- `softwareInfo` - Informações do software:
  - `productId`
  - `productVersion`
  - `softwareValidationNumber`
  - `jwsSoftwareSignature`

#### ✅ Documentos (Document):
- `documentNo` - Número do documento
- `atcud` - Código Único do Documento
- `documentStatus` - Estado (N, A, F, S)
- `documentType` - Tipo (FT, FR, FA, NC, ND, AR, RC, RG)
- `eacCode` - Código de Actividade Económica
- `documentDate` - Data do documento
- `systemEntryDate` - Data de registo no sistema
- `customerTaxID` - NIF do cliente
- `customerCountry` - País do cliente
- `companyName` - Nome da empresa cliente
- `jwsDocumentSignature` - Assinatura digital

#### ✅ Linhas de Produto (ProductLine):
- `lineNo` - Número da linha
- `productCode` - Código do produto (opcional)
- `productDescription` - Descrição
- `quantity` - Quantidade
- `unitOfMeasure` - Unidade de medida
- `unitPrice` - Preço unitário
- `tax[]` - Array de impostos

#### ✅ Impostos (TaxLine):
- `taxType` - Tipo (IVA, IS, IEC)
- `taxCountry` - País (AO)
- `taxCode` - Código do imposto
- `taxPercentage` - Percentagem
- `taxBase` - Base tributável
- `taxAmount` - Montante do imposto
- `taxExemptionCode` - Código de isenção (I01-I16)
- `taxExemptionReason` - Razão da isenção

#### ✅ Totais do Documento (DocumentTotals):
- `netTotal` - Total líquido
- `taxPayable` - Imposto a pagar
- `grossTotal` - Total bruto
- `currency` - Moeda

#### ✅ Pagamentos (PaymentReceipt):
- `paymentMethod[]` - Métodos de pagamento
  - `paymentMechanism` - Mecanismo (NU, TB, CD, CC)
  - `paymentAmount` - Montante
  - `paymentDate` - Data

#### ✅ Tabelas de Referência:
- **300+ códigos CAE** (Classificação de Atividades Económicas)
- **40+ produtos IEC** (Imposto Especial de Consumo)
- **40+ verbas IS** (Imposto de Selo)
- **16 códigos de isenção IVA** (I01-I16)

---

## ⚠️ FALTANDO OU INCOMPLETO

### 1. Campos Obrigatórios Faltando

#### 🔴 CRÍTICO - Campos Essenciais:

1. **HASH do Documento Anterior** ⚠️
   - Campo: `hash` e `hashControl`
   - Função: Garantir encadeamento de documentos
   - **Status**: Campo existe mas não está sendo calculado
   - **Ação**: Implementar algoritmo de hash SHA-256 ou SHA-1

2. **ATCUD (Código Único do Documento)** ⚠️
   - Campo: `atcud`
   - Formato: `ATCUD:[Código da validação]-[Número sequencial]`
   - **Status**: Campo existe mas não está sendo gerado
   - **Ação**: Implementar geração conforme algoritmo AGT

3. **Assinatura Digital JWS** ⚠️
   - Campos: `jwsDocumentSignature`, `jwsSoftwareSignature`
   - **Status**: Campos existem com valores mock
   - **Ação**: Implementar assinatura real com certificado digital

4. **Período Contabilístico** ⚠️
   - Campo: `period`
   - Formato: `YYYY-MM`
   - **Status**: Campo existe mas não está sendo preenchido
   - **Ação**: Auto-preencher com base na data do documento

### 2. Validações de Negócio Faltando

#### 🟡 IMPORTANTE:

1. **Validação de NIF** ❌
   - Algoritmo de verificação de dígito de controlo
   - Validação de formato (9 dígitos)
   - **Status**: Aceita qualquer string
   - **Ação**: Implementar algoritmo de validação AGT

2. **Validação de Sequência de Documentos** ❌
   - Verificar sequencialidade por série
   - Prevenir saltos ou duplicados
   - **Status**: Não implementado
   - **Ação**: Validar no frontend e backend

3. **Validação de Totais** ⚠️
   - Verificar soma de linhas = total documento
   - Verificar base tributável + IVA = total
   - **Status**: Cálculo implementado mas sem validação rigorosa
   - **Ação**: Adicionar validações de coerência

4. **Validação de Datas** ⚠️
   - Data do documento não pode ser futura
   - Data de sistema >= data do documento
   - **Status**: Parcial
   - **Ação**: Adicionar validações temporais

### 3. Campos Opcionais Importantes

#### 🟢 RECOMENDADO:

1. **Endereços Detalhados** ⚠️
   - `companyAddress`, `companyCity`, `companyPostalCode`, `companyCountry`
   - `billingAddress`, `shipToAddress`
   - **Status**: Campos existem mas input simplificado
   - **Ação**: Separar campos de endereço completo

2. **Retenções na Fonte** ❌
   - `withholdingTaxList[]`
   - **Status**: Tipo existe mas não há UI/lógica
   - **Ação**: Implementar cálculo e exibição de retenções

3. **Descontos e Liquidações** ⚠️
   - `settlementAmount` - Desconto de pronto pagamento
   - `changeAmount` - Troco
   - **Status**: Campos existem mas não há cálculo
   - **Ação**: Adicionar lógica de descontos

4. **Documentos Relacionados** ❌
   - `rejectedDocumentNo` - Documento anulado
   - Referências a documentos anteriores (NC/ND)
   - **Status**: Campo existe mas sem lógica
   - **Ação**: Implementar fluxo de anulação/retificação

### 4. Funcionalidades de Comunicação AGT

#### 🔴 CRÍTICO:

1. **Submissão Real de Documentos** ❌
   - Endpoint: POST para servidor AGT
   - Formato: XML assinado digitalmente
   - **Status**: Mock API apenas
   - **Ação**: Integrar com API real AGT (sandbox primeiro)

2. **Consulta de Estado de Documentos** ❌
   - Verificar se documento foi aceite/rejeitado
   - Obter mensagens de erro
   - **Status**: Mock apenas
   - **Ação**: Implementar polling/webhook real

3. **Validação de Estrutura XML** ❌
   - Validar contra XSD oficial AGT
   - **Status**: Não implementado
   - **Ação**: Adicionar validador XSD server-side

4. **Gestão de Certificados Digitais** ❌
   - Upload de certificado .pfx/.p12
   - Gestão de passwords
   - Renovação de certificados
   - **Status**: Não implementado
   - **Ação**: Criar módulo de gestão de certificados

### 5. Séries de Numeração

#### 🟡 IMPORTANTE:

1. **Solicitação Real de Séries à AGT** ❌
   - Comunicação com portal AGT
   - Aprovação de séries
   - **Status**: Mock apenas
   - **Ação**: Integrar com API/Portal AGT

2. **Controlo de Séries em Uso** ⚠️
   - Prevenir uso de série não aprovada
   - Atualizar status (Aberta → Em Uso → Fechada)
   - **Status**: Parcial
   - **Ação**: Adicionar validações rigorosas

3. **Fechamento de Séries** ❌
   - Declarar último número usado
   - Impedir novos documentos na série
   - **Status**: Status existe mas sem fluxo
   - **Ação**: Implementar processo de encerramento

### 6. Relatórios e Auditorias

#### 🟢 RECOMENDADO:

1. **Livro de Registos (SAF-T AO)** ❌
   - Exportação em formato SAF-T Angola
   - **Status**: Não implementado
   - **Ação**: Criar exportador SAF-T

2. **Relatório de Impostos** ❌
   - Agregação de IVA por taxa
   - Resumo de IS e IEC
   - **Status**: Não implementado
   - **Ação**: Criar dashboards de impostos

3. **Histórico de Submissões** ⚠️
   - Log de tentativas de envio
   - Mensagens de erro/sucesso
   - **Status**: Parcial (validationMessages)
   - **Ação**: Expandir logging e histórico

4. **Auditoria de Alterações** ❌
   - Rastreio de quem criou/alterou documentos
   - Timestamp de operações
   - **Status**: createdAt/updatedAt existem mas não rastreiam usuário
   - **Ação**: Adicionar audit trail completo

### 7. Tipos de Documentos Específicos

#### 🟡 IMPORTANTE:

1. **Nota de Crédito (NC)** ⚠️
   - Referência ao documento original
   - Motivo de emissão
   - **Status**: Tipo existe mas sem lógica específica
   - **Ação**: Implementar fluxo de NC

2. **Nota de Débito (ND)** ⚠️
   - Similar a NC mas para aumentos
   - **Status**: Tipo existe mas sem lógica específica
   - **Ação**: Implementar fluxo de ND

3. **Factura Recibo (FR)** ⚠️
   - Combina factura + recibo
   - Informações de pagamento obrigatórias
   - **Status**: Tipo existe mas sem validações específicas
   - **Ação**: Validar pagamento em FR

4. **Recibo (RC) e Recibo Global (RG)** ⚠️
   - Documento de quitação
   - **Status**: Tipos existem mas sem lógica
   - **Ação**: Implementar fluxos de recibo

### 8. QR Code

#### ✅ PARCIALMENTE IMPLEMENTADO:

1. **Geração de QR Code** ✅
   - **Status**: Implementado com qrcode.react
   - Versão: 4, Nível: M
   - Logo AGT no centro

2. **Conteúdo do QR Code** ⚠️
   - Deve conter dados conforme especificação AGT
   - **Status**: Implementado mas precisa validar formato exato
   - **Ação**: Verificar se formato está 100% conforme spec

3. **Validação de Leitura** ❌
   - Testar escaneamento com app oficial AGT
   - **Status**: Não testado
   - **Ação**: Testar com leitores QR AGT

### 9. Segurança e Compliance

#### 🔴 CRÍTICO:

1. **Encriptação de Dados Sensíveis** ❌
   - Senhas, certificados, tokens
   - **Status**: localStorage sem encriptação
   - **Ação**: Implementar encriptação client-side

2. **HTTPS Obrigatório** ⚠️
   - Comunicação segura com AGT
   - **Status**: Dev em HTTP
   - **Ação**: Configurar HTTPS em produção

3. **Validação de Certificado Digital** ❌
   - Verificar validade, emissor, revogação
   - **Status**: Não implementado
   - **Ação**: Validar certificados X.509

4. **Backup de Documentos** ❌
   - Cópia de segurança de facturas enviadas
   - **Status**: Apenas localStorage
   - **Ação**: Implementar backup server-side

### 10. Multi-Moeda e Internacionalização

#### 🟢 RECOMENDADO:

1. **Conversão de Moedas** ⚠️
   - Taxas de câmbio para USD, EUR
   - **Status**: Campo currency existe mas sem conversão
   - **Ação**: Adicionar API de câmbio

2. **Formatação de Números** ✅
   - Vírgula vs ponto decimal
   - **Status**: Implementado (pt-AO)

3. **Validação de Moeda** ⚠️
   - Moedas permitidas: AOA, USD, EUR
   - **Status**: Select com opções mas sem validação rigorosa
   - **Ação**: Restringir a moedas válidas

---

## 📊 RESUMO EXECUTIVO

### Conformidade Global: **65%**

| Área | Conformidade | Prioridade | Status |
|------|--------------|-----------|---------|
| **Estrutura de Dados** | 85% | 🔴 Alta | ✅ Maioria implementada |
| **Campos Obrigatórios** | 70% | 🔴 Alta | ⚠️ Hash, ATCUD, Assinaturas |
| **Validações de Negócio** | 50% | 🔴 Alta | ❌ NIF, Sequências, Totais |
| **Comunicação AGT** | 10% | 🔴 Alta | ❌ Apenas mock |
| **Certificados Digitais** | 0% | 🔴 Alta | ❌ Não implementado |
| **Tipos de Documentos** | 40% | 🟡 Média | ⚠️ FT ok, NC/ND/FR/RC faltam |
| **QR Code** | 75% | 🟡 Média | ✅ Gerado, ⚠️ validar formato |
| **Relatórios** | 20% | 🟢 Baixa | ❌ SAF-T, auditorias |
| **Segurança** | 30% | 🔴 Alta | ❌ Encriptação, HTTPS |
| **Séries** | 60% | 🟡 Média | ⚠️ UI ok, integração falta |

---

## 🎯 ROADMAP DE CONFORMIDADE

### FASE 1: CRÍTICO (2-3 semanas)
**Objetivo**: Tornar o sistema utilizável em ambiente de homologação AGT

1. ✅ **Implementar ATCUD** (3 dias)
   - Algoritmo de geração conforme AGT
   - Formato: `ATCUD:[Código]-[Sequencial]`

2. ✅ **Implementar Hash de Encadeamento** (3 dias)
   - SHA-256 do documento anterior
   - Inicializar primeira factura com hash vazio

3. ✅ **Validação de NIF** (2 dias)
   - Algoritmo de dígito de controlo
   - Validação de formato

4. ✅ **Validação de Totais** (2 dias)
   - Verificar coerência de cálculos
   - Prevenir divergências

5. ✅ **Integração API AGT Sandbox** (1 semana)
   - Submissão de documentos
   - Consulta de estado
   - Tratamento de erros

### FASE 2: IMPORTANTE (3-4 semanas)
**Objetivo**: Compliance completa para produção

1. ✅ **Gestão de Certificados Digitais** (1 semana)
   - Upload de .pfx/.p12
   - Assinatura JWS real
   - Gestão de senhas segura

2. ✅ **Fluxos de NC/ND** (3 dias)
   - Referência a documentos originais
   - Validações específicas

3. ✅ **Fluxos de Recibos (RC/RG)** (3 dias)
   - Quitação de facturas
   - Controlo de pagamentos

4. ✅ **Fechamento de Séries** (2 dias)
   - Declaração de último número
   - Bloqueio de série fechada

5. ✅ **Retenções na Fonte** (3 dias)
   - Cálculo automático
   - Exibição em PDF

### FASE 3: RECOMENDADO (2-3 semanas)
**Objetivo**: Funcionalidades avançadas

1. ✅ **Exportação SAF-T AO** (1 semana)
   - Formato XML conforme XSD
   - Período seleccionável

2. ✅ **Relatórios de Impostos** (3 dias)
   - Agregação por taxa
   - Exportação em Excel/PDF

3. ✅ **Auditoria Completa** (3 dias)
   - Rastreio de alterações
   - Logs de operações

4. ✅ **Backup Automático** (2 dias)
   - Sincronização server-side
   - Recuperação de dados

---

## 🚨 BLOQUEADORES PARA PRODUÇÃO

### Não pode ir para produção SEM:

1. ❌ **Assinatura Digital Real** - Documentos sem assinatura são rejeitados pela AGT
2. ❌ **Hash de Encadeamento** - Obrigatório por lei para auditoria fiscal
3. ❌ **ATCUD** - Código único obrigatório desde 2023
4. ❌ **Integração API AGT Real** - Mock não serve para submissão oficial
5. ❌ **Validação de NIF** - Documentos com NIF inválido são rejeitados
6. ❌ **HTTPS** - Comunicação não segura é bloqueada pela AGT
7. ❌ **Certificado Digital Válido** - Emitido por entidade certificadora reconhecida

---

## ✅ PRÓXIMOS PASSOS RECOMENDADOS

### Imediato (Esta Semana):
1. Implementar geração de ATCUD
2. Implementar hash de encadeamento SHA-256
3. Adicionar validação rigorosa de NIF
4. Testar QR Code com leitor AGT oficial

### Curto Prazo (2 Semanas):
1. Integrar com API Sandbox AGT
2. Implementar módulo de certificados digitais
3. Adicionar validação de sequência de documentos
4. Implementar fluxos de NC/ND

### Médio Prazo (1 Mês):
1. Certificação do software pela AGT
2. Testes em ambiente de homologação
3. Exportação SAF-T
4. Auditoria e compliance final

---

**Conclusão**: O protótipo está **bem estruturado** e cobre ~65% das especificações. Para uso em produção, são necessárias implementações críticas de segurança (assinaturas, hash, ATCUD) e integração real com AGT. O sistema tem uma base sólida e pode alcançar 100% de conformidade em 6-8 semanas de desenvolvimento focado.
