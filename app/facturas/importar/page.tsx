'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MainLayout } from '@/components/layout/MainLayout'
import { ExcelUploader, ParsedData } from '@/components/upload/ExcelUploader'
import { ExcelPreview } from '@/components/upload/ExcelPreview'
import { ParsedExcelData, ExcelRow, SeriesRow, ParsedSeriesData } from '@/lib/excelParser'
import { CheckCircle, AlertCircle, Loader, Zap, Cloud, FileSpreadsheet, ListPlus, FileInput } from 'lucide-react'
import { addFactura } from '@/lib/storage'
import { Factura } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'

type Step = 'upload' | 'preview' | 'processing' | 'result'

interface ProcessResult {
  success: boolean
  processed: number
  documents: number
  provider?: 'agt' | 'appypay'
  results: Array<{
    success: boolean
    documentNo?: string
    requestID?: string
    facturaId?: string
    documentCount?: number
    error?: string
    response?: unknown
    provider?: 'agt' | 'appypay'
    isAsync?: boolean
  }>
}

interface UserProfile {
  user: {
    id: string
    email: string
    name: string
    role: string
    nif?: string
  }
  company: {
    nif?: string
    name?: string
    email?: string
    address?: string
  }
  provider: {
    activeProvider: 'agt' | 'appypay'
  }
  series?: {
    code: string
    year: number
    documentType: string
    status: string
  }
}

export default function ImportarFacturasPage() {
  const [step, setStep] = useState<Step>('upload')
  const [importMode, setImportMode] = useState<'factura' | 'serie'>('factura')
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<ProcessResult | null>(null)
  const [activeProvider, setActiveProvider] = useState<'agt' | 'appypay'>('agt')

  // Dados do utilizador
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)

  // Configuração da empresa (carregada do perfil)
  const [companyNIF, setCompanyNIF] = useState('999888777')
  const [companyName, setCompanyName] = useState('Empresa Angola Lda')
  const [seriesCode, setSeriesCode] = useState('FT25')
  
  // Carregar perfil do utilizador
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch('/api/auth/profile')
        const data = await res.json()
        
        if (data.success && data.profile) {
          setProfile(data.profile)
          setActiveProvider(data.profile.provider.activeProvider)
          setCompanyNIF(data.profile.company.nif || '999888777')
          setCompanyName(data.profile.company.name || 'Empresa Angola Lda')
          
          if (data.profile.series?.code) {
            setSeriesCode(data.profile.series.code)
          }
        }
      } catch (err) {
        console.error('Erro ao carregar perfil:', err)
      } finally {
        setIsLoadingProfile(false)
      }
    }
    
    loadProfile()
  }, [])

  const { toast } = useToast()

  const handleDataParsed = (data: ParsedData) => {
    // if no rows were returned, inform user and stay on upload step
    if (data.rows.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nenhum registo encontrado',
        description: importMode === 'serie'
          ? 'O ficheiro de séries não contém linhas válidas. Verifique o template MODELO-SERIE-1.XLSX.'
          : 'O ficheiro de facturas não contém linhas válidas – verifique o formato.',
      })
      return
    }

    setParsedData(data)
    setStep('preview')
  }

  const handleCancelPreview = () => {
    setParsedData(null)
    setStep('upload')
  }

  const handleConfirmAndProcess = async (rows: ExcelRow[] | SeriesRow[]) => {
    setStep('processing')
    setIsProcessing(true)

    try {
      if (importMode === 'serie') {
        // drop any rows lacking all three required fields (code/year/type)
        const seriesRows = (rows as SeriesRow[]).filter(r => {
          const code = r['Code'] || r['Cod Serie'] || r['Série'] || r['Serie']
          const year = r['Year'] || r['Ano']
          const type = r['Doc Type'] || r['Tipo Doc'] || r['Tipo']
          return code || year || type // keep if at least one present; we still validate later
        })

        const results: Array<{
          success: boolean
          documentNo?: string
          error?: string
          provider?: 'agt' | 'appypay'
        }> = []
        let processed = 0
        let successCount = 0

        for (const row of seriesRows) {
           processed++
           try {
             // Map fields and validate minimally
             const code = row['Code'] || row['Cod Serie'] || row['Série'] || row['Serie']
             const year = row['Year'] || row['Ano']
             const type = row['Doc Type'] || row['Tipo Doc'] || row['Tipo']
             
             if (!code || !year || !type) {
               // skip row but record error
               results.push({ success: false, error: 'Dados incompletos (Serie, Ano, Tipo req)' })
               continue
             }

             const payload = {
              seriesCode: String(code),
              seriesYear: Number(year),
              documentType: String(type),
              firstDocumentNumber: Number(row['Start Number'] || row['Inicio'] || 1),
              status: row['Status'] ? String(row['Status']).substring(0, 1).toUpperCase() : 'A'
            }

            const res = await fetch('/api/series/agt/solicitar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            })
            const json = await res.json().catch(() => ({}))
            
            if (res.ok) {
              successCount++
              results.push({ success: true, documentNo: payload.seriesCode, provider: 'agt' as const })
            } else {
              results.push({ success: false, documentNo: payload.seriesCode, error: json.error || 'Erro na API' })
            }
           } catch (err: any) {
             results.push({ success: false, error: err.message || 'Erro desconhecido' })
           }
        }

        setResult({
           success: successCount > 0,
           processed,
           documents: successCount,
           results
        })
        setStep('result')
        setIsProcessing(false)
        return
      }

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
        for (const result of data.results as any[]) {
          if (result.success && result.facturaId) {
            try {
              const resp = await fetch(`/api/facturas/${encodeURIComponent(result.facturaId)}`)
              if (resp.ok) {
                const d = await resp.json()
                if (d.success && d.factura) {
                  addFactura(d.factura as Factura)
                  toast({ title: 'Factura guardada localmente', description: `ID ${result.facturaId}` })
                  console.log('✅ Factura adicionada ao armazenamento local:', result.facturaId)
                  continue
                }
              }
            } catch (err) {
              console.warn('Não foi possível buscar factura para salvar localmente', err)
            }
            // fallback: push minimal record so user can at least navigate
            try {
              addFactura({
                id: result.facturaId,
                requestID: result.requestID,
                taxRegistrationNumber: companyNIF,
                validationStatus: 'P',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              } as Factura)
              toast({ title: 'Factura guardada localmente (parcial)', description: `ID ${result.facturaId}` })
            } catch (err) {
              console.error('Erro ao salvar documento simples no localStorage:', err)
            }
          }
        }
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
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">
              {importMode === 'factura' ? 'Importar Facturas de Excel' : 'Importar Séries de Excel'}
            </h1>
            {importMode === 'factura' && (
              <Badge variant={activeProvider === 'appypay' ? 'default' : 'secondary'} className="flex items-center gap-1">
                {activeProvider === 'appypay' ? <Zap className="h-3 w-3" /> : <Cloud className="h-3 w-3" />}
                {activeProvider === 'appypay' ? 'AppyPay' : 'AGT'}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-2">
            {importMode === 'factura'
              ? `Carregue um ficheiro Excel com dados de facturas e processe-os para ${
                  activeProvider === 'appypay' ? 'AppyPay' : 'AGT'
                }`
              : 'Carregue um ficheiro Excel com dados de séries para solicitar novas séries (modelo-serie-1).' }
          </p>
          {profile && (
            <div className="flex gap-6 mt-3 text-sm">
              <div>
                <span className="text-muted-foreground">📦 Empresa:</span>
                <span className="ml-2 font-medium">{profile.company.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">🆔 NIF:</span>
                <span className="ml-2 font-medium font-mono">{profile.company.nif}</span>
              </div>
              {profile.series && (
                <div>
                  <span className="text-muted-foreground">📋 Série:</span>
                  <span className="ml-2 font-medium font-mono">{profile.series.code}</span>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-3 mt-3">
            {importMode === 'serie' ? (
              <>
                <a
                  href="/templates/MODELO-SERIE-1.xlsx"
                  download
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  📥 Template Série 1
                </a>
                <span className="text-muted-foreground">|</span>
                <a
                  href="/templates/MODELO-SERIE-2.xlsx"
                  download
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  📥 Template Série 2
                </a>
              </>
            ) : (
              <>
                <a
                  href="/templates/modelo-planilha-exemplo.xlsx"
                  download
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  📥 Baixar Template de Factura
                </a>
                <span className="text-muted-foreground">|</span>
                <a
                  href="/templates/exemplo_facturas_sap.csv"
                  download
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  📥 Formato SAP (CSV)
                </a>
              </>
            )}
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
                  `Revise os dados antes de processar. Os dados serão convertidos para formato ${activeProvider === 'appypay' ? 'AppyPay' : 'AGT'}.`}
                {step === 'processing' && `A converter dados e a enviar para ${activeProvider === 'appypay' ? 'AppyPay' : 'AGT'}...`}
                {step === 'result' &&
                  (result?.success
                    ? '✓ Facturas processadas com sucesso!'
                    : '✗ Ocorreu um erro ao processar')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Upload */}
              {step === 'upload' && (
                <div className="space-y-4">
                  <div className="flex p-1 bg-muted rounded-lg">
                    <button
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                        importMode === 'factura' 
                          ? 'bg-background shadow text-foreground' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => setImportMode('factura')}
                    >
                      Registar Factura
                    </button>
                    <button
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                        importMode === 'serie' 
                          ? 'bg-background shadow text-foreground' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => setImportMode('serie')}
                    >
                      Solicitar Série
                    </button>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {importMode === 'factura'
                      ? 'Importe facturas para emissão/registo (Modelo 2, 3 ou SAP).'
                      : 'Importe ficheiro de Séries para solicitar séries (MODELO-SERIE-1.XLSX ou MODELO-SERIE-2.XLSX).'}
                  </div>

                  <ExcelUploader
                    onDataParsed={handleDataParsed}
                    isProcessing={isProcessing}
                    mode={importMode}
                  />
                </div>
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
                  <p className="text-sm text-muted-foreground">Por favor, aguarde enquanto os dados são enviados para {activeProvider === 'appypay' ? 'AppyPay' : 'AGT'}</p>
                </div>
              )}

              {/* Result */}
              {step === 'result' && result && (
                <div className="space-y-4">
                  {result.success ? (
                    <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800 dark:text-green-200">
                        ✓ {result.results.length} factura(s) processada(s) com sucesso de {result.processed} linha(s) Excel via {result.provider === 'appypay' ? 'AppyPay' : 'AGT'}!
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
                              <div className="flex items-center gap-2">
                                <p className="text-green-700 dark:text-green-300 font-medium">
                                  ✓ Factura {idx + 1}/{result.results.length}
                                </p>
                                {res.provider === 'appypay' && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Zap className="h-2 w-2 mr-1" />
                                    AppyPay
                                  </Badge>
                                )}
                                {res.isAsync && (
                                  <Badge variant="outline" className="text-xs">
                                    Async
                                  </Badge>
                                )}
                              </div>
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

                            {res.facturaId && (
                              <div className="pt-2">
                                <Link href={`/facturas/${res.facturaId}`}>
                                  <Button size="sm" variant="outline">
                                    Ver detalhes (F{idx + 1})
                                  </Button>
                                </Link>
                              </div>
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
                <CardTitle className="text-lg">Configuração da Empresa</CardTitle>
                <CardDescription>Dados carregados da BD</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingProfile ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Loader className="w-6 h-6 mx-auto mb-2 animate-spin" />
                    A carregar dados...
                  </div>
                ) : profile ? (
                  <>
                    {/* NIF */}
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">NIF da Empresa</Label>
                      <div className="bg-muted p-3 rounded-lg font-mono font-medium">
                        {profile.company.nif || 'N/A'}
                      </div>
                    </div>

                    {/* Nome */}
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Nome da Empresa</Label>
                      <div className="bg-muted p-3 rounded-lg font-medium">
                        {profile.company.name || 'N/A'}
                      </div>
                    </div>

                    {/* Série */}
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Código da Série</Label>
                      <div className="bg-muted p-3 rounded-lg font-mono font-medium">
                        {seriesCode || 'N/A'}
                      </div>
                      {profile.series && (
                        <p className="text-xs text-muted-foreground">
                          Tipo: {profile.series.documentType} | Ano: {profile.series.year}
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    {profile.company.email && (
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Email da Empresa</Label>
                        <div className="bg-muted p-3 rounded-lg text-sm break-all">
                          {profile.company.email}
                        </div>
                      </div>
                    )}

                    {/* Endereço */}
                    {profile.company.address && (
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Endereço</Label>
                        <div className="bg-muted p-3 rounded-lg text-sm">
                          {profile.company.address}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-red-600 dark:text-red-400">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                    Erro ao carregar perfil
                  </div>
                )}

                {/* Status */}
                {step !== 'upload' && (
                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-xs mt-4">
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
