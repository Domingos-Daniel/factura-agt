'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Lock, LockOpen, Plus } from 'lucide-react'

import { Serie, SeriesStatus } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const statusLabels: Record<SeriesStatus, string> = {
  A: 'Aberta',
  U: 'Em Uso',
  F: 'Fechada',
}

const statusColors: Record<SeriesStatus, string> = {
  A: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  U: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  F: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}

const methodLabels: Record<string, string> = {
  FEPC: 'FEPC - Portal Contribuinte',
  FESF: 'FESF - Software Faturação',
  SF: 'SF - Sem Faturação',
}

type FilterValue = 'all' | SeriesStatus

type TabelaSeriesProps = {
  data: Serie[]
  statusFilter: FilterValue
  onStatusFilterChange: (value: FilterValue) => void
  documentTypeFilter?: string
  onDocumentTypeFilterChange?: (value: string) => void
  pageSize?: number
  onPageSizeChange?: (value: number) => void
  currentPage?: number
  onPageChange?: (value: number) => void
  onToggleStatus?: (serieId: string, newStatus: SeriesStatus) => void
}

export function TabelaSeries({ 
  data, 
  statusFilter, 
  onStatusFilterChange, 
  documentTypeFilter = 'all',
  onDocumentTypeFilterChange,
  pageSize = 50,
  onPageSizeChange,
  currentPage = 1,
  onPageChange,
  onToggleStatus 
}: TabelaSeriesProps) {
  const filteredSeries = useMemo(() => {
    let filtered = data
    
    // Filtro de status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((serie) => serie.status === statusFilter)
    }
    
    // Filtro de tipo de documento
    if (documentTypeFilter !== 'all') {
      filtered = filtered.filter((serie) => serie.documentType === documentTypeFilter)
    }
    
    return filtered
  }, [data, statusFilter, documentTypeFilter])
  
  // Tipos de documento únicos
  const documentTypes = useMemo(() => {
    const types = new Set(data.map(s => s.documentType))
    return Array.from(types).sort()
  }, [data])
  
  // Paginação
  const { paginatedSeries, totalPages } = useMemo(() => {
    if (pageSize === -1) {
      return { paginatedSeries: filteredSeries, totalPages: 1 }
    }
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return {
      paginatedSeries: filteredSeries.slice(start, end),
      totalPages: Math.ceil(filteredSeries.length / pageSize)
    }
  }, [filteredSeries, currentPage, pageSize])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Lista de Séries</CardTitle>
            <CardDescription>
              {filteredSeries.length} série{filteredSeries.length !== 1 ? 's' : ''} encontrada{filteredSeries.length !== 1 ? 's' : ''}
              {pageSize !== -1 && ` (${totalPages} página${totalPages !== 1 ? 's' : ''})`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-40">
              <Select 
                value={String(pageSize)} 
                onValueChange={(value) => onPageSizeChange?.(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Itens por página" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 por página</SelectItem>
                  <SelectItem value="50">50 por página</SelectItem>
                  <SelectItem value="100">100 por página</SelectItem>
                  <SelectItem value="-1">Mostrar todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-44">
              <Select 
                value={documentTypeFilter} 
                onValueChange={(value) => {
                  onDocumentTypeFilterChange?.(value)
                  onPageChange?.(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo documento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {documentTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <Select value={statusFilter} onValueChange={(value) => {
                onStatusFilterChange(value as FilterValue)
                onPageChange?.(1)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="A">Aberta</SelectItem>
                  <SelectItem value="U">Em Uso</SelectItem>
                  <SelectItem value="F">Fechada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Link href="/series/nova">
              <Button variant="gradient">
                <Plus className="mr-2 h-4 w-4" />
                Nova Série
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredSeries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Nenhuma série encontrada</p>
            <Link href="/series/nova">
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Criar primeira série
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Ano</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Sequência</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Solicitação</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSeries.map((serie) => (
                  <TableRow key={serie.id}>
                    <TableCell className="font-medium">{serie.seriesCode}</TableCell>
                    <TableCell>{serie.seriesYear}</TableCell>
                    <TableCell>{serie.documentType}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {serie.invoicingMethod ? methodLabels[serie.invoicingMethod] : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {serie.firstDocumentNumber} - {serie.currentSequence}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[serie.status]}`}
                      >
                        {statusLabels[serie.status]}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(serie.requestDate)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {serie.status === 'A' && onToggleStatus && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onToggleStatus(serie.id, 'F')}
                            title="Fechar série"
                          >
                            <Lock className="h-4 w-4" />
                          </Button>
                        )}
                        {serie.status === 'F' && onToggleStatus && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onToggleStatus(serie.id, 'A')}
                            title="Reabrir série"
                          >
                            <LockOpen className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {pageSize !== -1 && totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, filteredSeries.length)} de {filteredSeries.length} série{filteredSeries.length !== 1 ? 's' : ''}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange?.(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <div className="text-sm">
                    Página {currentPage} de {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange?.(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
