import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BookDetailPageClient } from '@/components/BookDetailPageClient'
import { notFound } from 'next/navigation'

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

  // 获取chapters（客户端会加载words）
  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, title')
    .eq('book_id', id)
    .order('order_index', { ascending: true })

  return (
    <BookDetailPageClient
      book={book}
      chapters={chapters || []}
      user={user}
    />
  )
}
