import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const revalidate = 0

export async function GET() {
  const environment = process.env.AGT_ENVIRONMENT || 'mock'
  
  return NextResponse.json(
    { environment },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  )
}
