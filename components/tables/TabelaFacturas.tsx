'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'

import type { Factura } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const statusLabels: Record<'P' | 'V' | 'I', string> = {
  P: 'Pendente',
  V: 'Válida',
  I: 'Inválida',
}

const statusColors: Record<'P' | 'V' | 'I', string> = {
  P: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  V: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  I: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

type FilterValue = 'all' | 'FT' | 'FR' | 'FA' | 'NC' | 'ND' | 'AR' | 'RC' | 'RG'

type TabelaFacturasProps = {
  data: Factura[]
}

export function TabelaFacturas({ data }: TabelaFacturasProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [documentType, setDocumentType] = useState<FilterValue>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'P' | 'V' | 'I'>('all')
  const [page, setPage] = useState(1)
  const pageSize = 8

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

  const totalPages = Math.max(1, Math.ceil(filteredFacturas.length / pageSize))

  const paginatedFacturas = useMemo(() => {
    const startIndex = (page - 1) * pageSize
    return filteredFacturas.slice(startIndex, startIndex + pageSize)
  }, [filteredFacturas, page, pageSize])

  useEffect(() => {
    setPage(1)
  }, [searchTerm, documentType, statusFilter])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
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
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nº, cliente ou NIF"
                className="pl-9"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <Select value={documentType} onValueChange={(value) => setDocumentType(value as FilterValue)}>
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
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | 'P' | 'V' | 'I')}>
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
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedFacturas.map((factura) => {
                const documento = factura.documents[0]
                const validationStatus = factura.validationStatus ?? 'P'
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

        {filteredFacturas.length > 0 && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              A mostrar {(page - 1) * pageSize + 1} – {Math.min(page * pageSize, filteredFacturas.length)} de {filteredFacturas.length} facturas
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
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
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
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
