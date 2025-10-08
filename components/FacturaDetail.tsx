import type { Factura } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { PDFExporter } from '@/components/PDFExporter'
import { QRGenerator } from '@/components/QRGenerator'

const statusLabels: Record<'P' | 'V' | 'I', { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  P: { label: 'Pendente', variant: 'secondary' },
  V: { label: 'Válida', variant: 'default' },
  I: { label: 'Inválida', variant: 'destructive' },
}

type FacturaDetailProps = {
  factura: Factura
}

export function FacturaDetail({ factura }: FacturaDetailProps) {
  const document = factura.documents[0]
  const status = factura.validationStatus ?? 'P'

  if (!document) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Detalhes da factura</CardTitle>
          <CardDescription>Documento não encontrado</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const qrValue = JSON.stringify({
    documentNo: document.documentNo,
    taxId: document.customerTaxID,
    total: document.documentTotals.grossTotal,
    date: document.documentDate,
  })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Factura {document.documentNo}</CardTitle>
            <CardDescription>Emitida em {formatDate(document.documentDate)}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusLabels[status].variant}>{statusLabels[status].label}</Badge>
            <PDFExporter factura={factura} />
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground">Cliente</h4>
            <p className="text-base font-medium">{document.companyName}</p>
            <p className="text-sm text-muted-foreground">NIF: {document.customerTaxID}</p>
            {document.companyAddress && (
              <p className="text-sm text-muted-foreground">{document.companyAddress}</p>
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground">Totais</h4>
            <p className="text-base font-medium">
              Total bruto: {formatCurrency(document.documentTotals.grossTotal, document.documentTotals.currency)}
            </p>
            <p className="text-sm text-muted-foreground">
              Impostos: {formatCurrency(document.documentTotals.taxPayable, document.documentTotals.currency)}
            </p>
            <p className="text-sm text-muted-foreground">
              Total líquido: {formatCurrency(document.documentTotals.netTotal, document.documentTotals.currency)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Linhas da factura</CardTitle>
          <CardDescription>Produtos e serviços faturados</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Preço unitário</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {document.lines.map((line) => (
                <TableRow key={line.lineNo}>
                  <TableCell>{line.lineNo}</TableCell>
                  <TableCell>
                    <div className="font-medium">{line.productDescription}</div>
                    {line.tax.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        IVA: {line.tax.find((tax) => tax.taxType === 'IVA')?.taxPercentage ?? 0}%
                      </p>
                    )}
                  </TableCell>
                  <TableCell>{line.quantity}</TableCell>
                  <TableCell>{formatCurrency(line.unitPrice, document.documentTotals.currency)}</TableCell>
                  <TableCell>{formatCurrency(line.quantity * line.unitPrice, document.documentTotals.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <QRGenerator value={qrValue} title="QR Code" subtitle="Resumo do documento" />

        {factura.validationMessages && factura.validationMessages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Mensagens de validação</CardTitle>
              <CardDescription>Feedback da AGT</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-2 pl-4 text-sm">
                {factura.validationMessages.map((message, index) => (
                  <li key={index}>{message}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
