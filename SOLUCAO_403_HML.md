# ✅ PROBLEMA TLS RESOLVIDO - 403 Forbidden Detectado

## 🎯 Status Atual

### ✅ Sucessos
1. **DNS funcionando**: `sifphml.minfin.gov.ao` → `80.88.9.13`
2. **Porta 443 acessível**: Conexão TCP estabelecida
3. **TLS Handshake completo**: PowerShell conseguiu estabelecer conexão HTTPS
4. **API respondendo**: Servidor AGT HML está online e respondendo

### ❌ Problema Identificado
**Erro HTTP 403 Forbidden** - Servidor rejeitou as credenciais

```
URL: https://sifphml.minfin.gov.ao/sigt/fe/v1/listarSeries
Método: POST
Credenciais: ws.hml.safe:mfn492026 (Basic Auth)
Resposta: 403 Proibido
```

## 🔍 Análise

O erro **403 Forbidden** significa que:
- ✅ A autenticação foi **processada** (não é 401 Unauthorized)
- ❌ O usuário `ws.hml.safe` **não tem permissão** de acesso
- ❌ As credenciais podem estar **expiradas, desativadas ou incorretas**
- ❌ O IP pode não estar em **whitelist**

## 🛠️ Soluções

### Opção 1: Verificar Credenciais (URGENTE)
Contactar AGT/Parceiro para confirmar:
- [ ] Usuário `ws.hml.safe` está **ativo** no ambiente HML?
- [ ] Password `mfn492026` está **correto** e **não expirado**?
- [ ] Credenciais foram **emitidas** para o NIF `5000413178`?
- [ ] Qual o **username correto** para testes HML?

### Opção 2: Verificar Whitelist de IP
Perguntar à AGT:
- [ ] Qual é o **IP público** que precisa estar em whitelist?
- [ ] Como solicitar **inclusão de IP** na whitelist?
- [ ] Há **VPN obrigatória** para acesso HML?

### Opção 3: Obter Novas Credenciais
Se as credenciais estão desatualizadas:
- [ ] Solicitar **novas credenciais HML** à AGT
- [ ] Confirmar se credenciais são **por parceiro** ou **por NIF**
- [ ] Verificar se há **processo de certificação** pendente

## 📝 Scripts Funcionais Criados

### ✅ test-hml-powershell.ps1
**Status:** Funcional - TLS OK, retorna 403  
**Uso:** `powershell -ExecutionPolicy Bypass -File scripts\test-hml-powershell.ps1`

### ✅ test-hml-diagnostico.js  
**Status:** Diagnóstico completo - identificou problema TLS  
**Uso:** `node scripts/test-hml-diagnostico.js`

### ⚠️ test-hml-all-services.js  
**Status:** Não funcional - problema TLS no Node.js  
**Recomendação:** Usar PowerShell no Windows

## 🎯 Próxima Ação Recomendada

**1. CONTACTAR AGT IMEDIATAMENTE**

Enviar email/ticket com:
```
Assunto: [URGENTE] Credenciais HML retornando 403 Forbidden

Olá equipa AGT,

Estou testando integração com ambiente HML e recebendo erro 403 Forbidden.

Dados do teste:
- Endpoint: https://sifphml.minfin.gov.ao/sigt/fe/v1/listarSeries
- Credenciais: ws.hml.safe
- NIF: 5000413178
- Erro: 403 Forbidden

Perguntas:
1. As credenciais ws.hml.safe:mfn492026 estão corretas e ativas?
2. O meu IP precisa estar em whitelist?
3. Como solicitar acesso ao ambiente HML?

Obrigado,
[Seu Nome]
```

**2. ENQUANTO AGUARDA RESPOSTA**

Testar com credenciais alternativas se disponíveis:
- Verificar documentação se há credenciais demo
- Testar com credenciais de outro parceiro (se aplicável)

---

## 📊 Comparação: Node.js vs PowerShell

| Feature | Node.js | PowerShell |
|---------|---------|------------|
| TLS Handshake | ❌ Timeout | ✅ Sucesso |
| Conexão HTTPS | ❌ Falha | ✅ Sucesso |
| Resposta API | ❌ N/A | ✅ 403 (esperado) |
| **Recomendação** | ❌ Não usar | ✅ **USAR** |

---

**Gerado:** 2026-02-03  
**Status:** BLOQUEADO - Aguardando credenciais válidas da AGT
