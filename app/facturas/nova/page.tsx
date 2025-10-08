'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import type { Serie } from '@/lib/types'
import { getSeries, updateSerie, getAppConfig } from '@/lib/storage'
import type { AppConfig } from '@/lib/types'
import { registarFacturaAPI } from '@/lib/mockAPI'
import { MainLayout } from '@/components/layout/MainLayout'
import { FormFactura, type FormFacturaSubmitPayload } from '@/components/forms/FormFactura'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { AIAssistente } from '@/components/ai/AIAssistente'
import { ProdutoSearchAI } from '@/components/ai/ProdutoSearchAI'
import { TaxSuggestionAI } from '@/components/ai/TaxSuggestionAI'

export default function NovaFacturaPage() {
  const [series, setSeries] = useState<Serie[]>([])
  const [config, setConfig] = useState<AppConfig | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const loadedSeries = getSeries().filter((serie) => serie.status !== 'F')
    setSeries(loadedSeries)
    setConfig(getAppConfig())
  }, [])

  const handleSubmit = async ({ facturaEnvelope, serie, nextSequence }: FormFacturaSubmitPayload) => {
    const result = await registarFacturaAPI(facturaEnvelope)

    if (!result.success) {
      toast({
        variant: 'destructive',
        title: 'Erro ao registar factura',
        description: result.error ?? 'Não foi possível concluir o pedido.',
      })
      return
    }

    updateSerie(serie.id, { currentSequence: nextSequence })
    setSeries((prev) =>
      prev.map((item) =>
        item.id === serie.id ? { ...item, currentSequence: nextSequence } : item
      )
    )

    toast({
      title: 'Factura submetida',
      description:
        result.data?.status === 'V'
          ? 'Factura validada com sucesso pela AGT.'
          : 'Factura registada, aguarde validação.',
    })

    router.push('/facturas/lista')
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Nova Factura</h2>
            <p className="text-muted-foreground">
              Emita um novo documento fiscal conforme as especificações da AGT
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <FormFactura availableSeries={series} onSubmit={handleSubmit} />
          {config?.aiAssistantsEnabled && (
            <div className="space-y-4">
              <AIAssistente />
              <ProdutoSearchAI />
              <TaxSuggestionAI />
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
