/**
 * Step 3 跟读背诵 - 客户端组件 (Neo-Brutalism风格)
 *
 * 核心功能：
 * 1. 展示原文（可隐藏/显示）
 * 2. 单句播放（强制原速，禁止连播）
 * 3. 状态标记（已练习、已掌握）
 * 4. 保存进度到数据库
 *
 * 严格按照三个文档实现：
 * - shangwenjie.md 第 2.6 节（背诵页需求）
 * - TECHNICAL_MODIFICATION_PLAN.md（逻辑隔离）
 * - AI_DEVELOPMENT_GUIDE.md（开发规范）
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Play, Eye, EyeOff, BookOpen } from 'lucide-react'
import type { SpeakerArticle, SpeakerSentence } from '@/types/speaker'
import { toast } from 'sonner'

interface RecitationClientProps {
  article: SpeakerArticle
  sentences: SpeakerSentence[]
  userId: string
}

type PlaybackState = 'idle' | 'playing' | 'paused'

export function RecitationClient({ article, sentences, userId }: RecitationClientProps) {
  const router = useRouter()

  // ========================================
  // 1. 文本显示控制
  // ========================================
  const [showText, setShowText] = useState(true)

  // ========================================
  // 2. 播放状态
  // ========================================
  const [audioPlaybackState, setAudioPlaybackState] = useState<PlaybackState>('idle')
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState<number | null>(null)

  // ========================================
  // 3. 练习进度状态
  // ========================================
  const [practicedSentenceIndices, setPracticedSentenceIndices] = useState<number[]>([])
  const [masteredSentenceIndices, setMasteredSentenceIndices] = useState<number[]>([])
  const [isLoadingProgress, setIsLoadingProgress] = useState(true)

  // 临时显示某个句子的文字（不保存到数据库）
  const [tempRevealedSentences, setTempRevealedSentences] = useState<Set<number>>(new Set())

  // 音频引用
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timeUpdateHandlerRef = useRef<((this: HTMLAudioElement, ev: Event) => any) | null>(null)

  // ========================================
  // 4. 初始化音频元素
  // ========================================
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(article.audio_url)
      audioRef.current.playbackRate = 1.0  // 强制原速

      audioRef.current.addEventListener('ended', () => {
        setAudioPlaybackState('idle')
        setCurrentPlayingIndex(null)
      })
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [article.audio_url])

  // ========================================
  // 5. 加载练习进度
  // ========================================
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const response = await fetch(
          `/api/speaker/recitation?articleId=${article.id}&userId=${userId}`
        )
        const data = await response.json()

        if (data.success) {
          setPracticedSentenceIndices(data.practicedSentences || [])
          setMasteredSentenceIndices(data.masteredSentences || [])
        }
      } catch (error) {
        console.error('[Recitation] 加载进度失败:', error)
      } finally {
        setIsLoadingProgress(false)
      }
    }

    loadProgress()
  }, [article.id, userId])

  // ========================================
  // 6. 播放单个句子
  // ========================================
  const playSentence = (sentenceIndex: number) => {
    const sentence = sentences[sentenceIndex]
    if (!sentence || !audioRef.current) return

    // 检查时间戳
    if (sentence.start_time === null || sentence.end_time === null) {
      toast.warning('该句子尚未添加时间戳，无法播放')
      return
    }

    const startTime = sentence.start_time
    const endTime = sentence.end_time
    const audio = audioRef.current

    // 先移除之前的监听器（如果存在）
    if (timeUpdateHandlerRef.current) {
      audio.removeEventListener('timeupdate', timeUpdateHandlerRef.current)
    }

    // 先停止当前播放
    audio.pause()

    // 跳转到开始时间
    audio.currentTime = startTime

    // 创建新的监听器
    const handleTimeUpdate = () => {
      if (audio.currentTime >= endTime) {
        audio.pause()
        setAudioPlaybackState('idle')
        setCurrentPlayingIndex(null)
        // 移除监听器
        if (timeUpdateHandlerRef.current) {
          audio.removeEventListener('timeupdate', timeUpdateHandlerRef.current)
          timeUpdateHandlerRef.current = null
        }
      }
    }

    // 保存监听器引用
    timeUpdateHandlerRef.current = handleTimeUpdate

    // 播放
    audio.play().then(() => {
      setAudioPlaybackState('playing')
      setCurrentPlayingIndex(sentenceIndex)

      // 标记为"已练习"
      if (!practicedSentenceIndices.includes(sentenceIndex)) {
        const newPracticed = [...practicedSentenceIndices, sentenceIndex]
        setPracticedSentenceIndices(newPracticed)
        saveProgress(newPracticed, masteredSentenceIndices)
      }
    }).catch(err => {
      console.error('[Recitation] 播放失败:', err)
      toast.error('播放失败，请重试')
    })

    // 添加监听器
    audio.addEventListener('timeupdate', handleTimeUpdate)
  }

  // ========================================
  // 7. 保存进度
  // ========================================
  const saveProgress = async (practiced: number[], mastered: number[]) => {
    try {
      await fetch('/api/speaker/recitation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: article.id,
          userId,
          practicedSentences: practiced,
          masteredSentences: mastered,
          completed: mastered.length === sentences.length
        })
      })
    } catch (error) {
      console.error('[Recitation] 保存进度失败:', error)
    }
  }

  // ========================================
  // 8. 切换"掌握"状态
  // ========================================
  const toggleMastered = (sentenceIndex: number) => {
    const newMastered = masteredSentenceIndices.includes(sentenceIndex)
      ? masteredSentenceIndices.filter(i => i !== sentenceIndex)
      : [...masteredSentenceIndices, sentenceIndex]

    setMasteredSentenceIndices(newMastered)

    // 每次切换状态都保存
    saveProgress(practicedSentenceIndices, newMastered)

    // 检查是否全部掌握
    if (newMastered.length === sentences.length) {
      toast.success('🎉 恭喜！你已背好所有句子，可以进入下一步了！')
    }
  }

  // ========================================
  // 9. 返回时间轴
  // ========================================
  const goToTimeline = () => {
    router.push(`/speaker/timeline?id=${article.id}`)
  }

  const goToKtvComparison = () => {
    router.push(`/speaker/steps/step4?id=${article.id}`)
  }

  // ========================================
  // 10. 临时显示/隐藏句子文字
  // ========================================
  const toggleTempReveal = (index: number) => {
    const newSet = new Set(tempRevealedSentences)
    if (newSet.has(index)) {
      newSet.delete(index)
    } else {
      newSet.add(index)
    }
    setTempRevealedSentences(newSet)
  }

  // ========================================
  // 判断句子状态
  // ========================================
  const isPracticed = (index: number) => practicedSentenceIndices.includes(index)
  const isMastered = (index: number) => masteredSentenceIndices.includes(index)
  const isPlaying = (index: number) => currentPlayingIndex === index
  const isTempRevealed = (index: number) => tempRevealedSentences.has(index)
  const shouldShowText = (index: number) => showText || isTempRevealed(index)

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* ========================================
          页面头部 - 控制台风格（与Step 4统一）
      ======================================== */}
      <div className="bg-white dark:bg-gray-800 border-b-4 border-black dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-6 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start justify-between">
            {/* 左侧：返回按钮 + 标题 */}
            <div className="flex-1">
              <button
                onClick={goToTimeline}
                className="w-12 h-12 flex items-center justify-center bg-white dark:bg-gray-700 border-3 border-black dark:border-gray-600 hover:bg-black dark:hover:bg-gray-900 hover:text-white transition-all mb-6"
              >
                <ArrowLeft className="w-6 h-6 text-current" strokeWidth={3} />
              </button>

              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-4xl sm:text-5xl font-black text-black dark:text-white tracking-tight font-sans">
                  跟读背诵
                </h1>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 italic font-sans">
                  {article.title}
                </p>

                {/* 右侧：隐藏文本开关 */}
                <button
                  onClick={() => setShowText(!showText)}
                  className={`
                    flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 border-3 border-black dark:border-gray-700 rounded-none transition-all font-bold text-xs sm:text-sm uppercase tracking-wide whitespace-nowrap
                    ${showText
                      ? 'bg-white dark:bg-gray-800 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666]'
                      : 'bg-[#B4F416] dark:bg-[#84cc16] text-black hover:bg-[#a3e014] dark:hover:bg-[#a3e014] shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666]'
                    }
                  `}
                >
                  {showText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{showText ? '隐藏文本' : '显示文本'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 数据统计 - 黑框数据格 */}
          <div className="flex items-center gap-4 mt-6">
            <div className="border-2 border-black px-3 py-1 font-mono font-bold bg-[#B4F416]">
              已掌握: {masteredSentenceIndices.length} / {sentences.length}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================
          主内容区
      ======================================== */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {isLoadingProgress ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* 说明区域 - Briefing */}
            <div className="p-8 rounded-none bg-white dark:bg-gray-800 border-3 border-black dark:border-gray-700 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666]">
              <h2 className="text-xl font-black text-black dark:text-white mb-2 flex items-center gap-3 font-sans">
                <span className="w-4 h-4 bg-black dark:bg-white dark:border dark:border-gray-600"></span>
                逐句背诵这篇课文
              </h2>
              <div className="mt-4 text-sm text-black dark:text-gray-200 font-sans space-y-2">
                <p className="font-bold">操作流程：</p>
                <div className="flex items-center gap-2">
                  <span className="text-black dark:text-white font-bold">①</span>
                  <span>点击播放按钮，听原音并跟读背诵</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-black dark:text-white font-bold">②</span>
                  <span>背诵完成后，点击右侧“标记完成”按钮</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-black dark:text-white font-bold">③</span>
                  <span>所有句子都掌握后，可进入下一步</span>
                </div>
              </div>
            </div>

            {/* 句子列表 - 任务卡片 */}
            {sentences.map((sentence, index) => {
              const mastered = isMastered(index)
              const playing = isPlaying(index)

              return (
                <div
                  key={index}
                  className={`
                    p-6 border-2 transition-all
                    ${mastered
                      ? 'bg-[#B4F416] dark:bg-[#84cc16] border-black dark:border-gray-600 translate-y-[2px] shadow-none'
                      : 'bg-white dark:bg-gray-800 border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] hover:translate-y-[-2px]'
                    }
                  `}
                >
                  <div className="flex items-center gap-4">
                    {/* 左侧：序号和播放按钮 */}
                    <div className="flex-shrink-0 flex items-center gap-3">
                      {/* 序号 - 黑底白字方块 */}
                      <span className={`
                        w-10 h-10 flex items-center justify-center text-sm font-black font-mono
                        ${mastered
                          ? 'bg-black dark:bg-black text-white dark:text-white'
                          : 'bg-black dark:bg-gray-700 text-white dark:text-gray-200'
                        }
                      `}>
                        {String(index + 1).padStart(2, '0')}
                      </span>

                      {/* 播放按钮 - 圆形黑框 */}
                      <button
                        onClick={() => playSentence(index)}
                        disabled={playing}
                        className={`
                          w-12 h-12 rounded-full border-2 border-black dark:border-gray-600 flex items-center justify-center transition-all duration-200
                          ${playing
                            ? 'bg-[#B4F416] dark:bg-[#84cc16] text-black'
                            : 'bg-white dark:bg-gray-700 text-black dark:text-white hover:bg-black dark:hover:bg-black hover:text-white'
                          }
                        `}
                        aria-label={playing ? '正在播放' : '播放句子'}
                      >
                        <Play className={`w-5 h-5 ${playing ? 'animate-pulse' : ''}`} fill={playing ? 'currentColor' : 'none'} />
                      </button>
                    </div>

                    {/* 中间：文本内容 */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-lg leading-relaxed font-medium text-black dark:text-gray-100 ${!shouldShowText(index) ? 'blur-sm select-none' : ''}`}>
                        {sentence.text}
                      </p>

                      {/* 播放中提示 */}
                      {playing && (
                        <div className="mt-2 text-xs text-black dark:text-gray-300 font-bold font-mono">
                          🔊 正在播放...
                        </div>
                      )}

                      {/* 临时显示文字按钮（仅在全局隐藏时显示） */}
                      {!showText && (
                        <button
                          onClick={() => toggleTempReveal(index)}
                          className="mt-2 text-xs text-black dark:text-gray-300 hover:underline font-bold font-mono flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          {isTempRevealed(index) ? '隐藏文字' : '显示文字'}
                        </button>
                      )}
                    </div>

                    {/* 右侧：掌握标记按钮 */}
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => toggleMastered(index)}
                        className={`
                          border-2 px-5 py-3 font-bold text-sm uppercase tracking-wide transition-all
                          ${mastered
                            ? 'bg-black dark:bg-black text-white dark:text-white border-black dark:border-gray-600'
                            : 'bg-white dark:bg-gray-700 text-black dark:text-white border-black dark:border-gray-600 hover:bg-black dark:hover:bg-black hover:text-white'
                          }
                        `}
                      >
                        {mastered ? '✓ 已背好' : '标记完成'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* 全部掌握提示 - 荧光绿高亮 */}
            {masteredSentenceIndices.length === sentences.length && sentences.length > 0 && (
              <div className="p-8 rounded-none bg-[#B4F416] dark:bg-[#84cc16] border-4 border-black dark:border-gray-700 shadow-[8px_8px_0px_0px_#000] dark:shadow-[8px_8px_0px_0px_#666] text-center">
                <h3 className="text-3xl font-black text-black dark:text-white mb-3 font-sans">
                  🎉 任务完成！
                </h3>
                <p className="text-lg text-black dark:text-gray-100 mb-6 font-bold font-sans">
                  你已掌握这篇文章的所有句子，可以进入下一步了！
                </p>
                <button
                  onClick={goToKtvComparison}
                  className="px-8 py-4 border-3 border-black bg-white dark:bg-gray-800 text-black dark:text-white font-black text-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all shadow-[6px_6px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] hover:-translate-y-1"
                >
                  进入原音对比
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
