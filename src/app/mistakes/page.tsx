import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Trophy, ArrowLeft, BookOpen } from 'lucide-react'
import { MistakesClient } from '@/components/MistakesClient'

// 强制动态渲染
export const dynamic = 'force-dynamic'

interface MistakeWord {
  id: string
  word: string
  phonetic: string
  uk_phonetic?: string
  us_phonetic?: string
  definition: string
  definition_en: string
  collocation: string
  collocation_en: string
  example_sentence: string
  example_sentence_en: string
  part_of_speech: string
  status: 'known' | 'fuzzy' | 'unknown' | 'new'
  book_id: string
  book_title: string
}

export default async function MistakesPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?redirect=' + encodeURIComponent('/mistakes'))
  }

  const supabase = await createClient()
  let mistakeWords: MistakeWord[] = []

  try {
    // 获取所有状态为 unknown 或 fuzzy 的单词进度（错题本）
    const { data: progressData, error: progressError } = await supabase
      .from('word_progress')
      .select('word_id, book_id, status')
      .eq('user_id', user.id)
      .in('status', ['unknown', 'fuzzy'])

    if (progressError) {
      console.error('Error fetching progress data:', progressError)
    } else if (progressData && progressData.length > 0) {
      // 获取单词详细信息
      const wordIds = progressData.map((p: any) => p.word_id)

      const { data: wordsData } = await supabase
        .from('words')
        .select('id, word, phonetic, uk_phonetic, us_phonetic, definition, definition_en, collocation, collocation_en, example_sentence, example_sentence_en, part_of_speech')
        .in('id', wordIds)

      if (wordsData) {
        // 获取书名信息
        const bookIds = [...new Set(progressData.map((p: any) => p.book_id))]
        const { data: booksData } = await supabase
          .from('books')
          .select('id, title')
          .in('id', bookIds)

        const bookMap = new Map(booksData?.map((b: any) => [b.id, b.title]) || [])

        // 合并数据
        mistakeWords = wordsData.map((word: any) => {
          const progress = progressData.find((p: any) => p.word_id === word.id)! as any
          return {
            id: word.id,
            word: word.word,
            phonetic: word.phonetic || '',
            uk_phonetic: word.uk_phonetic || undefined,
            us_phonetic: word.us_phonetic || undefined,
            definition: word.definition || '',
            definition_en: word.definition_en || '',
            collocation: word.collocation || '',
            collocation_en: word.collocation_en || '',
            example_sentence: word.example_sentence || '',
            example_sentence_en: word.example_sentence_en || '',
            part_of_speech: word.part_of_speech || '',
            status: progress.status as 'known' | 'fuzzy' | 'unknown' | 'new',
            book_id: progress.book_id,
            book_title: bookMap.get(progress.book_id) || '未知词书'
          }
        })
      }
    }
  } catch (error) {
    console.error('Error fetching mistakes:', error)
  }


  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F5F2' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 px-3 sm:px-4 md:px-6 py-3 md:py-4 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="w-full mx-auto" style={{ maxWidth: '1400px' }}>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-gray-900">错题本</h1>
              <p className="text-sm text-gray-500 mt-1">
                {mistakeWords.length > 0
                  ? `共 ${mistakeWords.length} 个待复习单词`
                  : '暂无错题'
                }
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-3 sm:px-4 md:px-6 pt-12 pb-6 md:pb-8">
        <div className="w-full mx-auto" style={{ maxWidth: '1400px' }}>

          {/* Mistakes List - 现在包含空状态逻辑 */}
          <MistakesClient initialWords={mistakeWords} />

        </div>
      </main>
    </div>
  )
}
