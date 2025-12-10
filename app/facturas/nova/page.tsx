'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import type { Serie } from '@/lib/types'
import { getSeries, updateSerie, getAppConfig } from '@/lib/storage'
import type { AppConfig } from '@/lib/types'
import { obterEstado, registarFactura } from '@/lib/api'
import { MainLayout } from '@/components/layout/MainLayout'
import { FormFactura, type FormFacturaSubmitPayload, type FormFacturaHandle } from '@/components/forms/FormFactura'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { AIAssistente } from '@/components/ai/AIAssistente'
import { ProdutoSearchAI } from '@/components/ai/ProdutoSearchAI'
import { TaxSuggestionAI } from '@/components/ai/TaxSuggestionAI'

export default function NovaFacturaPage() {
  const [series, setSeries] = useState<Serie[]>([])
  const [config, setConfig] = useState<AppConfig | null>(null)
  const formRef = useRef<FormFacturaHandle>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const loadedSeries = getSeries().filter((serie) => serie.status !== 'F')
    setSeries(loadedSeries)
    setConfig(getAppConfig())
  }, [])

  const handleSubmit = async ({ facturaEnvelope, serie, nextSequence }: FormFacturaSubmitPayload) => {
    const result = await registarFactura<typeof facturaEnvelope, any>(facturaEnvelope)

    if (!result.ok) {
      toast({
        variant: 'destructive',
        title: 'Erro ao registar factura',
        description: result.error ?? 'Não foi possível concluir o pedido.',
      })
      return
    }

    updateSerie(serie.id, { currentSequence: nextSequence })
    setSeries((prev) => prev.map((item) => (item.id === serie.id ? { ...item, currentSequence: nextSequence } : item)))

    toast({ title: 'Factura submetida', description: 'Factura registada, a validar com a AGT...' })

    // Background polling for obterEstado with exponential backoff
    const requestID = (result.data as any)?.requestID
    if (requestID) {
      let attempt = 0
      const maxAttempts = 5
      const poll = async () => {
        attempt++
        const waitMs = Math.min(15000, 1000 * Math.pow(2, attempt - 1))
        const statusRes = await obterEstado<{ requestID: string }, any>({ requestID })
        if (statusRes.ok) {
          const status = (statusRes.data as any)?.status || (statusRes.data as any)?.validationStatus
          if (status === 'V') {
            toast({ title: 'Factura validada', description: 'A AGT validou a sua factura.' })
            router.push('/facturas/lista')
            return
          }
          if (status === 'I') {
            toast({ variant: 'destructive', title: 'Factura inválida', description: 'A AGT rejeitou a factura.' })
            return
          }
        }
        if (attempt < maxAttempts) {
          setTimeout(poll, waitMs)
        } else {
          toast({ title: 'Validação pendente', description: 'Não foi possível obter o estado final. Tente novamente mais tarde.' })
          router.push('/facturas/lista')
        }
      }
      setTimeout(poll, 1000)
    } else {
      router.push('/facturas/lista')
    }
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr,1fr]">
          <FormFactura ref={formRef} availableSeries={series} onSubmit={handleSubmit} />
          {config?.aiAssistantsEnabled && (
            <div className="space-y-4">
              <AIAssistente />
              <ProdutoSearchAI
                onUseSuggestion={(suggestion) => formRef.current?.applyProductSuggestion(suggestion)}
              />
              <TaxSuggestionAI />
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
