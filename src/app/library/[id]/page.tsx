import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BookDetailPageClient } from '@/components/BookDetailPageClient'
import { notFound } from 'next/navigation'
import { getWordsForBookServer } from '@/lib/words-server'

export default async function BookDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { id } = await params
  const paramsObj = await searchParams

  // 🔧 Fix: 服务端获取用户失败时，不立即重定向
  // 让客户端组件处理登录检查
  const user = await getCurrentUser()

  // 如果没有用户，返回一个带有登录检查的客户端组件
  if (!user) {
    return <BookDetailPageClient
      book={null as any}
      chapters={[]}
      user={null}
      initialWords={[]}
      initialTotal={0}
      requireLogin={true}
    />
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

  // 🔥 从URL参数读取status和page，而不是硬编码
  const statusParam = (typeof paramsObj.status === 'string' ? paramsObj.status : null) || 'all'
  const pageParam = parseInt(typeof paramsObj.page === 'string' ? paramsObj.page : '1', 10) || 1

  console.log(`📖 [Server Page] URL params - status: ${statusParam}, page: ${pageParam}`)

  // 🆕 在服务端获取单词数据（根据URL参数）
  const initialWordsData = await getWordsForBookServer(id, user, pageParam, 21, statusParam)

  // 如果获取失败，返回空数组但不阻止页面渲染
  const initialWords = initialWordsData.success ? initialWordsData.words : []
  const initialTotal = initialWordsData.success ? initialWordsData.total : book.total_words || 0

  console.log(`📖 [Server Page] Passing ${initialWords.length} initial words to client`)

  return (
    <BookDetailPageClient
      book={book}
      chapters={chapters || []}
      user={user}
      initialWords={initialWords}
      initialTotal={initialTotal}
    />
  )
}
