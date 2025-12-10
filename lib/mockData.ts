import { v4 as uuidv4 } from 'uuid'

import { getSeries, saveSeries, getFacturas, saveFacturas } from './storage'
import type { Serie, Factura } from './types'
import { generateJWSSignature, generateDocumentNo } from './mockAPI'

export function seedMockData(): void {
  if (typeof window === 'undefined') return

  let series = getSeries()
  if (series.length === 0) {
    const now = new Date()
    const documentTypes: Serie['documentType'][] = ['FT', 'FR', 'FA', 'NC', 'ND', 'RC', 'RG', 'AR']
    series = Array.from({ length: 10 }, (_, index) => {
      const documentType = documentTypes[index % documentTypes.length]
      const year = 2025 - Math.floor(index / 3)
      const seriesCode = `${documentType}${year}`
      return {
        id: uuidv4(),
        seriesCode,
        seriesYear: year,
        documentType,
        firstDocumentNumber: 1,
        currentSequence: 0,
        status: index % 3 === 0 ? 'U' : index % 3 === 1 ? 'A' : 'F',
        requestDate: new Date(now.getTime() - index * 86400000).toISOString(),
        approvalDate: new Date(now.getTime() - index * 43200000).toISOString(),
      } satisfies Serie
    })
    saveSeries(series)
  }

  const existingFacturas = getFacturas()
  if (existingFacturas.length === 0) {
    const seriesSnapshot = series.map((serie) => ({ ...serie }))
    const clientes = [
      { nome: 'Mercantil Luanda, Lda', nif: '541230987', endereco: 'Zona Económica Especial, Viana' },
      { nome: 'Benguela Bebidas SA', nif: '700112345', endereco: 'Av. da Marginal, Benguela' },
      { nome: 'Huambo Agro', nif: '620987654', endereco: 'Rua do Comércio, Huambo' },
      { nome: 'Lubango Serviços', nif: '501234567', endereco: 'Centro Empresarial do Lubango' },
      { nome: 'Namibe Pescas', nif: '580001234', endereco: 'Porto Comercial, Namibe' },
    ]

    const produtos = [
      { codigo: 'SERV001', descricao: 'Consultoria fiscal', unidade: 'UN', preco: 145000, cae: '69200' },
      { codigo: 'SERV045', descricao: 'Implementação software AGT', unidade: 'UN', preco: 195000, cae: '62010' },
      { codigo: 'PROD210', descricao: 'Cerveja artesanal', unidade: 'CX', preco: 24000, cae: '11050' },
      { codigo: 'PROD310', descricao: 'Água engarrafada 1.5L', unidade: 'CX', preco: 9000, cae: '11070' },
      { codigo: 'SERV512', descricao: 'Transporte rodoviário', unidade: 'UN', preco: 68000, cae: '49410' },
    ]

    const facturas: Factura[] = []
    const now = new Date()

    for (let index = 0; index < 20; index++) {
      const serie = seriesSnapshot[index % seriesSnapshot.length]
      const cliente = clientes[index % clientes.length]
      const produtoPrincipal = produtos[index % produtos.length]
      const quantidadePrincipal = ((index % 3) + 1) * (index % 2 === 0 ? 1 : 2)

      const sequencial = serie.currentSequence + 1
      serie.currentSequence = sequencial

      const submissionDate = new Date(now.getTime() - index * 86400000)
      const submissionStamp = submissionDate.toISOString()
      const documentDate = submissionStamp.split('T')[0]
      const documentNo = generateDocumentNo('AGT', serie.seriesCode, sequencial)

  const linhas = [] as Factura['documents'][number]['lines']

      const basePrincipal = quantidadePrincipal * produtoPrincipal.preco
      linhas.push({
        lineNo: 1,
        productCode: produtoPrincipal.codigo,
        productDescription: produtoPrincipal.descricao,
        quantity: quantidadePrincipal,
        unitOfMeasure: produtoPrincipal.unidade,
        unitPrice: produtoPrincipal.preco,
        taxPointDate: documentDate,
        description: `Prestação referente a ${documentDate}`,
        taxes: [
          {
            taxType: 'IVA',
            taxCountryRegion: 'AO',
            taxCode: 'NOR',
            taxPercentage: 14,
            taxBase: basePrincipal,
            taxAmount: Number((basePrincipal * 0.14).toFixed(2)),
            taxContribution: Number((basePrincipal * 0.14).toFixed(2)),
          },
        ],
      })

      if (index % 4 === 0) {
        const adicional = produtos[(index + 2) % produtos.length]
        const quantidadeAdicional = (index % 3) + 1
        const baseAdicional = quantidadeAdicional * adicional.preco
        linhas.push({
          lineNo: 2,
          productCode: adicional.codigo,
          productDescription: adicional.descricao,
          quantity: quantidadeAdicional,
          unitOfMeasure: adicional.unidade,
          unitPrice: adicional.preco,
          taxPointDate: documentDate,
          description: 'Item adicional',
          taxes: [
            {
              taxType: 'IVA',
              taxCountryRegion: 'AO',
              taxCode: 'NOR',
              taxPercentage: 14,
              taxBase: baseAdicional,
              taxAmount: Number((baseAdicional * 0.14).toFixed(2)),
              taxContribution: Number((baseAdicional * 0.14).toFixed(2)),
            },
          ],
        })
      }

      const netTotal = linhas.reduce((acc, linha) => acc + linha.quantity * linha.unitPrice, 0)
  const taxTotal = Number((linhas.reduce((acc, linha) => acc + (linha.taxes?.[0]?.taxAmount ?? 0), 0)).toFixed(2))
      const grossTotal = Number((netTotal + taxTotal).toFixed(2))

      const status = index % 6 === 0 ? 'I' : index % 5 === 0 ? undefined : 'V'
      const mensagens =
        status === 'I'
          ? ['Erro: divergência no NIF do adquirente', 'Validar dados do cliente antes de reenviar']
          : status === 'V'
            ? ['Factura validada com sucesso no ambiente de homologação']
            : ['Factura submetida, aguarde validação da AGT']

      const factura: Factura = {
        id: uuidv4(),
        schemaVersion: '1.0',
        submissionGUID: uuidv4(),
        taxRegistrationNumber: '500000000',
        submissionTimeStamp: submissionStamp,
        softwareInfo: {
          productId: 'FACTURA-AGT-PROTOTIPO',
          productVersion: '0.1.0',
          softwareValidationNumber: 'AGT-NONPROD-0001',
          jwsSoftwareSignature: generateJWSSignature(),
        },
        documents: [
          {
            documentNo,
            documentStatus: 'N',
            jwsDocumentSignature: generateJWSSignature(),
            documentDate,
            documentType: serie.documentType,
            eacCode: produtoPrincipal.cae,
            systemEntryDate: submissionStamp,
            transactionDate: documentDate,
            customerCountry: 'AO',
            customerTaxID: cliente.nif,
            companyName: cliente.nome,
            companyAddress: cliente.endereco,
            lines: linhas,
            paymentReceipt: {
              paymentMethod: [
                {
                  paymentMechanism: index % 2 === 0 ? 'TB' : 'NU',
                  paymentAmount: grossTotal,
                  paymentDate: documentDate,
                },
              ],
            },
            documentTotals: {
              netTotal,
              taxPayable: taxTotal,
              grossTotal,
            },
          },
        ],
        requestID: uuidv4(),
        validationStatus: status,
        validationMessages: mensagens,
        createdAt: submissionStamp,
        updatedAt: submissionStamp,
      }

      facturas.push(factura)
    }

    saveFacturas(facturas)
    saveSeries(seriesSnapshot)
  }
}
