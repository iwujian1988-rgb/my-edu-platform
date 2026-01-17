import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getUserPermissions } from '@/lib/permissions'
import Link from 'next/link'
import { Dumbbell, ArrowRight, Home } from 'lucide-react'

/**
 * 打字练习入口页 - 词书列表
 * Route: /typing
 */
export default async function TypingPage() {
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
          return hasAllBooks || userBookIds.includes(book.id) || book.created_by === user.id
        })
        .map((book: any) => ({
          id: book.id,
          title: book.title,
          description: book.description || '',
          total_words: book.total_words || 0,
          cover_color: book.cover_color || '',
          cover_url: book.cover_url || null,
        }))
    }
  } catch (error) {
    console.error('Error fetching books:', error)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* 简单的顶部导航 */}
      <div className="bg-white border-b-[2px] border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#B4F416] border-[2px] border-black rounded-lg flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-black" strokeWidth={3} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  打字练习
                </h1>
                <p className="text-xs text-gray-500">
                  选择词书开始练习
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              <Home className="w-4 h-4" />
              返回首页
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {books.length === 0 ? (
          <div className="text-center py-16 bg-white border-[3px] border-black rounded-xl">
            <Dumbbell className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-bold mb-2">还没有可用的词库</p>
            <p className="text-sm text-gray-400">请联系管理员获取词库访问权限</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {books.map((book: any, index: number) => (
              <Link
                key={book.id}
                href={`/practice?bookId=${book.id}`}
                className="group block"
              >
                <div className="relative w-full cursor-pointer">
                  {/* 阴影 */}
                  <div className="absolute inset-0 bg-black rounded-lg md:rounded-xl translate-x-1.5 md:translate-x-2 translate-y-1.5 md:translate-y-2 transition-transform group-hover:translate-x-2 group-hover:translate-y-2 md:group-hover:translate-x-3 md:group-hover:translate-y-3" />

                  {/* 卡片容器 */}
                  <div className="relative bg-white rounded-lg border-[2px] md:border-[3px] border-black overflow-hidden flex flex-col h-full transition-all hover:shadow-[4px_4px_0px_0px_#000]">

                    {/* 封面区 */}
                    <div className="aspect-[4/3] relative flex flex-col items-center justify-center border-b-[2px] md:border-b-[3px] border-black bg-gradient-to-br from-[#B4F416] to-[#A0E00A] p-4">

                      {/* 练习模式标签 */}
                      <div className="absolute top-2 left-2 z-20">
                        <span className="px-2 py-1 bg-black text-[10px] font-bold text-white border border-black rounded-md shadow-[2px_2px_0px_0px_#000]">
                          打字练习
                        </span>
                      </div>

                      {/* 图标 + 代码 */}
                      <div className="flex flex-col items-center justify-center mt-4">
                        <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center shadow-[4px_4px_0px_0px_#fff] mb-3">
                          <Dumbbell className="w-8 h-8 text-[#B4F416]" strokeWidth={3} />
                        </div>
                      </div>

                      {/* 背景纹理 */}
                      <div className="absolute inset-0 opacity-10 pointer-events-none"
                           style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
                    </div>

                    {/* 信息区 */}
                    <div className="p-4 bg-white">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg leading-tight text-gray-900 line-clamp-1 mb-1">
                            {book.title || '未命名词书'}
                          </h3>
                          <div className="font-mono text-xs text-gray-500 flex items-center gap-1">
                            <span>{book.total_words?.toLocaleString() || 0} 单词</span>
                          </div>
                        </div>
                        <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-black transition-colors" strokeWidth={3} />
                      </div>
                    </div>

                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
