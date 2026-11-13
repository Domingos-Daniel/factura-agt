# Email para Suporte AGT - Erro 403 Forbidden

---

**Para:** suporte.agt@minfin.gov.ao  
**Assunto:** Solicitação de Suporte - Erro 403 Forbidden no Ambiente HML AGT  
**De:** [Seu Nome / Empresa]  
**Data:** 03 de Fevereiro de 2026

---

Exmos. Senhores,

Venho por este meio solicitar apoio técnico para resolução de um erro de autenticação que estamos a enfrentar no ambiente de Homologação (HML) do sistema AGT de Facturação Electrónica.

## 📋 Contexto da Situação

Estamos a implementar o sistema de facturação electrónica **SafeFacturas** (versão 1.0.1) e a realizar testes de integração com o ambiente HML da AGT. Apesar de seguirmos rigorosamente a documentação técnica (decreto.md), os nossos pedidos ao endpoint de registar factura estão a retornar **erro 403 Forbidden**.

## 🔧 Detalhes Técnicos da Implementação

### Endpoint Testado:
```
POST https://sifphml.minfin.gov.ao/sigt/fe/v1/registar
```

### Credenciais Utilizadas:
- **Username:** ws.hml.safe
- **Password:** mfn492026
- **NIF Emissor:** 5000413178

### Informações do Software:
- **Product ID:** SafeFacturas
- **Product Version:** 1.0.1
- **Software Validation Number:** FE/164/AGT/2026

### Assinaturas JWS Implementadas:
- ✅ **jwsSoftwareSignature:** Implementado com RSA-SHA256 (256 caracteres)
- ✅ **jwsDocumentSignature:** Implementado com RSA-SHA256 (256 caracteres)
- ✅ Ambas as assinaturas usam chave privada RSA 2048-bit conforme especificação

### Formato do Payload:
- ✅ Schema Version: 1.0
- ✅ UUID de submissão gerado correctamente
- ✅ Timestamps no formato ISO 8601
- ✅ Campos obrigatórios todos presentes
- ✅ Cálculos fiscais validados (creditAmount, taxContribution, totais)

## ❓ Questões para Validação

Para procedermos com a correcção do erro, solicitamos esclarecimento sobre os seguintes pontos:

### 1. **Credenciais de Acesso HML**
- As credenciais `ws.hml.safe` / `mfn492026` estão activas no ambiente HML?
- Estas credenciais têm permissões para o endpoint `/registar`?
- Existe algum processo de activação ou registo prévio necessário?

### 2. **Certificado de Software**
- O certificado `FE/164/AGT/2026` está registado no ambiente HML?
- Este certificado está associado ao NIF `5000413178`?
- É necessário submeter a chave pública RSA previamente?

### 3. **Assinaturas JWS (Criptografia)**
- A chave pública RSA correspondente à nossa chave privada foi registada no sistema AGT?
- Qual é o processo para submeter/validar a chave pública?
- As assinaturas JWS estão a ser validadas correctamente pelo servidor?

### 4. **NIF e Permissões**
- O NIF `5000413178` tem permissões no ambiente HML?
- É necessário algum registo ou aprovação prévia deste NIF para testes?
- Existem restrições de IP ou outras políticas de segurança activas?

### 5. **Logs e Diagnóstico**
- É possível obter logs detalhados do servidor que expliquem a causa exacta do 403?
- Existe algum painel de diagnóstico ou validação de credenciais disponível?

## 📎 Anexos Disponíveis

Caso seja útil para análise, podemos fornecer:
- ✅ Payload JSON completo sendo enviado
- ✅ Exemplo de assinatura JWS gerada
- ✅ Chave pública RSA para validação
- ✅ Headers HTTP completos do pedido
- ✅ Logs detalhados da nossa aplicação

## 🎯 Objectivo

O nosso objectivo é completar os testes de certificação no ambiente HML para posteriormente migrar para o ambiente de produção. Estamos comprometidos em seguir todas as especificações técnicas da AGT e agradecemos todo o apoio para resolução desta questão.

## 📞 Contactos para Resposta

- **Email:** [seu.email@empresa.ao]
- **Telefone:** [+244 XXX XXX XXX]
- **Empresa:** [Nome da Empresa]
- **Responsável Técnico:** [Nome do Responsável]

---

Agradecemos desde já a vossa atenção e ficamos no aguardo de retorno com a maior brevidade possível.

Com os melhores cumprimentos,

**[Seu Nome]**  
[Cargo/Função]  
[Nome da Empresa]  
[Contacto]

---

## 📝 Notas Técnicas Adicionais

### Testes de Conectividade Realizados:
- ✅ DNS Resolution: OK (80.88.9.13)
- ✅ TCP Connection: OK (porta 443)
- ✅ TLS Handshake: OK (TLS 1.2)
- ✅ HTTP Request: OK (método POST, Content-Type: application/json)
- ❌ Authentication: FAIL (403 Forbidden)

### Documentação Consultada:
- ✅ decreto.md - Especificação técnica AGT
- ✅ FORMATO_EXCEL_AGT.md - Formatos de dados
- ✅ INTEGRACAO_SAP_AGT.md - Guia de integração

### Ambiente de Desenvolvimento:
- **OS:** Windows 11
- **Runtime:** Node.js v24.11.1
- **Bibliotecas:** crypto (RSA-SHA256), uuid, dotenv
- **Método de conexão:** PowerShell Invoke-RestMethod (TLS 1.2)

---

**Referência Interna:** TICKET-AGT-HML-403-20260203
