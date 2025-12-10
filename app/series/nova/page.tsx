'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { solicitarSerie } from '@/lib/api'
import { type SeriesFormData } from '@/lib/schemas/seriesSchema'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { FormSerie } from '@/components/forms/FormSerie'

export default function NovaSeriesPage() {
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (data: SeriesFormData) => {
    const result = await solicitarSerie<typeof data, any>(data)
    if (result.ok) {
      toast({ title: 'Série criada com sucesso', description: `Série ${data.seriesCode} foi criada.` })
      router.push('/series/lista')
    } else {
      toast({ variant: 'destructive', title: 'Erro ao criar série', description: result.error })
    }
  }

  return (
    <MainLayout>
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/series/lista">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Nova Série</h2>
            <p className="text-muted-foreground">
              Solicitar nova série de numeração de documentos
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados da Série</CardTitle>
            <CardDescription>
              Preencha os campos abaixo para solicitar uma nova série de numeração
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormSerie
              onSubmit={handleSubmit}
              onCancel={() => router.push('/series/lista')}
            />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
