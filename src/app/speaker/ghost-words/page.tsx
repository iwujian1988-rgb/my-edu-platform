/**
 * 演说家模块 - 魔鬼生词本页面
 *
 * 严格按照三个文档实现：
 * - shangwenjie.md 第 2.5 节（魔鬼生词本）
 * - TECHNICAL_MODIFICATION_PLAN.md（技术方案）
 * - AI_DEVELOPMENT_GUIDE.md（开发指南）
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GhostWordBook } from '@/components/speaker/GhostWordBook'

// 强制动态渲染，跳过预渲染
export const dynamic = 'force-dynamic'

export default async function GhostWordsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <GhostWordBook userId={user.id} />
}
