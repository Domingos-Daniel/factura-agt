# 📦 Pacote de Integração SAP → AGT

Este diretório contém todos os recursos necessários para a equipa SAP iniciar a integração.

## 📁 Conteúdo do Pacote

### 1. **INTEGRACAO_SAP_AGT.md** ⭐ Principal
Guia técnico completo (15.000+ palavras) contendo:
- ✅ Arquitetura de integração
- ✅ WSDL e endpoints REST
- ✅ Mapeamento detalhado SAP → AGT (tabelas VBRK, VBRP, KNA1, KONV)
- ✅ Exemplos de payload com dados reais
- ✅ Código ABAP de conversão
- ✅ Configuração SAP PI/PO e CPI
- ✅ Estratégia de retry e error handling
- ✅ Checklist completo de testes

### 2. **QUICKSTART_SAP.md** ⚡ Início Rápido
Guia de 5 minutos para testar rapidamente:
- ✅ Comandos cURL prontos
- ✅ Exemplo de função ABAP
- ✅ Configuração básica PI/PO
- ✅ Tabela de mapeamento rápida

### 3. **public/wsdl/AGT_FacturaService.wsdl** 📜 WSDL
Definição SOAP completa para SAP PI/PO:
- ✅ 3 operações principais (RegistarFactura, ConsultarEstado, SolicitarSerie)
- ✅ Tipos complexos definidos (Cliente, Linhas, Impostos, Totais)
- ✅ Documentação inline
- ✅ Pronto para import no SAP NetWeaver

### 4. **public/postman/AGT_API_Collection.json** 🧪 Testes
Collection Postman com 15+ requests:
- ✅ Autenticação e gestão de token
- ✅ CRUD completo de facturas
- ✅ Gestão de séries
- ✅ Validações
- ✅ Variáveis de ambiente pré-configuradas

## 🚀 Como Usar Este Pacote

### Para o Programador SAP:

1. **Leia primeiro**: `QUICKSTART_SAP.md` (5 min)
2. **Teste a API**: Importe `postman/AGT_API_Collection.json` no Postman
3. **Estude o mapeamento**: Consulte seção "Mapeamento SAP → AGT" em `INTEGRACAO_SAP_AGT.md`
4. **Configure PI/PO**: Importe o WSDL em `wsdl/AGT_FacturaService.wsdl`
5. **Implemente**: Use exemplos ABAP e Groovy fornecidos
6. **Valide**: Siga checklist de testes no guia completo

### Para o Arquiteto SAP:

1. **Leia**: Seção "Arquitetura de Integração" em `INTEGRACAO_SAP_AGT.md`
2. **Revise**: Diagrama de sequência e componentes
3. **Defina**: Estratégia de middleware (PI/PO vs CPI)
4. **Planeje**: Volume de transações e SLAs

### Para o Analista Funcional:

1. **Entenda**: Seção "Tipos de Documento" e "Mapeamento"
2. **Valide**: Tabelas de conversão (FKART → documentType)
3. **Confirme**: Regras de negócio e validações fiscais

## 📊 Resumo Técnico

| Aspecto | Detalhe |
|---------|---------|
| **Protocolos** | REST (recomendado), SOAP/WSDL |
| **Autenticação** | JWT Bearer Token (RS256) |
| **Formato** | JSON (REST), XML (SOAP) |
| **Endpoints** | 7 operações principais |
| **Tabelas SAP** | VBRK, VBRP, KNA1, KNB1, KONV |
| **Middleware** | SAP PI/PO, CPI, ou direto via RFC |
| **Timeout** | 30 segundos |
| **Rate Limit** | 100 req/min |

## 🔗 Links Rápidos

- **Sistema Web**: https://seu-sistema.ao
- **Configurações**: https://seu-sistema.ao/configuracoes (ver seção "Integração SAP")
- **API Status**: https://seu-sistema.ao/api/integrations/status
- **Swagger/OpenAPI**: (em desenvolvimento)

## 📞 Contactos

**Equipa Técnica**
- Email: dev@seu-sistema.ao
- Slack: #integracao-sap-agt
- Jira: PROJECT-INT

**Horário de Suporte**
- Segunda a Sexta: 08:00 - 18:00 (WAT)
- Sábado: 09:00 - 13:00 (WAT)
- Emergências: +244 9XX XXX XXX

## ✅ Checklist para Início

- [ ] Download de todos os arquivos deste pacote
- [ ] Leitura do QUICKSTART_SAP.md
- [ ] Teste básico com Postman Collection
- [ ] Import do WSDL no PI/PO
- [ ] Criação de função Z customizada no SAP
- [ ] Mapeamento de campos (VBRK/VBRP → JSON)
- [ ] Configuração de autenticação JWT
- [ ] Testes em ambiente DEV
- [ ] Testes em ambiente QAS
- [ ] Validação com equipa AGT
- [ ] Go-live em PRD

## 📝 Notas Importantes

⚠️ **Conformidade Legal**: Sistema em conformidade com Decreto Presidencial 71/25 e Anexos Técnicos AGT I, II e III.

⚠️ **Segurança**: Token JWT expira em 1 hora. Implementar renovação automática.

⚠️ **Dados Sensíveis**: NIF deve ter exatamente 9 dígitos. Validar antes de enviar.

⚠️ **Totais**: Sistema AGT valida que soma das linhas = total. Diferenças causam erro 422.

⚠️ **QR Codes**: Obrigatórios em todos documentos. Retornados como base64 PNG 350x350.

## 🆕 Atualizações

**v1.0.0** (11/12/2025)
- ✅ Pacote inicial criado
- ✅ WSDL publicado
- ✅ Postman collection disponível
- ✅ Documentação completa

---

**Preparado por**: Equipa Técnica Sistema AGT  
**Data**: 11 Dezembro 2025  
**Versão**: 1.0.0
