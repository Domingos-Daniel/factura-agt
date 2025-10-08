'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const QUICK_PROMPTS = [
  'Resumo das facturas deste mês',
  'Séries prestes a atingir o limite',
  'Sugestões para otimizar impostos',
]

type Message = {
  role: 'user' | 'assistant'
  content: string
}

function buildResponse(question: string): string {
  const normalized = question.toLowerCase()

  if (normalized.includes('resumo') || normalized.includes('factura')) {
    return 'Neste mês emitimos várias facturas. Verifique o dashboard para acompanhar os totais e utilize o filtro por status para identificar documentos pendentes.'
  }

  if (normalized.includes('série') || normalized.includes('series')) {
    return 'Sugestão: garanta que cada série aberta possui margem antes de novas emissões. Pode criar séries adicionais em "Configurações > Séries" para manter o fluxo.'
  }

  if (normalized.includes('imposto') || normalized.includes('iva')) {
    return 'Analise se os produtos elegíveis beneficiam de códigos de isenção apropriados (por exemplo I01 para exportações). A ferramenta de sugestão de impostos prevê isenções comuns com base no CAE.'
  }

  return 'Estou aqui para ajudar com o fluxo de faturação AGT. Pergunte sobre séries, facturas ou impostos para obter orientações contextuais.'
}

type AIAssistenteProps = {
  onPromptSelect?: (text: string) => void
}

export function AIAssistente({ onPromptSelect }: AIAssistenteProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Olá! Posso analisar as suas séries, facturas e impostos para sugerir próximos passos. Como posso ajudar?',
    },
  ])
  const [input, setInput] = useState('')

  const handlePrompt = (prompt: string) => {
    if (onPromptSelect) {
      onPromptSelect(prompt)
    }
    submitQuestion(prompt)
  }

  const submitQuestion = (text: string) => {
    const response = buildResponse(text)
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: text },
      { role: 'assistant', content: response },
    ])
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!input.trim()) return
    submitQuestion(input.trim())
    setInput('')
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Assistente Inteligente</CardTitle>
        <CardDescription>Insights rápidos sobre séries, facturas e impostos.</CardDescription>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((prompt) => (
            <Button key={prompt} variant="secondary" size="sm" onClick={() => handlePrompt(prompt)}>
              {prompt}
            </Button>
          ))}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto rounded-md border p-3 text-sm">
          {messages.map((message, index) => (
            <div
              key={index}
              className={message.role === 'assistant' ? 'text-muted-foreground' : 'text-foreground font-medium'}
            >
              {message.role === 'assistant' ? 'Assistente: ' : 'Você: '}
              {message.content}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            placeholder="Faça uma pergunta..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
          <Button type="submit">
            <Send className="mr-1 h-4 w-4" />
            Enviar
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
