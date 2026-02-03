'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  const router = useRouter()
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          router.push('/dashboard')
        } else {
          router.push('/login')
        }
      } catch (error) {
        router.push('/login')
      }
    }
    
    checkAuth()
  }, [router])
  
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-muted-foreground">A carregar...</p>
      </div>
    </div>
  )
}
