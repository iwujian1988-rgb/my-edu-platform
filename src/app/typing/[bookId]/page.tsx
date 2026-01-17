// src/app/typing/[bookId]/page.tsx
// 打字练习 - 范围选择页

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Dumbbell, ChevronRight, AlertCircle } from 'lucide-react'
import Link from 'next/link'

/**
 * 打字练习范围选项
 */
type ScopeType = 'all' | 'new' | 'known' | 'fuzzy' | 'unknown' | 'mistakes'

interface ScopeOption {
  value: ScopeType
  label: string
  description: string
  count: number
  disabled: boolean
  color: string
  bgColor: string
  icon: any
}

export default function TypingScopePage() {
  const params = useParams()
  const router = useRouter()
  const bookId = params.bookId as string

  const [loading, setLoading] = useState(true)
  const [bookTitle, setBookTitle] = useState('')
  const [totalWords, setTotalWords] = useState(0)
  const [mistakesCount, setMistakesCount] = useState(0)
  const [newCount, setNewCount] = useState(0)
  const [knownCount, setKnownCount] = useState(0)
  const [fuzzyCount, setFuzzyCount] = useState(0)
  const [unknownCount, setUnknownCount] = useState(0)

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
          const { count: mistakes } = await supabase
            .from('mistakes')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('book_id', bookId)
            .gt('typing_wrong_count', 0)

          setMistakesCount(mistakes || 0)

          // 3. 获取各状态单词数量
          // 🔥 修复：直接从word_progress表查询，由于有UNIQUE约束，每个单词只有一条记录
          const { data: progressData, error } = await supabase
            .from('word_progress')
            .select('status')
            .eq('user_id', user.id)
            .eq('book_id', bookId)

          if (error) {
            console.error('Error fetching progress:', error)
            setNewCount(totalWords)
          } else if (progressData && progressData.length > 0) {
            const known = progressData.filter(p => p.status === 'known').length
            const fuzzy = progressData.filter(p => p.status === 'fuzzy').length
            const unknown = progressData.filter(p => p.status === 'unknown').length
            const total = known + fuzzy + unknown
            const newWords = totalWords - total

            setNewCount(Math.max(0, newWords))
            setKnownCount(known)
            setFuzzyCount(fuzzy)
            setUnknownCount(unknown)
          } else {
            // 没有进度数据，全部都是新词
            setNewCount(totalWords)
          }
        } else {
          // 未登录，全部都是新词
          setNewCount(totalWords)
        }

      } catch (error) {
        console.error('Error loading scope data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [bookId, totalWords])

  // 范围选项
  const scopeOptions: ScopeOption[] = [
    {
      value: 'new',
      label: '未标注',
      description: '从未练习过的单词',
      count: newCount,
      disabled: newCount === 0,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      icon: Dumbbell
    },
    {
      value: 'known',
      label: '已认识',
      description: '标记为"认识"的单词',
      count: knownCount,
      disabled: knownCount === 0,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      icon: Dumbbell
    },
    {
      value: 'fuzzy',
      label: '模糊',
      description: '标记为"模糊"的单词',
      count: fuzzyCount,
      disabled: fuzzyCount === 0,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      icon: Dumbbell
    },
    {
      value: 'unknown',
      label: '不认识',
      description: '标记为"不认识"的单词',
      count: unknownCount,
      disabled: unknownCount === 0,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      icon: Dumbbell
    },
    {
      value: 'all',
      label: '全部单词',
      description: '所有单词',
      count: totalWords,
      disabled: totalWords === 0,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      icon: Dumbbell
    },
    {
      value: 'mistakes',
      label: '拼写错题',
      description: '重点攻克拼写错误的单词',
      count: mistakesCount,
      disabled: mistakesCount === 0,
      color: 'text-red-800',
      bgColor: 'bg-red-200',
      icon: AlertCircle
    }
  ]

  // 处理范围选择
  const handleSelectScope = (scopeType: ScopeType) => {
    router.push(`/typing/${bookId}/practice?scope=${scopeType}`)
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
              href="/typing"
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
                  w-full flex items-center justify-between p-6 border-[3px] rounded-xl transition-all
                  ${option.disabled
                    ? 'bg-gray-50 border-gray-300 opacity-50 cursor-not-allowed'
                    : `${option.bgColor} border-black cursor-pointer shadow-[4px_4px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none`
                  }
                `}
              >
                {/* 左侧：图标框 */}
                <div className={`w-16 h-16 rounded-xl border-[3px] border-black flex items-center justify-center flex-shrink-0 ${option.disabled ? 'bg-gray-200' : option.bgColor}`}>
                  <Icon className={`w-8 h-8 ${option.disabled ? 'text-gray-400' : option.color}`} strokeWidth={3} />
                </div>

                {/* 中间：标题和描述 */}
                <div className="flex-1 ml-6 text-left">
                  <div className={`font-black text-xl ${option.disabled ? 'text-gray-400' : option.color}`}>
                    {option.label}
                  </div>
                  <div className={`text-sm font-bold mt-1 ${option.disabled ? 'text-gray-400' : 'text-gray-700'}`}>
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
                      : `${option.bgColor} ${option.color}`
                    }
                  `}>
                    {option.count}
                  </div>

                  {/* 右箭头 */}
                  {!option.disabled && (
                    <ChevronRight className={`w-8 h-8 flex-shrink-0 ${option.color}`} strokeWidth={3} />
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* 底部提示 */}
        <div className="mt-12 text-center">
          <div className="inline-block px-6 py-3 bg-[#fffbeb] border-[2px] border-[#fcd34d] text-[#b45309] rounded-lg text-sm font-bold">
            💡 选择范围后进入练习，建议从未标注单词开始
          </div>
        </div>
      </div>
    </div>
  )
}
