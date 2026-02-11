/**
 * 演说家模块 - Step 3 跟读背诵页面
 *
 * 路由：/speaker/steps/step3?id={articleId}
 * 功能：录音跟读，自我评价
 *
 * 参考：
 * - shangwenjie.md 第 2.5 节（Step 3 跟读）
 * - TECHNICAL_MODIFICATION_PLAN.md（逻辑隔离）
 */

import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RecitationClient } from '@/components/speaker/RecitationClient'
import { getSpeakerArticleById } from '@/lib/speaker-data'

// 强制动态渲染
export const dynamic = 'force-dynamic'

export default async function RecitationPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  // 检查登录状态
  const user = await getCurrentUser()
  if (!user) {
    const { id: articleId } = await searchParams
    const currentUrl = articleId ? `/speaker/steps/step3?id=${articleId}` : '/speaker/steps/step3'
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

  return (
    <RecitationClient
      article={article}
      sentences={article.sentences || []}
      userId={user.id}
    />
  )
}
