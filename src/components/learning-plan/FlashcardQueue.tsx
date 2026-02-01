'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Volume2,
  ArrowDown,
  RotateCcw
} from 'lucide-react'
import { markWord } from '@/services/learning-plan'
import { useLearningPlanTTS } from '@/hooks/useLearningPlanTTS'
import { useTheme } from '@/contexts/ThemeContext'

interface Word {
  id: string
  word: string
  phonetic?: string
  meaning?: string
  example?: string
  type: 'new' | 'review'
  definition_en?: string
  collocation?: string
  collocation_en?: string
  example_sentence_en?: string
  part_of_speech?: string
  audio_url?: string | null
}

interface Props {
  initialWords: Word[]
  bookId: string
  onSwitchMode: () => void
  onComplete: () => void
  totalOriginalWords?: number  // 🔧 新增：原始总单词数
  completedOriginalWords?: number  // 🔧 新增：已完成单词数
}

type WordStatus = 'known' | 'fuzzy' | 'unknown'

export function FlashcardQueue({
  initialWords,
  bookId,
  onSwitchMode,
  onComplete,
  totalOriginalWords,
  completedOriginalWords
}: Props) {
  const router = useRouter()
  const { theme, mounted } = useTheme()
  const isDark = mounted && theme === 'dark'

  // TTS Hook - 学习计划专用（高性能版本）
  const { play: speak, isPlaying, isLoading: ttsLoading } = useLearningPlanTTS({ type: '2', showFallbackToast: false })

  // 队列状态
  const [queue, setQueue] = useState<Word[]>([...initialWords])
  const [completed, setCompleted] = useState<Word[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  // UI 状态
  const [flipped, setFlipped] = useState(false)
  const [marking, setMarking] = useState(false)

  // 拖拽相关状态
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [keyboardAnimation, setKeyboardAnimation] = useState<{ x: number; rotate: number } | null>(null)
  const [isCardSwitching, setIsCardSwitching] = useState(false)
  const [hasUserInteracted, setHasUserInteracted] = useState(false)
  const hasUserInteractedRef = useRef(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const isSpeakingRef = useRef(false)
  const hasDraggedRef = useRef(false)

  const currentWord = queue[currentIndex]

  // 🔧 使用原始进度数据（如果没有传入，则使用队列长度）
  const totalCount = totalOriginalWords || initialWords.length
  const initialCompletedCount = completedOriginalWords || 0
  const completedCount = completed.length
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  // ============================================
  // 🎨 拖拽交互处理
  // ============================================
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (marking) return

    hasUserInteractedRef.current = true
    if (!hasUserInteracted) {
      setHasUserInteracted(true)
    }

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    setDragStart({ x: clientX, y: clientY })
    hasDraggedRef.current = false
  }, [marking, hasUserInteracted])

  const handleDragMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!dragStart || marking) return

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    const deltaX = clientX - dragStart.x
    const deltaY = clientY - dragStart.y

    // 判断是否真正拖拽了（移动超过5px才算）
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      hasDraggedRef.current = true
    }

    setDragOffset({ x: deltaX, y: deltaY })
  }, [dragStart, marking])

  const handleDragEnd = useCallback(() => {
    if (!dragStart || marking) return

    const deltaX = dragOffset.x
    const threshold = 100 // 滑动阈值

    if (Math.abs(deltaX) > threshold) {
      // 触发标记（与原版卡片背单词逻辑一致）
      if (deltaX > 0) {
        // ➡️ 右滑 - 不认识
        handleStatus('unknown')
      } else {
        // ⬅️ 左滑 - 认识
        handleStatus('known')
      }
    }

    // 重置拖拽状态
    setDragStart(null)
    setDragOffset({ x: 0, y: 0 })
  }, [dragStart, dragOffset.x, marking])

  // 点击翻转（支持双向翻转）
  const handleFlip = useCallback(() => {
    if (hasDraggedRef.current || marking) return
    setFlipped(prev => !prev)  // ✅ 支持翻转回去
  }, [marking])

  // ============================================
  // 🎯 标记单词处理
  // ============================================
  const handleStatus = useCallback(async (status: WordStatus) => {
    if (!currentWord || marking) return

    console.log('[FlashcardQueue] Marking word:', currentWord.word, 'as', status)
    console.log('[FlashcardQueue] Current progress:', { completed: completed.length, total: totalCount })

    setMarking(true)

    try {
      // 🔥 先立即更新UI（乐观更新）
      if (status === 'known') {
        // 移出队列
        setCompleted(prev => {
          const newCompleted = [...prev, currentWord]
          console.log('[FlashcardQueue] ✅ 已完成:', newCompleted.length, '/', totalCount)
          return newCompleted
        })
        // ✅ 使用 currentWord 引用，避免 stale closure
        setQueue(prev => prev.filter(w => w !== currentWord))
      } else {
        // 移到队尾
        setQueue(prev => {
          const newQueue = [...prev]
          const index = newQueue.findIndex(w => w === currentWord)
          if (index !== -1) {
            const [word] = newQueue.splice(index, 1)
            return [...newQueue, word]
          }
          return newQueue
        })
        console.log('[FlashcardQueue] ⏸️ 移到队尾，继续学习')
      }
      setCurrentIndex(0)

      // 设置切换状态，隐藏当前卡片
      setIsCardSwitching(true)
      setFlipped(false)

      // 清除拖动状态
      setDragStart(null)
      setDragOffset({ x: 0, y: 0 })
      setKeyboardAnimation(null)

      // 短暂延迟后显示新卡片
      setTimeout(() => {
        setIsCardSwitching(false)
        setMarking(false)
      }, 50)

      // 🌐 后台调用API（不阻塞UI）
      markWord({
        wordId: currentWord.id,
        bookId,
        status,
        source: 'flashcard'
      }).then(() => {
        console.log('[FlashcardQueue] ✅ API mark success')
      }).catch((error) => {
        console.error('[FlashcardQueue] ❌ API mark failed:', error)
        toast.error('标记失败，请重试')
      })

      // 检查是否全部完成
      if (status === 'known') {
        const newCompletedLength = completed.length + 1
        if (newCompletedLength === totalCount) {
          toast.success('🎉 太棒了！今日任务全部完成！')
          setTimeout(() => {
            onComplete()
          }, 1500)
        } else {
          // 显示进度提示
          console.log('[FlashcardQueue] Progress:', newCompletedLength, '/', totalCount)
        }
      }
    } catch (error: any) {
      console.error('[FlashcardQueue] Failed to mark word:', error)
      toast.error('标记失败，请重试')
      setMarking(false)
    }
  }, [currentWord, marking, bookId, completed.length, totalCount, currentIndex, onComplete])

  // ============================================
  // ⌨️ 键盘快捷键
  // ============================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      hasUserInteractedRef.current = true
      if (!hasUserInteracted) {
        setHasUserInteracted(true)
      }

      if (e.key === 'ArrowLeft') {
        // ⬅️ 认识
        e.preventDefault()
        handleStatus('known')
      } else if (e.key === 'ArrowUp') {
        // ↑ 模糊
        e.preventDefault()
        handleStatus('fuzzy')
      } else if (e.key === 'ArrowRight' || e.key === ' ') {
        // ➡️ 或 Space - 不认识
        e.preventDefault()
        handleStatus('unknown')
      } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
        // ↓ 或 Enter - 翻转卡片
        e.preventDefault()
        if (!flipped) {
          setFlipped(true)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [flipped, handleStatus])

  // ============================================
  // 🔊 自动朗读
  // ============================================
  useEffect(() => {
    // 只在卡片完全显示后且用户已经交互过后自动朗读
    if (currentWord && !flipped && !isCardSwitching && hasUserInteractedRef.current && !isSpeakingRef.current) {
      // 延迟300ms后自动朗读，确保卡片切换动画完成
      const timer = setTimeout(() => {
        if (hasUserInteractedRef.current && !isSpeakingRef.current) {
          speak(currentWord.word, currentWord.audio_url)
        }
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [currentIndex, currentWord, isCardSwitching, flipped, hasUserInteracted, speak])

  // 重置当前卡片
  const handleReset = () => {
    setFlipped(false)
  }

  // 返回
  const handleBack = () => {
    router.back()
  }

  if (!currentWord) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0f172a]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-green-500">✅</div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
            🎉 所有单词已完成！
          </h2>
          <button
            onClick={onComplete}
            className="px-6 py-3 bg-[#B4F416] border-3 border-black text-black font-bold rounded shadow-[4px_4px_0px_0px_#000]"
          >
            查看完成统计
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f172a]">
      {/* 顶部导航栏 */}
      <div className="sticky top-0 z-10 px-4 py-3 bg-white dark:bg-[#0f172a]">
        <div className="max-w-2xl mx-auto flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 rounded hover:opacity-70 text-gray-600 dark:text-gray-400"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                <span>🃏 卡片背单词</span>
              </h1>
            </div>
          </div>

          <button
            onClick={onSwitchMode}
            className="px-3 py-2 text-sm font-bold rounded border-2 border-black dark:border-slate-600 bg-[#B4F416] dark:bg-[#86efac] text-black flex items-center gap-1 transition-all shadow-[2px_2px_0px_0px_#000] dark:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000] dark:hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            🎧 切换到听写
          </button>
        </div>

        {/* 进度条 */}
        <div className="max-w-2xl mx-auto mb-2">
          <div className="flex justify-between text-xs mb-1 text-gray-500 dark:text-gray-400">
            <span>{completedCount + initialCompletedCount}/{totalCount} 已完成</span>
            <span className="font-mono">{((completedCount + initialCompletedCount) / totalCount * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-slate-800">
            <div
              className="h-full bg-[#B4F416] transition-all duration-300"
              style={{ width: `${((completedCount + initialCompletedCount) / totalCount * 100)}%` }}
            />
          </div>
        </div>

        {/* 任务说明 */}
        <div className="max-w-2xl mx-auto mb-2">
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            💡 认识→完成，模糊/不认识→继续
          </p>
        </div>

        {/* 队列状态 */}
        <div className="max-w-2xl mx-auto flex items-center justify-center gap-3 text-xs">
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400">
            <span className="font-mono">✅ 已完成: {completedCount + initialCompletedCount}</span>
          </div>
          {queue.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-yellow-100 dark:bg-slate-800 text-yellow-700 dark:text-yellow-400">
              <span className="font-mono">🔄 待学习: {queue.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* 卡片区域 */}
      <div className="flex items-center justify-center min-h-[600px]">
        <div style={{ width: '340px', height: '440px', position: 'relative' }}>
          {/* 用户未交互提示 - Neo-Brutalism */}
          {!hasUserInteracted && (
            <>
              {/* 半透明毛玻璃遮罩 - 覆盖整个屏幕 */}
              <div
                className="fixed inset-0 z-10"
                style={{
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.6)'
                }}
              />
              {/* 提示框 */}
              <div
                className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md p-6 text-center cursor-pointer z-20 transition-colors duration-300"
                style={{
                  backgroundColor: isDark ? '#0f172a' : 'white',
                  border: '3px solid #000',
                  borderRadius: '12px',
                  boxShadow: '4px 4px 0px 0px #000'
                }}
                onClick={() => {
                  hasUserInteractedRef.current = true
                  setHasUserInteracted(true)
                }}
              >
                <p className="text-lg font-black mb-2 text-gray-900 dark:text-white">👆 点击此处开始学习</p>
                <p className="text-sm font-bold text-gray-600 dark:text-gray-400">首次点击激活语音功能</p>
              </div>
            </>
          )}

          {/* Current Card */}
          <div
            ref={cardRef}
            className="rounded flex flex-col p-6 text-center cursor-grab active:cursor-grabbing transition-colors duration-300 bg-white dark:bg-[#0f172a]"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '340px',
              height: '440px',
              border: '4px solid #000',
              boxShadow: '12px 12px 0px 0px #000',
              perspective: '1000px',
              opacity: (dragStart || keyboardAnimation || isCardSwitching) ? 0 : 1,
              transform: `translate(${dragOffset.x + (keyboardAnimation?.x || 0)}px, ${dragOffset.y}px) rotate(${dragOffset.x * 0.05 + (keyboardAnimation?.rotate || 0)}deg)`,
              transition: dragStart || keyboardAnimation || isCardSwitching ? 'transform 0.3s ease-out, opacity 0.3s ease-out' : 'transform 0.15s ease-out, opacity 0.3s ease-out',
              zIndex: 10,
              touchAction: 'none',
            }}
            onMouseDown={handleDragStart}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={handleDragStart}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
            onClick={handleFlip}
          >
            <div
              className="flex flex-col w-full h-full"
              style={{
                transformStyle: 'preserve-3d',
                transition: 'transform 0.6s',
                transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
              }}
            >
              {/* Front - Word */}
              <div style={{
                backfaceVisibility: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                padding: '1.5rem 1.5rem 0.75rem 1.5rem'
              }}>
                {/* Type Badge */}
                <div className={`mb-4 px-3 py-1 rounded-full text-xs font-black border-2 border-black ${
                  currentWord.type === 'review'
                    ? 'bg-[#FACC15] text-black'
                    : 'bg-[#B4F416] text-black'
                }`} style={{ boxShadow: '2px 2px 0px 0px #000' }}>
                  {currentWord.type === 'review' ? '🔄 复习' : '✨ 新学'}
                </div>

                {/* Main Content */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
                  {/* Word */}
                  <h1 className="text-5xl md:text-6xl font-black tracking-tight text-center text-gray-900 dark:text-white">
                    {currentWord.word}
                  </h1>

                  {/* Phonetic + Button */}
                  <div className="flex items-center gap-4 justify-center">
                    <span className="font-mono text-lg text-gray-600 dark:text-gray-400">
                      {currentWord.phonetic}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        hasUserInteractedRef.current = true
                        if (!hasUserInteracted) {
                          setHasUserInteracted(true)
                        }
                        speak(currentWord?.word || '', currentWord?.audio_url)
                      }}
                      className="w-10 h-10 flex items-center justify-center bg-[#B4F416] border-2 border-black rounded-full shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all"
                    >
                      <Volume2 size={18} strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* Part of Speech */}
                  {currentWord.part_of_speech && (
                    <span className="inline-block px-3 py-1.5 border-2 border-black rounded text-sm font-bold bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white">
                      {currentWord.part_of_speech}
                    </span>
                  )}
                </div>

                {/* Footer Hint */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                  <ArrowDown size={20} className="animate-bounce text-black" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-black">Tap to Flip</p>
                </div>
              </div>

              {/* Back - Definition */}
              <div
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '1.5rem 1.5rem 0.75rem 1.5rem',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              >
                {/* Content Area */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', overflowY: 'auto', maxHeight: '100%' }}>
                  {/* English Definition */}
                  {currentWord.definition_en && (
                    <div className="mb-3">
                      <p className="text-sm font-bold mb-1 text-gray-500 dark:text-gray-400">英文释义</p>
                      <p className="text-base font-black leading-snug break-words text-gray-900 dark:text-white">
                        {currentWord.definition_en}
                      </p>
                    </div>
                  )}

                  {/* Chinese Definition */}
                  {currentWord.meaning && (
                    <div className="mb-3">
                      <p className="text-sm font-bold mb-1 text-gray-500 dark:text-gray-400">中文释义</p>
                      <p className="text-base font-black leading-snug break-words text-gray-900 dark:text-white">
                        {currentWord.meaning}
                      </p>
                    </div>
                  )}

                  {/* English Collocation */}
                  {currentWord.collocation_en && (
                    <div className="mb-3">
                      <p className="text-sm font-bold mb-1 text-gray-500 dark:text-gray-400">英文搭配</p>
                      <p className="text-sm font-semibold leading-snug break-words text-gray-700 dark:text-gray-300">
                        {currentWord.collocation_en}
                      </p>
                    </div>
                  )}

                  {/* Chinese Collocation */}
                  {currentWord.collocation && (
                    <div className="mb-3">
                      <p className="text-sm font-bold mb-1 text-gray-500 dark:text-gray-400">搭配</p>
                      <p className="text-sm font-semibold leading-snug break-words text-gray-700 dark:text-gray-300">
                        {currentWord.collocation}
                      </p>
                    </div>
                  )}

                  {/* English Example */}
                  {currentWord.example_sentence_en && (
                    <div className="p-3 mb-3 bg-gray-100 dark:bg-slate-800 border-2 border-black rounded">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">英文例句</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            speak(currentWord.example_sentence_en || '', null)
                          }}
                          className="w-7 h-7 flex items-center justify-center bg-[#B4F416] border-2 border-black rounded shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all"
                        >
                          <Volume2 size={14} strokeWidth={2.5} />
                        </button>
                      </div>
                      <p className="text-sm font-semibold leading-snug break-words text-gray-900 dark:text-white">
                        {currentWord.example_sentence_en}
                      </p>
                    </div>
                  )}

                  {/* Chinese Example */}
                  {currentWord.example && (
                    <div className="mb-3">
                      <p className="text-sm font-bold mb-1 text-gray-500 dark:text-gray-400">例句</p>
                      <p className="text-sm font-semibold leading-snug break-words text-gray-700 dark:text-gray-300">
                        {currentWord.example}
                      </p>
                    </div>
                  )}

                  {/* 提示用户使用手势或键盘 */}
                  <div className="mt-4 pt-3 border-t-2 border-gray-200 dark:border-slate-700">
                    <p className="text-[10px] text-center text-gray-400 dark:text-gray-500">
                      👆 拖拽卡片或使用键盘快捷键
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 操作提示 */}
      <div className="max-w-2xl mx-auto px-4 mt-4">
        <div className="text-center text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p className="font-bold">⌨️ 键盘：← 认识 | ↑ 模糊 | → 不认识 | ↓ 翻转</p>
          <p className="font-bold">👆 手势：右滑认识 / 左滑不认识 / 点击翻转</p>
        </div>
      </div>
    </div>
  )
}
