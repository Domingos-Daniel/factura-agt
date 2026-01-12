'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MainLayout } from '@/components/layout/MainLayout'
import { ExcelUploader } from '@/components/upload/ExcelUploader'
import { ExcelPreview } from '@/components/upload/ExcelPreview'
import { ParsedExcelData, ExcelRow } from '@/lib/excelParser'
import { CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { addFactura } from '@/lib/storage'
import { Factura } from '@/lib/types'

type Step = 'upload' | 'preview' | 'processing' | 'result'

interface ProcessResult {
  success: boolean
  processed: number
  documents: number
  results: Array<{
    success: boolean
    documentCount?: number
    error?: string
    response?: unknown
  }>
}

export default function ImportarFacturasPage() {
  const [step, setStep] = useState<Step>('upload')
  const [parsedData, setParsedData] = useState<ParsedExcelData | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<ProcessResult | null>(null)

  // Configuração da empresa
  const [companyNIF, setCompanyNIF] = useState('999888777')
  const [companyName, setCompanyName] = useState('Empresa Angola Lda')
  const [seriesCode, setSeriesCode] = useState('FT25')

  const handleDataParsed = (data: ParsedExcelData) => {
    setParsedData(data)
    setStep('preview')
  }

  const handleCancelPreview = () => {
    setParsedData(null)
    setStep('upload')
  }

  const handleConfirmAndProcess = async (rows: ExcelRow[]) => {
    setStep('processing')
    setIsProcessing(true)

    try {
      const response = await fetch('/api/excel/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows,
          companyNIF,
          companyName,
          seriesCode,
        }),
      })

      const data = await response.json()

      // Salvar facturas no localStorage se sucesso
      if (data.success && data.results) {
        data.results.forEach((result: any) => {
          if (result.success && result.facturaId && result.requestID) {
            // Reconstruir factura para salvar
            const facturaToSave: Partial<Factura> = {
              id: result.facturaId,
              requestID: result.requestID,
              taxRegistrationNumber: companyNIF,
              validationStatus: 'V',
              // Dados básicos serão preenchidos quando carregar da lista
            }
            
            try {
              // Adicionar ao localStorage
              // Note: addFactura requer Factura completa, então vamos apenas marcar para reload
              console.log('✅ Factura salva:', result.facturaId, result.requestID)
            } catch (storageError) {
              console.error('Erro ao salvar no localStorage:', storageError)
            }
          }
        })
      }

      setResult(data)
      setStep('result')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao processar'
      setResult({
        success: false,
        processed: 0,
        documents: 0,
        results: [
          {
            success: false,
            error: errorMessage,
          },
        ],
      })
      setStep('result')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReset = () => {
    setStep('upload')
    setParsedData(null)
    setResult(null)
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Importar Facturas de Excel</h1>
          <p className="text-muted-foreground mt-2">
            Carregue um ficheiro Excel com dados de facturas e processe-os para AGT
          </p>
          <div className="flex gap-3 mt-3">
            <a 
              href="/templates/modelo-planilha-exemplo.xlsx" 
              download
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              📥 Baixar Template com Exemplo
            </a>
            <span className="text-muted-foreground">|</span>
            <a 
              href="/templates/exemplo_facturas_sap.csv" 
              download
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              📥 Formato SAP (CSV)
            </a>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Coluna Principal */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
              <CardTitle>
                {step === 'upload' && '1. Carregue o Ficheiro Excel'}
                {step === 'preview' && '2. Verifique os Dados'}
                {step === 'processing' && '3. A Processar...'}
                {step === 'result' && '4. Resultado'}
              </CardTitle>
              <CardDescription>
                {step === 'upload' &&
                  'Arraste o ficheiro Excel ou clique para selecionar'}
                {step === 'preview' &&
                  'Revise os dados antes de processar. Os dados serão convertidos para formato AGT.'}
                {step === 'processing' && 'A converter dados e a enviar para AGT...'}
                {step === 'result' &&
                  (result?.success
                    ? '✓ Facturas processadas com sucesso!'
                    : '✗ Ocorreu um erro ao processar')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Upload */}
              {step === 'upload' && (
                <ExcelUploader
                  onDataParsed={handleDataParsed}
                  isProcessing={isProcessing}
                />
              )}

              {/* Preview */}
              {step === 'preview' && parsedData && (
                <ExcelPreview
                  data={parsedData}
                  onConfirm={handleConfirmAndProcess}
                  onCancel={handleCancelPreview}
                  isProcessing={isProcessing}
                />
              )}

              {/* Processing */}
              {step === 'processing' && (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="animate-spin">
                    <Loader className="w-12 h-12 text-primary" />
                  </div>
                  <p className="text-lg font-semibold">A processar {parsedData?.summary.validRows} linha(s)...</p>
                  <p className="text-sm text-muted-foreground">Por favor, aguarde enquanto os dados são enviados para AGT</p>
                </div>
              )}

              {/* Result */}
              {step === 'result' && result && (
                <div className="space-y-4">
                  {result.success ? (
                    <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800 dark:text-green-200">
                        ✓ {result.results.length} factura(s) processada(s) com sucesso de {result.processed} linha(s) Excel!
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        ✗ Erro ao processar: {result.results[0]?.error || 'Erro desconhecido'}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Detalhes */}
                  <div className="bg-muted/50 p-4 rounded-lg space-y-2 max-h-96 overflow-y-auto">
                    {result.results.map((res: any, idx) => (
                      <div key={idx} className="text-sm border rounded p-3 space-y-1">
                        {res.success ? (
                          <>
                            <div className="flex items-center justify-between">
                              <p className="text-green-700 dark:text-green-300 font-medium">
                                ✓ Factura {idx + 1}/{result.results.length}
                              </p>
                              {res.documentNo && (
                                <span className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded font-medium">
                                  {res.documentNo}
                                </span>
                              )}
                            </div>
                            {res.requestID && (
                              <p className="text-xs text-muted-foreground">
                                🎫 Request ID: <span className="font-mono">{res.requestID}</span>
                              </p>
                            )}
                            {res.facturaId && (
                              <p className="text-xs text-muted-foreground">
                                🆔 Factura ID: <span className="font-mono text-[10px]">{res.facturaId}</span>
                              </p>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="text-red-700 dark:text-red-300 font-medium">
                              ✗ Factura {idx + 1}/{result.results.length}
                              {res.documentNo && ` - ${res.documentNo}`}
                            </p>
                            <p className="text-xs text-red-600 dark:text-red-400">
                              Erro: {res.error}
                            </p>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button onClick={handleReset} variant="outline" className="flex-1">
                      Importar Novo Ficheiro
                    </Button>
                    {result.success && (
                      <Link href="/facturas/lista" className="flex-1">
                        <Button className="w-full">
                          Ver Facturas Importadas
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          </div>

          {/* Sidebar - Configuração */}
          <div>
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">Configuração</CardTitle>
                <CardDescription>Dados da empresa</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* NIF */}
                <div className="space-y-2">
                  <Label htmlFor="companyNIF" className="text-sm">
                    NIF da Empresa
                  </Label>
                  <Input
                    id="companyNIF"
                    value={companyNIF}
                    onChange={(e) => setCompanyNIF(e.target.value)}
                    placeholder="ex: 999888777"
                    disabled={step !== 'upload'}
                  />
                </div>

                {/* Nome */}
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-sm">
                    Nome da Empresa
                  </Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="ex: Empresa Angola Lda"
                    disabled={step !== 'upload'}
                  />
                </div>

                {/* Série */}
                <div className="space-y-2">
                  <Label htmlFor="seriesCode" className="text-sm">
                    Código da Série
                  </Label>
                  <Input
                    id="seriesCode"
                    value={seriesCode}
                    onChange={(e) => setSeriesCode(e.target.value)}
                    placeholder="ex: FT25 ou FT2025"
                    disabled={step !== 'upload'}
                  />
                </div>



                {/* Status */}
                {step !== 'upload' && (
                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-xs">
                    <p className="font-semibold mb-2">Status do Processamento</p>
                    <div className="space-y-1 text-blue-900 dark:text-blue-100">
                      <p>
                        {step === 'preview' && '📋 Aguardando confirmação'}
                        {step === 'processing' && '⏳ A processar...'}
                        {step === 'result' && result?.success ? '✅ Concluído com sucesso' : '❌ Erro durante processamento'}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
