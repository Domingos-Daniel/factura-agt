'use client'

import { useState } from 'react'

import { suggestTaxExemption } from '@/lib/taxCalculator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export function TaxSuggestionAI() {
  const [productDescription, setProductDescription] = useState('')
  const [customerCountry, setCustomerCountry] = useState('AO')
  const [eacCode, setEacCode] = useState('')
  const [suggestion, setSuggestion] = useState<string | null>(null)

  const handleSuggest = () => {
    if (!productDescription || !eacCode) {
      setSuggestion('Preencha descrição e código CAE para obter a sugestão.')
      return
    }
    const result = suggestTaxExemption(customerCountry, productDescription, eacCode)
    if (result) {
      setSuggestion(`Sugestão: aplicar código de isenção ${result}.`)
    } else {
      setSuggestion('Nenhuma isenção recomendada. Aplicar taxa normal de IVA.')
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Sugestão de Impostos</CardTitle>
        <CardDescription>Analisa descrição, país e CAE para prever isenção de IVA.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Descrição do produto/serviço</Label>
          <Input
            value={productDescription}
            onChange={(event) => setProductDescription(event.target.value)}
            placeholder="Ex: Consultoria financeira"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>País do cliente</Label>
            <Input
              value={customerCountry}
              onChange={(event) => setCustomerCountry(event.target.value.toUpperCase())}
              maxLength={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Código CAE</Label>
            <Input
              value={eacCode}
              onChange={(event) => setEacCode(event.target.value)}
              placeholder="00000"
            />
          </div>
        </div>
        <Button type="button" onClick={handleSuggest}>
          Gerar sugestão
        </Button>
        {suggestion && <p className="text-sm text-muted-foreground">{suggestion}</p>}
      </CardContent>
    </Card>
  )
}
