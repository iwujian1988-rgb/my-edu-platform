/**
 * 演说家模块 - 文章列表页面（主页）
 *
 * 路由：/speaker
 * 功能：显示所有演说家文章，支持按难度等级过滤
 *
 * 参考：
 * - shangwenjie.md 第 2.1 节（演说家首页）
 * - AI_DEVELOPMENT_GUIDE.md Step 3.2
 */

import { getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SpeakerClient } from '@/components/SpeakerClient'
import { getUserPermissions } from '@/lib/permissions'

// 强制动态渲染
export const dynamic = 'force-dynamic'

export default async function SpeakerPage() {
  // 检查登录状态
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?redirect=' + encodeURIComponent('/speaker'))
  }

  // 直接返回空数组，完全使用客户端渲染避免服务端阻塞
  console.log('[Speaker Page] 使用客户端渲染模式')

  const userPermissions = await getUserPermissions()

  return (
    <SpeakerClient
      initialArticles={[]}
      userId={user.id}
      userPermissions={userPermissions?.featurePermissions || []}
    />
  )
}

