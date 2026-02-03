import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const AUTH_COOKIE = 'auth_token'

export function middleware(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value
  const pathname = request.nextUrl.pathname

  console.log('🔍 Middleware verificando:', pathname, 'Token presente:', !!token)

  // Se não tem token e está tentando acessar rota protegida, redireciona para login
  if (!token) {
    console.log('❌ Sem token, redirecionando para login')
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  console.log('✅ Token presente, permitindo acesso')
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/series/:path*', '/facturas/:path*', '/configuracoes/:path*'],
}
