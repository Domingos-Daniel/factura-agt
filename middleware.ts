import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const AUTH_COOKIE = 'factura-agt-auth'

export function middleware(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/series/:path*', '/facturas/:path*'],
}
