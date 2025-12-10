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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-agt rounded-full flex items-center justify-center">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Sistema de Faturação AGT</CardTitle>
          <CardDescription>
            Administração Geral Tributária de Angola
            <br />
            <span className="text-xs">Faça login para continuar</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nif">NIF</Label>
              <Input
                id="nif"
                placeholder="123456789"
                {...register('nif')}
                disabled={isLoading}
              />
              {errors.nif && (
                <p className="text-sm text-destructive">{errors.nif.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            
            <Button
              type="submit"
              variant="gradient"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A entrar...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
          
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-2 font-semibold">Credenciais de Teste:</p>
            <p className="text-xs text-muted-foreground">NIF: <strong>123456789</strong></p>
            <p className="text-xs text-muted-foreground">Senha: <strong>admin123</strong></p>
          </div>
        </CardContent>
      </Card>
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
