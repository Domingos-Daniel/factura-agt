'use client'

import QRCode from 'qrcode.react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const AGT_LOGO_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzIiIGhlaWdodD0iNzIiIHZpZXdCb3g9IjAgMCA3MiA3MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjcyIiBoZWlnaHQ9IjcyIiByeD0iMTIiIGZpbGw9IiMxNzU5YzYiIC8+CjxwYXRoIGQ9Ik0zNS45MDYgMTkuMzY5TDM0LjE0MSAyNC43MjVIMjMuNzc4TDE4LjAxMyAzOS41MjFIMjUuN0wyOC4xNDMgMzIuMDAzSDMzLjQ3MkwzMS4wMjkgMzkuNTIxSDM4LjcxN0w0NS4zMzYgMjAuMzYySDM1LjkwNloiIGZpbGw9IndoaXRlIiAvPgo8cGF0aCBkPSJNNTEuNjYyIDM1LjAxOUg0My45NzRMMzguMjA5IDQ5LjgxN0g0NS44OTdMNTEuNjYyIDM1LjAxOVoiIGZpbGw9IndoaXRlIiAvPgo8Y2lyY2xlIGN4PSI1OC44NyIgY3k9IjI0LjQxOSIgcj0iNS4zNDgiIGZpbGw9IndoaXRlIiAvPgo8L3N2Zz4K'

type QRGeneratorProps = {
  value: string
  title?: string
  subtitle?: string
  size?: number
  showLogo?: boolean
}

export function QRGenerator({
  value,
  title = 'QR Code',
  subtitle,
  size = 350,
  showLogo = true,
}: QRGeneratorProps) {
  const renderSize = Math.max(Math.min(size, 320), 180)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        <div className="relative w-full max-w-[min(320px,100%)]">
          <QRCode
            value={value}
            size={renderSize}
            level="M"
            renderAs="svg"
            includeMargin
            bgColor="transparent"
            fgColor="var(--foreground)"
            style={{ width: '100%', height: 'auto' }}
          />
          {showLogo && (
            <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-background shadow-lg sm:h-16 sm:w-16">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={AGT_LOGO_DATA_URL} alt="AGT" className="h-12 w-12 rounded-full sm:h-14 sm:w-14" />
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
