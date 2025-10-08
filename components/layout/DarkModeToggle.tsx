'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

const THEME_STORAGE_KEY = 'factura-agt-theme'

type ThemeMode = 'light' | 'dark'

function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', mode === 'dark')
}

export function DarkModeToggle() {
  const [mode, setMode] = useState<ThemeMode>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initialMode = stored ?? (prefersDark ? 'dark' : 'light')

    setMode(initialMode)
    applyTheme(initialMode)
    setMounted(true)
  }, [])

  const toggle = () => {
    const nextMode: ThemeMode = mode === 'light' ? 'dark' : 'light'
    setMode(nextMode)
    applyTheme(nextMode)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextMode)
    }
  }

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label="Alternar tema" disabled>
        <Sun className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Alternar tema">
      {mode === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </Button>
  )
}
