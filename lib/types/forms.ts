import type { DocumentType, TaxExemptionCode } from './index'

export interface FacturaLineInput {
  productDescription: string
  productCode?: string
  quantity: number
  unitPrice: number
  unitOfMeasure: string
  ivaExemptionCode?: TaxExemptionCode
  notes?: string
}

export interface FacturaFormInput {
  seriesId: string
  documentType: DocumentType
  documentDate: string
  customerTaxID: string
  customerName: string
  customerAddress?: string
  customerCountry: string
  eacCode: string
  paymentMechanism: string
  lines: FacturaLineInput[]
  currency: string
}
