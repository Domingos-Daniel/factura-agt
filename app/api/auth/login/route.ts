import { loginAPI } from '@/lib/mockAPI'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { nif, password } = await request.json()
    
    const result = await loginAPI(nif, password)
    
    if (result.success && result.data) {
      return NextResponse.json({
        success: true,
        data: result.data,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'NIF ou senha incorretos',
        },
        { status: 401 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao processar login' },
      { status: 500 }
    )
  }
}
