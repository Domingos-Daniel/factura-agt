'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

import type { Factura } from '@/lib/types'
import { getFacturas } from '@/lib/storage'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { TabelaFacturas } from '@/components/tables/TabelaFacturas'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function ListaFacturasPage() {
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Carregar facturas do localStorage (com seed automático na primeira vez)
    const loadFacturas = () => {
      const data = getFacturas()
      setFacturas(data)
      setIsLoading(false)
    }
    
    loadFacturas()
  }, [])

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Facturas</h2>
            <p className="text-muted-foreground">Consulte e acompanhe o estado das facturas emitidas.</p>
          </div>
          <Link href="/facturas/nova">
            <Button variant="gradient">
              <Plus className="mr-2 h-4 w-4" />
              Nova Factura
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ) : (
          <TabelaFacturas data={facturas} />
        )}
      </div>
    </MainLayout>
  )
}
