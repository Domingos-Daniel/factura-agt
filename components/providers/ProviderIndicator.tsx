'use client'

import { Badge } from '@/components/ui/badge'
import { Cloud, Building2 } from 'lucide-react'
import type { FiscalProviderName } from '@/lib/providers/types'

interface ProviderIndicatorProps {
  provider: FiscalProviderName
  status?: 'available' | 'unavailable' | 'degraded' | 'unknown'
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const providerConfig = {
  appypay: {
    name: 'AppyPay',
    shortName: 'AP',
    icon: Cloud,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    borderColor: 'border-blue-300 dark:border-blue-700',
  },
  agt: {
    name: 'AGT',
    shortName: 'AGT',
    icon: Building2,
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    borderColor: 'border-orange-300 dark:border-orange-700',
  },
}

const statusColors = {
  available: 'bg-green-500',
  unavailable: 'bg-red-500',
  degraded: 'bg-yellow-500',
  unknown: 'bg-gray-400',
}

export function ProviderIndicator({
  provider,
  status,
  showLabel = true,
  size = 'md',
  className = '',
}: ProviderIndicatorProps) {
  const config = providerConfig[provider]
  const Icon = config.icon
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  }
  
  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }
  
  return (
    <Badge 
      variant="outline" 
      className={`${config.color} ${config.borderColor} ${sizeClasses[size]} ${className} inline-flex items-center gap-1`}
    >
      <Icon className={iconSizes[size]} />
      {showLabel && <span>{config.shortName}</span>}
      {status && (
        <span 
          className={`${statusColors[status]} h-2 w-2 rounded-full`}
          title={status}
        />
      )}
    </Badge>
  )
}
