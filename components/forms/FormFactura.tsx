'use client'

import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { FormProvider, useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

import type { Serie, Document, Factura, ProductLine, TaxExemptionCode } from '@/lib/types'
import type { FacturaFormInput } from '@/lib/types/forms'
import { calculateDocumentTotals, calculateLineTaxes, suggestTaxExemption } from '@/lib/taxCalculator'
import { generateDocumentNo } from '@/lib/mockAPI'
import { getAuth, getAppConfig } from '@/lib/storage'
import type { AppConfig } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { QRGenerator } from '@/components/QRGenerator'
import { FormLinhaFactura } from './FormLinhaFactura'

const documentTypeOptions = [
  { value: 'FT', label: 'FT - Factura' },
  { value: 'FR', label: 'FR - Factura Recibo' },
  { value: 'FA', label: 'FA - Factura Adiantamento' },
  { value: 'NC', label: 'NC - Nota de Crédito' },
  { value: 'ND', label: 'ND - Nota de Débito' },
  { value: 'AR', label: 'AR - Aviso de Recebimento' },
  { value: 'RC', label: 'RC - Recibo' },
  { value: 'RG', label: 'RG - Recibo Global' },
]

const paymentMechanismOptions = [
  { value: 'NU', label: 'Numerário' },
  { value: 'TB', label: 'Transferência Bancária' },
  { value: 'CD', label: 'Cartão de Débito' },
  { value: 'CC', label: 'Cartão de Crédito' },
]

const facturaFormSchema = z.object({
  seriesId: z.string().min(1, 'Selecione uma série'),
  documentType: z.enum(['FT', 'FR', 'FA', 'NC', 'ND', 'AR', 'RC', 'RG']),
  documentDate: z.string().min(1, 'Data do documento é obrigatória'),
  customerTaxID: z.string().min(9, 'NIF inválido').max(15, 'NIF muito longo'),
  customerName: z.string().min(1, 'Nome do cliente é obrigatório'),
  customerAddress: z.string().optional(),
  customerCountry: z.string().length(2, 'País deve ter 2 caracteres').default('AO'),
  eacCode: z.string().min(3, 'Código CAE obrigatório'),
  paymentMechanism: z.string().min(1, 'Selecione o meio de pagamento'),
  currency: z.string().length(3, 'Moeda deve ter 3 caracteres'),
  lines: z
    .array(
      z.object({
        productDescription: z.string().min(1, 'Descrição obrigatória'),
        productCode: z.string().optional(),
        quantity: z.number().min(0.01, 'Quantidade inválida'),
        unitPrice: z.number().min(0, 'Preço deve ser positivo'),
        unitOfMeasure: z.string().min(1, 'Preencha a unidade'),
        ivaExemptionCode: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .min(1, 'Adicione pelo menos uma linha de produto'),
});

const SOFTWARE_INFO = {
  productId: 'FACTURA-AGT-PROTOTIPO',
  productVersion: '0.1.0',
  softwareValidationNumber: 'AGT-NONPROD-0001',
  jwsSoftwareSignature: 'pending-server-signature',
}

type FacturaFormSchema = FacturaFormInput

export type FormFacturaSubmitPayload = {
  facturaEnvelope: Omit<Factura, 'id' | 'createdAt' | 'updatedAt'>
  serie: Serie
  nextSequence: number
}

type FormFacturaProps = {
  availableSeries: Serie[]
  onSubmit: (payload: FormFacturaSubmitPayload) => Promise<void> | void
}

export type ProductSuggestion = {
  description: string
  unitPrice: number
  unitOfMeasure: string
}

export type FormFacturaHandle = {
  applyProductSuggestion: (suggestion: ProductSuggestion) => void
}

const defaultLine = {
  productDescription: '',
  productCode: '',
  quantity: 1,
  unitPrice: 0,
  unitOfMeasure: 'UN',
  ivaExemptionCode: undefined,
  notes: '',
}

export const FormFactura = forwardRef<FormFacturaHandle, FormFacturaProps>(function FormFactura(
  { availableSeries, onSubmit },
  ref
) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emitterNIF, setEmitterNIF] = useState<string>('')
  const [config, setConfig] = useState<AppConfig | null>(null)

  useEffect(() => {
    const auth = getAuth()
    if (auth?.user?.nif) {
      setEmitterNIF(auth.user.nif)
    }
    const loadedConfig = getAppConfig()
    setConfig(loadedConfig)
    if (!auth?.user?.nif && loadedConfig.companyNIF) {
      setEmitterNIF(loadedConfig.companyNIF)
    }
  }, [])

  const methods = useForm<FacturaFormSchema>({
    resolver: zodResolver(facturaFormSchema),
    defaultValues: {
      seriesId: availableSeries[0]?.id ?? (availableSeries.length === 0 ? '__no-series' : ''),
      documentType: 'FT',
      documentDate: new Date().toISOString().split('T')[0],
      customerTaxID: '',
      customerName: '',
      customerAddress: '',
      customerCountry: 'AO',
      eacCode: '',
      paymentMechanism: 'NU',
      currency: 'AOA',
      lines: [defaultLine],
    },
  })

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    setFocus,
    formState: { errors },
    setError,
  } = methods

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines',
  })

  const lines = watch('lines')
  const customerCountry = watch('customerCountry')
  const eacCode = watch('eacCode')
  const seriesId = watch('seriesId')

  const selectedSerie = useMemo(
    () => availableSeries.find((serie) => serie.id === seriesId),
    [availableSeries, seriesId]
  )

  const nextSequence = selectedSerie ? selectedSerie.currentSequence + 1 : 1
  const documentNoPreview = selectedSerie ? generateDocumentNo('AGT', selectedSerie.seriesCode, nextSequence) : null

  const qrPreviewValue = documentNoPreview
    ? `https://portaldocontribuinte.minfin.gov.ao/consultar-fe?documentNo=${encodeURIComponent(documentNoPreview)}`
    : 'https://portaldocontribuinte.minfin.gov.ao/consultar-fe?documentNo=PREVIEW'

  useEffect(() => {
    if (!config) return
    setValue('currency', config.defaultCurrency)
    setValue('paymentMechanism', config.defaultPaymentMechanism)
    setValue('customerCountry', config.defaultCountry)
  }, [config, setValue])

  useEffect(() => {
    if (availableSeries.length === 0) return
    if (!seriesId || seriesId === '__no-series') {
      setValue('seriesId', availableSeries[0].id)
    }
  }, [availableSeries, seriesId, setValue])

  // Conversão robusta de valores numéricos (aceita string, number ou vazio)
  const toNumber = (val: unknown): number => {
    if (typeof val === 'number') return Number.isFinite(val) ? val : 0
    if (typeof val === 'string') {
      if (!val.trim()) return 0
      const n = parseFloat(val.replace(',', '.'))
      return Number.isFinite(n) ? n : 0
    }
    return 0
  }

  // Para cálculo verdadeiramente "live", evitamos useMemo dependente de referência estática de RHF
  // e recalculamos a cada render com base nos valores observados.
  const lineSummaries = (lines || []).map((line) => {
    if (!line) {
      return { totals: { baseAmount: 0, totalTax: 0, grossAmount: 0 }, taxes: [] }
    }
    const quantity = toNumber(line.quantity)
    const unitPrice = toNumber(line.unitPrice)
    const { taxes, totals } = calculateLineTaxes(
      quantity,
      unitPrice,
      line.productCode,
      undefined,
      line.ivaExemptionCode as TaxExemptionCode | undefined
    )
    return { taxes, totals }
  })

  const overallTotals = lineSummaries.reduce(
    (acc, item) => {
      acc.netTotal += item.totals.baseAmount
      acc.taxPayable += item.totals.totalTax
      acc.grossTotal += item.totals.grossAmount
      return acc
    },
    { netTotal: 0, taxPayable: 0, grossTotal: 0 }
  )

  const handleSuggestTax = (index: number) => {
    const line = lines[index]
    if (!line) return

    const suggested = suggestTaxExemption(customerCountry, line.productDescription, eacCode)
    setValue(`lines.${index}.ivaExemptionCode`, suggested)
  }

  useEffect(() => {
    if (!config?.autoSuggestTaxes) return
    lines.forEach((line, index) => {
      if (!line) return
      if (line.ivaExemptionCode) return
      if (!line.productDescription?.trim()) return
      const suggested = suggestTaxExemption(customerCountry, line.productDescription, eacCode)
      if (suggested) {
        setValue(`lines.${index}.ivaExemptionCode`, suggested, { shouldDirty: true })
      }
    })
  }, [config?.autoSuggestTaxes, lines, customerCountry, eacCode, setValue])

  const submitHandler = handleSubmit(async (values) => {
    if (!emitterNIF) {
      setError('seriesId', { type: 'manual', message: 'Autentique-se para emitir facturas.' })
      return
    }

  const serie = selectedSerie
    if (!serie) {
      setError('seriesId', { type: 'manual', message: 'Selecione uma série válida.' })
      return
    }

  const documentNo = documentNoPreview ?? generateDocumentNo('AGT', serie.seriesCode, serie.currentSequence + 1)

    const productLines: ProductLine[] = values.lines.map((line, index) => {
      const quantity = toNumber(line.quantity)
      const unitPrice = toNumber(line.unitPrice)
      const { taxes } = calculateLineTaxes(
        quantity,
        unitPrice,
        line.productCode,
        undefined,
        line.ivaExemptionCode as TaxExemptionCode | undefined
      )
      return {
        lineNo: index + 1,
        productCode: line.productCode,
        productDescription: line.productDescription,
        quantity,
        unitOfMeasure: line.unitOfMeasure,
        unitPrice,
        taxPointDate: values.documentDate,
        description: line.notes,
          taxes, // Updated to use the new field name
      }
    })

    const documentTotals = calculateDocumentTotals(productLines)
    const now = new Date().toISOString()

    const document: Document = {
      documentNo,
      documentStatus: 'N',
  jwsDocumentSignature: 'pending-server-signature',
      documentDate: values.documentDate,
      documentType: values.documentType,
      eacCode: values.eacCode,
      systemEntryDate: now,
      transactionDate: values.documentDate,
      customerCountry: values.customerCountry,
      customerTaxID: values.customerTaxID,
      companyName: values.customerName,
      companyAddress: values.customerAddress,
      lines: productLines,
      paymentReceipt: {
        paymentMethod: [
          {
            paymentMechanism: values.paymentMechanism,
            paymentAmount: documentTotals.grossTotal,
            paymentDate: values.documentDate,
          },
        ],
      },
      documentTotals: {
        netTotal: documentTotals.netTotal,
        taxPayable: documentTotals.taxPayable,
        grossTotal: documentTotals.grossTotal,
        ...(values.currency !== 'AOA'
          ? {
              currency: {
                currencyCode: values.currency,
                currencyAmount: documentTotals.grossTotal,
                exchangeRate: 1,
              },
            }
          : {}),
      },
    }

    const facturaEnvelope: Omit<Factura, 'id' | 'createdAt' | 'updatedAt'> = {
      schemaVersion: '1.0',
      submissionGUID: uuidv4(),
      taxRegistrationNumber: emitterNIF,
      submissionTimeStamp: now,
      softwareInfo: {
        ...SOFTWARE_INFO,
  jwsSoftwareSignature: 'pending-server-signature',
      },
      documents: [document],
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        facturaEnvelope,
        serie,
        nextSequence,
      })
    } finally {
      setIsSubmitting(false)
    }
  })

  useImperativeHandle(
    ref,
    () => ({
      applyProductSuggestion: (suggestion) => {
        if (!suggestion) return

        const currentLines = getValues('lines')
        let targetIndex = currentLines.findIndex((line) => !line?.productDescription?.trim())

        if (targetIndex === -1) {
          append({
            ...defaultLine,
            productDescription: suggestion.description,
            unitPrice: suggestion.unitPrice,
            unitOfMeasure: suggestion.unitOfMeasure || defaultLine.unitOfMeasure,
          })
          targetIndex = currentLines.length
        } else {
          setValue(`lines.${targetIndex}.productDescription`, suggestion.description, { shouldDirty: true })
          setValue(`lines.${targetIndex}.unitPrice`, suggestion.unitPrice, { shouldDirty: true })
          setValue(
            `lines.${targetIndex}.unitOfMeasure`,
            suggestion.unitOfMeasure || defaultLine.unitOfMeasure,
            { shouldDirty: true }
          )
        }

        const focusField = () => setFocus(`lines.${targetIndex}.quantity` as any)
        if (typeof window !== 'undefined') {
          window.requestAnimationFrame(() => focusField())
        } else {
          focusField()
        }
      },
    }),
    [append, getValues, setFocus, setValue]
  )

  return (
    <FormProvider {...methods}>
      <form onSubmit={submitHandler} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados da Factura</CardTitle>
            <CardDescription>Informações gerais do documento</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Série *</Label>
              <Select value={watch('seriesId')} onValueChange={(value) => setValue('seriesId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a série" />
                </SelectTrigger>
                <SelectContent>
                  {availableSeries.length === 0 ? (
                    // Radix Select disallows an empty string value on Select.Item.
                    // Provide a non-empty disabled placeholder value instead.
                    <SelectItem value="__no-series" disabled>
                      Nenhuma série disponível
                    </SelectItem>
                  ) : (
                    availableSeries.map((serie) => (
                      <SelectItem key={serie.id} value={serie.id}>
                        {serie.seriesCode} ({serie.seriesYear})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.seriesId && <p className="text-sm text-destructive">{errors.seriesId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Tipo de Documento *</Label>
              <Select value={watch('documentType')} onValueChange={(value) => setValue('documentType', value as FacturaFormSchema['documentType'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {documentTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentDate">Data *</Label>
              <Input id="documentDate" type="date" {...methods.register('documentDate')} />
            </div>

            <div className="space-y-2">
              <Label>Moeda *</Label>
              <Select value={watch('currency')} onValueChange={(value) => setValue('currency', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AOA">AOA - Kwanza</SelectItem>
                  <SelectItem value="USD">USD - Dólar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dados do Cliente</CardTitle>
            <CardDescription>Informações necessárias para validar o documento</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customerTaxID">NIF do Cliente *</Label>
              <Input id="customerTaxID" placeholder="000000000" {...methods.register('customerTaxID')} />
              {errors.customerTaxID && (
                <p className="text-sm text-destructive">{errors.customerTaxID.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerName">Nome / Empresa *</Label>
              <Input id="customerName" placeholder="Nome do cliente" {...methods.register('customerName')} />
              {errors.customerName && (
                <p className="text-sm text-destructive">{errors.customerName.message}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="customerAddress">Endereço</Label>
              <Input id="customerAddress" placeholder="Rua, cidade" {...methods.register('customerAddress')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerCountry">País *</Label>
              <Input id="customerCountry" placeholder="AO" maxLength={2} {...methods.register('customerCountry')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eacCode">Código CAE *</Label>
              <Input id="eacCode" placeholder="00000" {...methods.register('eacCode')} />
              {errors.eacCode && <p className="text-sm text-destructive">{errors.eacCode.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Linhas da Factura</CardTitle>
            <CardDescription>Detalhe os produtos ou serviços faturados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="space-y-2">
                <FormLinhaFactura
                  index={index}
                  onRemove={fields.length > 1 ? () => remove(index) : undefined}
                  totals={lineSummaries[index]?.totals}
                />
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="secondary" onClick={() => handleSuggestTax(index)}>
                    Sugerir Isenção (IA)
                  </Button>
                </div>
                {index < fields.length - 1 && <Separator className="my-4" />}
              </div>
            ))}

            <Button type="button" variant="outline" onClick={() => append({ ...defaultLine })}>
              Adicionar Linha
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pagamento & Totais</CardTitle>
            <CardDescription>Resumo dos valores calculados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Meio de Pagamento *</Label>
                <Select value={watch('paymentMechanism')} onValueChange={(value) => setValue('paymentMechanism', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMechanismOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Totais</p>
                <div className="space-y-2 mt-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Base tributável</span>
                    <span className="font-semibold">{formatCurrency(overallTotals.netTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Impostos</span>
                    <span className="font-semibold">{formatCurrency(overallTotals.taxPayable)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-base">
                    <span>Total a pagar</span>
                    <span className="font-semibold">{formatCurrency(overallTotals.grossTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* debug panel removed */}

            <div className="flex justify-end">
              <Button type="submit" variant="gradient" disabled={isSubmitting || availableSeries.length === 0}>
                {isSubmitting ? 'A processar...' : 'Enviar para AGT'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo Digital</CardTitle>
            <CardDescription>Pré-visualização do pedido e QR conforme dados selecionados.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr,1fr]">
            <div className="space-y-3 rounded-lg border p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Documento</span>
                <span className="font-semibold">{documentNoPreview ?? 'Selecione uma série'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Próximo sequencial</span>
                <span className="font-semibold">{nextSequence}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total bruto</span>
                <span className="font-semibold">{formatCurrency(overallTotals.grossTotal)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">URL de consulta</span>
                <span className="truncate font-mono text-xs text-primary" title={qrPreviewValue}>
                  {qrPreviewValue}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <QRGenerator
                value={qrPreviewValue}
                title="QR de Pré-visualização"
                subtitle="Modelo 2 • Versão 4 • Correção M"
              />
            </div>
          </CardContent>
        </Card>
      </form>
    </FormProvider>
  )
});
