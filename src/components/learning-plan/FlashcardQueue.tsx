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
import type { LearningPlanPhase } from '@/types/learning-plan'

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
  // 多语言支持
  kana?: string       // 日语假名
  romaji?: string     // 日语罗马音
}

interface Props {
  initialWords: Word[]
  bookId: string
  onComplete: () => void
  totalOriginalWords?: number  // 🔧 新增：原始总单词数
  completedOriginalWords?: number  // 🔧 新增：已完成单词数
  phase?: LearningPlanPhase  // [Upgrade] 两阶段系统：学习阶段
  isConsolidateMode?: boolean  // [Upgrade] 巩固模式：专注学习未掌握的单词
}

type WordStatus = 'known' | 'fuzzy' | 'unknown'

export function FlashcardQueue({
  initialWords,
  bookId,
  onComplete,
  totalOriginalWords,
  completedOriginalWords,
  phase = 'legacy',  // [Upgrade] 两阶段系统：默认 legacy 保持向后兼容
  isConsolidateMode = false  // [Upgrade] 巩固模式
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

  // [Upgrade] 巩固模式状态
  const [showConsolidateModal, setShowConsolidateModal] = useState(false)
  const [unmasteredCount, setUnmasteredCount] = useState(0)

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
      // [Upgrade] 两阶段系统：根据阶段使用不同的完成逻辑
      if (phase === 'learning' || phase === 'review') {
        // [Upgrade] 两阶段系统：任何标记都算完成（移出队列）
        setCompleted(prev => {
          const newCompleted = [...prev, currentWord]
          console.log('[FlashcardQueue] ✅ 两阶段系统 - 已完成:', newCompleted.length, '/', totalCount)
          return newCompleted
        })
        setQueue(prev => prev.filter(w => w !== currentWord))
      } else {
        // [Legacy] v4.0：只有"认识"才完成
        if (status === 'known') {
          // 移出队列
          setCompleted(prev => {
            const newCompleted = [...prev, currentWord]
            console.log('[FlashcardQueue] ✅ Legacy - 已完成:', newCompleted.length, '/', totalCount)
            return newCompleted
          })
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
          console.log('[FlashcardQueue] ⏸️ Legacy - 移到队尾，继续学习')
        }
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
      // [Upgrade] 两阶段系统：根据阶段使用不同的完成检测逻辑
      const newCompletedLength = completed.length + 1
      if (isConsolidateMode) {
        // [Upgrade] 巩固模式：全部完成
        if (newCompletedLength === totalCount) {
          toast.success('🎉 巩固完成！所有单词都已复习过')
          setTimeout(() => {
            onComplete()
          }, 1500)
        }
      } else if (phase === 'review') {
        // [Upgrade] 复习阶段：永不完成（只显示进度）
        console.log('[FlashcardQueue] Progress (review):', newCompletedLength, '/', totalCount)
      } else if (phase === 'learning') {
        // [Upgrade] 学习阶段：全部处理过即完成（任何状态）
        if (newCompletedLength === totalCount) {
          // [Upgrade] 巩固模式：检查是否有未掌握的单词
          if (status !== 'known') {
            // 最后一个单词标记为 fuzzy 或 unknown
            setUnmasteredCount(1)
            setShowConsolidateModal(true)
          } else {
            // 全部标记为 known，直接完成
            toast.success('🎉 学习阶段完成！所有单词都已标记过')
            setTimeout(() => {
              onComplete()
            }, 1500)
          }
        } else {
          console.log('[FlashcardQueue] Progress (learning):', newCompletedLength, '/', totalCount)
        }
      } else {
        // [Legacy] v4.0：只有标记为"认识"才计入完成
        if (status === 'known') {
          if (newCompletedLength === totalCount) {
            toast.success('🎉 太棒了！今日任务全部完成！')
            setTimeout(() => {
              onComplete()
            }, 1500)
          } else {
            // 显示进度提示
            console.log('[FlashcardQueue] Progress (legacy):', newCompletedLength, '/', totalCount)
          }
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
        </div>

        {/* 进度条 - [Upgrade] 巩固模式下隐藏 */}
        {!isConsolidateMode && (
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
        )}

        {/* 任务说明 */}
        <div className="max-w-2xl mx-auto mb-2">
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            {/* [Upgrade] 巩固模式提示 */}
            {isConsolidateMode
              ? '💡 巩固模式：专注学习未掌握的单词'
              : phase === 'review'
                ? '💡 复习阶段：巩固记忆，永不结束'
                : phase === 'learning'
                  ? '💡 学习阶段：任意标记都算学过，全部标记即完成'
                  : '💡 认识→完成，模糊/不认识→继续'  // [Legacy] v4.0
            }
          </p>
        </div>

        {/* 队列状态 - [Upgrade] 巩固模式下隐藏 */}
        {!isConsolidateMode && (
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
        )}
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
                      {/* 发音显示：日语优先（假名+罗马音），其次英语 */}
                      {currentWord.kana
                        ? `${currentWord.kana}${currentWord.romaji ? ` / ${currentWord.romaji}` : ''}`
                        : currentWord.phonetic
                      }
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

      {/* [Upgrade] 巩固模式弹窗 */}
      {showConsolidateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowConsolidateModal(false)}
        >
          <div
            className={`
              relative w-full max-w-md mx-4
              border-[3px] border-black dark:border-slate-600
              bg-white dark:bg-[#0f172a]
              shadow-[8px_8px_0px_0px_#000] dark:shadow-none
              p-6
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 图标 */}
            <div className="text-center mb-4">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <span className="text-4xl">💪</span>
              </div>
              <h3 className="text-xl font-black text-black dark:text-white mb-2">
                学习已完成！
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                您已完成今日学习，但还有未完全掌握的单词
              </p>
            </div>

            {/* 统计信息 */}
            <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 mb-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">未掌握单词</span>
                <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                  {unmasteredCount} 个
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 text-center">
                这些单词被标记为"模糊"或"不认识"
              </div>
            </div>

            {/* 按钮 */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowConsolidateModal(false)
                  // 刷新页面并添加巩固模式参数
                  router.refresh()
                  setTimeout(() => {
                    window.location.href = `/learning-plan/learning-flow?bookId=${bookId}&mode=flashcard&consolidate=true`
                  }, 100)
                }}
                className={`
                  w-full p-3 text-base font-black
                  border-[3px] border-black dark:border-slate-600
                  bg-[#B4F416] dark:bg-[#86efac]
                  shadow-[4px_4px_0px_0px_#000] dark:shadow-none
                  hover:translate-x-[1px] hover:translate-y-[1px]
                  hover:shadow-[2px_2px_0px_0px_#000]
                  active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
                  transition-all duration-200
                `}
              >
                继续巩固（推荐）
              </button>

              <button
                onClick={() => {
                  setShowConsolidateModal(false)
                  setTimeout(() => {
                    onComplete()
                  }, 300)
                }}
                className="
                  w-full p-3 text-sm font-bold text-gray-600 dark:text-gray-400
                  hover:text-black dark:hover:text-slate-300
                  transition-colors
                "
              >
                稍后再说
              </button>
            </div>
          </div>
        </div>
      )}

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
