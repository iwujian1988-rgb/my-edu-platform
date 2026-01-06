import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Volume2, Gamepad2, CreditCard } from 'lucide-react'
import { Metadata } from 'next'

type ChapterWithWords = {
  id: string
  title: string
  words?: any[]
}

type Book = {
  title: string
  [key: string]: any
}

interface PageProps {
  params: Promise<{ bookId: string }>
}

export const metadata: Metadata = {
  title: '选择练习模式 - 小语笔记',
  description: '选择你喜欢的练习模式开始学习',
}

export default async function PracticeModePage({ params }: PageProps) {
  const { bookId } = await params
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get book details
  const { data: book } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .single()

  if (!book) {
    redirect('/library')
  }

  const typedBook = book as Book

  // Get chapters with words
  const { data: chapters } = await supabase
    .from('chapters')
    .select(`
      id,
      title,
      words (
        id,
        word,
        phonetic,
        definition
      )
    `)
    .eq('book_id', bookId)

  const totalWords = chapters?.reduce((sum: number, ch: ChapterWithWords) => sum + (ch.words?.length || 0), 0) || 0

  const practiceModes = [
    {
      id: 'flashcards',
      title: '卡片背单词',
      description: '经典记忆模式，点击翻转卡片，快速记忆单词',
      icon: CreditCard,
      color: 'clay-card-lilac',
      gradient: 'text-gradient-lilac',
      buttonText: '开始背诵',
      link: `/study/${bookId}/flashcards`
    },
    {
      id: 'dictation',
      title: '听写模式',
      description: '听音拼写，强化记忆，检验学习成果',
      icon: Volume2,
      color: 'clay-card-mint',
      gradient: 'text-gradient-mint',
      buttonText: '开始听写',
      link: `/study/${bookId}/dictation`
    },
    {
      id: 'match-game',
      title: '消消乐',
      description: '趣味配对游戏，轻松学习，寓教于乐',
      icon: Gamepad2,
      color: 'clay-card-peach',
      gradient: 'text-gradient-peach',
      buttonText: '开始游戏',
      link: `/study/${bookId}/match-game`
    }
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F5F2' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="clay-card px-6 py-4 flex items-center gap-4">
            <Link href={`/library/${bookId}`}>
              <button className="clay-icon p-2 hover:scale-110 transition-transform">
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
            </Link>
            <div className="flex items-center gap-3 flex-1">
              <div className="clay-icon p-2">
                <BookOpen className="w-5 h-5 text-[#9B8CB5]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gradient-lilac">{typedBook.title}</h1>
                <p className="text-xs text-gray-600 font-semibold">
                  共 {totalWords} 个单词
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Title Card */}
          <div className="clay-card p-8 mb-8">
            <h2 className="text-3xl font-bold text-gradient-lilac mb-4">
              选择练习模式 🎯
            </h2>
            <p className="text-lg text-gray-700 font-semibold">
              选择你喜欢的练习模式开始学习吧！
            </p>
          </div>

          {/* Practice Modes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {practiceModes.map((mode) => {
              const Icon = mode.icon
              return (
                <Link
                  key={mode.id}
                  href={mode.link}
                  className="group"
                >
                  <div className={`${mode.color} p-8 h-full flex flex-col shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1`}>
                    {/* Icon */}
                    <div className="clay-icon p-4 mb-6 group-hover:scale-110 transition-transform">
                      <Icon className={`w-12 h-12 ${mode.gradient}`} />
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">
                      {mode.title}
                    </h3>
                    <p className="text-base text-gray-700 font-semibold mb-6 flex-1">
                      {mode.description}
                    </p>

                    {/* Button */}
                    <div className="clay-button-primary text-center py-3 font-black">
                      {mode.buttonText}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Tips Card */}
          <div className="clay-card-blue p-6 mt-8">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              💡 学习小贴士
            </h3>
            <ul className="space-y-2 text-sm text-gray-700 font-semibold">
              <li>• 建议每天学习20-30个单词，保持连续性</li>
              <li>• 尝试不同练习模式，找到最适合你的方式</li>
              <li>• 标记"不认识"的单词会自动加入错题本</li>
              <li>• 定期复习错题本中的单词，巩固记忆</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}
