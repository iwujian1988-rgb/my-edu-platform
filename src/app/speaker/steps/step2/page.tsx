/**
 * 演说家模块 - Step 2 听写训练页面
 *
 * 路由：/speaker/steps/step2?id={articleId}
 * 功能：逐句听写，核心练习
 *
 * 严格按照三个文档实现：
 * - shangwenjie.md 第 2.4 节（产品需求）
 * - TECHNICAL_MODIFICATION_PLAN.md（技术方案）
 * - AI_DEVELOPMENT_GUIDE.md（开发指南）
 */

import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DictationClientV2 } from '@/components/speaker/DictationClientV2'
import { getSpeakerArticleById } from '@/lib/speaker-data'

// 强制动态渲染
export const dynamic = 'force-dynamic'

export default async function DictationPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  // 检查登录状态并获取真实用户 ID
  const user = await getCurrentUser()
  if (!user) {
    const { id: articleId } = await searchParams
    const currentUrl = articleId ? `/speaker/steps/step2?id=${articleId}` : '/speaker/steps/step2'
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

  // 使用真实用户 ID
  const userId = user.id

  return (
    <DictationClientV2
      article={article}
      userId={userId}
    />
  )
}
