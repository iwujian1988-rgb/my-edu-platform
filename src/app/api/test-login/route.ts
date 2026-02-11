import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { email, password } = await request.json()

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  return NextResponse.json({
    hasUser: !!data?.user,
    userId: data?.user?.id,
    error: error?.message,
    errorStatus: error?.status,
    errorDetails: error
  })
}
