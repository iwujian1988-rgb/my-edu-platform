'use client'

import { useState } from 'react'
import { BookOpen, ArrowLeft, Filter, Shuffle, ChevronDown, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { WordList } from '@/components/WordList'
import { GlobalHideButton } from '@/components/GlobalHideButton'

interface Word {
  id: string
  word: string
  phonetic: string
  definition: string
  definition_en: string
  collocation: string
  collocation_en: string
  example_sentence: string
  example_sentence_en: string
  part_of_speech: string
  status: 'known' | 'fuzzy' | 'unknown'
}

interface Book {
  id: string
  title: string
  description: string
  total_words: number
}

interface BookDetailPageClientProps {
  book: Book
  words: Word[]
  user: any
  useMockData: boolean
}

export function BookDetailPageClient({ book, words, user, useMockData }: BookDetailPageClientProps) {
  const [globalHideChinese, setGlobalHideChinese] = useState(false)

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
                {/* 全局隐藏中文按钮 */}
                <GlobalHideButton
                  bookId={book.id}
                  onHideChange={setGlobalHideChinese}
                />
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:border-purple-300 hover:text-purple-600 transition-all">
                  <Shuffle className="w-4 h-4" />
                  随机
                </button>
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:border-purple-300 hover:text-purple-600 transition-all">
                  <Filter className="w-4 h-4" />
                  筛选
                </button>
              </div>
            </div>
          </section>

          {/* 单词列表 */}
          <WordList
            initialWords={words}
            bookId={book.id}
            globalHideChinese={globalHideChinese}
          />

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
