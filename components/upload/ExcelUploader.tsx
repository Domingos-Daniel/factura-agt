'use client'

import React, { useState, useRef } from 'react'
import { Upload, AlertCircle, CheckCircle, XCircle, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { parseExcelFile, ParsedExcelData } from '@/lib/excelParser'

interface ExcelUploaderProps {
  onDataParsed: (data: ParsedExcelData) => void
  isProcessing?: boolean
}

export function ExcelUploader({ onDataParsed, isProcessing = false }: ExcelUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setError(null)
    setFileName(null)

    // Validar tipo de ficheiro
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('Por favor, carregue um ficheiro Excel (.xlsx, .xls) ou CSV')
      return
    }

    setIsLoading(true)
    setFileName(file.name)

    try {
      const parsedData = await parseExcelFile(file)
      onDataParsed(parsedData)

      if (!parsedData.success && parsedData.errors.length > 0) {
        setError(
          `Ficheiro carregado com ${parsedData.errors.length} linha(s) com erro. Verifique o preview.`
        )
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao processar ficheiro'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="w-full">
      {/* Zona de Drop */}
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200
          ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 bg-muted/5 hover:border-primary/50'
          }
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleInputChange}
          className="hidden"
          disabled={isProcessing}
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div
            className={`
            w-16 h-16 rounded-full flex items-center justify-center
            transition-all duration-200
            ${isDragging ? 'bg-primary text-primary-foreground' : 'bg-muted'}
          `}
          >
            {isLoading ? (
              <div className="animate-spin">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
            ) : (
              <Upload className="w-8 h-8" />
            )}
          </div>

          <div>
            <p className="font-semibold text-lg">
              {isLoading
                ? 'A processar ficheiro...'
                : 'Arraste o ficheiro Excel aqui ou clique para selecionar'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Suporta formatos: .xlsx, .xls, .csv (máx. 10MB)
            </p>
          </div>

          {fileName && !isLoading && (
            <p className="text-sm text-primary font-medium">
              ✓ {fileName}
            </p>
          )}

          {!isLoading && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isProcessing}
              onClick={(e) => {
                e.stopPropagation()
                handleClick()
              }}
            >
              {fileName ? 'Carregar outro ficheiro' : 'Selecionar ficheiro'}
            </Button>
          )}
        </div>
      </div>

      {/* Erros */}
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
