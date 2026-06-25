import { getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsPageClient } from '@/components/SettingsPageClient'
import { getAllBooks } from '@/lib/books-server'
import { getUserPermissions } from '@/lib/permissions'

// 强制动态渲染
export const dynamic = 'force-dynamic'

// 设置页面 - 服务端组件
//
// 🚀 性能优化：
// - 使用 React cache 机制，如果首页已经查询过 books，这里会直接使用缓存
// - 避免重复数据库查询
export default async function SettingsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // 获取用户权限（只查询一次）
  const userPermissions = await getUserPermissions()

  // 🚀 使用统一的缓存函数获取词书数据
  // 如果在同一请求中已经调用过 getAllBooks()（例如首页），
  // 这里会直接返回缓存结果，不会再次查询数据库
  const books = await getAllBooks(user.id, userPermissions)

  console.log(`[Settings Page] Loaded ${books.length} books`)

  return (
    <SettingsPageClient
      books={books}
      userId={user.id}
      userPermissions={userPermissions?.featurePermissions || []}
    />
  )
}
