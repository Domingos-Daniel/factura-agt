'use client'

import { useEffect, useMemo, useState } from 'react'
import Fuse from 'fuse.js'
import { Search } from 'lucide-react'

import type { Factura } from '@/lib/types'
import { getFacturas } from '@/lib/storage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type ProductSuggestion = {
  description: string
  unitPrice: number
  unitOfMeasure: string
  frequency: number
}

type ProdutoSearchAIProps = {
  onUseSuggestion?: (suggestion: ProductSuggestion) => void
}

export function ProdutoSearchAI({ onUseSuggestion }: ProdutoSearchAIProps) {
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ProductSuggestion[]>([])

  useEffect(() => {
    setFacturas(getFacturas())
  }, [])

  const dataset = useMemo(() => {
    const map = new Map<string, ProductSuggestion>()
    facturas.forEach((factura) => {
      factura.documents.forEach((doc) => {
        doc.lines.forEach((line) => {
          const key = line.productDescription.toLowerCase()
          const existing = map.get(key)
          if (existing) {
            existing.frequency += 1
            existing.unitPrice = (existing.unitPrice + line.unitPrice) / 2
          } else {
            map.set(key, {
              description: line.productDescription,
              unitPrice: line.unitPrice,
              unitOfMeasure: line.unitOfMeasure,
              frequency: 1,
            })
          }
        })
      })
    })
    return Array.from(map.values())
  }, [facturas])

  useEffect(() => {
    if (!query.trim()) {
      setResults(dataset.slice(0, 5))
      return
    }
    const fuse = new Fuse(dataset, {
      keys: ['description'],
      threshold: 0.4,
    })
    const matches = fuse.search(query).map((match) => match.item)
    setResults(matches.slice(0, 5))
  }, [dataset, query])

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Pesquisa Inteligente de Produtos</CardTitle>
        <CardDescription>Reaproveite descrições utilizadas anteriormente.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Pesquisar por descrição"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="space-y-3">
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem histórico disponível.</p>
          ) : (
            results.map((item) => (
              <div key={item.description} className="rounded-md border p-3 text-sm">
                <div className="font-medium">{item.description}</div>
                <p className="text-xs text-muted-foreground">
                  {item.frequency} vez(es) • {item.unitOfMeasure} • {item.unitPrice.toFixed(2)} AOA
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2"
                  onClick={() => {
                    if (onUseSuggestion) {
                      onUseSuggestion(item)
                    } else {
                      navigator.clipboard?.writeText(item.description).catch(() => {})
                    }
                  }}
                >
                  {onUseSuggestion ? 'Usar descrição' : 'Copiar descrição'}
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
