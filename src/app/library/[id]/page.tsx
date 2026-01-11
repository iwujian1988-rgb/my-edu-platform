import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BookDetailPageClient } from '@/components/BookDetailPageClient'
import { hasBookPermission } from '@/lib/permissions'
import { notFound } from 'next/navigation'

type Chapter = {
  id: string
  title: string
}

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

  // Check if user has permission to access this book
  const hasPermission = await hasBookPermission(user.id, id)
  if (!hasPermission) {
    redirect('/?no-permission=true')
  }

  const supabase = await createClient()

  // 获取词书信息
  let book = null
  let words: any[] = []

  try {
    // 获取词书基本信息
    const { data: bookData, error: bookError } = await supabase
      .from('books')
      .select('*')
      .eq('id', id)
      .single()

    if (bookError || !bookData) {
      console.log('Book not found in database:', bookError)
      notFound()
    }

    book = bookData

    // 获取该词书的所有章节和单词
    const { data: chaptersData } = await supabase
      .from('chapters')
      .select('id, title')
      .eq('book_id', id)
      .order('order_index', { ascending: true })

    if (chaptersData && chaptersData.length > 0) {
      const chapterIds = chaptersData.map((c: Chapter) => c.id)

      // 创建章节 Map 方便查找章节标题
      const chapterMap = new Map<string, string>()
      chaptersData.forEach((c: Chapter) => {
        chapterMap.set(c.id, c.title)
      })

      // 获取所有单词
      const { data: wordsData } = await supabase
        .from('words')
        .select('*')
        .in('chapter_id', chapterIds)
        .order('order_index', { ascending: true })

      if (wordsData && wordsData.length > 0) {
        // 获取用户的单词学习进度
        const { data: progressData } = await supabase
          .from('word_progress')
          .select('word_id, status')
          .eq('user_id', user.id)
          .eq('book_id', id)

        // 将进度数据转换为 Map 方便查找
        const progressMap = new Map<string, string>()
        progressData?.forEach((p: any) => {
          progressMap.set(p.word_id, p.status)
        })

        // 映射数据库字段到组件格式
        words = wordsData.map((w: any) => ({
          id: w.id,
          word: w.word,
          phonetic: w.phonetic || '',
          uk_phonetic: w.uk_phonetic || undefined,
          us_phonetic: w.us_phonetic || undefined,
          definition: w.definition || '',
          definition_en: w.definition_en || '',
          collocation: w.collocation || '',
          collocation_en: w.collocation_en || '',
          example_sentence: w.example_sentence || '',
          example_sentence_en: w.example_sentence_en || '',
          part_of_speech: w.part_of_speech || '',
          status: (progressMap.get(w.id) as 'known' | 'unknown' | 'fuzzy' | 'new') || 'new',
          chapter_id: w.chapter_id || null,
          chapter: w.chapter_id ? chapterMap.get(w.chapter_id) || '' : ''
        }))
      }
    }
  } catch (error) {
    console.error('Error fetching book data:', error)
    notFound()
  }

  // 如果没有找到书，返回404
  if (!book) {
    notFound()
  }

  return (
    <BookDetailPageClient
      book={book}
      words={words}
      user={user}
      useMockData={false}
    />
  )
}
