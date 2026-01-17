// src/app/study/[bookId]/typing/page.tsx
// 打字练习 - 范围选择页

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Dumbbell, ChevronRight, AlertCircle, BookOpen, Loader2 } from 'lucide-react'
import Link from 'next/link'

/**
 * 打字练习范围选项
 */
type ScopeType = 'all' | 'mistakes' | 'chapter'

interface ScopeOption {
  value: ScopeType
  label: string
  description: string
  count: number
  disabled: boolean
  color: string
  icon: any
}

interface Chapter {
  id: string
  title: string
  word_count: number
}

export default function TypingScopePage() {
  const params = useParams()
  const router = useRouter()
  const bookId = params.bookId as string

  const [loading, setLoading] = useState(true)
  const [bookTitle, setBookTitle] = useState('')
  const [totalWords, setTotalWords] = useState(0)
  const [mistakesCount, setMistakesCount] = useState(0)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null)

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createClient()

        // 1. 获取词书信息
        const { data: book } = await supabase
          .from('books')
          .select('title, total_words')
          .eq('id', bookId)
          .single()

        if (book) {
          setBookTitle(book.title)
          setTotalWords(book.total_words || 0)
        }

        // 2. 获取拼写错题数量
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { count } = await supabase
            .from('mistakes')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('book_id', bookId)
            .gt('typing_wrong_count', 0)

          setMistakesCount(count || 0)
        }

        // 3. 获取章节列表
        const { data: chaptersData } = await supabase
          .from('chapters')
          .select('id, title, word_count')
          .eq('book_id', bookId)
          .order('order_index', { ascending: true })

        if (chaptersData) {
          setChapters(chaptersData)
        }

      } catch (error) {
        console.error('Error loading scope data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [bookId])

  // 范围选项
  const scopeOptions: ScopeOption[] = [
    {
      value: 'all',
      label: '全部单词',
      description: '练习所有单词，全面巩固',
      count: totalWords,
      disabled: totalWords === 0,
      color: 'bg-black',
      icon: Dumbbell
    },
    {
      value: 'mistakes',
      label: '拼写错题',
      description: '重点攻克拼写错误的单词',
      count: mistakesCount,
      disabled: mistakesCount === 0,
      color: 'bg-red-500',
      icon: AlertCircle
    },
    {
      value: 'chapter',
      label: '按章节练习',
      description: '选择特定章节进行练习',
      count: chapters.length,
      disabled: chapters.length === 0,
      color: 'bg-blue-500',
      icon: BookOpen
    }
  ]

  // 处理范围选择
  const handleSelectScope = (scopeType: ScopeType) => {
    if (scopeType === 'chapter') {
      // 章节选择：展开章节列表
      setSelectedChapter('show')
    } else {
      // 全部或错题：直接跳转
      router.push(`/study/${bookId}/typing/practice?scope=${scopeType}`)
    }
  }

  // 处理章节选择
  const handleSelectChapter = (chapterId: string) => {
    router.push(`/study/${bookId}/typing/practice?scope=chapter&chapterId=${chapterId}`)
  }

  // 加载状态
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-black border-t-[#B4F416] mb-6 mx-auto"></div>
          <p className="text-black font-black text-lg">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b-[3px] border-black sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link
              href={`/library/${bookId}`}
              className="w-12 h-12 bg-white border-[3px] border-black rounded-xl flex items-center justify-center shadow-[3px_3px_0px_0px_#000] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000] transition-all"
            >
              <ArrowLeft className="w-6 h-6" strokeWidth={3} />
            </Link>
            <div className="flex-1">
              <h1 className="text-xl md:text-2xl font-black text-gray-900 truncate">
                {bookTitle || '词书'}
              </h1>
              <p className="text-sm text-gray-500 font-mono mt-0.5">
                选择练习范围
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 范围选项卡片 */}
        <div className="space-y-4">
          {scopeOptions.map((option) => {
            const Icon = option.icon
            return (
              <button
                key={option.value}
                onClick={() => !option.disabled && handleSelectScope(option.value)}
                disabled={option.disabled}
                className={`
                  w-full flex items-center justify-between p-6 bg-white border-[3px] rounded-xl transition-all
                  ${option.disabled
                    ? 'border-gray-300 opacity-50 cursor-not-allowed'
                    : 'border-black cursor-pointer shadow-[4px_4px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none'
                  }
                `}
              >
                {/* 左侧：图标框 */}
                <div className={`w-16 h-16 rounded-xl border-[3px] border-black flex items-center justify-center flex-shrink-0 ${option.disabled ? 'bg-gray-200' : option.color}`}>
                  <Icon className={`w-8 h-8 ${option.disabled ? 'text-gray-400' : option.value === 'all' || option.value === 'mistakes' ? 'text-white' : 'text-black'}`} strokeWidth={3} />
                </div>

                {/* 中间：标题和描述 */}
                <div className="flex-1 ml-6 text-left">
                  <div className={`font-black text-xl ${option.disabled ? 'text-gray-400' : 'text-black'}`}>
                    {option.label}
                  </div>
                  <div className={`text-sm font-bold mt-1 ${option.disabled ? 'text-gray-400' : 'text-gray-600'}`}>
                    {option.description}
                  </div>
                </div>

                {/* 右侧：数字和箭头 */}
                <div className="flex items-center gap-4">
                  {/* 数字标签 */}
                  <div className={`
                    w-16 h-16 flex items-center justify-center text-2xl font-black border-[3px] border-black rounded-xl
                    ${option.disabled
                      ? 'bg-gray-200 text-gray-400'
                      : option.color
                    }
                  `}>
                    {option.count}
                  </div>

                  {/* 右箭头 */}
                  {!option.disabled && (
                    <ChevronRight className="w-8 h-8 text-black flex-shrink-0" strokeWidth={3} />
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* 章节列表（展开状态） */}
        {selectedChapter === 'show' && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-gray-900">选择章节</h2>
              <button
                onClick={() => setSelectedChapter(null)}
                className="px-4 py-2 bg-white border-[2px] border-black rounded-lg font-bold hover:bg-gray-50 transition-all"
              >
                取消
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {chapters.map((chapter) => (
                <button
                  key={chapter.id}
                  onClick={() => handleSelectChapter(chapter.id)}
                  className="p-4 bg-white border-[3px] border-black rounded-xl shadow-[4px_4px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all text-left"
                >
                  <div className="font-black text-lg text-black mb-2 truncate">
                    {chapter.title}
                  </div>
                  <div className="text-sm font-bold text-gray-600">
                    {chapter.word_count} 单词
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 底部提示 */}
        <div className="mt-12 text-center">
          <div className="inline-block px-6 py-3 bg-[#fffbeb] border-[2px] border-[#fcd34d] text-[#b45309] rounded-lg text-sm font-bold">
            💡 选择范围后进入练习，建议先从错题开始
          </div>
        </div>
      </div>
    </div>
  )
}
