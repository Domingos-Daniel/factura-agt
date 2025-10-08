'use client'

import jsPDF from 'jspdf'

import type { Factura } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { FileDown } from 'lucide-react'

function formatLines(lines: Factura['documents'][number]['lines']) {
  return lines.map((line) => `${line.lineNo}. ${line.productDescription} - ${line.quantity} x ${line.unitPrice.toFixed(2)} = ${(line.quantity * line.unitPrice).toFixed(2)}`).join('\n')
}

type PDFExporterProps = {
  factura: Factura
  documentIndex?: number
}

export function PDFExporter({ factura, documentIndex = 0 }: PDFExporterProps) {
  const handleDownload = () => {
    const document = factura.documents[documentIndex]
    if (!document) return

    const pdf = new jsPDF()
    pdf.setFontSize(16)
    pdf.text('Factura AGT', 14, 20)
    pdf.setFontSize(11)
    pdf.text(`Documento: ${document.documentNo}`, 14, 30)
    pdf.text(`Data: ${document.documentDate}`, 14, 36)
    pdf.text(`Cliente: ${document.companyName}`, 14, 42)
    pdf.text(`NIF: ${document.customerTaxID}`, 14, 48)

    pdf.text('Linhas:', 14, 60)
    pdf.text(formatLines(document.lines), 14, 66)

    pdf.text(`Total líquido: ${document.documentTotals.netTotal.toFixed(2)} ${document.documentTotals.currency}`, 14, 120)
    pdf.text(`Impostos: ${document.documentTotals.taxPayable.toFixed(2)} ${document.documentTotals.currency}`, 14, 126)
    pdf.text(`Total: ${document.documentTotals.grossTotal.toFixed(2)} ${document.documentTotals.currency}`, 14, 132)

    pdf.save(`factura-${document.documentNo}.pdf`)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDownload}>
      <FileDown className="mr-2 h-4 w-4" />
      Exportar PDF
    </Button>
  )
}
