import { v4 as uuidv4 } from 'uuid'

import { getSeries, saveSeries, getFacturas, saveFacturas } from './storage'
import type { Serie, Factura } from './types'
import { generateJWSSignature, generateDocumentNo } from './mockAPI'

export function seedMockData(): void {
  if (typeof window === 'undefined') return

  const existingSeries = getSeries()
  if (existingSeries.length === 0) {
    const now = new Date().toISOString()
    const baseSeries: Serie[] = [
      {
        id: uuidv4(),
        seriesCode: 'FT2024',
        seriesYear: 2024,
        documentType: 'FT',
        firstDocumentNumber: 1,
        currentSequence: 5,
        status: 'U',
        requestDate: now,
      },
      {
        id: uuidv4(),
        seriesCode: 'FR2024',
        seriesYear: 2024,
        documentType: 'FR',
        firstDocumentNumber: 1,
        currentSequence: 2,
        status: 'A',
        requestDate: now,
      },
    ]
    saveSeries(baseSeries)
  }

  const existingFacturas = getFacturas()
  if (existingFacturas.length === 0) {
    const submissionTime = new Date().toISOString()
    const documentNo = generateDocumentNo('AGT', 'FT2024', 5)

    const factura: Factura = {
      id: uuidv4(),
      schemaVersion: '1.0',
      submissionGUID: uuidv4(),
      taxRegistrationNumber: '500000000',
      submissionTimeStamp: submissionTime,
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
          documentDate: submissionTime.split('T')[0],
          documentType: 'FT',
          eacCode: '62010',
          systemEntryDate: submissionTime,
          transactionDate: submissionTime.split('T')[0],
          customerCountry: 'AO',
          customerTaxID: '700000000',
          companyName: 'Cliente Exemplo Lda',
          companyAddress: 'Luanda, Angola',
          lines: [
            {
              lineNo: 1,
              productCode: 'SERV001',
              productDescription: 'Serviços de consultoria',
              quantity: 1,
              unitOfMeasure: 'UN',
              unitPrice: 150000,
              taxPointDate: submissionTime.split('T')[0],
              description: 'Consultoria fiscal AGT',
              tax: [
                {
                  taxType: 'IVA',
                  taxCountry: 'AO',
                  taxCode: 'IVA',
                  taxPercentage: 14,
                  taxBase: 150000,
                  taxAmount: 21000,
                },
              ],
            },
          ],
          paymentReceipt: {
            paymentMethod: [
              {
                paymentMechanism: 'TB',
                paymentAmount: 171000,
                paymentDate: submissionTime.split('T')[0],
              },
            ],
          },
          documentTotals: {
            netTotal: 150000,
            taxPayable: 21000,
            grossTotal: 171000,
            currency: 'AOA',
          },
        },
      ],
      requestID: uuidv4(),
      validationStatus: 'V',
      validationMessages: ['Factura validada pelo ambiente de homologação'],
      createdAt: submissionTime,
      updatedAt: submissionTime,
    }

    saveFacturas([factura])
  }
}
