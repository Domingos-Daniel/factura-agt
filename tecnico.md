# Integração Técnica SAP → AGT (Factura Eletrónica)

Este documento consolida a especificação oficial da AGT (converted.md) e descreve como o nosso sistema irá mediar documentos vindos do SAP para o modelo de Facturação Eletrónica da AGT: formatos de payload, assinaturas, QR Code, endpoints, mapeamentos de dados, lacunas e plano de implementação.

## Escopo e contrato

- Entrada: Documentos de faturação oriundos do SAP (ordens de faturação/SD ou FI), com linhas, impostos e totais, mais metadados do software (produto, versão, número de certificação).
- Saída: Chamada ao serviço AGT registarFactura (lote até 30 docs), obtenção de requestID, monitorização do estado com obterEstado, consultas e listagens (consultarFactura, listarFacturas, listarSeries), e criação de séries (solicitarSerie) quando aplicável.
- Sucesso: requestID recebido; depois statusResult com documentos válidos (V) ou válidos com penalização (P). Em caso de erro estrutural, lista de erros 4xx; em caso de solicitação prematura/repetida, 422/429 conforme tabela.
- Erros esperados: E94 (NIF diferente), E95 (NIF emissor diferente), E96 (erro de estrutura), E97 (prematura), E98 (solicitações repetidas).

## Serviços REST AGT (conforme spec)

- POST registarFactura: regista solicitação (retorna requestID). Validação do conteúdo é posterior.
- POST obterEstado: devolve statusResult (resultCode, documentStatusList).
- POST listarFacturas: lista documentNo e documentDate por período.
- POST consultarFactura: devolve detalhe do(s) documento(s) por documentNo.
- POST solicitarSerie: cria série de numeração por tipo/ano (resultCode 1=sucesso).
- POST listarSeries: lista séries e respetivo estado/ano/tipo/método.
- POST validarDocumento: confirmação/rejeição pelo adquirente (C/R) com percentagem de IVA dedutível quando aplicável.

Notas técnicas gerais:
- Arquitetura REST, JSON, com suporte a null em campos opcionais.
- Auditoria: registar eventos, erros e alterações.
- Respeitar formatos numéricos e caracteres portugueses.

## Estrutura de dados (núcleo)

Payload do POST registarFactura (resumo):
- schemaVersion: string (ex: "1.0").
- submissionGUID: UUID v4 único por contribuinte emissor.
- taxRegistrationNumber: NIF emissor (max 15).
- submissionTimeStamp: ISO 8601 (UTC ou com timezone).
- softwareInfo: { softwareInfoDetail, jwsSoftwareSignature }
  - softwareInfoDetail: { productId, productVersion, softwareValidationNumber }
  - jwsSoftwareSignature: assinatura JWS do objeto softwareInfo (256 chars na spec)
- numberOfEntries: inteiro
- documents: array de até 30 documentos (document)

Documento (resumo de campos-chave):
- documentNo: "<codigoInterno> - <seriesCode>/ - <sequencial>" (8 a 60 chars)
- documentStatus: N | S | A | R | C
- documentCancelReason: I | N (obrigatório se A)
- rejectedDocumentNo: obrigatório se C
- jwsDocumentSignature: assinatura JWS com campos: documentNo, taxRegistrationNumber, documentType, documentDate, customerTaxID, customerCountry, companyName, documentTotals
- documentDate: YYYY-MM-DD
- documentType: FA | FT | FR | FG | AC | AR | TV | RC | RG | RE | ND | NC | AF | RP | RA | CS | LD
- eacCode: 5 caracteres (CAE)
- systemEntryDate: ISO 8601 (data/hora no momento da assinatura)
- customerCountry: ISO 3166-1 alpha-2 (AO doméstico)
- customerTaxID: NIF em Angola para AO; "999999999" para domésticos sem identificação
- companyName
- lines: obrigatório exceto AR, RC, RG
  - lineNumber, productCode, productDescription, quantity, unitOfMeasure, unitPrice, unitPriceBase, referenceInfo?, debitAmount? | creditAmount?, taxes[], settlementAmount
- paymentReceipt: obrigatório para AR, RC, RG
  - sourceDocuments: [{ lineNo, sourceDocumentID, debitAmount? | creditAmount? }]
  - sourceDocumentID: { OriginatingON, documentDate }
- documentTotals: { taxPayable, netTotal, grossTotal, currency? }
  - currency: { currencyCode, currencyAmount, exchangeRate } se moeda != AOA
- withholdingTaxList?: [{ withholdingTaxType, withholdingTaxDescription?, withholdingTaxAmount }]

Linhas de impostos (taxes):
- taxType: IVA | IS | IEC | NS
- taxCountryRegion: AO ou AO-CAB, ou ISO 3166-1 alpha-2 para países
- taxCode: conforme taxType (IVA: NOR/INT/RED/ISE/OUT; IS: verba; IEC: código pautal; ISE)
- taxBase?: quando a base não constitui receita do sujeito passivo
- taxPercentage?: percentagem (0 se isento/não sujeito)
- taxAmount?: valor fixo da verba de IS
- taxContribution?: imposto calculado (arredondamento por excesso ao cêntimo)
- taxExemptionCode?: obrigatório se ISE ou NS (ver Tabelas 4/5/6)

Estados de validação (obterEstado.statusResult):
- resultCode: 0 (sem inválidas), 1 (com válidas e inválidas), 2 (sem válidas), 7 (prematura/repetida), 8 (em curso), 9 (cancelado)
- documentStatusList: [{ documentNo, documentStatus: V | I | P, errorList? }]

## QR Code nos impressos

- Padrão: QR Code Model 2, Versão 4 (33x33), Nível M (15%), Modo Byte, UTF-8
- URL: https://portaldocontribuinte.minfin.gov.ao/consultar-fe?documentNo
- Espaços no documentNo substituídos por %20
- Formato PNG 350x350 px
- Logotipo AGT pode ser incluído (<= 20% da imagem)

No projeto: `components/QRGenerator.tsx` e geração de URL já seguem o formato indicado no formulário de fatura.

## Mapeamento do nosso modelo → AGT (diferenças e ajustes)

Ficheiro base: `lib/types/index.ts`

Diferenças a resolver:
- DocumentType: atualmente contempla FT, FR, FA, NC, ND, AR, RC, RG; faltam FG, AC, TV, RE, AF, RP, RA, CS, LD.
- DocumentStatus: atual {N, A, F, S}. Pela spec: {N, S, A, R, C} para envio e {V, I, P} para resultado; remover F; ajustar S (significado) e adicionar R e C; manter ajuste na UI.
- TaxType: atual {IVA, IS, IEC}; falta NS (Não Sujeito).
- TaxLine: usar taxCountryRegion em vez de taxCountry; alinhar taxCode conforme regras por taxType; adicionar taxContribution (arredondamento por excesso) e taxExemptionCode obrigatório quando ISE/NS.
- Linhas: o nosso campo `tax` deve ser renomeado para `taxes` (array) e incluir unitPriceBase, referenceInfo (para NC), debitAmount/creditAmount mutuamente exclusivos.
- Currency: hoje `DocumentTotals.currency: string`; pela spec, deve ser objeto `{ currencyCode, currencyAmount, exchangeRate }` quando moeda != AOA.
- withholdingTaxList: `withholdingTaxDescription` é opcional na spec (obrigatório no nosso tipo); tornar opcional.
- Campos de série/numeração: `documentNo` já no formato "<codigo> - <serie>/ - <seq>"; garantir limites de tamanho e preenchimento zero do sequencial; e inclusão do ano na série (`seriesCode` deve conter ano: 25 ou 2025).
- Estados de série: alinhar `SeriesStatus` com A/U/F e campos `invoicingMethod` (FEPC/FESF/SF) nos resultados de listarSeries.
- Assinaturas JWS: já temos `jwsSoftwareSignature` e `jwsDocumentSignature`. Precisamos de garantir a composição exata dos campos e o algoritmo/gestão de chaves (ver secção Segurança).

Campos adicionais a introduzir (conforme spec):
- documentCancelReason, rejectedDocumentNo, referenceInfo, paymentReceipt.sourceDocuments, sourceDocumentID, unitPriceBase, settlementAmount por linha, taxContribution, taxExemptionCode, currency object.

Validações e regras:
- Máximo 30 documentos por submissão.
- Para AR/RC/RG: lines vazio e paymentReceipt preenchido; totais baseados em documentos origem.
- Arredondamento de imposto por excesso ao cêntimo para taxContribution.
- customerTaxID = "999999999" em AO sem identificação.

## Fluxo de mediação SAP → AGT

1) Entrada (SAP):
	- Origens: OData/REST de SD/FI, Event Mesh/webhook, ou export batch.
	- Conteúdo mínimo: cabeçalho (NIF emissor, cliente, data, tipo, CAE, série, sequencial), linhas (quantidade, preço, unidade), impostos (IVA/IS/IEC/NS) com percentuais/verbas, totais, moeda.

2) Normalização e enriquecimento:
	- Mapear tipos de documento SAP → AGT (FT/FR/NC/…); validar série contém ano.
	- Validar CAE (ver `lib/data/tabelaCAE.ts`) e códigos fiscais (IVA/IS/IEC) com `lib/data/*`.
	- Calcular unitPriceBase, settlementAmount por linha e taxContribution com arredondamento por excesso.
	- Determinar taxCode por taxType e regra (NOR/INT/RED/ISE/OUT; verbas IS; pautas IEC).
	- Preencher currency se moeda != AOA (código, montante e câmbio).

3) Assinaturas e segurança:
	- jwsSoftwareSignature: assinatura do objeto softwareInfo.
	- jwsDocumentSignature: assinar campos: documentNo, taxRegistrationNumber, documentType, documentDate, customerTaxID, customerCountry, companyName, documentTotals.
	- Gestão de chaves: armazenar chaves privadas de produtor/emissor em KMS/HSM; rotação e segregação; nunca em repositório.

4) Submissão e acompanhamento:
	- POST registarFactura com lote (<=30); capturar requestID.
	- Persistir requestID e relação com documentos submetidos.
	- Backoff para obterEstado: respeitar E97 (prematura) e E98 (rate limit). Re-tentar após intervalo mínimo.
	- Atualizar estado (V/I/P) por documentNo; anexar errorList quando inválido.

5) Consulta e impressão:
	- consultarFactura/listarFacturas conforme necessidade.
	- Geração de PDF com QR Code do documentNo (já implementado em `components/PDFExporter.tsx` + `components/QRGenerator.tsx`).

6) Integração reversa com SAP:
	- Retornar requestID, estado, e documentNo; no caso V/P, marcar documento emitido/penalizado; no caso I, sinalizar rejeição/estorno.

## Segurança e conformidade

- TLS obrigatório para chamadas; validação de certificados.
- Autenticação aos serviços AGT: conforme integração (none/basic/apiKey/bearer) – parametrizado via `.env` e `lib/server/integrationCatalogue.ts`.
- Chaves JWS em KMS/HSM; assinatura no servidor.
- Auditoria: registar payloads (ofuscar dados sensíveis), respostas, timestamps, utilizador, IP, chaves/versões, e hash de conteúdo.

## Observabilidade e operações

- Status Board: já implementado (`components/integrations/IntegrationStatusBoard.tsx`) consulta `app/api/integrations/status/route.ts`.
- Métricas desejadas: taxa de sucesso por submissão, tempo de validação (request→status V/I), latência média, erros por código (E9x), disponibilidade por integração.
- Retenção de logs e trilhas de auditoria conforme política interna.

## Lacunas (Gaps) no código atual e ações

1) Modelos/tipos (`lib/types/index.ts`):
	- [ ] Expandir DocumentType com todos os tipos AGT; ajustar rótulos na UI.
	- [ ] Ajustar DocumentStatus para envio (N/S/A/R/C) e resultados (V/I/P) onde aplicável.
	- [ ] Incluir NS em TaxType; renomear taxCountry → taxCountryRegion; adicionar taxContribution e regras de arredondamento.
	- [ ] Renomear `ProductLine.tax` → `taxes` e incluir unitPriceBase, referenceInfo, mutual exclusivity debitAmount/creditAmount.
	- [ ] Alterar DocumentTotals.currency para objeto conforme spec; condicional para moeda != AOA.
	- [ ] Tornar withholdingTaxDescription opcional e alinhar tipos de código (IRT/II/IS/IVA/IP/IAC/OU/IRPC/IRPS).
	- [ ] Adicionar campos: documentCancelReason, rejectedDocumentNo, paymentReceipt.sourceDocuments.

2) Validação/calculadora de impostos (`lib/taxCalculator.ts`):
	- [ ] Introduzir cálculo de taxContribution e arredondamento por excesso.
	- [ ] Validar emissão AR/RC/RG sem linhas e totais agregados de origem.
	- [ ] Validar obrigatoriedade de taxExemptionCode quando ISE/NS.

3) Assinaturas JWS:
	- [ ] Implementar módulo server-side para assinar `softwareInfo` e `document` com chaves reais (placeholder hoje em `lib/mockAPI.ts`).
	- [ ] Definir armazenamento seguro das chaves e formato JWS/algoritmo (confirmar com AGT; por norma RS256/ECDSA é comum).

4) Séries:
	- [ ] UI/serviço para solicitarSerie (ano corrente até 15/12; após, ano corrente e seguinte) e listarSeries com `invoicingMethod`.
	- [ ] Validar `seriesCode` contém ano (2 ou 4 dígitos) e `firstDocumentNumber >= 1`.

5) APIs AGT reais:
	- [ ] Isolar clientes HTTP com timeouts e retries com recuo exponencial; mapear erros E9x e 4xx/5xx.
	- [ ] Políticas de rate limit (429/E98) e janela entre obterEstado (E97).

6) PDF/QR:
	- [ ] Garantir QR com version=4, M, 350x350 e substituição de espaço por %20; opção de overlay de logo AGT <= 20%.

## Plano de implementação (fases)

Fase 1 – Modelos e validações (backend + UI)
- Atualizar tipos e validações de formulário para linhas/impostos/totais e estados.
- Implementar arredondamento por excesso e regras de obrigatoriedade (ISE/NS, AR/RC/RG, NC referenceInfo).

Fase 2 – Assinaturas e segurança
- Módulo de JWS no servidor (assinar softwareInfo e documentos); gestão de chaves (KMS/HSM); variáveis em `.env`.

Fase 3 – Cliente AGT e orquestração
- Implementar clientes REST para registarFactura/obterEstado/... com retries/backoff e mapeamento de erros.
- Persistir requestID e estado; jobs/background para polling de obterEstado.

Fase 4 – Séries e conformidade de impressão
- Fluxos solicitarSerie/listarSeries; validações de série/ano.
- PDF com QR conforme spec (aparência e dimensões); opcionais: logo AGT.

Fase 5 – Integração SAP
- Conector (OData/Event Mesh) para entrada; mapeamento e normalização; retorno de estado/resultados ao SAP.

## Critérios de aceitação e testes

- Enviar lote com 2 documentos (FT e FR) → receber requestID e, após polling, obter V (ou P quando >24h sem contingência).
- Enviar NC com referenceInfo obrigatório → validar retorno V; sem referenceInfo → retorno I com errorList.
- Enviar AR/RC/RG sem lines e com paymentReceipt → aceitar e calcular totais por origem.
- Enviar linha com ISE/NS sem taxExemptionCode → rejeição (I) com erro coerente.
- Verificar arredondamento de taxContribution por excesso (exemplos da spec).
- QR no PDF abre URL oficial com documentNo codificado.

## Notas finais

- As Tabelas (CAE, IEC, IS, IVA) estão no `converted.md` e as nossas tabelas utilitárias em `lib/data/*`. Validar cobertura e atualização periódica.
- Manter documentação de variáveis de ambiente no `.env.example` (endpoints SAP/AGT, timeouts/SLAs, auths, intervalos de monitorização).

