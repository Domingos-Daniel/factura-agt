'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import type { Factura } from '@/lib/types'
import { getFacturaById } from '@/lib/storage'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { FacturaDetail } from '@/components/FacturaDetail'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function FacturaDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [factura, setFactura] = useState<Factura | null>(null)

  useEffect(() => {
    if (!params?.id) return
    const doc = getFacturaById(params.id)
    if (!doc) {
      router.replace('/facturas/lista')
      return
    }
    setFactura(doc)
  }, [params?.id, router])

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/facturas/lista">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Detalhe da Factura</h2>
            <p className="text-muted-foreground">Visualize informações completas do documento</p>
          </div>
        </div>

        {factura ? (
          <FacturaDetail factura={factura} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Factura não encontrada</CardTitle>
              <CardDescription>O documento selecionado não está disponível.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push('/facturas/lista')}>Voltar à lista</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  )
}
