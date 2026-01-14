import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BookDetailPageClient } from '@/components/BookDetailPageClient'
import { notFound } from 'next/navigation'
import { getWordsForBookServer } from '@/lib/words-server'

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?redirect=' + encodeURIComponent(`/library/${id}`))
  }

  const supabase = await createClient()

  // 快速权限检查 + 获取book信息（一次查询）
  const { data: book } = await supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .single()

  if (!book) {
    notFound()
  }

  // 自定义词库：检查是否为创建者
  if (book.is_official === false && book.created_by !== user.id) {
    redirect('/?no-permission=true')
  }

  // 获取chapters
  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, title')
    .eq('book_id', id)
    .order('order_index', { ascending: true })

  // 🆕 在服务端获取第一页单词数据（解决客户端认证问题）
  const initialWordsData = await getWordsForBookServer(id, user, 1, 21, 'all')

  // 如果获取失败，返回空数组但不阻止页面渲染
  const initialWords = initialWordsData.success ? initialWordsData.words : []
  const initialTotal = initialWordsData.success ? initialWordsData.total : book.total_words || 0

  console.log(`📖 [Server Page] Passing ${initialWords.length} initial words to client`)

  return (
    <BookDetailPageClient
      book={book}
      chapters={chapters || []}
      user={user}
      // 🆕 传递初始数据，避免客户端需要再次调用API
      initialWords={initialWords}
      initialTotal={initialTotal}
    />
  )
}
