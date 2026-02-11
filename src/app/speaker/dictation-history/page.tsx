/**
 * 演说家模块 - 听写历史记录页面
 *
 * 严格按照三个文档实现：
 * - shangwenjie.md 第 2.4 节 F（训练结果页 - 历史切片入口）
 * - TECHNICAL_MODIFICATION_PLAN.md（技术方案）
 * - AI_DEVELOPMENT_GUIDE.md（开发指南）
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import { DictationHistoryWrapper } from '@/components/speaker/DictationHistoryWrapper'

// 强制动态渲染，跳过预渲染
export const dynamic = 'force-dynamic'

export default async function DictationHistoryPageRoute() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">加载中...</div>}>
      <DictationHistoryWrapper userId={user.id} />
    </Suspense>
  )
}
