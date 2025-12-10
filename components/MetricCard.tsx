import type { LucideIcon } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type MetricCardProps = {
  title: string
  description: string
  value: string | number
  icon: LucideIcon
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
}

const variants = {
  default: {
    card: 'border-border/50 bg-gradient-to-br from-card to-card/80 shadow-sm hover:shadow-md transition-all duration-200',
    icon: 'text-muted-foreground',
    iconBg: 'bg-muted/40',
  },
  primary: {
    card: 'border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 shadow-sm hover:shadow-md transition-all duration-200 hover:border-primary/30',
    icon: 'text-primary',
    iconBg: 'bg-primary/10',
  },
  success: {
    card: 'border-emerald-200/50 bg-gradient-to-br from-emerald-50/80 via-emerald-50/60 to-emerald-50/40 dark:from-emerald-950/20 dark:via-emerald-950/30 dark:to-emerald-950/20 dark:border-emerald-800/30 shadow-sm hover:shadow-md transition-all duration-200',
    icon: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-100/80 dark:bg-emerald-900/40',
  },
  warning: {
    card: 'border-amber-200/50 bg-gradient-to-br from-amber-50/80 via-amber-50/60 to-amber-50/40 dark:from-amber-950/20 dark:via-amber-950/30 dark:to-amber-950/20 dark:border-amber-800/30 shadow-sm hover:shadow-md transition-all duration-200',
    icon: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-100/80 dark:bg-amber-900/40',
  },
  danger: {
    card: 'border-rose-200/50 bg-gradient-to-br from-rose-50/80 via-rose-50/60 to-rose-50/40 dark:from-rose-950/20 dark:via-rose-950/30 dark:to-rose-950/20 dark:border-rose-800/30 shadow-sm hover:shadow-md transition-all duration-200',
    icon: 'text-rose-600 dark:text-rose-400',
    iconBg: 'bg-rose-100/80 dark:bg-rose-900/40',
  },
}

export function MetricCard({ title, description, value, icon: Icon, variant = 'default' }: MetricCardProps) {
  const style = variants[variant]
  
  return (
    <Card className={cn('overflow-hidden', style.card)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-foreground/90">{title}</CardTitle>
        <div className={cn('p-2 rounded-lg', style.iconBg)}>
          <Icon className={cn('h-4 w-4', style.icon)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
          {value}
        </div>
        <CardDescription className="text-muted-foreground/80">{description}</CardDescription>
      </CardContent>
    </Card>
  )
}
