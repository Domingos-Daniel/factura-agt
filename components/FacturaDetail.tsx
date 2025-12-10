import { useCallback, useEffect, useState } from 'react'

import type { Factura } from '@/lib/types'
import { updateFactura } from '@/lib/storage'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
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
  const initialStatus = factura.validationStatus ?? 'P'
  const [status, setStatus] = useState<'P' | 'V' | 'I'>(initialStatus)
  const [messages, setMessages] = useState<string[]>(factura.validationMessages ?? [])
  const [isFetchingStatus, setIsFetchingStatus] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const { toast } = useToast()

  const handleObterEstado = useCallback(async () => {
    if (!document?.documentNo) {
      toast({
        variant: 'destructive',
        title: 'Não é possível consultar',
        description: 'Esta factura não possui número de documento.',
      })
      return
    }

    setIsFetchingStatus(true)
    try {
      const response = await fetch('/api/agt/consultarFactura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taxRegistrationNumber: factura.taxRegistrationNumber,
          documentNo: document.documentNo,
        }),
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        toast({
          variant: 'destructive',
          title: 'Erro na consulta AGT',
          description: result.error ?? 'Não foi possível consultar o documento junto da AGT.',
        })
        return
      }

      const agtStatus = result.data.processingStatus
      const newStatus: 'P' | 'V' | 'I' =
        agtStatus === 'Processado' ? 'V' : agtStatus === 'Rejeitado' ? 'I' : 'P'
      const newMessages = [
        `ReturnCode: ${result.data.returnCode}`,
        `ReturnMessage: ${result.data.returnMessage}`,
        `Status: ${agtStatus}`,
      ]

      setStatus(newStatus)
      setMessages(newMessages)
      if (factura.id) {
        updateFactura(factura.id, {
          validationStatus: newStatus === 'P' ? undefined : newStatus,
          validationMessages: newMessages,
        })
      }

      toast({
        title: 'Estado AGT atualizado',
        description:
          newStatus === 'V'
            ? 'Documento processado com sucesso pela AGT.'
            : newStatus === 'I'
              ? 'Documento rejeitado. Verifique as mensagens AGT.'
              : 'Documento ainda em processamento na AGT.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro de conexão',
        description: error instanceof Error ? error.message : 'Falha ao consultar a AGT.',
      })
    } finally {
      setIsFetchingStatus(false)
    }
  }, [document?.documentNo, factura.taxRegistrationNumber, factura.id, toast])

  useEffect(() => {
    if (!autoRefresh || status !== 'P') return
    const interval = setInterval(() => {
      void handleObterEstado()
    }, 15000)
    return () => clearInterval(interval)
  }, [autoRefresh, status, handleObterEstado])

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

  const qrValue = `https://portaldocontribuinte.minfin.gov.ao/consultar-fe?documentNo=${encodeURIComponent(
    document.documentNo
  )}`

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
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleObterEstado} disabled={isFetchingStatus}>
                {isFetchingStatus ? 'A consultar...' : 'Obter estado'}
              </Button>
              {status === 'P' && (
                <Button
                  variant={autoRefresh ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                >
                  {autoRefresh ? 'Auto-refresh ativo' : 'Ativar auto-refresh'}
                </Button>
              )}
              <PDFExporter factura={factura} />
            </div>
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
              Total bruto: {formatCurrency(document.documentTotals.grossTotal, document.documentTotals.currency?.currencyCode)}
            </p>
            <p className="text-sm text-muted-foreground">
              Impostos: {formatCurrency(document.documentTotals.taxPayable, document.documentTotals.currency?.currencyCode)}
            </p>
            <p className="text-sm text-muted-foreground">
              Total líquido: {formatCurrency(document.documentTotals.netTotal, document.documentTotals.currency?.currencyCode)}
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
                      {line.taxes && line.taxes.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                          IVA: {line.taxes.find((tax) => tax.taxType === 'IVA')?.taxPercentage ?? 0}%
                      </p>
                    )}
                  </TableCell>
                  <TableCell>{line.quantity}</TableCell>
                  <TableCell>{formatCurrency(line.unitPrice, document.documentTotals.currency?.currencyCode)}</TableCell>
                  <TableCell>{formatCurrency(line.quantity * line.unitPrice, document.documentTotals.currency?.currencyCode)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
  <QRGenerator value={qrValue} title="QR Code" subtitle="Resumo do documento" size={260} />

        {messages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Mensagens de validação</CardTitle>
              <CardDescription>Feedback da AGT</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-2 pl-4 text-sm">
                {messages.map((message, index) => (
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
