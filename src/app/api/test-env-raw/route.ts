import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY_LENGTH: key?.length || 0,
      NEXT_PUBLIC_SUPABASE_ANON_KEY_PREFIX: key?.substring(0, 30) + '...',
      NEXT_PUBLIC_SUPABASE_ANON_KEY_SUFFIX: '...' + key?.substring((key?.length || 0) - 30),
    },
    nodeEnv: process.env.NODE_ENV,
  })
}
