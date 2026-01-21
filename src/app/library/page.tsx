import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LibraryClient } from '@/components/LibraryClient'
import { getAllBooks } from '@/lib/books-server'
import { getUserPermissions } from '@/lib/permissions'

export default async function LibraryPage() {
  const user = await getCurrentUser()

  // Middleware 会处理未登录用户的重定向，这里确保有用户
  if (!user) {
    return null
  }

  const supabase = await createClient()

  // 获取用户权限（只查询一次）
  const userPermissions = await getUserPermissions()

  // 🚀 使用统一的缓存函数获取词书数据
  // 这会使用 React cache 机制，避免重复查询数据库
  const books = await getAllBooks(user.id, userPermissions)

  // 获取用户最近访问的词库ID（前6个）
  let recentBookIds: string[] = []

  try {
    // 获取最近访问记录
    const { data: recentPrefs } = await supabase
      .from('user_book_preferences')
      .select('book_id')
      .eq('user_id', user.id)
      .not('last_accessed_at', 'is', null)
      .order('last_accessed_at', { ascending: false })
      .limit(6)

    if (recentPrefs) {
      recentBookIds = recentPrefs.map(p => p.book_id)
    }
  } catch (error) {
    console.error('Error fetching recent books:', error)
  }

  // 为每个书籍添加 isRecent 标记
  const booksWithRecentFlag = books.map(book => ({
    ...book,
    isRecent: recentBookIds.includes(book.id)
  }))

  console.log(`[Library Page] Loaded ${booksWithRecentFlag.length} books (${recentBookIds.length} recent)`)

  return (
    <LibraryClient books={booksWithRecentFlag} />
  )
}
