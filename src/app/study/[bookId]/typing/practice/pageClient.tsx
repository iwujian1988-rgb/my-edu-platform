'use client'

// src/app/study/[bookId]/practice/page.tsx
// 打字练习核心游戏页



import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTypingStore, type ScopeType, type Word } from '@/stores/typingStore'
import { ArrowLeft, Settings, X, Volume2, RotateCcw, SkipForward, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { speak } from '@/lib/speech'

/**
 * 打字练习核心页面
 */
export default function TypingPracticePageClient() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookId = params.bookId as string

  const scope = searchParams.get('scope') as ScopeType
  const chapterId = searchParams.get('chapterId')

  // Zustand store
  const {
    currentSession,
    loopSettings,
    settings,
    statistics,
    ui,
    actions,
  } = useTypingStore()

  // 本地状态
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [showComplete, setShowComplete] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  // 加载单词列表
  useEffect(() => {
    const loadWords = async () => {
      try {
        const supabase = createClient()

        let query = supabase
          .from('words')
          .select('id, word, definition, phonetic, uk_phonetic, us_phonetic, part_of_speech')
          .eq('book_id', bookId)

        // 根据范围筛选
        if (scope === 'mistakes') {
          // 获取拼写错题
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: mistakes } = await supabase
              .from('mistakes')
              .select('word_id')
              .eq('user_id', user.id)
              .eq('book_id', bookId)
              .gt('typing_wrong_count', 0)

            const wordIds = mistakes?.map(m => m.word_id) || []
            if (wordIds.length > 0) {
              query = query.in('id', wordIds)
            } else {
              // 没有错题，返回空
              actions.startSession(bookId, scope, chapterId, [])
              setLoading(false)
              return
            }
          }
        } else if (scope === 'chapter' && chapterId) {
          query = query.eq('chapter_id', chapterId)
        }

        const { data: words } = await query

        if (words && words.length > 0) {
          actions.startSession(bookId, scope, chapterId, words)
        } else {
          console.error('No words found')
        }

        setLoading(false)
      } catch (error) {
        console.error('Error loading words:', error)
        setLoading(false)
      }
    }

    loadWords()
  }, [bookId, scope, chapterId, actions])

  // 自动聚焦输入框
  useEffect(() => {
    if (!loading && currentSession.isPlaying && !currentSession.isPaused) {
      inputRef.current?.focus()
    }
  }, [loading, currentSession.isPlaying, currentSession.isPaused])

  // 自动发音（单词打对后）
  useEffect(() => {
    const { userInput, words, currentWordIndex } = currentSession
    const currentWord = words[currentWordIndex]

    if (currentWord && settings.wordAutoPronounce) {
      const targetWord = currentWord.word.toLowerCase()

      // 检查是否完全正确
      if (userInput.toLowerCase() === targetWord) {
        // 播放发音
        const lang = settings.pronunciationScheme === 'uk' ? 'en-GB' : 'en-US'
        speak(currentWord.word, {
          lang,
          rate: settings.wordSpeed,
          volume: settings.wordVolume / 100,
        })
      }
    }
  }, [currentSession.userInput, currentSession.words, currentSession.currentWordIndex, settings])

  // 键盘事件处理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!currentSession.isPlaying || currentSession.isPaused) return

    const { userInput, words, currentWordIndex } = currentSession
    const currentWord = words[currentWordIndex]

    if (!currentWord) return

    // 处理字母输入
    if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault()
      const targetWord = currentWord.word.toLowerCase()
      const nextIndex = userInput.length

      // 检查是否超出单词长度
      if (nextIndex < targetWord.length) {
        actions.handleInput(e.key)
      }
    }
    // 处理退格
    else if (e.key === 'Backspace') {
      e.preventDefault()
      actions.handleBackspace()
    }
    // 处理跳过（连续错误4次）
    else if (e.key === 'Escape' || (e.ctrlKey && e.key === 'SkipForward')) {
      e.preventDefault()
      actions.skipWord()
    }
    // 重试当前单词
    else if (e.key === 'Tab') {
      e.preventDefault()
      actions.resetCurrentWord()
    }
  }

  // 完成练习并同步数据
  const handleComplete = async () => {
    actions.endSession()
    setShowComplete(true)

    // 同步数据到服务器
    setSyncing(true)
    try {
      const supabase = createClient()

      // 1. 同步错题
      const mistakes = Array.from(useTypingStore.getState().tempMistakes.values())
      if (mistakes.length > 0) {
        await fetch('/api/mistakes/batch-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookId,
            mistakes: mistakes.map(m => ({
              wordId: m.wordId,
              wrongCount: m.wrongCount,
              typingWrongCount: m.typingWrongCount,
            })),
          }),
        })
      }

      // 2. 更新进度
      const { words } = currentSession
      const progressData = words.map(word => {
        const mistake = useTypingStore.getState().tempMistakes.get(word.id)
        const typingWrongCount = mistake?.typingWrongCount || 0
        const typingTotalAttempts = typingWrongCount + 1 // 至少尝试1次
        const typingCorrectCount = typingTotalAttempts - typingWrongCount
        const accuracy = typingTotalAttempts > 0 ? typingCorrectCount / typingTotalAttempts : 0

        return {
          wordId: word.id,
          typingCorrectCount,
          typingTotalAttempts,
          accuracy,
        }
      })

      await fetch('/api/word-progress/batch-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          progress: progressData,
        }),
      })

      // 3. 创建学习记录
      await fetch('/api/learning-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          wordIds: words.map(w => w.id),
          practiceMode: 'typing',
          action: 'typing_practice',
          timeSpentSeconds: Math.floor((Date.now() - (currentSession.startTime || Date.now())) / 1000),
          metadata: {
            totalWords: statistics.totalWords,
            completedWords: statistics.completedWords,
            skippedWords: statistics.skippedWords,
            wpm: statistics.wpm,
            accuracy: statistics.accuracy,
            mistakeCount: mistakes.length,
          },
        }),
      })

      // 清除临时错题
      actions.clearTempMistakes()
    } catch (error) {
      console.error('Error syncing data:', error)
    } finally {
      setSyncing(false)
    }
  }

  // 获取当前单词
  const currentWord = currentSession.words[currentSession.currentWordIndex]
  const targetWord = currentWord?.word || ''
  const charElements = targetWord.split('').map((char, index) => {
    const status = currentSession.charStatuses[index] || 'pending'
    const inputChar = currentSession.userInput[index]?.toLowerCase() || ''

    return (
      <span
        key={index}
        className={`
          ${index === currentSession.userInput.length ? 'animate-pulse' : ''}
          ${status === 'correct' ? 'text-green-500' : ''}
          ${status === 'wrong' ? 'text-red-500' : ''}
          ${status === 'pending' && index < currentSession.userInput.length ? 'text-red-500' : ''}
          ${status === 'pending' && index >= currentSession.userInput.length ? 'text-gray-300' : ''}
        `}
      >
        {char}
      </span>
    )
  })

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

  // 没有单词
  if (currentSession.words.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 font-bold mb-4">没有找到可练习的单词</p>
          <Link
            href={`/study/${bookId}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#B4F416] border-[3px] border-black rounded-xl font-bold hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000] transition-all"
          >
            返回
          </Link>
        </div>
      </div>
    )
  }

  // 完成状态
  if (showComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white border-[3px] border-black rounded-xl shadow-[8px_8px_0px_0px_#000] p-8 max-w-md w-full">
          <div className="text-center">
            <div className="w-20 h-20 bg-[#B4F416] border-[3px] border-black rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-black" strokeWidth={3} />
            </div>
            <h2 className="text-3xl font-black mb-4">练习完成！</h2>

            <div className="space-y-3 mb-8 text-left">
              <div className="flex justify-between items-center p-3 bg-gray-50 border-[2px] border-black rounded-lg">
                <span className="font-bold">完成单词</span>
                <span className="font-black">{statistics.completedWords}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 border-[2px] border-black rounded-lg">
                <span className="font-bold">跳过单词</span>
                <span className="font-black">{statistics.skippedWords}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 border-[2px] border-black rounded-lg">
                <span className="font-bold">WPM</span>
                <span className="font-black">{statistics.wpm}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 border-[2px] border-black rounded-lg">
                <span className="font-bold">正确率</span>
                <span className="font-black">{(statistics.accuracy * 100).toFixed(1)}%</span>
              </div>
            </div>

            {syncing && (
              <div className="mb-6 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-black border-t-[#B4F416] mr-2"></div>
                <span className="font-bold">同步数据中...</span>
              </div>
            )}

            <div className="flex gap-4">
              <Link
                href={`/study/${bookId}`}
                className="flex-1 px-6 py-3 bg-white border-[3px] border-black rounded-xl font-bold hover:bg-gray-50 transition-all"
              >
                返回
              </Link>
              <Link
                href="/typing"
                className="flex-1 px-6 py-3 bg-[#B4F416] border-[3px] border-black rounded-xl font-bold hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000] transition-all"
              >
                词书列表
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 检查是否完成所有单词
  if (currentSession.currentWordIndex >= currentSession.words.length) {
    handleComplete()
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b-[3px] border-black sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/study/${bookId}`}
                className="w-10 h-10 bg-white border-[3px] border-black rounded-xl flex items-center justify-center shadow-[3px_3px_0px_0px_#000] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000] transition-all"
              >
                <ArrowLeft className="w-5 h-5" strokeWidth={3} />
              </Link>
              <div>
                <p className="text-sm text-gray-500 font-mono">
                  {currentSession.currentWordIndex + 1} / {currentSession.words.length}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {loopSettings.enabled && (
                <div className="px-3 py-1 bg-[#B4F416] border-[2px] border-black rounded-lg text-sm font-bold">
                  {loopSettings.currentWordCompletionCount}/{loopSettings.loopCount}
                </div>
              )}

              <button
                onClick={() => actions.openModal('settings')}
                className="w-10 h-10 bg-white border-[3px] border-black rounded-xl flex items-center justify-center hover:bg-gray-50 transition-all"
              >
                <Settings className="w-5 h-5" strokeWidth={3} />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#B4F416] transition-all duration-300"
              style={{ width: `${((currentSession.currentWordIndex + 1) / currentSession.words.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white border-[3px] border-black rounded-xl shadow-[8px_8px_0px_0px_#000] p-8 md:p-12">
          {/* 单词显示区 */}
          <div className="text-center mb-12">
            {/* 释义 */}
            {settings.showTranslation && currentWord.definition && (
              <div className="mb-8">
                <p className="text-xl md:text-2xl font-bold text-gray-700 mb-2">
                  {currentWord.definition}
                </p>
                {currentWord.part_of_speech && (
                  <span className="inline-block px-3 py-1 bg-gray-100 border-[2px] border-black rounded-lg text-sm font-bold text-gray-600">
                    {currentWord.part_of_speech}
                  </span>
                )}
              </div>
            )}

            {/* 单词（打字区域） */}
            <div className="mb-8">
              <p
                className="text-4xl md:text-6xl font-black tracking-wider leading-relaxed font-mono"
                style={{ fontSize: `${settings.foreignFontSize}px` }}
              >
                {charElements}
              </p>
            </div>

            {/* 音标 */}
            {currentWord.phonetic && (
              <div className="flex items-center justify-center gap-2 mb-6">
                <Volume2 className="w-4 h-4 text-gray-400" strokeWidth={3} />
                <p className="text-sm font-mono text-gray-500">
                  [{currentWord.phonetic}]
                </p>
              </div>
            )}
          </div>

          {/* 隐藏输入框 */}
          <input
            ref={inputRef}
            type="text"
            value={currentSession.userInput}
            onChange={() => {}}
            onKeyDown={handleKeyDown}
            className="opacity-0 absolute"
            autoFocus
          />

          {/* 操作按钮 */}
          <div className="flex justify-center gap-4 mt-8">
            <button
              onClick={() => actions.resetCurrentWord()}
              className="flex items-center gap-2 px-6 py-3 bg-white border-[3px] border-black rounded-xl font-bold hover:bg-gray-50 transition-all"
            >
              <RotateCcw className="w-5 h-5" strokeWidth={3} />
              重试
            </button>
            <button
              onClick={() => actions.skipWord()}
              className="flex items-center gap-2 px-6 py-3 bg-white border-[3px] border-black rounded-xl font-bold hover:bg-gray-50 transition-all"
            >
              <SkipForward className="w-5 h-5" strokeWidth={3} />
              跳过
            </button>
          </div>

          {/* 提示 */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 font-bold">
              直接键盘输入单词 | Tab 重试 | Esc 跳过
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
