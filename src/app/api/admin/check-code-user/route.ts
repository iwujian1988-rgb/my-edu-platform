import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.json({ error: 'Missing code parameter' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  // 1. 查询邀请码详情
  const { data: invitationCode, error: codeError } = await supabase
    .from('invitation_codes')
    .select('*')
    .eq('code', code)
    .single()

  if (codeError) {
    return NextResponse.json({ error: 'Invitation code not found: ' + codeError.message }, { status: 404 })
  }

  // 2. 查询最近注册的用户（按创建时间倒序，取前10个）
  const { data: recentUsers, error: usersError } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 })
  }

  // 3. 查询所有使用了这个邀请码ID的用户
  const { data: usersWithCode, error: usersWithCodeError } = await supabase
    .from('users')
    .select('*')
    .eq('invitation_code_id', invitationCode.id)

  if (usersWithCodeError) {
    return NextResponse.json({ error: usersWithCodeError.message }, { status: 500 })
  }

  return NextResponse.json({
    invitationCode: {
      id: invitationCode.id,
      code: invitationCode.code,
      package_id: invitationCode.package_id,
      book_permissions: invitationCode.book_permissions,
      feature_permissions: invitationCode.feature_permissions,
      used_count: invitationCode.used_count,
      used_by: invitationCode.used_by
    },
    usersWithThisCode: usersWithCode,
    recentUsers: recentUsers
  })
}
