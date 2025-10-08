'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { seriesSchema, type SeriesFormData } from '@/lib/schemas/seriesSchema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

const DOCUMENT_TYPES = [
  { value: 'FT', label: 'FT - Factura' },
  { value: 'FR', label: 'FR - Factura Recibo' },
  { value: 'FA', label: 'FA - Factura Adiantamento' },
  { value: 'NC', label: 'NC - Nota de Crédito' },
  { value: 'ND', label: 'ND - Nota de Débito' },
  { value: 'AR', label: 'AR - Aviso de Recebimento' },
  { value: 'RC', label: 'RC - Recibo' },
  { value: 'RG', label: 'RG - Recibo Global' },
]

type FormSerieProps = {
  initialValues?: Partial<SeriesFormData>
  onSubmit: (values: SeriesFormData) => Promise<void> | void
  onCancel?: () => void
}

export function FormSerie({ initialValues, onSubmit, onCancel }: FormSerieProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<SeriesFormData>({
    resolver: zodResolver(seriesSchema),
    defaultValues: {
      seriesCode: '',
      documentType: 'FT',
      seriesYear: new Date().getFullYear(),
      firstDocumentNumber: 1,
      ...initialValues,
    },
  })

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = form

  const submitHandler = async (values: SeriesFormData) => {
    try {
      setIsSubmitting(true)
      await onSubmit(values)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(submitHandler)} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="seriesCode">Código da Série *</Label>
          <Input
            id="seriesCode"
            placeholder="FT2025"
            {...register('seriesCode')}
            disabled={isSubmitting}
          />
          {errors.seriesCode && (
            <p className="text-sm text-destructive">{errors.seriesCode.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Alfanumérico com ano (ex: FT2025, NC2025)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="seriesYear">Ano *</Label>
          <Input
            id="seriesYear"
            type="number"
            {...register('seriesYear', { valueAsNumber: true })}
            disabled={isSubmitting}
          />
          {errors.seriesYear && (
            <p className="text-sm text-destructive">{errors.seriesYear.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="documentType">Tipo de Documento *</Label>
        <Select
          value={form.watch('documentType')}
          onValueChange={(value) => setValue('documentType', value as SeriesFormData['documentType'])}
          disabled={isSubmitting}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo de documento" />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.documentType && (
          <p className="text-sm text-destructive">{errors.documentType.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="firstDocumentNumber">Número Inicial *</Label>
        <Input
          id="firstDocumentNumber"
          type="number"
          {...register('firstDocumentNumber', { valueAsNumber: true })}
          disabled={isSubmitting}
        />
        {errors.firstDocumentNumber && (
          <p className="text-sm text-destructive">{errors.firstDocumentNumber.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Normalmente 1, mas pode ser outro valor se necessário
        </p>
      </div>

      <div className="flex gap-4 pt-4">
        <Button type="submit" variant="gradient" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              A processar...
            </>
          ) : (
            'Guardar Série'
          )}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}
