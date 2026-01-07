import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  // 1. 查询"新概念英语第四册"这本书的信息
  const { data: books } = await supabase
    .from('books')
    .select('id, title, total_words')
    .ilike('title', '%新概念%第四册%')

  // 2. 查询所有用户的所有"unknown"和"fuzzy"单词
  const { data: allMistakes } = await supabase
    .from('word_progress')
    .select('user_id, book_id, status')
    .in('status', ['unknown', 'fuzzy'])

  // 3. 统计每本书的错题数量
  const bookStats = new Map<string, { title: string; unknown: number; fuzzy: number }>()

  if (allMistakes) {
    for (const mistake of allMistakes as any[]) {
      if (!bookStats.has(mistake.book_id)) {
        // 获取书名
        const book = (books as any[])?.find(b => b.id === mistake.book_id)
        bookStats.set(mistake.book_id, {
          title: book?.title || mistake.book_id,
          unknown: 0,
          fuzzy: 0
        })
      }

      const stats = bookStats.get(mistake.book_id)!
      if (mistake.status === 'unknown') {
        stats.unknown++
      } else if (mistake.status === 'fuzzy') {
        stats.fuzzy++
      }
    }
  }

  // 4. 格式化结果
  const result = Array.from(bookStats.entries()).map(([bookId, stats]) => ({
    bookId,
    ...stats
  }))

  return NextResponse.json({
    books,
    allMistakesCount: allMistakes?.length || 0,
    bookStats: result
  })
}
