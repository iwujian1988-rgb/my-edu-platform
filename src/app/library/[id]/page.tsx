import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, ArrowLeft, Filter, Shuffle, ChevronDown, EyeOff } from 'lucide-react'
import { WordList } from '@/components/WordList'

// Mock 数据 - 单词列表
const mockWords = [
  {
    id: '1',
    word: 'agenda',
    phonetic: '/əˈdʒendə/',
    definition: 'n. 议程，日程表',
    definition_en: 'A list of items to be discussed at a meeting',
    collocation: 'set the agenda',
    collocation_en: 'set the agenda',
    example_sentence: 'Could you please send me the agenda before the meeting?',
    example_sentence_en: 'Could you please send me the agenda before the meeting?',
    part_of_speech: 'noun',
    status: 'unknown' // unknown, known, fuzzy
  },
  {
    id: '2',
    word: 'compromise',
    phonetic: '/ˈkɒmprəmaɪz/',
    definition: 'n. 妥协，折中；v. 妥协，让步',
    definition_en: 'An agreement made between two sides where each gives up something',
    collocation: 'reach a compromise',
    collocation_en: 'reach a compromise',
    example_sentence: 'We need to reach a compromise that satisfies both parties.',
    example_sentence_en: 'We need to reach a compromise that satisfies both parties.',
    part_of_speech: 'noun, verb',
    status: 'known'
  },
  {
    id: '3',
    word: 'abbreviate',
    phonetic: '/əˈbriːvieɪt/',
    definition: 'v. 缩写，缩短',
    definition_en: 'To shorten a word or phrase',
    collocation: 'abbreviate information',
    collocation_en: 'abbreviate information',
    example_sentence: 'Please abbreviate the report to one page.',
    example_sentence_en: 'Please abbreviate the report to one page.',
    part_of_speech: 'verb',
    status: 'fuzzy'
  },
  {
    id: '4',
    word: 'appetizer',
    phonetic: '/ˈæpɪtaɪzər/',
    definition: 'n. 开胃菜',
    definition_en: 'A small dish served before the main course',
    collocation: 'order an appetizer',
    collocation_en: 'order an appetizer',
    example_sentence: 'I would like to order the soup as an appetizer.',
    example_sentence_en: 'I would like to order the soup as an appetizer.',
    part_of_speech: 'noun',
    status: 'unknown'
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
        const chapterIds = chaptersData.map(c => c.id)

        // 获取所有单词
        const { data: wordsData } = await supabase
          .from('words')
          .select('*')
          .in('chapter_id', chapterIds)
          .order('order_index', { ascending: true })

        if (wordsData && wordsData.length > 0) {
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
            status: 'unknown' // TODO: 从 user_word_progress 表获取
          }))
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
      total_words: words.length
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F5F2' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 px-3 sm:px-4 md:px-6 py-3 md:py-4 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="w-full mx-auto" style={{ maxWidth: '1400px' }}>
          <div className="flex items-center justify-between">
            {/* Logo & Back */}
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">{book.title || '未命名词书'}</h1>
                  <p className="text-xs text-gray-500">{words.length} 个单词</p>
                </div>
              </div>
              {/* 演示数据提示 */}
              {useMockData && (
                <div className="hidden md:block px-3 py-1 bg-yellow-100 border border-yellow-300 rounded-full">
                  <span className="text-xs font-semibold text-yellow-800">演示数据</span>
                </div>
              )}
            </div>

            {/* User */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-600 hidden sm:block">{user.email}</span>
              <Link
                href="/logout"
                className="px-4 py-2 text-sm font-bold text-gray-700 border-2 border-gray-200 rounded-xl hover:border-red-300 hover:text-red-600 transition-all"
              >
                退出
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-3 sm:px-4 md:px-6 py-6 md:py-8">
        <div className="w-full mx-auto" style={{ maxWidth: '1400px' }}>

          {/* 顶部筛选栏 */}
          <section className="clay-card p-4 md:p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* 左侧：主题/场景筛选 */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gray-200 cursor-pointer hover:border-purple-300 transition-colors">
                  <span className="text-sm font-semibold text-gray-700">全部主题</span>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gray-200 cursor-pointer hover:border-purple-300 transition-colors">
                  <span className="text-sm font-semibold text-gray-700">全部场景</span>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </div>
              </div>

              {/* 右侧：排序与筛选 */}
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:border-purple-300 hover:text-purple-600 transition-all">
                  <Shuffle className="w-4 h-4" />
                  随机
                </button>
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:border-purple-300 hover:text-purple-600 transition-all">
                  <Filter className="w-4 h-4" />
                  筛选
                </button>
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:border-purple-300 hover:text-purple-600 transition-all">
                  <EyeOff className="w-4 h-4" />
                  隐藏释义
                </button>
              </div>
            </div>
          </section>

          {/* 单词列表 */}
          <WordList initialWords={words} />

          {/* 底部控制栏 - 仅在单词数 > 50 时显示 */}
          {words.length > 50 && (
            <section className="clay-card p-4 md:p-6 mt-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  显示 1-50 / 共 {words.length} 个单词
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-4 py-2 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50" disabled>
                    上一页
                  </button>
                  <span className="text-sm font-semibold text-gray-900">1 / 2</span>
                  <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-400 to-green-500 text-white text-sm font-semibold hover:shadow-lg transition-all">
                    下一页
                  </button>
                </div>
              </div>
            </section>
          )}

        </div>
      </main>
    </div>
  )
}
