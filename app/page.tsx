'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/storage'

export default function HomePage() {
  const router = useRouter()
  
  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/dashboard')
    } else {
      router.push('/login')
    }
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
