import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const phone = searchParams.get('phone')

  if (!phone) {
    return NextResponse.json({ error: 'Missing phone parameter' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  // 查询用户信息（可能有多条）
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('phone_number', phone)
    .order('created_at', { ascending: false })

  if (userError) {
    return NextResponse.json({ error: 'Query failed: ' + userError.message }, { status: 500 })
  }

  if (!users || users.length === 0) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({
    users,
    count: users.length
  })
}
