# 🎯 ROADMAP DE CONFORMIDADE AGT - Priorizado

## 🔴 FASE 1: BLOQUEADORES CRÍTICOS (Não pode ir para produção sem isto)
**Prazo**: 2-3 semanas  
**Prioridade**: MÁXIMA

### 1.1 Segurança e Assinaturas Digitais
- [ ] **Gestão de Certificados Digitais** (1 semana)
  - Upload de certificado .pfx/.p12
  - Armazenamento seguro de passwords
  - Validação de certificado (validade, emissor, revogação)
  - Interface de gestão de certificados
  
- [ ] **Assinatura JWS Real** (3 dias)
  - Implementar assinatura de documentos com certificado
  - Gerar `jwsDocumentSignature` conforme especificação
  - Gerar `jwsSoftwareSignature`
  - Validar assinatura antes de enviar

### 1.2 Campos Obrigatórios AGT
- [ ] **ATCUD (Código Único do Documento)** (3 dias)
  - Implementar algoritmo de geração: `ATCUD:[Código da validação]-[Número sequencial]`
  - Integrar com formulário de factura
  - Validar formato
  - Exibir no PDF e QR Code

- [ ] **Hash de Encadeamento** (3 dias)
  - Implementar SHA-256 do documento anterior
  - Primeira factura: hash vazio ou "0"
  - Armazenar histórico de hashes
  - Validar integridade da cadeia

- [ ] **Período Contabilístico** (1 dia)
  - Auto-preencher campo `period` (formato: YYYY-MM)
  - Baseado na data do documento
  - Validar período não fechado

### 1.3 Validações de Negócio Críticas
- [ ] **Validação de NIF** (2 dias)
  - Implementar algoritmo de dígito de controlo AGT
  - Validar formato (9 dígitos)
  - Feedback em tempo real no formulário
  - Rejeitar NIF inválido

- [ ] **Validação de Sequência de Documentos** (2 dias)
  - Verificar sequencialidade por série
  - Prevenir saltos de numeração
  - Prevenir duplicados
  - Alertas de inconsistência

- [ ] **Validação de Totais** (2 dias)
  - Verificar: soma de linhas = total documento
  - Verificar: base tributável + IVA = total bruto
  - Tolerância de arredondamento (0.01)
  - Bloquear submissão se divergente

### 1.4 Integração API AGT
- [ ] **Integração com API Sandbox AGT** (1 semana)
  - Configurar endpoints de sandbox
  - Implementar submissão de documentos (POST)
  - Implementar consulta de estado (GET)
  - Tratamento de erros e respostas
  - Logging de tentativas
  - Retry automático em falhas

- [ ] **Validação XML contra XSD** (2 dias)
  - Baixar XSD oficial AGT
  - Validador server-side
  - Mensagens de erro detalhadas
  - Pré-validação antes de enviar

---

## 🟡 FASE 2: FUNCIONALIDADES IMPORTANTES (Para uso completo)
**Prazo**: 3-4 semanas  
**Prioridade**: ALTA

### 2.1 Tipos de Documentos Específicos
- [ ] **Nota de Crédito (NC)** (3 dias)
  - Referência ao documento original
  - Motivo de emissão (campo texto)
  - Validar valores negativos
  - Fluxo de criação a partir de FT

- [ ] **Nota de Débito (ND)** (2 dias)
  - Similar a NC mas para aumentos
  - Validações específicas
  
- [ ] **Factura Recibo (FR)** (3 dias)
  - Combinar factura + recibo
  - Pagamento obrigatório
  - Validações de quitação

- [ ] **Recibo (RC) e Recibo Global (RG)** (3 dias)
  - Documento de quitação
  - Listar facturas em aberto
  - Permitir pagamento parcial

### 2.2 Gestão de Séries
- [ ] **Solicitação Real de Séries à AGT** (3 dias)
  - Integração com portal AGT
  - Acompanhamento de aprovação
  - Notificação de série aprovada

- [ ] **Fechamento de Séries** (2 dias)
  - Declarar último número usado
  - Impedir novos documentos
  - Comunicação com AGT

- [ ] **Controlo Rigoroso de Séries** (2 dias)
  - Prevenir uso de série não aprovada
  - Auto-atualizar status (Aberta → Em Uso → Fechada)
  - Alertas de série próxima do fim

### 2.3 Funcionalidades Adicionais
- [ ] **Retenções na Fonte** (3 dias)
  - Cálculo automático (tabela de retenções)
  - Campo `withholdingTaxList[]`
  - Exibição em PDF
  - Declaração de retenções

- [ ] **Descontos e Liquidações** (2 dias)
  - `settlementAmount` - Desconto de pronto pagamento
  - `changeAmount` - Troco
  - Cálculo automático
  - Validação de limites

- [ ] **Endereços Detalhados** (2 dias)
  - Separar: Rua, Cidade, Código Postal, País
  - Validação de código postal
  - Auto-complete de moradas

---

## 🟢 FASE 3: FUNCIONALIDADES RECOMENDADAS (Para excelência)
**Prazo**: 2-3 semanas  
**Prioridade**: MÉDIA

### 3.1 Relatórios e Compliance
- [ ] **Exportação SAF-T AO** (1 semana)
  - Formato XML conforme XSD SAF-T Angola
  - Período seleccionável (mensal, trimestral, anual)
  - Incluir todas as facturas
  - Validação antes de exportar

- [ ] **Relatórios de Impostos** (3 dias)
  - Agregação de IVA por taxa (14%, 7%, isento)
  - Resumo de IS e IEC
  - Exportação Excel/PDF
  - Gráficos de evolução

- [ ] **Auditoria Completa** (3 dias)
  - Rastreio de quem criou/alterou documentos
  - Timestamp detalhado
  - Log de todas as operações
  - Exportação de audit trail

### 3.2 Multi-Moeda e Conversão
- [ ] **Conversão de Moedas** (2 dias)
  - Integração com API de câmbio (ex: exchangerate-api.com)
  - Taxas de USD, EUR, ZAR
  - Histórico de taxas
  - Exibição em múltiplas moedas

- [ ] **Validação de Moeda** (1 dia)
  - Restringir a: AOA, USD, EUR
  - Moeda por defeito configurável
  - Símbolo correcto por moeda

### 3.3 Backup e Recuperação
- [ ] **Backup Automático Server-Side** (2 dias)
  - Sincronização periódica
  - Armazenamento em cloud (S3, Azure Blob)
  - Versionamento de documentos
  - Recuperação de dados

- [ ] **Exportação de Documentos** (2 dias)
  - Backup manual em ZIP
  - Incluir PDF + XML
  - Restauração de backup

### 3.4 QR Code e Validação
- [ ] **Validação de Formato QR Code** (1 dia)
  - Verificar conformidade com spec AGT
  - Testar com app oficial AGT
  - Ajustar se necessário

- [ ] **QR Code Dinâmico** (1 dia)
  - Incluir URL para validação online
  - Link para portal AGT

---

## 🔒 FASE 4: SEGURANÇA E PRODUÇÃO
**Prazo**: 1-2 semanas  
**Prioridade**: ALTA (antes de produção)

### 4.1 Segurança
- [ ] **Encriptação de Dados Sensíveis** (3 dias)
  - Encriptar senhas no localStorage
  - Encriptar certificados
  - Usar Web Crypto API

- [ ] **HTTPS Obrigatório** (1 dia)
  - Configurar SSL/TLS
  - Redirect HTTP → HTTPS
  - HSTS headers

- [ ] **Validação de Certificado Digital** (2 dias)
  - Verificar validade (datas)
  - Verificar emissor (CA reconhecida)
  - Verificar revogação (CRL/OCSP)

### 4.2 Performance e Escalabilidade
- [ ] **Optimização de Queries** (2 dias)
  - Indexação de localStorage
  - Paginação eficiente
  - Cache de tabelas de referência

- [ ] **Lazy Loading** (1 dia)
  - Carregar componentes sob demanda
  - Code splitting
  - Reduzir bundle size

### 4.3 Testes
- [ ] **Testes End-to-End** (1 semana)
  - Fluxo completo: Login → Série → Factura → PDF → Envio AGT
  - Testes de validação
  - Testes de erros

- [ ] **Testes de Integração API AGT** (3 dias)
  - Mock de respostas
  - Testes de timeout
  - Testes de retry

---

## 📊 RESUMO DE PRIORIDADES

### Para Homologação (Mínimo Viável):
1. ✅ ATCUD
2. ✅ Hash de Encadeamento
3. ✅ Assinatura Digital
4. ✅ Validação de NIF
5. ✅ Integração API Sandbox AGT
6. ✅ Validação de Totais

### Para Produção (Compliance Total):
7. ✅ Gestão de Certificados
8. ✅ NC/ND/FR/RC
9. ✅ Fechamento de Séries
10. ✅ Validação XML (XSD)
11. ✅ HTTPS
12. ✅ Testes E2E

### Para Excelência (Diferencial):
13. ✅ SAF-T AO
14. ✅ Relatórios de Impostos
15. ✅ Auditoria Completa
16. ✅ Multi-Moeda
17. ✅ Backup Automático

---

## 🎯 MÉTRICAS DE SUCESSO

- **Conformidade AGT**: 100%
- **Testes Aprovados**: 95%+
- **Tempo de Resposta API**: < 2s
- **Uptime**: 99.9%
- **Documentos Rejeitados**: < 1%

---

**Status Actual**: 65% conformidade  
**Objetivo**: 100% conformidade em 8 semanas  
**Próximo Milestone**: ATCUD + Hash + Assinatura (3 semanas)
