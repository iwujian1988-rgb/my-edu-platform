/**
 * 用户详情页面
 * 显示用户的详细信息、学习记录、操作历史等
 */

import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'
import { notFound } from 'next/navigation'
import { UserDetail } from '@/components/admin/UserDetail'

// 强制动态渲染
export const dynamic = 'force-dynamic'

export default async function AdminUserDetailPage({
  params
}: {
  params: Promise<{ userId: string }>
}) {
  const admin = await requireAdmin()
  // 使用 admin client 绕过 RLS 限制
  const supabase = await createAdminClient()

  // 解析参数
  const { userId } = await params

  // 获取用户详细信息
  const { data: user, error } = await (supabase
    .from('users') as any)
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !user) {
    notFound()
  }

  // 获取用户的学习记录统计
  const { data: learningStats } = await supabase
    .from('learning_records')
    .select('created_at')
    .eq('user_id', userId)

  // 获取用户的学习天数统计
  const learningDays = learningStats && learningStats.length > 0
    ? new Set(learningStats.map((r: any) => r.created_at.split('T')[0])).size
    : 0

  // 获取用户的单词掌握情况
  const { data: wordProgress } = await supabase
    .from('word_progress')
    .select('status')
    .eq('user_id', userId)

  const wordsLearned = wordProgress?.filter((w: any) => w.status === 'known').length || 0
  const wordsFuzzy = wordProgress?.filter((w: any) => w.status === 'fuzzy').length || 0
  const wordsUnknown = wordProgress?.filter((w: any) => w.status === 'unknown').length || 0

  // 获取用户使用的邀请码
  const { data: invitationCode } = await supabase
    .from('invitation_codes')
    .select('*')
    .eq('used_by', userId)
    .single()

  // 获取所有单词书
  const { data: allBooks } = await supabase
    .from('books')
    .select('id, title')

  // 获取套餐信息（通过 users.package_ids）
  interface PackageRow {
    id: string
    name: string
    description: string | null
    validity_days: number | null
    duration_days: number | null
    feature_permissions: string[] | null
    book_permissions: string[] | null
    is_active: boolean
    [key: string]: unknown
  }
  let userPackage: PackageRow | null = null
  let userAllPackages: PackageRow[] = []
  const userPackageIds = (user as Record<string, unknown>).package_ids as string[] | null
  if (userPackageIds && userPackageIds.length > 0) {
    const { data: pkgs } = await supabase
      .from('invitation_packages')
      .select('*')
      .in('id', userPackageIds)

    userAllPackages = (pkgs as PackageRow[]) || []
    userPackage = userAllPackages.length > 0 ? userAllPackages[0] : null
  } else {
    // 兜底：通过邀请码查找套餐
    const fallbackPackageId = (invitationCode as Record<string, unknown>)?.package_id as string | null
    if (fallbackPackageId) {
      const { data: pkg } = await supabase
        .from('invitation_packages')
        .select('*')
        .eq('id', fallbackPackageId)
        .single()

      userPackage = pkg as PackageRow | null
      userAllPackages = pkg ? [pkg as PackageRow] : []
    }
  }

  // 获取所有套餐列表（用于权限管理）
  const { data: allPackages } = await supabase
    .from('invitation_packages')
    .select('id, name, description, validity_days, feature_permissions, book_permissions, is_active')
    .order('sort_order', { ascending: true })

  return (
    <div className="space-y-6">
      {/* 返回按钮 */}
      <a
        href="/admin/users"
        className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-bold"
      >
        ← 返回用户列表
      </a>

      {/* 用户详情 */}
      <UserDetail
        user={user}
        stats={{
          learningDays,
          wordsLearned,
          wordsFuzzy,
          wordsUnknown,
          totalWords: wordProgress?.length || 0
        }}
        invitationCode={invitationCode}
        allBooks={allBooks || []}
        userPackage={userPackage}
        userAllPackages={userAllPackages}
        allPackages={allPackages || []}
      />
    </div>
  )
}
