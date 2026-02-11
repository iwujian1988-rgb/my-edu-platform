/**
 * 演说家模块 - Step 4 原音对比页面（KTV模式）
 *
 * 路由：/speaker/steps/step4?id={articleId}
 * 功能：KTV模式滚动高亮，完课确认
 *
 * 严格按照三个文档实现：
 * - shangwenjie.md 第 2.7 节（KTV模式需求）
 * - TECHNICAL_MODIFICATION_PLAN.md（逻辑隔离）
 * - AI_DEVELOPMENT_GUIDE.md（性能优化）
 */

import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { KTVClient } from '@/components/speaker/KTVClient'
import { getSpeakerArticleById } from '@/lib/speaker-data'

// 强制动态渲染
export const dynamic = 'force-dynamic'

export default async function KTVPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  // 检查登录状态
  const user = await getCurrentUser()
  if (!user) {
    const { id: articleId } = await searchParams
    const currentUrl = articleId ? `/speaker/steps/step4?id=${articleId}` : '/speaker/steps/step4'
    redirect('/login?redirect=' + encodeURIComponent(currentUrl))
  }

  const { id: articleId } = await searchParams

  if (!articleId) {
    redirect('/speaker')
  }

  const supabase = await createClient()

  const article = await getSpeakerArticleById(supabase, articleId)

  if (!article) {
    redirect('/speaker')
  }

  // 获取学习进度，检查是否已完成
  const { data: progressData } = await supabase
    .from('speaker_progress')
    .select('step4_completed, status')
    .eq('user_id', user.id)
    .eq('article_id', articleId)
    .single()

  const isCompleted = progressData?.step4_completed || false

  return (
    <KTVClient
      article={article}
      sentences={article.sentences || []}
      userId={user.id}
      isCompleted={isCompleted}
    />
  )
}
