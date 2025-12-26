# AGT Fields Checklist — Resumo por Serviço

Objetivo: checklist conciso dos campos que a AGT exige por serviço (baseado em `decreto.md`) para que as equipas SAP saibam exactamente o que enviar ao middleware.

> Arquivo gerado automaticamente a partir do `decreto.md` — Dezembro 2025

---

## Índice
- registarFactura
- obterEstado
- listarFacturas
- consultarFactura
- solicitarSerie
- listarSeries
- validarDocumento

---

## 1) registarFactura (Submeter facturas)
Campos obrigatórios principais:
- schemaVersion (string)
- submissionGUID (string, UUID v4) — único por emissor
- taxRegistrationNumber (string, maxlength 15)
- submissionTimeStamp (ISO 8601)
- softwareInfo (object)
  - softwareInfoDetail.productId (string)
  - softwareInfoDetail.productVersion (string)
  - softwareInfoDetail.softwareValidationNumber (string)
  - jwsSoftwareSignature (string, minlength=256, maxlength=256)
- numberOfEntries (integer)
- documents (array, max 30) — cada `document` contém:
  - documentNo (string, minlength=8, maxlength=60)
  - documentStatus (1 char: N,S,A,R,C)
  - jwsDocumentSignature (string, minlength=256, maxlength=256)
  - documentDate (YYYY-MM-DD)
  - documentType (2 chars)
  - systemEntryDate (ISO datetime)
  - customerCountry (ISO3166 alpha-2)
  - customerTaxID (string)
  - companyName (string)
  - documentTotals { taxPayable, netTotal, grossTotal }
  - lines (array) **obrigatório exceto para recibos (AR/RC/RG)**
  - paymentReceipt (object) **obrigatório para recibos (AR/RC/RG)**

Regras importantes:
- Máx 30 documentos por lote
- NC (Nota de Crédito) requer referência (`referenceInfo`) em pelo menos uma linha
- Recibos (AR/RC/RG) devem ter `paymentReceipt` e não `lines`
- `jwsDocumentSignature` deve cobrir: documentNo, taxRegistrationNumber, documentType, documentDate, customerTaxID, customerCountry, companyName, documentTotals

Referências no código:
- Schemas: `lib/schemas/facturaSchema.ts`
- Tipos: `lib/types/agt-official.ts`
- Handler REST: `app/api/agt/registarFactura/route.ts`
- Mock: `lib/server/agtMockService.ts` (registarFactura)

---

## 2) obterEstado (Consultar validação)
Campos obrigatórios:
- schemaVersion
- submissionId / requestID (string, maxlength 15)
- taxRegistrationNumber (maxlength 15)
- submissionTimeStamp (ISO 8601)
- softwareInfo
- jwsSignature (string, minlength=256)

Resposta relevante:
- statusResult { requestID, resultCode (0,1,2,7,8,9), documentStatusList [{ documentNo, documentStatus (V/I/P) }] }

Referências:
- Schema: `lib/schemas/index.ts` (obterEstadoRequest)
- Handler: `app/api/agt/obterEstado/route.ts`
- Mock: `lib/server/agtMockService.ts` (obterEstado)

---

## 3) listarFacturas
Campos obrigatórios:
- schemaVersion, submissionId, taxRegistrationNumber, submissionTimeStamp, softwareInfo, jwsSignature
- queryStartDate (YYYY-MM-DD), queryEndDate (YYYY-MM-DD)

Regras:
- Período máximo (recomendado) 30–45 dias

Referências:
- Schema: `lib/schemas/index.ts` (listarFacturasRequest)
- Handler: `app/api/agt/listarFacturas/route.ts`
- Mock: `lib/server/agtMockService.ts` (listarFacturas)

---

## 4) consultarFactura
Campos obrigatórios:
- schemaVersion, submissionId, taxRegistrationNumber, submissionTimeStamp, softwareInfo, jwsSignature
- documentNo (maxlength 60)

Referências:
- Schema: `lib/schemas/index.ts` (consultarFacturaRequest)
- Handler: `app/api/agt/consultarFactura/route.ts`
- Mock: `lib/server/agtMockService.ts` (consultarFactura)

---

## 5) solicitarSerie
Campos obrigatórios:
- schemaVersion, submissionId, taxRegistrationNumber, submissionTimeStamp, softwareInfo, jwsSignature
- seriesCode (minlength 3, maxlength 60)
- seriesYear (integer)
- documentType (2 chars)
- firstDocumentNumber (integer >=1)

Referências:
- Schema: `lib/schemas/index.ts` (solicitarSerieRequest)
- Handler: `app/api/agt/solicitarSerie/route.ts`
- Mock: `lib/server/agtMockService.ts` (solicitarSerie)

---

## 6) listarSeries
Campos:
- schemaVersion, submissionId, taxRegistrationNumber, submissionTimeStamp, softwareInfo, jwsSignature
- filtros opcionais: seriesCode, seriesYear, documentType, seriesStatus (A/U/F)

Referências:
- Schema: `lib/schemas/index.ts` (listarSeriesRequest)
- Handler: `app/api/agt/listarSeries/route.ts`
- Mock: `lib/server/agtMockService.ts` (listarSeries)

---

## 7) validarDocumento
Campos obrigatórios:
- schemaVersion, submissionId, taxRegistrationNumber (RECEPTOR), submissionTimeStamp, softwareInfo, jwsSignature
- documentNo (maxlength 60)
- emitterTaxRegistrationNumber (maxlength 15)
- action (C | R)
- rejectionReason (quando action = R)
- deductibleVATPercentage (0–100) opcional quando aplicável

Referências:
- Schema: `lib/schemas/index.ts` (validarDocumentoRequest)
- Handler: `app/api/agt/validarDocumento/route.ts`
- Mock: `lib/server/agtMockService.ts` (validarDocumento)

---

## Observações gerais
- Datas: `YYYY-MM-DD`; timestamps: ISO 8601
- UUID: `submissionGUID` no formato RFC4122 (v4 recomendado)
- Assinaturas: JWS RS256 com comprimento fixo (256) para `jwsSoftwareSignature`, `jwsDocumentSignature` e `jwsSignature`
- Campos opcionais podem aparecer com valor `null` quando não aplicável
- Validar totals (netTotal + taxPayable === grossTotal) e regras de arredondamento

---

## Deseja um ficheiro CSV/Excel com este checklist para enviar ao time SAP?
Posso também gerar exemplos prontos em XML (SOAP) e JSON para cada serviço.

