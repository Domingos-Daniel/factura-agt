'use client'

import jsPDF from 'jspdf'
import type { Factura } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { FileDown } from 'lucide-react'

const TABLE_HEADERS = ['#', 'Descrição', 'Qtd', 'Preço', 'Total'] as const
const HEADER_POSITIONS = [50, 90, 340, 400, 460] as const

type PDFExporterProps = {
  factura: Factura
  documentIndex?: number
}

export function PDFExporter({ factura, documentIndex = 0 }: PDFExporterProps) {
  const downloadPdf = async () => {
    const document = factura.documents[documentIndex]
    if (!document) return

    const pdf = new jsPDF({ unit: 'pt', format: 'a4' })

    pdf.setFillColor(23, 89, 198)
    pdf.circle(68, 68, 36, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(20)
    pdf.text('AGT', 68, 76, { align: 'center' })

    pdf.setTextColor(28, 28, 30)
    pdf.setFontSize(14)
    pdf.text('República de Angola', 120, 48)
    pdf.setFontSize(22)
    pdf.text('Factura Eletrónica', 120, 78)
    pdf.setFontSize(12)
    pdf.text(`Documento nº ${document.documentNo}`, 120, 102)

    const qrUrl = `https://portaldocontribuinte.minfin.gov.ao/consultar-fe?documentNo=${document.documentNo.replace(/ /g, '%20')}`
    const { default: QRCode } = await import('qrcode')
    let qrDataUrl: string
    try {
      qrDataUrl = await QRCode.toDataURL(qrUrl, { errorCorrectionLevel: 'M', version: 4, margin: 1, width: 350, type: 'image/png' })
    } catch {
      qrDataUrl = await QRCode.toDataURL(qrUrl, { errorCorrectionLevel: 'M', margin: 1, width: 350, type: 'image/png' })
    }

    const canvas = globalThis.document.createElement('canvas')
    canvas.width = 350
    canvas.height = 350
    const ctx = canvas.getContext('2d')!
    
    const qrImg = new Image()
    await new Promise<void>((resolve) => {
      qrImg.onload = () => {
        ctx.drawImage(qrImg, 0, 0, 350, 350)
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(175, 175, 36, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#1759c6'
        ctx.beginPath()
        ctx.arc(175, 175, 30, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 24px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('AGT', 175, 175)
        resolve()
      }
      qrImg.src = qrDataUrl
    })

    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 420, 36, 150, 150)

    pdf.setDrawColor(230, 232, 236)
    pdf.roundedRect(40, 140, 240, 100, 8, 8, 'S')
    pdf.roundedRect(300, 140, 240, 100, 8, 8, 'S')
    pdf.setFontSize(11)
    pdf.setTextColor(108, 117, 125)
    pdf.text('Emitente', 56, 160)
    pdf.text('Cliente', 316, 160)
    pdf.setTextColor(33, 37, 41)
    pdf.text(factura.softwareInfo.productId, 56, 178)
    pdf.text(`NIF: ${factura.taxRegistrationNumber}`, 56, 194)
    pdf.text(factura.softwareInfo.productVersion, 56, 210)
    pdf.text(document.companyName, 316, 178)
    pdf.text(`NIF: ${document.customerTaxID}`, 316, 194)
    if (document.companyAddress) pdf.text(document.companyAddress, 316, 210, { maxWidth: 210 })

    const startY = 270
    pdf.setFillColor(23, 89, 198)
    pdf.setTextColor(255, 255, 255)
    pdf.roundedRect(40, startY, 500, 26, 6, 6, 'F')
    pdf.setFontSize(11)
    TABLE_HEADERS.forEach((header, index) => { const x = HEADER_POSITIONS[index]; if (x) pdf.text(header, x, startY + 17) })

    let rowY = startY + 40
    pdf.setTextColor(33, 37, 41)
    ;(document.lines || []).forEach((line) => {
      const lineTotal = line.quantity * line.unitPrice
      pdf.text(String(line.lineNo), 50, rowY)
      pdf.text(line.productDescription, 90, rowY, { maxWidth: 230 })
      pdf.text(line.quantity.toFixed(2), 340, rowY, { align: 'right' })
      pdf.text(line.unitPrice.toFixed(2), 410, rowY, { align: 'right' })
      pdf.text(lineTotal.toFixed(2), 490, rowY, { align: 'right' })
      rowY += 22
    })

    const totalsY = rowY + 20
    pdf.setDrawColor(230, 232, 236)
    pdf.roundedRect(320, totalsY - 10, 220, 80, 8, 8, 'S')
    const currencyCode = document.documentTotals.currency?.currencyCode || 'AOA'
    pdf.text('Totais', 334, totalsY)
    pdf.setFontSize(12)
    pdf.text(`Base: ${document.documentTotals.netTotal.toFixed(2)} ${currencyCode}`, 334, totalsY + 20)
    pdf.text(`Impostos: ${document.documentTotals.taxPayable.toFixed(2)} ${currencyCode}`, 334, totalsY + 38)
    pdf.setFontSize(13)
    pdf.text(`Total: ${document.documentTotals.grossTotal.toFixed(2)} ${currencyCode}`, 334, totalsY + 58)
    pdf.setFontSize(9)
    pdf.setTextColor(108, 117, 125)
    pdf.text(`Submetido em ${factura.submissionTimeStamp}  GUID ${factura.submissionGUID}`, 40, totalsY + 70)

    pdf.save(`factura-${document.documentNo}.pdf`)
  }

  const handleDownload = () => { void downloadPdf() }

  return (
    <Button variant="outline" size="sm" onClick={handleDownload}>
      <FileDown className="mr-2 h-4 w-4" />
      Exportar PDF
    </Button>
  )
}
