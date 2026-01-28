'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { clearAuth, getAuth, getAppConfig } from '@/lib/storage'
import { DarkModeToggle } from './DarkModeToggle'

export function Header() {
  const router = useRouter()
  const [userName, setUserName] = useState<string>('')
  const [companyName, setCompanyName] = useState<string>('Empresa Demo AGT')
  const [systemName, setSystemName] = useState<string>('Sistema AGT')
  const [systemSubtitle, setSystemSubtitle] = useState<string>('Faturação Eletrónica')

  useEffect(() => {
    const auth = getAuth()
    const config = getAppConfig()
    
    // Use company name from config or auth
    const displayName = config.companyName || auth?.user?.company || auth?.user?.name || 'Empresa Demo AGT'
    setUserName(displayName)
    setCompanyName(displayName)
    
    setSystemName('SafeFacturas')
    setSystemSubtitle('Sistema de Faturação Eletrónica')
  }, [])

  const handleLogout = () => {
    clearAuth()
    router.push('/login')
  }

  return (
    <header className="border-b border-border/50 bg-gradient-to-r from-background via-background/95 to-background backdrop-blur-sm sticky top-0 z-40 shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 bg-gradient-to-br from-primary via-primary/90 to-primary/80 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-200 group-hover:scale-105">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-bold text-lg bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              {companyName}
            </h1>
            <p className="text-xs text-muted-foreground/80">{systemSubtitle}</p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {userName && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-foreground/90">
                {userName}
              </span>
            </div>
          )}
          <DarkModeToggle />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout}
            className="border-border/50 hover:border-destructive/50 hover:bg-destructive/5 hover:text-destructive transition-all duration-200"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
