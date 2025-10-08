'use client'

import Link from 'next/link'
import { FileStack, FileSpreadsheet, FileText, LayoutDashboard, Settings } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function Sidebar() {
  return (
    <aside className="w-64 border-r bg-muted/40 min-h-[calc(100vh-4rem)] p-4 hidden lg:block">
      <nav className="space-y-2">
        <Link href="/dashboard">
          <Button variant="ghost" className="w-full justify-start">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
        </Link>

        <div className="pt-4">
          <p className="text-xs font-semibold text-muted-foreground px-3 pb-2">SÉRIES</p>
          <Link href="/series/nova">
            <Button variant="ghost" className="w-full justify-start">
              <FileStack className="mr-2 h-4 w-4" />
              Nova Série
            </Button>
          </Link>
          <Link href="/series/lista">
            <Button variant="ghost" className="w-full justify-start">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Listar Séries
            </Button>
          </Link>
        </div>

        <div className="pt-4">
          <p className="text-xs font-semibold text-muted-foreground px-3 pb-2">FACTURAS</p>
          <Link href="/facturas/nova">
            <Button variant="ghost" className="w-full justify-start">
              <FileText className="mr-2 h-4 w-4" />
              Nova Factura
            </Button>
          </Link>
          <Link href="/facturas/lista">
            <Button variant="ghost" className="w-full justify-start">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Listar Facturas
            </Button>
          </Link>
        </div>

        <div className="pt-4">
          <p className="text-xs font-semibold text-muted-foreground px-3 pb-2">SISTEMA</p>
          <Link href="/configuracoes">
            <Button variant="ghost" className="w-full justify-start">
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </Button>
          </Link>
        </div>
      </nav>
    </aside>
  )
}
