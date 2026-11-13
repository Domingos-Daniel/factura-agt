# Relatório de Validação Estrutural — Payloads de Certificação AGT (schema 2.0)

**Data:** 2026-11-13T12:04:31.883Z
**Schema:** 2.0
**Payloads validados:** 18
**Tipos cobertos:** AC, AF, AR, CS, FA, FG, FR, FT, GF, LD, NC, ND, RA, RC, RE, RG, RP, TV
**Resultado:** ✅ APROVADO

- Erros: **0**
- Avisos: **0**

## Cobertura por tipo de documento

| Tipo | Documento | Estado | Linhas | Recibo | Divisa | Net | Impostos | Bruto | Resultado |
|------|-----------|--------|--------|--------|--------|-----|----------|-------|-----------|
| AC | Aviso de Cobrança | N | 2 | não | AOA | 195000.00 | 27300.00 | 222300.00 | ✅ |
| AF | Factura/Recibo de Autofacturação | N | 1 | não | AOA | 480000.00 | 67200.00 | 547200.00 | ✅ |
| AR | Aviso de Cobrança/Recibo | N | 0 | sim | AOA | 315000.00 | 44100.00 | 359100.00 | ✅ |
| CS | Imputação a Co-seguradoras | N | 2 | não | AOA | 1225000.00 | 7100.00 | 1232100.00 | ✅ |
| FA | Factura de Adiantamento | N | 1 | não | AOA | 900000.00 | 126000.00 | 1026000.00 | ✅ |
| FG | Factura Global | N | 3 | não | AOA | 645000.00 | 84700.00 | 729700.00 | ✅ |
| FR | Factura/Recibo | N | 2 | não | AOA | 348000.00 | 48720.00 | 396720.00 | ✅ |
| FT | Factura | N | 2 | não | EUR | 1350000.00 | 189000.00 | 1539000.00 | ✅ |
| GF | Factura Genérica | N | 1 | não | AOA | 75000.00 | 10500.00 | 85500.00 | ✅ |
| LD | Imputação a Co-seguradora Líder | N | 2 | não | AOA | 3150000.00 | 30000.00 | 3180000.00 | ✅ |
| NC | Nota de Crédito | N | 1 | não | AOA | 185000.00 | 25900.00 | 210900.00 | ✅ |
| ND | Nota de Débito | N | 2 | não | AOA | 53000.00 | 0.00 | 53000.00 | ✅ |
| RA | Resseguro Aceite | N | 2 | não | AOA | 2460000.00 | 15600.00 | 2475600.00 | ✅ |
| RC | Recibo em numerário (cash) | N | 0 | sim | AOA | 430000.00 | 60200.00 | 490200.00 | ✅ |
| RE | Estorno ou Recibo de Estorno | N | 1 | não | AOA | 430000.00 | 60200.00 | 490200.00 | ✅ |
| RG | Outros recibos | N | 0 | sim | AOA | 240000.00 | 33600.00 | 273600.00 | ✅ |
| RP | Prémio ou Recibo de Prémio | N | 2 | não | AOA | 492000.00 | 1476.00 | 493476.00 | ✅ |
| TV | Talão de Venda | N | 3 | não | AOA | 39900.00 | 10262.40 | 50162.40 | ✅ |

## Verificações aplicadas (schema 2.0)

- `schemaVersion` = 2.x; `submissionUUID` UUID v4; `numberOfEntries` inteiro.
- `softwareInfoDetail` com `signatureVersion`; JWS do software assina o objecto completo.
- JWS compacto Base64URL (`header.payload.signature`), sem padding, alg RS256.
- `documentStatus` apenas N/C; ausência de `documentCancelReason`.
- `documentNo` (8..60, prefixo = tipo), datas, CAE, cliente.
- Regras por tipo: `lines` excepto AR/RC/RG; `paymentReceipt` apenas AR/RC/RG; NC com `referenceInfo`.
- Linhas: `operationType` obrigatório; `operationDate` em GF/FG; tipos numéricos; um só de debit/credit; isenções.
- Aritmética: montante = quantidade × unitPriceBase; `taxContribution` arredondado por excesso; totais [E21–E24].
- Regras E16/E17: NC com crédito < débito; restantes com crédito > débito.
- Câmbio [E25]: `currencyAmount` = grossTotal × exchangeRate (divisa ≠ AOA).
- Recibos: totais iguais à soma dos documentos de origem.
- Cobertura dos 18 tipos, sem duplicados.

