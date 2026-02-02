import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data: books, error } = await supabase
    .from('books')
    .select('id, title, description, total_words, is_official, created_at')
    .order('title', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 生成文本格式
  let output = '=== 生产环境词书列表 ===\n\n'
  output += `总计: ${books.length} 本词书\n\n`

  books.forEach((book: any, index: number) => {
    output += `${index + 1}. 【${book.title}】\n`
    if (book.description) {
      output += `   简介: ${book.description}\n`
    }
    output += `   单词数: ${book.total_words || 0}\n`
    output += `   类型: ${book.is_official ? '官方词书' : '自定义词书'}\n`
    output += '\n'
  })

  const officialBooks = books.filter((b: any) => b.is_official)
  const customBooks = books.filter((b: any) => !b.is_official)
  const totalWords = books.reduce((sum: number, b: any) => sum + (b.total_words || 0), 0)

  output += '--- 统计 ---\n'
  output += `官方词书: ${officialBooks.length} 本\n`
  output += `自定义词书: ${customBooks.length} 本\n`
  output += `总单词数: ${totalWords}\n`

  return new NextResponse(output, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
