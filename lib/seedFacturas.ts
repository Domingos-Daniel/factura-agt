import type { Factura } from './types'

export const seedFacturas: Factura[] = [
  {
    schemaVersion: '1.0',
    submissionGUID: '550e8400-e29b-41d4-a716-446655440001',
    taxRegistrationNumber: '5000012345',
    submissionTimeStamp: '2025-10-01T10:30:00Z',
    softwareInfo: {
      productId: 'FacturaAGT',
      productVersion: '1.0.0',
      softwareValidationNumber: 'AGT2025001',
      jwsSoftwareSignature: 'eyJhbGciOiJSUzI1NiJ9...'
    },
    documents: [
      {
        documentNo: 'FT 2025/001',
        documentStatus: 'N',
        jwsDocumentSignature: 'eyJhbGciOiJSUzI1NiJ9...',
        documentDate: '2025-10-01',
        documentType: 'FT',
        systemEntryDate: '2025-10-01T10:30:00',
        customerCountry: 'AO',
        customerTaxID: '5000098765',
        companyName: 'Supermercado Central Lda',
        eacCode: '47111',
        lines: [
          {
            lineNo: 1,
            productDescription: 'Arroz Branco 5kg',
            quantity: 50,
            unitOfMeasure: 'UN',
            unitPrice: 2500.00,
            debitAmount: 125000.00,
            taxes: [
              {
                taxType: 'IVA',
                taxCountryRegion: 'AO',
                taxCode: 'NOR',
                taxPercentage: 14,
                taxBase: 125000.00,
                taxAmount: 17500.00
              }
            ]
          }
        ],
        documentTotals: {
          taxPayable: 17500.00,
          netTotal: 125000.00,
          grossTotal: 142500.00
        }
      }
    ],
    requestID: 'AGT-20251001-0001',
    validationStatus: 'V'
  }
]
