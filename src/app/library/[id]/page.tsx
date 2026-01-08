import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BookDetailPageClient } from '@/components/BookDetailPageClient'
import { hasBookPermission } from '@/lib/permissions'

type Chapter = {
  id: string
  title: string
}

// Mock 数据 - 单词列表
const mockWords = [
  {
    id: '1',
    word: 'agenda',
    phonetic: '/əˈdʒendə/',
    definition: '议程，日程表',
    definition_en: 'A list of items to be discussed at a meeting',
    collocation: '制定议程',
    collocation_en: 'set the agenda',
    example_sentence: '请在会议前把议程发给我好吗？',
    example_sentence_en: 'Could you please send me the agenda before the meeting?',
    part_of_speech: 'noun',
    status: 'new' as const
  },
  {
    id: '2',
    word: 'compromise',
    phonetic: '/ˈkɒmprəmaɪz/',
    definition: '妥协，折中；让步',
    definition_en: 'An agreement made between two sides where each gives up something',
    collocation: '达成妥协',
    collocation_en: 'reach a compromise',
    example_sentence: '我们需要达成一个让双方都满意的妥协。',
    example_sentence_en: 'We need to reach a compromise that satisfies both parties.',
    part_of_speech: 'noun, verb',
    status: 'new' as const
  },
  {
    id: '3',
    word: 'abbreviate',
    phonetic: '/əˈbriːvieɪt/',
    definition: '缩写，缩短',
    definition_en: 'To shorten a word or phrase',
    collocation: '缩写信息',
    collocation_en: 'abbreviate information',
    example_sentence: '请把报告缩写成一页。',
    example_sentence_en: 'Please abbreviate the report to one page.',
    part_of_speech: 'verb',
    status: 'new' as const
  },
  {
    id: '4',
    word: 'appetizer',
    phonetic: '/ˈæpɪtaɪzər/',
    definition: '开胃菜',
    definition_en: 'A small dish served before the main course',
    collocation: '点开胃菜',
    collocation_en: 'order an appetizer',
    example_sentence: '我想点这个汤作为开胃菜。',
    example_sentence_en: 'I would like to order the soup as an appetizer.',
    part_of_speech: 'noun',
    status: 'new' as const
  },
]

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
  let words = mockWords
  let useMockData = false

  try {
    // 获取词书基本信息
    const { data: bookData, error: bookError } = await supabase
      .from('books')
      .select('*')
      .eq('id', id)
      .single()

    if (bookError) {
      console.log('Book not found in database, using mock data:', bookError)
      useMockData = true
    }

    if (bookData && !useMockData) {
      book = bookData

      // 获取该词书的所有章节和单词
      const { data: chaptersData } = await supabase
        .from('chapters')
        .select('id, title')
        .eq('book_id', id)
        .order('order_index', { ascending: true })

      if (chaptersData && chaptersData.length > 0) {
        const chapterIds = chaptersData.map((c: Chapter) => c.id)

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
            definition: w.definition || '',
            definition_en: w.definition_en || '',
            collocation: w.collocation || '',
            collocation_en: w.collocation_en || '',
            example_sentence: w.example_sentence || '',
            example_sentence_en: w.example_sentence_en || '',
            part_of_speech: w.part_of_speech || '',
            status: (progressMap.get(w.id) as 'known' | 'unknown' | 'fuzzy' | 'new') || 'new'
          })) as typeof mockWords
        } else {
          console.log('No words found in database, using mock data')
          useMockData = true
        }
      } else {
        console.log('No chapters found in database, using mock data')
        useMockData = true
      }
    }
  } catch (error) {
    console.error('Error fetching book data:', error)
    useMockData = true
  }

  // 如果使用mock数据，创建一个mock book对象
  if (useMockData || !book) {
    book = {
      id: id,
      title: 'CET-4 核心词汇（演示）',
      description: '大学英语四级必备词汇 - 这是一个演示页面，实际使用时将从数据库加载',
      total_words: words.length,
      is_official: true, // Mock数据视为官方词库
      created_by: undefined
    }
  }

  return (
    <BookDetailPageClient
      book={book}
      words={words}
      user={user}
      useMockData={useMockData}
    />
  )
}
