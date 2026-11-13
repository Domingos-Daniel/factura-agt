# Relatório de Diagnóstico AGT HML

**Data:** 2026-02-03  
**Ambiente:** HML (Homologação)  
**Endpoint:** https://sifphml.minfin.gov.ao/sigt/fe/v1

---

## 🔍 Resultados dos Testes

### ✅ 1. Resolução DNS
- **Status:** SUCESSO
- **Hostname:** sifphml.minfin.gov.ao
- **IP:** 80.88.9.13
- **Conclusão:** Servidor está resolvendo corretamente

### ✅ 2. Conectividade TCP
- **Status:** SUCESSO
- **Porta:** 443
- **Conclusão:** Porta HTTPS está acessível

### ❌ 3. Handshake TLS/SSL
- **Status:** FALHA (Timeout após 10s)
- **Erro:** TLS Handshake não completou
- **Conclusão:** **PROBLEMA IDENTIFICADO**

### ❌ 4. Requisição HTTPS
- **Status:** NÃO EXECUTADO (dependia do TLS)

---

## 🔴 Problema Identificado

O servidor AGT HML **não está completando o handshake TLS**. Possíveis causas:

### 1. **Firewall/Proxy Corporativo**
   - O firewall local pode estar bloqueando o handshake TLS
   - Solução: Verificar com IT/Network se há proxy ou firewall bloqueando

### 2. **Servidor Requer SNI (Server Name Indication)**
   - O servidor pode estar esperando SNI no handshake
   - Node.js geralmente envia SNI, mas pode haver incompatibilidade

### 3. **Versão TLS Incompatível**
   - Servidor pode aceitar apenas TLS 1.2 ou 1.3
   - Cliente pode estar tentando TLS 1.0/1.1 (deprecated)

### 4. **Certificado/Chave de Cliente Necessária**
   - Servidor pode exigir autenticação mútua (mTLS)
   - Requer certificado cliente para completar handshake

### 5. **Acesso Restrito por IP**
   - Servidor pode aceitar apenas IPs específicos (whitelist)
   - Seu IP pode não estar na lista de acesso

### 6. **VPN/Tunnel Necessário**
   - Ambiente HML pode exigir VPN para acesso
   - Verificar com AGT se há requisitos de rede

---

## 🔧 Soluções Recomendadas

### Opção 1: Testar com CURL (bypassa problemas de Node.js)
```bash
curl -v -k -X POST https://sifphml.minfin.gov.ao/sigt/fe/v1/listarSeries \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n 'ws.hml.safe:mfn492026' | base64)" \
  -d '{"taxRegistrationNumber":"5000413178","seriesYear":2026}'
```

### Opção 2: Verificar Requisitos de Rede
- Contactar AGT para confirmar:
  - Whitelist de IPs
  - Necessidade de VPN
  - Versão TLS suportada
  - Certificados necessários

### Opção 3: Testar de Outro Ambiente
- Testar de outro computador/rede
- Testar de servidor em cloud (AWS/Azure)
- Confirmar se é problema local ou do servidor

### Opção 4: Usar Postman/Insomnia
- Ferramentas GUI podem ter melhor suporte a TLS
- Permitem ver detalhes do handshake
- Facilitam debug de autenticação

---

## 📋 Próximos Passos

1. **URGENTE:** Contactar AGT/Suporte técnico para:
   - Confirmar se IP precisa estar em whitelist
   - Verificar se VPN é necessária
   - Obter documentação de requisitos de rede

2. Testar com `curl` (ver comando acima)

3. Testar de outro ambiente (cloud/servidor)

4. Se problema persiste, solicitar:
   - Logs do servidor AGT
   - Configuração de firewall
   - Certificados necessários

---

## 🔄 Status Atual

**BLOQUEADO:** Não é possível completar handshake TLS com servidor AGT HML.  
**PRÓXIMA AÇÃO:** Contactar suporte AGT para requisitos de acesso.

---

**Gerado por:** test-hml-diagnostico.js  
**Credenciais Testadas:** ws.hml.safe  
**NIF Teste:** 5000413178
