/**
 * 演说家模块 - 时间轴页面
 *
 * 路由：/speaker/timeline?id={articleId}
 * 功能：单篇文章的学习导航中心，显示4个学习步骤
 *
 * 参考：
 * - shangwenjie.md 第 2.2 节（时间轴页）
 * - TECHNICAL_MODIFICATION_PLAN.md（逻辑隔离策略）
 */

import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TimelineClient } from '@/components/TimelineClient'
import { getSpeakerArticleById, getSpeakerProgress } from '@/lib/speaker-data'

// 强制动态渲染
export const dynamic = 'force-dynamic'

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  // 检查登录状态
  const user = await getCurrentUser()
  if (!user) {
    const { id: articleId } = await searchParams
    const currentUrl = articleId ? `/speaker/timeline?id=${articleId}` : '/speaker/timeline'
    redirect('/login?redirect=' + encodeURIComponent(currentUrl))
  }

  const { id: articleId } = await searchParams

  // 验证文章ID
  if (!articleId) {
    redirect('/speaker')
  }

  const supabase = await createClient()

  // 获取文章数据
  const article = await getSpeakerArticleById(supabase, articleId)

  // 文章不存在
  if (!article) {
    redirect('/speaker')
  }

  // 获取用户学习进度
  const progress = await getSpeakerProgress(supabase, user.id, articleId)

  return (
    <TimelineClient
      article={article}
      progress={progress}
    />
  )
}
