'use client'

import React, { useState } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ParsedExcelData, ExcelRow } from '@/lib/excelParser'
import { formatDecimal } from '@/lib/excelMapping'

interface ExcelPreviewProps {
  data: ParsedExcelData
  onConfirm: (rows: ExcelRow[]) => void
  onCancel: () => void
  isProcessing?: boolean
}

export function ExcelPreview({
  data,
  onConfirm,
  onCancel,
  isProcessing = false,
}: ExcelPreviewProps) {
  const [showErrors, setShowErrors] = useState(data.errors.length > 0)
  const [showAll, setShowAll] = useState(false)

  const displayRows = showAll ? data.rows : data.rows.slice(0, 5)
  const hasMoreRows = data.rows.length > 5

  // Detectar se dados estão vazios (template vazio)
  const hasEmptyData = data.rows.length > 0 && data.summary.totalAmount === 0 && 
    data.rows.every(row => {
      // Verificar se todos os campos importantes estão vazios
      const isAGT = row['Nº Docum'] !== undefined
      const isModelo2 = row['Nº Documento'] !== undefined
      
      if (isModelo2) {
        return !row['Nº Documento'] || !row['Nome E']
      } else if (isAGT) {
        return !row['Nº Docum'] || !row['Nº Cliente'] || !row['Nome E']
      } else {
        return !row.VBELN || !row.STCD1 || !row.NAME1
      }
    })

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
          <p className="text-sm text-muted-foreground">Total de Linhas</p>
          <p className="text-2xl font-bold">{data.summary.totalRows}</p>
        </div>

        <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
          <p className="text-sm text-muted-foreground">Válidas</p>
          <p className="text-2xl font-bold text-green-600">{data.summary.validRows}</p>
        </div>

        <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
          <p className="text-sm text-muted-foreground">Com Erros</p>
          <p className="text-2xl font-bold text-red-600">{data.summary.errorRows}</p>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg">
          <p className="text-sm text-muted-foreground">Valor Total</p>
          <p className="text-2xl font-bold">
            {data.summary.totalAmount.toLocaleString('pt-AO', {
              style: 'currency',
              currency: 'AOA',
            })}
          </p>
        </div>
      </div>

      {/* Tipos de Documento */}
      {Object.keys(data.summary.documentTypes).length > 0 && (
        <div className="bg-muted/50 p-4 rounded-lg">
          <p className="font-semibold text-sm mb-3">Tipos de Documento Detectados</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.summary.documentTypes).map(([docType, count]) => (
              <span
                key={docType}
                className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
              >
                {docType}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Alertas */}
      {hasEmptyData && (
        <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-900">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <strong>⚠️ Template Vazio Detectado</strong>
            <p className="mt-1">
              Este ficheiro parece ser um template sem dados. As linhas estão vazias ou com valores placeholder.
            </p>
            <div className="mt-2 text-sm">
              <p className="font-semibold">💡 Sugestões:</p>
              <ul className="list-disc list-inside ml-2 mt-1">
                <li>Baixe <a href="/templates/modelo-planilha-exemplo.xlsx" className="underline font-semibold" download>modelo-planilha-exemplo.xlsx</a> (com dados)</li>
                <li>Ou preencha este template com seus dados reais</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {data.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Existem {data.errors.length} linha(s) com erro. Verifique-as antes de processar.
          </AlertDescription>
        </Alert>
      )}

      {data.success && (
        <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            ✓ Todos os dados foram validados com sucesso!
          </AlertDescription>
        </Alert>
      )}

      {/* Erros Detalhados */}
      {data.errors.length > 0 && (
        <div className="border rounded-lg">
          <button
            onClick={() => setShowErrors(!showErrors)}
            className="w-full p-4 flex items-center justify-between font-semibold text-sm hover:bg-muted/50 transition"
          >
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              Detalhes dos Erros ({data.errors.length})
            </span>
            {showErrors ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          {showErrors && (
            <div className="p-4 border-t max-h-64 overflow-y-auto">
              <div className="space-y-2">
                {data.errors.map((error, idx) => (
                  <div key={idx} className="text-sm p-2 bg-red-50 dark:bg-red-950 rounded">
                    <p className="font-semibold text-red-900 dark:text-red-100">
                      Linha {error.row}:
                    </p>
                    <p className="text-red-700 dark:text-red-300">
                      Campo &quot;{error.field}&quot; - {error.error}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview dos Dados */}
      <div className="border rounded-lg">
        <div className="p-4 border-b bg-muted/50">
          <p className="font-semibold text-sm">Preview dos Dados (primeiras {displayRows.length} linhas)</p>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Cliente (NIF)</TableHead>
                <TableHead>Nome Cliente</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRows.map((row, idx) => {
                // Detectar formato (AGT, modelo-2 ou SAP)
                const isAGT = row['Nº Docum'] !== undefined
                const isModelo2 = row['Nº Documento'] !== undefined
                const isSAP = row.VBELN !== undefined
                
                let docNum: string | undefined
                let docType: string | undefined
                let docDate: string | undefined
                let clientNIF: string | undefined
                let clientName: string | undefined
                
                if (isModelo2) {
                  // Formato modelo-2
                  docNum = row['Nº Documento'] as string
                  docType = row['Tipo Doc'] as string
                  // Extrair tipo do número do documento se vazio
                  if (!docType || docType.trim() === '') {
                    const match = docNum?.match(/^([A-Z]{2})\s/)
                    if (match) docType = match[1]
                  }
                  docDate = row['Data Doc'] as string
                  clientNIF = row['Nº Fiscal'] as string || row['Nº Cliente'] as string
                  clientName = row['Nome E'] as string
                } else if (isAGT) {
                  // Formato AGT
                  docNum = row['Nº Docum'] as string
                  docType = row['Tipo Doc'] as string
                  docDate = row['Data Doc'] as string
                  clientNIF = row['Nº Cliente'] as string
                  clientName = row['Nome E'] as string
                } else {
                  // Formato SAP legado
                  docNum = row.VBELN as string
                  docType = row.FKART as string
                  docDate = row.FKDAT as string
                  clientNIF = row.STCD1 as string
                  clientName = row.NAME1 as string
                }
                
                // Extrair valor total
                let totalValue = 0
                if ((isAGT || isModelo2) && row['DOCUMENT_TOTALS']) {
                  try {
                    const totals = JSON.parse(row['DOCUMENT_TOTALS'] as string)
                    totalValue = totals.grossTotal || totals.netTotal || 0
                  } catch {}
                } else if (row.NETWR) {
                  totalValue = typeof row.NETWR === 'number' ? row.NETWR : parseFloat(row.NETWR as string)
                }
                
                return (
                  <TableRow key={idx} className="text-sm">
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-mono">{docNum || '-'}</TableCell>
                    <TableCell>
                      <span className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 px-2 py-1 rounded text-xs font-semibold">
                        {docType || 'FT'}
                      </span>
                    </TableCell>
                    <TableCell>{docDate ? (isAGT || isModelo2 ? docDate : formatDate(docDate as string)) : '-'}</TableCell>
                    <TableCell className="font-mono">{clientNIF || '-'}</TableCell>
                    <TableCell>
                      <div className="max-w-xs line-clamp-1">
                        {clientName || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {totalValue > 0 ? totalValue.toLocaleString('pt-AO') : '-'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {hasMoreRows && !showAll && (
          <div className="p-4 border-t text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAll(true)}
            >
              Mostrar todas as {data.rows.length} linhas
            </Button>
          </div>
        )}

        {showAll && hasMoreRows && (
          <div className="p-4 border-t text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAll(false)}
            >
              Mostrar menos
            </Button>
          </div>
        )}
      </div>

      {/* Ações */}
      <div className="flex gap-3 justify-end pt-6 border-t">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
        >
          Cancelar
        </Button>
        <Button
          onClick={() => onConfirm(data.rows)}
          disabled={!data.success || isProcessing}
          className="bg-green-600 hover:bg-green-700"
        >
          {isProcessing ? 'A processar...' : `✓ Processar ${data.summary.validRows} linha(s)`}
        </Button>
      </div>
    </div>
  )
}

function formatDate(dateStr: string): string {
  if (dateStr.length !== 8) return dateStr
  return `${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}/${dateStr.substring(0, 4)}`
}
