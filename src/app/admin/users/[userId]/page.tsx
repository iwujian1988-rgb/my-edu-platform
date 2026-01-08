/**
 * 用户详情页面
 * 显示用户的详细信息、学习记录、操作历史等
 */

import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'
import { notFound } from 'next/navigation'
import { UserDetail } from '@/components/admin/UserDetail'

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
  const { data: user, error } = await supabase
    .from('users')
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

  // 获取套餐信息（如果邀请码有关联的套餐）
  let userPackage = null
  if (invitationCode?.package_id) {
    const { data: pkg } = await supabase
      .from('invitation_packages')
      .select('*')
      .eq('id', invitationCode.package_id)
      .single()

    userPackage = pkg
  }

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
      />
    </div>
  )
}
