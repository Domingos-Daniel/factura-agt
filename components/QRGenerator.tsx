'use client'

import QRCode from 'qrcode.react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type QRGeneratorProps = {
  value: string
  title?: string
  subtitle?: string
}

export function QRGenerator({ value, title = 'QR Code', subtitle }: QRGeneratorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        <QRCode value={value} size={160} bgColor="transparent" fgColor="var(--foreground)" />
      </CardContent>
    </Card>
  )
}
