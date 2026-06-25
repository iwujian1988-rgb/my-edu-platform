import { getCurrentUser } from '@/lib/supabase/server'
import { LibraryClient } from '@/components/LibraryClient'
import { getAllBooks } from '@/lib/books-server'
import { getUserPermissions } from '@/lib/permissions'
import { Suspense } from 'react'

// 强制动态渲染，因为子组件使用了 useRouter
export const dynamic = 'force-dynamic'

export default async function LibraryPage() {
  const pageStartTime = Date.now()

  // Step 1: 获取当前用户（使用 cache，应该很快）
  const userStart = Date.now()
  const user = await getCurrentUser()
  const userTime = Date.now() - userStart

  // Middleware 会处理未登录用户的重定向，这里确保有用户
  if (!user) {
    return null
  }

  // Step 2: 获取用户权限（内部使用 cache）
  const permStart = Date.now()
  const userPermissions = await getUserPermissions()
  const permTime = Date.now() - permStart

  // Step 3: 获取词库列表
  const booksStart = Date.now()
  const books = await getAllBooks(user.id, userPermissions)
  const booksTime = Date.now() - booksStart

  const totalTime = Date.now() - pageStartTime
  console.log(`[Library Page] Timing:`, {
    getCurrentUser: `${userTime}ms`,
    getUserPermissions: `${permTime}ms`,
    getAllBooks: `${booksTime}ms`,
    total: `${totalTime}ms`,
    booksCount: books.length
  })

  return (
    <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
      <LibraryClient
        books={books}
        userId={user.id}
        userPermissions={userPermissions?.featurePermissions || []}
      />
    </Suspense>
  )
}
