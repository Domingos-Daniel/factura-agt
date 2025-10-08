'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { clearAuth, getAuth } from '@/lib/storage'
import { DarkModeToggle } from './DarkModeToggle'

export function Header() {
  const router = useRouter()
  const [userName, setUserName] = useState<string>('')

  useEffect(() => {
    const auth = getAuth()
    if (auth?.user?.name) {
      setUserName(auth.user.name)
    }
  }, [])

  const handleLogout = () => {
    clearAuth()
    router.push('/login')
  }

  return (
    <header className="border-b bg-background sticky top-0 z-40">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-gradient-agt rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-bold text-lg">Sistema AGT</h1>
            <p className="text-xs text-muted-foreground">Faturação Eletrónica</p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {userName && (
            <span className="text-sm text-muted-foreground hidden md:inline">
              {userName}
            </span>
          )}
          <DarkModeToggle />
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
