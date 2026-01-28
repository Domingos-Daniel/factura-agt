'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginFormData } from '@/lib/schemas/authSchema'
import { saveAuth } from '@/lib/storage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { FileText, Loader2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

function LoginFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })
  
  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nif: data.nif, password: data.password }),
      })
      
      const result = await response.json()
      
      if (result.success && result.data) {
        saveAuth(result.data)
        toast({
          title: 'Autenticação bem-sucedida',
          description: `Bem-vindo, ${result.data.user.name}!`,
        })
        const redirectTo = searchParams.get('redirectTo') || '/dashboard'
        router.push(redirectTo)
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro de autenticação',
          description: result.error || 'NIF ou senha incorretos',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Ocorreu um erro ao processar o login',
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-0 backdrop-blur-sm bg-white/95 dark:bg-gray-800/95">
          <CardHeader className="space-y-4 text-center pb-8">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-200">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                SafeFacturas
              </CardTitle>
              <CardDescription className="text-base">
                Sistema de Faturação Eletrónica
              </CardDescription>
              
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nif" className="text-sm font-medium">NIF da Empresa</Label>
                <Input
                  id="nif"
                  placeholder="123456789"
                  {...register('nif')}
                  disabled={isLoading}
                  className="h-11"
                />
                {errors.nif && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <span className="text-xs">⚠</span> {errors.nif.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  disabled={isLoading}
                  className="h-11"
                />
                {errors.password && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <span className="text-xs">⚠</span> {errors.password.message}
                  </p>
                )}
              </div>
              
              <Button
                type="submit"
                variant="gradient"
                className="w-full h-11 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    A autenticar...
                  </>
                ) : (
                  'Entrar no Sistema'
                )}
              </Button>
            </form>
          </CardContent>
          
          {/* Footer com nome da aplicação */}
          <div className="px-6 py-4 bg-muted/30 border-t text-center">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold">SafeFacturas</span> © {new Date().getFullYear()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Desenvolvido por SafeQ Angola
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
        <div className="animate-pulse">Carregando...</div>
      </div>
    }>
      <LoginFormContent />
    </Suspense>
  )
}
