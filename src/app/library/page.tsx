import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LibraryClient } from '@/components/LibraryClient'
import { getAllBooks } from '@/lib/books-server'
import { getUserPermissions } from '@/lib/permissions'
import { Suspense } from 'react'

// 强制动态渲染，因为子组件使用了 useRouter
export const dynamic = 'force-dynamic'

export default async function LibraryPage() {
  const user = await getCurrentUser()

  // Middleware 会处理未登录用户的重定向，这里确保有用户
  if (!user) {
    return null
  }

  // 🔥 修复：改为串行获取，避免 Promise.all 导致的变量引用问题
  // b47f698 优化尝试并行执行，但 userPermissions 在解构前不存在
  const userPermissions = await getUserPermissions()
  const books = await getAllBooks(user.id, userPermissions)

  console.log(`[Library Page] Loaded ${books.length} books`)

  return (
    <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
      <LibraryClient books={books} userId={user.id} />
    </Suspense>
  )
}
