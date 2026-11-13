# Payloads de Certificação AGT — 18 Tipos de Documento (schema 2.0)

Conjunto de payloads prontos para os testes de **Conformidade Estrutural e Cobertura de Regras de Facturação** da certificação de software de facturação electrónica (AGT — Angola), já no **schema 2.0**.

> ⚠️ A versão 1.x do schema deixou de ser aceite pela AGT ("A versão 1.0 do schema já não é suportada"). Todos os payloads foram migrados para **`schemaVersion: "2.0"`** e para as novas regras estruturais.

- **Documentação oficial usada:**
  - Registar factura (v2.0): <https://portaldoparceiro.hml.minfin.gov.ao/doc-agt/faturacao-electronica/1/servicos/registar.html>
  - Assinaturas JWS: <https://portaldoparceiro.hml.minfin.gov.ao/doc-agt/faturacao-electronica/1/estrutura.html>
  - Gestão de chaves: <https://portaldoparceiro.hml.minfin.gov.ao/doc-agt/faturacao-electronica/1/gestao.html>
- **Pasta:** `data/test-payloads/`
- **Gerador:** [`scripts/generate-payloads-certificacao.js`](../../scripts/generate-payloads-certificacao.js)
- **Validador:** [`scripts/validate-payloads-certificacao.js`](../../scripts/validate-payloads-certificacao.js)

---

## 1. Mapa dos 18 casos exigidos

| # | Caso de certificação | Código | Ficheiro | Estado | Linhas | Recibo | Divisa |
|---|----------------------|--------|----------|--------|--------|--------|--------|
| 1 | Aviso de Cobrança | `AC` | `CERT_AC_Aviso_Cobranca.json` | N | 2 | não | AOA |
| 2 | Factura/Recibo de Autofacturação | `AF` | `CERT_AF_Autofacturacao.json` | N | 1 | não | AOA |
| 3 | Aviso de Cobrança/Recibo | `AR` | `CERT_AR_Aviso_Cobranca_Recibo.json` | N | — | sim | AOA |
| 4 | Imputação a Co-seguradoras | `CS` | `CERT_CS_Imputacao_Co_Seguradoras.json` | N | 2 | não | AOA |
| 5 | Factura de Adiantamento | `FA` | `CERT_FA_Factura_Adiantamento.json` | N | 1 | não | AOA |
| 6 | Factura Global | `FG` | `CERT_FG_Factura_Global.json` | N | 3 | não | AOA |
| 7 | Factura/Recibo | `FR` | `CERT_FR_Factura_Recibo.json` | N | 2 | não | AOA |
| 8 | Factura | `FT` | `CERT_FT_Factura.json` | N | 2 | não | **EUR** |
| 9 | Factura Genérica | `GF` | `CERT_GF_Factura_Generica.json` | N | 1 | não | AOA |
| 10 | Imputação a Co-seguradora Líder | `LD` | `CERT_LD_Imputacao_Co_Seguradora_Lider.json` | N | 2 | não | AOA |
| 11 | Nota de Crédito | `NC` | `CERT_NC_Nota_Credito.json` | N | 1 | não | AOA |
| 12 | Nota de Débito | `ND` | `CERT_ND_Nota_Debito.json` | N | 2 | não | AOA |
| 13 | Resseguro Aceite | `RA` | `CERT_RA_Resseguro_Aceite.json` | N | 2 | não | AOA |
| 14 | Recibo em numerário (cash) | `RC` | `CERT_RC_Recibo_Numerario.json` | N | — | sim | AOA |
| 15 | Estorno ou Recibo de Estorno | `RE` | `CERT_RE_Estorno.json` | N | 1 | não | AOA |
| 16 | Outros recibos | `RG` | `CERT_RG_Outros_Recibos.json` | N | — | sim | AOA |
| 17 | Prémio ou Recibo de Prémio | `RP` | `CERT_RP_Premio_Recibo_Premio.json` | N | 2 | não | AOA |
| 18 | Talão de Venda | `TV` | `CERT_TV_Talao_Venda.json` | N | 3 | não | AOA |

Ficheiros auxiliares:

| Ficheiro | Conteúdo |
|----------|----------|
| `_ALL_PAYLOADS_CERTIFICACAO.json` | Array com os 18 pedidos `registarFactura` |
| `_INDEX_CERTIFICACAO.json` | Índice com tipo, número, estado, totais e divisa |
| `_VALIDATION_REPORT.md` | Relatório da última validação estrutural |
| `certificacao-api-test.http` | 18 pedidos HTTP (REST Client / VS Code) |

---

## 2. O que mudou do schema 1.x para 2.0

| # | Alteração | v1.x | v2.0 (aplicado) |
|---|-----------|------|-----------------|
| 1 | `schemaVersion` | `"1.0"` / `"1.2"` | **`"2.0"`** |
| 2 | `softwareInfoDetail` | 3 campos | **+ `signatureVersion`** (integer, ex.: `1`) |
| 3 | Tipos numéricos | string `"15000.00"` | **number** `15000` |
| 4 | Linha — novo campo | — | **`operationType`** obrigatório |
| 5 | Linha — `operationDate` | — | Obrigatório em **GF** e **FG** |
| 6 | `unitPriceBase` / `unitPrice` | base = após desconto | **base = sem desconto; unitPrice = após desconto** |
| 7 | `settlementAmount` | usado como total da linha | **total de descontos** (`0` sem desconto) |
| 8 | `documentStatus` | N, S, A, R, C | **apenas N e C** |
| 9 | `documentCancelReason` | existia | **removido** |
| 10 | `referenceInfo.referenceItemLineNo` | existia | **mantém-se obrigatório** (o portal exige-o) |
| 11 | JWS | 256 caracteres fixos | **`header.payload.signature` Base64URL, sem padding, tamanho variável** |
| 12 | `currency` | valor na divisa | **totais em AOA; `currencyAmount = grossTotal ÷ exchangeRate`** |
| 13 | Regras E16/E17 | — | **NC: crédito < débito; restantes: crédito > débito** |
| 14 | `taxBase` | livre | **proibido em conjunto com `debitAmount`/`creditAmount` (E19)** |
| 15 | `taxType` | IVA, IS, IEC, NS | **+ `CEOC`** (Contribuição Especial de Consumo) |

### `operationType` usado por documento

| Código | Significado | Documentos / linhas |
|--------|-------------|---------------------|
| `SG` | Serviço geral | AC, AF, CS (encargos), FA, FT, ND (juros), RE |
| `TB` | Transmissão de bens | AC (peças), FG, FR, GF, NC, TV |
| `SIF` | Serviço de intermediação financeira/seguradora | CS, LD, RA, RP (prémios e comissões) |
| `RD` | Repasse de despesas | ND (despesas de cobrança) |

### Regras E16/E17 — débito vs crédito

A AGT exige que a soma dos valores a **crédito** seja **inferior** à soma a **débito** nas **Notas de Crédito**, e **superior** em todos os outros tipos. Por isso:

- `NC` → usa **`debitAmount`** (crédito = 0 < débito);
- todos os restantes → usam **`creditAmount`** (débito = 0 < crédito). Isto inclui o `RE`.

### Moeda estrangeira (E25)

> ⚠️ **Correção importante.** A documentação do schema 2.0 descreve `currencyAmount` como contra-valor em Kwanzas e `grossTotal × exchangeRate = currencyAmount`. **O portal de certificação valida ao contrário**, como no SAF-T(AO): os totais ficam em **AOA** e `currencyAmount` é o contra-valor **na divisa**. Com a fórmula da documentação a FT falhou com E25:
>
> *"Valor registado na factura no campo `grossTotal` não corresponde ao valor na divisa utilizada no pagamento (1.404.337,5) ao câmbio da divisa (912,5)."*

Regra efetivamente aplicada pelo portal:

```
grossTotal (AOA) = currencyAmount (divisa) × exchangeRate
```

Na `FT`: totais em **AOA** (`netTotal 1 350 000`, `taxPayable 189 000`, `grossTotal 1 539 000`), divisa `EUR`, câmbio `900` → `currencyAmount = 1 710,00 EUR`.

A taxa foi escolhida para a divisão ser **exacta** (`1 539 000 ÷ 900 = 1 710,00`), evitando diferenças de arredondamento na validação. Ao alterar valores, garanta que `grossTotal ÷ exchangeRate` dê no máximo 2 casas decimais exactas.

Para `currencyCode = AOA` (factura de exportação em Kwanzas), a relação é a mesma: `currencyAmount` representa o contra-valor em divisas e `grossTotal = currencyAmount × exchangeRate`.

---

## 3. Regras estruturais aplicadas

| Regra (schema 2.0) | Onde é demonstrada |
|--------------------|--------------------|
| `lines` obrigatórias **excepto** `AR`, `RC`, `RG` | 15 payloads com linhas; 3 recibos sem linhas |
| `paymentReceipt` obrigatório **apenas** em `AR`, `RC`, `RG` | AR, RC, RG (e ausente nos restantes 15) |
| `NC` exige `referenceInfo` por linha | `CERT_NC_Nota_Credito.json` |
| `operationType` obrigatório em todas as linhas | Todas as linhas dos 15 documentos com linhas |
| `operationDate` obrigatório em `GF`/`FG` | `CERT_GF_Factura_Generica.json`, `CERT_FG_Factura_Global.json` |
| `taxCode = ISE` exige `taxExemptionCode` (3 caracteres) | `FG` (M10), `ND` (M10), `TV` (M10) |
| Um e um só de `debitAmount` / `creditAmount` por linha | Todas as linhas |
| `taxContribution` arredondado **por excesso** ao cêntimo | Cálculo no gerador e verificação no validador |
| `grossTotal = netTotal + taxPayable` | Todos os documentos |
| `numberOfEntries` = nº de documentos (E04) | Todos os envelopes (1) |
| Retenção na fonte | `FT` (12 285,00 AOA) e `AF` (4 368,00 AOA) |

### Cobertura fiscal

| Regra fiscal | Documentos |
|--------------|-----------|
| IVA taxa normal 14% | AC, AF, CS, FA, FG, FR, FT, GF, LD, NC, RA, RE, RP, TV |
| IVA isento (ISE + M10) | FG, ND, TV |
| Imposto de Selo — verba 22.1.5 (0,3%) | CS, LD, RA, RP |
| IEC (código pautal 2203) | TV (linha 3 — IVA calculado sobre base + IEC) |
| Liquidação em divisa (EUR) | FT |
| Adquirente identificado (NIF real) | Todos os 18 documentos |
| Múltiplas linhas | AC, CS, FG, FR, FT, LD, ND, RA, RP, TV |
| Documento rectificativo com referência | NC, ND, RE |

---

## 4. Como usar

### Regenerar

```bash
node scripts/generate-payloads-certificacao.js
```

### Validar

```bash
node scripts/validate-payloads-certificacao.js
```

O validador é independente do gerador e verifica: envelope, `signatureVersion`, JWS (estrutura Base64URL e conteúdo assinado), tipos numéricos, `operationType`, `operationDate`, isenções, aritmética linha a linha, totais (E21–E24), regras E16/E17, câmbio (E25), documentos de origem dos recibos, cobertura dos 18 tipos e duplicados. Sai com código `0` (aprovado) ou `1` (reprovado).

### Submeter

```bash
curl -X POST https://sifphml.minfin.gov.ao/sigt/fe/v1/registarFactura \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  --data-binary "@data/test-payloads/CERT_FT_Factura.json"
```

Para pré-validação estrutural use `POST /validarDocumento` com o mesmo corpo.

---

## 5. Antes de submeter à AGT — obrigatório

1. **Assinaturas reais (RS256).** `jwsSoftwareSignature` e `jwsDocumentSignature` são **mocks estruturais** no formato JWS (`header.payload.signature`, Base64URL sem padding, assinatura de 2048 bits equivalente). Não validam criptograficamente. É obrigatório assinar com:
   - `jwsSoftwareSignature` → chave privada do **produtor** de software;
   - `jwsDocumentSignature` → chave privada do **emissor**.
   Em Node.js, ver [`lib/jws-signer.js`](../../lib/jws-signer.js). O payload assinado é o objecto JSON canónico (sem espaços), com os campos indicados na documentação oficial.
2. **`signatureVersion`.** Está a `1`. Deve corresponder ao número da chave de assinatura registada pelo produtor no portal do parceiro.
3. **Dados do emissor e do adquirente.** Já configurados com NIFs reais registados na AGT:
   - `taxRegistrationNumber` (emissor) = **`5000660086`**;
   - `customerTaxID` (adquirente) = **`003043657LA038`** em todos os documentos;
   - `softwareInfo` = `SafeFacturas / 1.0.1 / FE/BB/AGT/2026`.
   Ajustar apenas se o número de certificação do software mudar.
4. **Séries.** Os `documentNo` usam séries `2026A`, `2026B` e `2026C` (contêm o ano). Confirmar que estão autorizadas (`/listarSeries`).
5. **Duplicados.** `submissionUUID` é novo a cada geração. Os `documentNo` são fixos — não reutilizar números já registados.
6. **Datas.** Documentos de `2026-03-02`; recibos referenciam origem de `2026-01`/`2026-02`.

---

## 6. Migração do código da aplicação (pendente)

Os payloads de certificação já estão em 2.0, mas o código que a aplicação usa para gerar/enviar facturas ainda está em 1.x. Para a aplicação deixar de ser rejeitada, é necessário:

| Ficheiro | O que mudar |
|----------|-------------|
| [`lib/server/agtConfig.ts`](../../lib/server/agtConfig.ts#L15) | `SCHEMA_VERSION = '1.2'` → `'2.0'`; acrescentar `signatureVersion: 1` a `SOFTWARE_INFO` |
| [`lib/server/agtTransformer.ts`](../../lib/server/agtTransformer.ts) | `operationType` por linha, tipos numéricos, `settlementAmount` = descontos, remover `documentCancelReason`, `documentStatus` só N/C |
| [`lib/agt-payload-types.ts`](../../lib/agt-payload-types.ts) | `DocumentLine` + `operationType`/`operationDate`; manter `referenceItemLineNo` (obrigatório); tipos number |
| [`lib/agt-payload-generators.ts`](../../lib/agt-payload-generators.ts) | `schemaVersion: '2.0'`, `signatureVersion`, `operationType`, valores numéricos |
| [`lib/excelMapping.ts`](../../lib/excelMapping.ts) | 4 ocorrências de `schemaVersion: '1.2'` |
| `app/api/facturas/agt/route.ts`, `app/api/facturas/agt/listar/route.ts`, `app/api/agt/listarSeries/route.ts`, `app/api/series/agt/**`, `app/api/soap/route.ts` | `schemaVersion: '1.2'` / `'1.0.0'` → `'2.0'` |
| [`lib/schemas/facturaSchema.ts`](../../lib/schemas/facturaSchema.ts#L157) | default `'1.0'` → `'2.0'`; validar `operationType` |
| [`lib/schemas/index.ts`](../../lib/schemas/index.ts) | defaults `'1.0.0'` → `'2.0'` |

O gerador e o validador desta pasta podem servir de referência para a implementação.

---

## 7. Notas de decisão

- **`settlementAmount`:** no 2.0 é o **total de descontos**. Como as linhas não têm desconto, vale `0` em todos os documentos. Evitou-se usar descontos porque a regra E21 (`montante = quantity × unitPriceBase`) e a semântica `unitPrice`/`unitPriceBase` do 2.0 tornam a combinação ambígua; a cobertura fica para um caso dedicado.
- **`documentStatus = S` (Autofacturação):** desapareceu no 2.0. A autofacturação é identificada apenas pelo `documentType = "AF"`, com estado `N`.
- **`RE` (Estorno):** a especificação continua a excluir `lines`/exigir `paymentReceipt` apenas em AR/RC/RG. Logo o `RE` tem linha e não tem `paymentReceipt`; por força da regra E17 usa `creditAmount`.
- **`RP` e `RA`:** variante de documento de prémio (com linhas, sem `paymentReceipt`), com `operationType = SIF`.
- **JWS — header:** usado `{"alg":"RS256","typ":"JWT"}` conforme a página *Estrutura das Assinaturas Digitais* (o exemplo de `registar.html` usa `typ:"JOSE"`; ambos são aceites pela AGT desde que a assinatura seja válida).

### Divergências entre a documentação e o validador do portal

Pontos em que a página oficial não corresponde ao que o portal de certificação valida (o portal é a fonte de verdade):

| Tema | Documentação | Portal (validado) | Resolução |
|------|--------------|-------------------|-----------|
| `currencyAmount` / `exchangeRate` (E25) | `currencyAmount = grossTotal × exchangeRate` | `grossTotal = currencyAmount × exchangeRate` | Totais em AOA e `currencyAmount` na divisa (`FT`: 1 710 EUR × 900 = 1 539 000 AOA) |
| `referenceInfo.referenceItemLineNo` | campo omitido da tabela | **obrigatório** | Reposto em NC, ND e RE |
| Base do IVA em linhas com IEC | não explicitado | **IVA sobre `net + IEC`** | Na TV linha 3: `(19 200 + 5 760) × 14% = 3 494,40` (e não `19 200 × 14% = 2 688`) |
