'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Cloud, Building2, Database, FileSpreadsheet, Loader2 } from 'lucide-react'

import type { Factura } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

const statusLabels: Record<'P' | 'V' | 'I' | 'R' | 'E', string> = {
  P: 'Pendente',
  V: 'Válida',
  I: 'Inválida',
  R: 'Rejeitada',
  E: 'Com Erros',
}

const statusColors: Record<'P' | 'V' | 'I' | 'R' | 'E', string> = {
  P: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  V: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  I: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  R: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  E: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
}

type FilterValue = 'all' | 'FT' | 'FR' | 'FA' | 'NC' | 'ND' | 'AR' | 'RC' | 'RG'

type TabelaFacturasProps = {
  data: Factura[]
  documentTypeFilter?: string
  onDocumentTypeFilterChange?: (value: string) => void
  statusFilter?: 'all' | 'P' | 'V' | 'I'
  onStatusFilterChange?: (value: 'all' | 'P' | 'V' | 'I') => void
  pageSize?: number
  onPageSizeChange?: (value: number) => void
  currentPage?: number
  onPageChange?: (value: number) => void
}

export function TabelaFacturas({ 
  data,
  documentTypeFilter = 'all',
  onDocumentTypeFilterChange,
  statusFilter: externalStatusFilter = 'all',
  onStatusFilterChange: externalOnStatusFilterChange,
  pageSize: externalPageSize = 50,
  onPageSizeChange,
  currentPage: externalCurrentPage = 1,
  onPageChange
}: TabelaFacturasProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [documentType, setDocumentType] = useState<FilterValue>(documentTypeFilter as FilterValue)
  const [statusFilter, setStatusFilter] = useState<'all' | 'P' | 'V' | 'I'>(externalStatusFilter)
  const [page, setPage] = useState(externalCurrentPage)
  const pageSize = externalPageSize

  const filteredFacturas = useMemo(() => {
    return data.filter((factura) => {
      const documento = factura.documents[0]
      if (!documento) return false

      const matchesSearch = searchTerm
        ? documento.documentNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          documento.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          factura.taxRegistrationNumber.includes(searchTerm)
        : true

      const matchesDocType = documentType === 'all' ? true : documento.documentType === documentType

      const validationStatus = factura.validationStatus ?? 'P'
      const matchesStatus = statusFilter === 'all' ? true : validationStatus === statusFilter

      return matchesSearch && matchesDocType && matchesStatus
    })
  }, [data, searchTerm, documentType, statusFilter])

  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(filteredFacturas.length / pageSize))

  const paginatedFacturas = useMemo(() => {
    if (pageSize === -1) return filteredFacturas
    const startIndex = (page - 1) * pageSize
    return filteredFacturas.slice(startIndex, startIndex + pageSize)
  }, [filteredFacturas, page, pageSize])

  useEffect(() => {
    setPage(1)
    onPageChange?.(1)
  }, [searchTerm, documentType, statusFilter])

  useEffect(() => {
    if (page > totalPages) {
      const newPage = Math.max(1, totalPages)
      setPage(newPage)
      onPageChange?.(newPage)
    }
  }, [page, totalPages])

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Facturas Emitidas</CardTitle>
            <CardDescription>
              {filteredFacturas.length} documento{filteredFacturas.length !== 1 ? 's' : ''} encontrado{filteredFacturas.length !== 1 ? 's' : ''}
              {pageSize !== -1 && ` (${totalPages} página${totalPages !== 1 ? 's' : ''})`}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="w-36">
              <Select 
                value={String(pageSize)} 
                onValueChange={(value) => {
                  const newSize = Number(value)
                  onPageSizeChange?.(newSize)
                  setPage(1)
                  onPageChange?.(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Itens" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 por pág</SelectItem>
                  <SelectItem value="50">50 por pág</SelectItem>
                  <SelectItem value="100">100 por pág</SelectItem>
                  <SelectItem value="-1">Todas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nº, cliente ou NIF"
                className="pl-9"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <Select value={documentType} onValueChange={(value) => {
              setDocumentType(value as FilterValue)
              onDocumentTypeFilterChange?.(value)
            }}>
              <SelectTrigger className="md:w-48">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="FT">Factura</SelectItem>
                <SelectItem value="FR">Factura Recibo</SelectItem>
                <SelectItem value="FA">Factura Adiantamento</SelectItem>
                <SelectItem value="NC">Nota de Crédito</SelectItem>
                <SelectItem value="ND">Nota de Débito</SelectItem>
                <SelectItem value="RC">Recibo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value) => {
              const newValue = value as 'all' | 'P' | 'V' | 'I'
              setStatusFilter(newValue)
              externalOnStatusFilterChange?.(newValue)
            }}>
              <SelectTrigger className="md:w-40">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="P">Pendente</SelectItem>
                <SelectItem value="V">Válida</SelectItem>
                <SelectItem value="I">Inválida</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredFacturas.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            Nenhuma factura encontrada com os filtros selecionados.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Documento</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedFacturas.map((factura) => {
                const documento = factura.documents[0]
                const validationStatus = factura.validationStatus ?? 'P'
                const agtSynced = !!(factura as any).agtLastSyncAt || !!(factura as any).agtEstadoLastSyncAt
                const lastSync = (factura as any).agtLastSyncAt || (factura as any).agtEstadoLastSyncAt
                return (
                  <TableRow key={factura.id ?? factura.submissionGUID}>
                    <TableCell className="font-medium">{documento?.documentNo}</TableCell>
                    <TableCell>
                      <div className="font-medium">{documento?.companyName}</div>
                      <div className="text-xs text-muted-foreground">NIF: {documento?.customerTaxID}</div>
                    </TableCell>
                    <TableCell>{documento?.documentType}</TableCell>
                    <TableCell>{documento ? formatDate(documento.documentDate) : '-'}</TableCell>
                    <TableCell>{documento ? formatCurrency(documento.documentTotals.grossTotal) : '-'}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${statusColors[validationStatus]}`}>
                        {statusLabels[validationStatus]}
                      </span>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        // Detectar provedor e status
                        const provider = (factura as any).provider || 
                          ((factura as any).appyPayDocumentId ? 'appypay' : null)
                        const appyPayStatus = (factura as any).appyPayStatus
                        
                        if (provider === 'appypay') {
                          if (appyPayStatus === 'processing') {
                            return (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                AppyPay
                              </Badge>
                            )
                          }
                          return (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                              <Cloud className="h-3 w-3 mr-1" />
                              AppyPay
                            </Badge>
                          )
                        }
                        
                        if (agtSynced) {
                          return (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800" title={lastSync ? `Sincronizado: ${new Date(lastSync).toLocaleString('pt-AO')}` : undefined}>
                              <Building2 className="h-3 w-3 mr-1" />
                              AGT
                            </Badge>
                          )
                        }
                        
                        if (factura.requestID) {
                          return (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                              <FileSpreadsheet className="h-3 w-3 mr-1" />
                              Excel
                            </Badge>
                          )
                        }
                        
                        return (
                          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600">
                            <Database className="h-3 w-3 mr-1" />
                            Local
                          </Badge>
                        )
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/facturas/${factura.id ?? factura.submissionGUID}`}>
                        <Button variant="outline" size="sm">
                          Ver detalhes
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}

        {filteredFacturas.length > 0 && pageSize !== -1 && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              A mostrar {(page - 1) * pageSize + 1} – {Math.min(page * pageSize, filteredFacturas.length)} de {filteredFacturas.length} facturas
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newPage = Math.max(1, page - 1)
                  setPage(newPage)
                  onPageChange?.(newPage)
                }}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <span className="text-sm font-medium">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newPage = Math.min(totalPages, page + 1)
                  setPage(newPage)
                  onPageChange?.(newPage)
                }}
                disabled={page === totalPages}
              >
                Seguinte
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
