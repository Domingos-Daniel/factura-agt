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
    // Carregar facturas do localStorage E do arquivo JSON
    const loadFacturas = async () => {
      try {
        // 1. Carregar do localStorage (mocks + seed)
        const localFacturas = getFacturas()
        console.log('📦 LocalStorage facturas:', localFacturas.length)
        
        // 2. Carregar do JSON (importações Excel)
        let jsonFacturas: Factura[] = []
        try {
          const response = await fetch('/api/facturas/list')
          if (response.ok) {
            const data = await response.json()
            jsonFacturas = data.facturas || []
            console.log('📄 JSON facturas:', jsonFacturas.length, jsonFacturas)
          } else {
            console.warn('⚠️ API retornou erro:', response.status)
          }
        } catch (error) {
          console.error('❌ Erro ao carregar facturas do JSON:', error)
        }
        
        // 3. Combinar (remover duplicados por ID)
        const allFacturas = [...localFacturas]
        const existingIds = new Set(localFacturas.map(f => f.id))
        
        jsonFacturas.forEach(factura => {
          if (!existingIds.has(factura.id)) {
            allFacturas.push(factura)
            console.log('➕ Adicionando factura do JSON:', factura.id, factura.documents?.[0]?.documentNo)
          }
        })
        
        console.log('✅ Total facturas combinadas:', allFacturas.length)
        
        // 4. Ordenar por data (mais recentes primeiro)
        allFacturas.sort((a, b) => {
          const dateA = new Date(a.submissionTimeStamp || a.createdAt || 0)
          const dateB = new Date(b.submissionTimeStamp || b.createdAt || 0)
          return dateB.getTime() - dateA.getTime()
        })
        
        setFacturas(allFacturas)
      } catch (error) {
        console.error('❌ Erro ao carregar facturas:', error)
        // Fallback: mostrar apenas localStorage
        setFacturas(getFacturas())
      } finally {
        setIsLoading(false)
      }
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
