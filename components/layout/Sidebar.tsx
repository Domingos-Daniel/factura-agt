'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileStack, FileSpreadsheet, FileText, LayoutDashboard, Settings, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  const getActiveClasses = (href: string, hoverClasses: string) => {
    const active = isActive(href)
    return cn(
      'w-full justify-start transition-all duration-200 group relative',
      active
        ? 'bg-primary/15 text-primary border-l-2 border-primary shadow-sm'
        : `hover:${hoverClasses} transition-all duration-200 group`
    )
  }

  const getIconClasses = (href: string, hoverBg: string) => {
    const active = isActive(href)
    return cn(
      'mr-3 p-1 rounded-md transition-colors duration-200',
      active
        ? 'bg-primary/20'
        : `group-hover:${hoverBg} transition-colors duration-200`
    )
  }

  return (
    <aside className="w-64 border-r border-border/50 bg-gradient-to-b from-muted/30 via-muted/20 to-muted/10 min-h-[calc(100vh-4rem)] p-4 hidden lg:block backdrop-blur-sm">
      <nav className="space-y-1">
        <Link href="/dashboard">
          <Button
            variant="ghost"
            className={getActiveClasses('/dashboard', 'bg-primary/10 hover:text-primary')}
          >
            <div className={getIconClasses('/dashboard', 'bg-primary/20')}>
              <LayoutDashboard className="h-4 w-4" />
            </div>
            Dashboard
          </Button>
        </Link>

        <div className="pt-6">
          <div className="flex items-center gap-2 px-3 pb-3">
            <div className="h-px flex-1 bg-gradient-to-r from-border/50 to-transparent" />
            <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">Séries</p>
            <div className="h-px flex-1 bg-gradient-to-l from-border/50 to-transparent" />
          </div>
          <div className="space-y-1">
            <Link href="/series/nova">
              <Button
                variant="ghost"
                className={getActiveClasses('/series/nova', 'bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400')}
              >
                <div className={getIconClasses('/series/nova', 'bg-emerald-500/20')}>
                  <FileStack className="h-4 w-4" />
                </div>
                Nova Série
              </Button>
            </Link>
            <Link href="/series/lista">
              <Button
                variant="ghost"
                className={getActiveClasses('/series/lista', 'bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400')}
              >
                <div className={getIconClasses('/series/lista', 'bg-emerald-500/20')}>
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                Listar Séries
              </Button>
            </Link>
          </div>
        </div>

        <div className="pt-6">
          <div className="flex items-center gap-2 px-3 pb-3">
            <div className="h-px flex-1 bg-gradient-to-r from-border/50 to-transparent" />
            <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">Facturas</p>
            <div className="h-px flex-1 bg-gradient-to-l from-border/50 to-transparent" />
          </div>
          <div className="space-y-1">
            <Link href="/facturas/nova">
              <Button
                variant="ghost"
                className={getActiveClasses('/facturas/nova', 'bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400')}
              >
                <div className={getIconClasses('/facturas/nova', 'bg-blue-500/20')}>
                  <FileText className="h-4 w-4" />
                </div>
                Nova Factura
              </Button>
            </Link>
            <Link href="/facturas/lista">
              <Button
                variant="ghost"
                className={getActiveClasses('/facturas/lista', 'bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400')}
              >
                <div className={getIconClasses('/facturas/lista', 'bg-blue-500/20')}>
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                Listar Facturas
              </Button>
            </Link>
            <Link href="/facturas/importar">
              <Button
                variant="ghost"
                className={getActiveClasses('/facturas/importar', 'bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400')}
              >
                <div className={getIconClasses('/facturas/importar', 'bg-blue-500/20')}>
                  <Upload className="h-4 w-4" />
                </div>
                Importar Excel
              </Button>
            </Link>
          </div>
        </div>

        <div className="pt-6">
          <div className="flex items-center gap-2 px-3 pb-3">
            <div className="h-px flex-1 bg-gradient-to-r from-border/50 to-transparent" />
            <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">Sistema</p>
            <div className="h-px flex-1 bg-gradient-to-l from-border/50 to-transparent" />
          </div>
          <div className="space-y-1">
            <Link href="/configuracoes">
              <Button
                variant="ghost"
                className={getActiveClasses('/configuracoes', 'bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400')}
              >
                <div className={getIconClasses('/configuracoes', 'bg-amber-500/20')}>
                  <Settings className="h-4 w-4" />
                </div>
                Configurações
              </Button>
            </Link>
          </div>
        </div>
      </nav>
    </aside>
  )
}
