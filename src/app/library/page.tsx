import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppSidebar } from '@/components/AppSidebar'
import { FilterableBookGrid } from '@/components/FilterableBookGrid'
import { getUserPermissions } from '@/lib/permissions'

export default async function LibraryPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const supabase = await createClient()

  // 获取用户权限
  const userPermissions = await getUserPermissions()
  const hasAllBooks = (userPermissions?.bookPermissions.includes('*') || userPermissions?.bookPermissions.includes('全部')) || false
  const userBookIds = userPermissions?.bookPermissions || []

  // 获取所有词书数据
  let books: any[] = []

  // 获取用户最近访问的词库ID（前6个）
  let recentBookIds: string[] = []

  try {
    const { data: booksData } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false })

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

    if (booksData && booksData.length > 0) {
      // 根据权限过滤
      books = booksData
        .filter((book: any) => {
          return hasAllBooks || userBookIds.includes(book.id)
        })
        .map((book: any) => ({
          id: book.id,
          title: book.title,
          description: book.description || '',
          total_words: book.total_words || 0,
          cover_color: book.cover_color || '',
          cover_url: book.cover_url || null,
          isRecent: recentBookIds.includes(book.id)
          // 注意：coverType 和 code 会在 FilterableBookGrid 中自动添加
        }))
    }
  } catch (error) {
    console.error('Error fetching books:', error)
  }

  return (
    <>
      <AppSidebar />
      <div className="lg:ml-64">
        {books.length === 0 ? (
          <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto text-center py-16 bg-white border-[3px] border-black rounded-xl">
              <p className="text-gray-500 font-bold mb-4">还没有可用的词库</p>
              <p className="text-sm text-gray-400">请联系管理员获取词库访问权限</p>
            </div>
          </div>
        ) : (
          <FilterableBookGrid books={books} />
        )}
      </div>
    </>
  )
}
