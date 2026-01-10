import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppSidebar } from '@/components/AppSidebar'
import { BookCard } from '@/components/BookCard'
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

  try {
    const { data: booksData } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false })

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
          cover_url: book.cover_url || null
        }))
    }
  } catch (error) {
    console.error('Error fetching books:', error)
  }

  return (
    <>
      <AppSidebar />
      <div className="min-h-screen bg-[#F8FAFC] text-black font-sans p-4 md:p-8 lg:ml-64">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">系统词库</h1>
            <p className="text-gray-600 font-bold mt-2">浏览所有可用的词库资源</p>
          </header>

          {/* Books Grid */}
          {books.length === 0 ? (
            <div className="text-center py-16 bg-white border-[3px] border-black rounded-xl">
              <p className="text-gray-500 font-bold mb-4">还没有可用的词库</p>
              <p className="text-sm text-gray-400">请联系管理员获取词库访问权限</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {books.map((book, index) => (
                <BookCard key={book.id} book={book} index={index} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
