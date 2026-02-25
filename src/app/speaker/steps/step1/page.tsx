/**
 * 演说家模块 - Step 1 整段盲听页面
 *
 * 路由：/speaker/steps/step1?id={articleId}
 * 功能：纯听觉输入，建立沉浸感
 *
 * 参考：
 * - shangwenjie.md 第 2.3 节（Step 1 盲听）
 * - TECHNICAL_MODIFICATION_PLAN.md（逻辑隔离）
 */

import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BlindListenClient } from '@/components/speaker/BlindListenClient'
import { getSpeakerArticleById, getSpeakerProgress } from '@/lib/speaker-data'

// 强制动态渲染
export const dynamic = 'force-dynamic'

export default async function BlindListenPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  // 检查登录状态
  const user = await getCurrentUser()
  if (!user) {
    const { id: articleId } = await searchParams
    const currentUrl = articleId ? `/speaker/steps/step1?id=${articleId}` : '/speaker/steps/step1'
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

  // TODO: 获取真实用户ID后查询进度
  // 暂时设为 null，表示用户还未开始学习
  const progress = null

  return (
    <BlindListenClient
      article={article}
      lastPosition={progress?.step1_last_position || null}
      userId={user.id}
    />
  )
}
