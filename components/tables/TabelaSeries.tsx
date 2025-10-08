'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'

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

type FilterValue = 'all' | SeriesStatus

type TabelaSeriesProps = {
  data: Serie[]
  statusFilter: FilterValue
  onStatusFilterChange: (value: FilterValue) => void
}

export function TabelaSeries({ data, statusFilter, onStatusFilterChange }: TabelaSeriesProps) {
  const filteredSeries = useMemo(() => {
    if (statusFilter === 'all') return data
    return data.filter((serie) => serie.status === statusFilter)
  }, [data, statusFilter])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Lista de Séries</CardTitle>
            <CardDescription>
              {filteredSeries.length} série{filteredSeries.length !== 1 ? 's' : ''} encontrada{filteredSeries.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-48">
              <Select value={statusFilter} onValueChange={(value) => onStatusFilterChange(value as FilterValue)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Ano</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Sequência</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data Solicitação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSeries.map((serie) => (
                <TableRow key={serie.id}>
                  <TableCell className="font-medium">{serie.seriesCode}</TableCell>
                  <TableCell>{serie.seriesYear}</TableCell>
                  <TableCell>{serie.documentType}</TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
