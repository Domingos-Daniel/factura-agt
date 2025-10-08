'use client'

import { Controller, useFormContext } from 'react-hook-form'
import { Trash2 } from 'lucide-react'

import type { FacturaFormInput } from '@/lib/types/forms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'

const UNIT_OF_MEASURE_OPTIONS = ['UN', 'KG', 'LT', 'H', 'M']

const IVA_EXEMPTION_OPTIONS = [
  { value: '__tributado', label: 'Tributado' },
  { value: 'I01', label: 'I01 - Exportação' },
  { value: 'I06', label: 'I06 - Serviços médicos' },
  { value: 'I07', label: 'I07 - Educação' },
  { value: 'I14', label: 'I14 - Serviços financeiros' },
]

type LineTotals = {
  baseAmount: number
  totalTax: number
  grossAmount: number
}

type FormLinhaFacturaProps = {
  index: number
  onRemove?: () => void
  totals?: LineTotals
}

export function FormLinhaFactura({ index, onRemove, totals }: FormLinhaFacturaProps) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<FacturaFormInput>()

  const lineErrors = (errors.lines?.[index] ?? {}) as any

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <Label htmlFor={`lines.${index}.productDescription`}>Descrição do Produto *</Label>
          <Input
            id={`lines.${index}.productDescription`}
            placeholder="Descrição detalhada"
            {...register(`lines.${index}.productDescription`)}
          />
          {lineErrors?.productDescription && (
            <p className="text-sm text-destructive">{lineErrors.productDescription.message}</p>
          )}
        </div>
        {onRemove && (
          <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label="Remover linha">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor={`lines.${index}.productCode`}>Código</Label>
          <Input
            id={`lines.${index}.productCode`}
            placeholder="SKU / Código interno"
            {...register(`lines.${index}.productCode`)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`lines.${index}.quantity`}>Quantidade *</Label>
          <Input
            id={`lines.${index}.quantity`}
            type="number"
            step="0.01"
            min={0.01}
            {...register(`lines.${index}.quantity`, { valueAsNumber: true })}
          />
          {lineErrors?.quantity && (
            <p className="text-sm text-destructive">{lineErrors.quantity.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`lines.${index}.unitPrice`}>Preço Unitário *</Label>
          <Input
            id={`lines.${index}.unitPrice`}
            type="number"
            step="0.01"
            min={0}
            {...register(`lines.${index}.unitPrice`, { valueAsNumber: true })}
          />
          {lineErrors?.unitPrice && (
            <p className="text-sm text-destructive">{lineErrors.unitPrice.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Unidade *</Label>
          <Controller
            control={control}
            name={`lines.${index}.unitOfMeasure`}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OF_MEASURE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {lineErrors?.unitOfMeasure && (
            <p className="text-sm text-destructive">{lineErrors.unitOfMeasure.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Isenção de IVA</Label>
          <Controller
            control={control}
            name={`lines.${index}.ivaExemptionCode`}
            render={({ field }) => (
              <Select 
                value={field.value === undefined ? '__tributado' : field.value} 
                onValueChange={(value) => field.onChange(value === '__tributado' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tributado" />
                </SelectTrigger>
                <SelectContent>
                  {IVA_EXEMPTION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`lines.${index}.notes`}>Observações</Label>
          <Input
            id={`lines.${index}.notes`}
            placeholder="Notas adicionais"
            {...register(`lines.${index}.notes`)}
          />
        </div>
      </div>

      {totals && (
        <div className="grid gap-4 sm:grid-cols-3 rounded-md bg-muted/40 p-3 text-sm">
          <div>
            <p className="text-muted-foreground">Base tributável</p>
            <p className="font-semibold">{formatCurrency(totals.baseAmount)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Impostos</p>
            <p className="font-semibold">{formatCurrency(totals.totalTax)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total linha</p>
            <p className="font-semibold">{formatCurrency(totals.grossAmount)}</p>
          </div>
        </div>
      )}
    </div>
  )
}
