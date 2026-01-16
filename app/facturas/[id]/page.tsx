'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'

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
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function loadFactura() {
      if (!params?.id) {
        setLoading(false)
        return
      }
      
      // Primeiro tenta buscar do localStorage
      const localDoc = getFacturaById(params.id)
      if (localDoc) {
        setFactura(localDoc)
        setLoading(false)
        return
      }
      
      // Se não encontrar, busca da API (que inclui o JSON)
      try {
        const response = await fetch(`/api/facturas/${params.id}`)
        if (response.ok) {
          const data = await response.json()
          if (data.factura) {
            setFactura(data.factura)
            setLoading(false)
            return
          }
        }
      } catch (error) {
        console.error('Erro ao buscar factura:', error)
      }
      
      // Factura não encontrada em nenhum lugar
      setNotFound(true)
      setLoading(false)
    }
    
    loadFactura()
  }, [params?.id])

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

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Carregando factura...</span>
            </CardContent>
          </Card>
        ) : factura ? (
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
