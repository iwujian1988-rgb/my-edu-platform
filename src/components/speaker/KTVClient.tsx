/**
 * Step 4 原音对比 - KTV模式客户端组件
 *
 * 核心功能：
 * 1. 静音领跑（音频默认音量 0.1）
 * 2. KTV滚动高亮（根据时间轴自动滚动）
 * 3. 节流优化（只在句子切换时滚动）
 * 4. 完课确认
 *
 * 严格按照三个文档实现：
 * - shangwenjie.md 第 2.7 节（KTV模式需求）
 * - TECHNICAL_MODIFICATION_PLAN.md（逻辑隔离）
 * - AI_DEVELOPMENT_GUIDE.md（性能优化）
 */

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, BookOpen, Play, Pause, RotateCcw, Volume2, VolumeX, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { SpeakerArticle, SpeakerSentence } from '@/types/speaker'

interface KTVClientProps {
  article: SpeakerArticle
  sentences: SpeakerSentence[]
  userId: string
  isCompleted?: boolean
}

type PlaybackState = 'idle' | 'playing' | 'paused'

export function KTVClient({ article, sentences, userId, isCompleted: initialIsCompleted = false }: KTVClientProps) {
  const router = useRouter()

  // ========================================
  // 1. 文本显示控制（模糊遮罩）
  // ========================================
  const [showText, setShowText] = useState(false) // 默认隐藏文本，方便背诵
  const [isHovered, setIsHovered] = useState(false) // 鼠标悬停临时显示
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null)

  // ========================================
  // 2. 播放状态
  // ========================================
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle')
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(0)
  const [currentVolume, setCurrentVolume] = useState(0.1) // 当前音量（0.1 或 1.0）

  // ========================================
  // 3. 倒计时状态
  // ========================================
  const [countdown, setCountdown] = useState(0)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // ========================================
  // 4. 学习目标卡片显示控制
  // ========================================
  const [showLearningGoal, setShowLearningGoal] = useState(true)

  // 从localStorage读取用户之前的选择
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem(`ktv_learning_goal_${article.id}`)
      if (savedState === 'closed') {
        setShowLearningGoal(false)
      }
    }
  }, [article.id])

  // 关闭学习目标卡片
  const handleCloseLearningGoal = () => {
    setShowLearningGoal(false)
    if (typeof window !== 'undefined') {
      localStorage.setItem(`ktv_learning_goal_${article.id}`, 'closed')
    }
  }

  // 重新展开学习目标卡片
  const handleReopenLearningGoal = () => {
    setShowLearningGoal(true)
  }

  // ========================================
  // 4. 完课状态（使用传入的初始值）
  // ========================================
  const [isCompleting, setIsCompleting] = useState(false)
  const [isCompleted, setIsCompleted] = useState(initialIsCompleted)

  // ========================================
  // 5. 演示模式状态
  // ========================================
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [demoCurrentTime, setDemoCurrentTime] = useState(0)
  const [demoDuration, setDemoDuration] = useState(0)
  const [demoCountdown, setDemoCountdown] = useState(0) // 演示模式321倒计时
  const demoIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // ========================================
  // 5. "我已背完"弹层状态
  // ========================================
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'faster' | 'slower' | 'close'>('close')

  // 音频引用
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)

  // ========================================
  // 4. 鼠标悬停临时显示（延迟300ms）
  // ========================================
  const handleMouseEnter = () => {
    if (!showText) {
      // 清除之前的延迟定时器
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current)
      }
      // 延迟300ms后再显示，避免鼠标经过时误触发
      hoverTimerRef.current = setTimeout(() => {
        setIsHovered(true)
        hoverTimerRef.current = null
      }, 300)
    }
  }

  const handleMouseLeave = () => {
    // 清除延迟定时器（如果还未触发）
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
    // 立即隐藏
    setIsHovered(false)
  }

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current)
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [])

  // ========================================
  // 6. 倒计时功能
  // ========================================
  const startCountdown = (callback: () => void) => {
    setCountdown(3)
    let count = 3

    countdownIntervalRef.current = setInterval(() => {
      count--
      if (count > 0) {
        setCountdown(count)
      } else {
        setCountdown(0)
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current)
        }
        callback()
      }
    }, 1000)
  }

  // ========================================
  // 3. 初始化音频元素
  // ========================================
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(article.audio_url)
      audioRef.current.volume = currentVolume // 设置初始音量

      audioRef.current.addEventListener('ended', () => {
        setPlaybackState('idle')
        setCurrentSentenceIndex(0)
      })
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [article.audio_url, currentVolume])

  // ========================================
  // 4. KTV滚动高亮（性能优化版）
  // ========================================
  const previousSentenceIndexRef = useRef<number>(-1)
  const lastScrollTimeRef = useRef<number>(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      const currentTime = audio.currentTime

      // 根据当前时间找到对应的句子索引
      let foundIndex: number | null = null
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i]
        if (sentence.start_time !== null &&
            sentence.end_time !== null &&
            currentTime >= sentence.start_time &&
            currentTime < sentence.end_time) {
          foundIndex = i
          break
        }
      }

      // 如果找到了匹配的句子，且索引发生变化，才更新和滚动
      if (foundIndex !== null && foundIndex !== previousSentenceIndexRef.current) {
        const now = Date.now()

        // 额外节流：最多每 500ms 滚动一次
        if (now - lastScrollTimeRef.current > 500) {
          setCurrentSentenceIndex(foundIndex)
          previousSentenceIndexRef.current = foundIndex
          lastScrollTimeRef.current = now

          // 平滑滚动到当前句子
          scrollToSentence(foundIndex)
        }
      }
    }

    // 使用节流：每 200ms 检查一次，而不是每次 timeupdate 都检查
    const intervalId = setInterval(handleTimeUpdate, 200)

    return () => {
      clearInterval(intervalId)
    }
  }, [sentences])

  // ========================================
  // 5. 平滑滚动到指定句子（居中显示）
  // ========================================
  const scrollToSentence = useCallback((index: number) => {
    if (!containerRef.current) return

    const sentenceElement = containerRef.current.querySelector(
      `[data-sentence-index="${index}"]`
    ) as HTMLElement

    if (sentenceElement) {
      // 使用 scrollIntoView 的 block: 'center' 让元素在可视区域居中
      sentenceElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      })
    }
  }, [])

  // ========================================
  // 6. 播放控制（支持指定音量）
  // ========================================
  const handlePlayWithVolume = (volume: 0.1 | 1.0) => {
    if (!audioRef.current) return

    // 设置音量
    audioRef.current.volume = volume
    setCurrentVolume(volume)

    if (playbackState === 'playing') {
      // 如果正在播放，先暂停，然后以新音量继续播放
      audioRef.current.pause()
      setPlaybackState('paused')
      // 短暂延迟后继续播放，确保音量切换生效
      setTimeout(() => {
        audioRef.current?.play()
        setPlaybackState('playing')
      }, 50)
    } else {
      // 如果未播放，直接开始播放
      audioRef.current.play()
      setPlaybackState('playing')
    }

    // 显示提示
    if (volume === 0.1) {
      toast.success('🔇 已切换到低音量模式')
    } else {
      toast.success('🔊 已开启正常音量')
    }
  }

  // 和原音开始比语速（带321倒计时）
  const handleStartRace = () => {
    // 重置到开头
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.volume = 0.1
      setCurrentVolume(0.1)
    }

    // 开始倒计时
    startCountdown(() => {
      // 倒计时结束后开始播放
      if (audioRef.current) {
        audioRef.current.play()
        setPlaybackState('playing')
      }
    })
  }

  const handlePause = () => {
    if (!audioRef.current) return

    audioRef.current.pause()
    setPlaybackState('paused')
  }

  // ========================================
  // 7. 完课确认
  // ========================================
  const handleComplete = async () => {
    if (isCompleting || isCompleted) return

    setIsCompleting(true)

    try {
      const response = await fetch('/api/speaker/complete', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: article.id,
          userId,
          step: 'step4'
        })
      })

      const data = await response.json()

      if (data.success) {
        setIsCompleted(true)
        toast.success('🎉 恭喜！你已完成这篇文章的学习！')

        // 2秒后跳转回时间轴
        setTimeout(() => {
          router.push(`/speaker/timeline?id=${article.id}`)
        }, 2000)
      } else {
        toast.error('保存失败，请重试')
      }
    } catch (error) {
      console.error('[KTV] 完课失败:', error)
      toast.error('保存失败，请重试')
    } finally {
      setIsCompleting(false)
    }
  }

  // ========================================
  // 8. 重置进度（重新学习）
  // ========================================
  const handleResetProgress = async () => {
    try {
      const response = await fetch('/api/speaker/reset-progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: article.id,
          userId,
          step: 'step4'
        })
      })

      const data = await response.json()

      if (data.success) {
        setIsCompleted(false)
        toast.success('已重置，可以重新学习！')
      } else {
        toast.error('重置失败，请重试')
      }
    } catch (error) {
      console.error('[KTV] 重置进度失败:', error)
      toast.error('重置失败，请重试')
    }
  }

  // ========================================
  // 9. 返回时间轴
  // ========================================
  const goToTimeline = () => {
    router.push(`/speaker/timeline?id=${article.id}`)
  }

  // ========================================
  // 10. 跳转到 speaker 首页
  // ========================================
  const goToSpeakerHome = () => {
    router.push('/speaker')
  }

  // ========================================
  // 11. 演示模式功能
  // ========================================
  // 格式化时间显示
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 启动演示模式（带321倒计时）
  const startDemoMode = () => {
    if (isDemoMode || demoCountdown > 0) return
    const realDuration = audioRef.current?.duration || 30
    setDemoDuration(realDuration)
    setDemoCurrentTime(0)
    setCurrentSentenceIndex(0)

    // 开始321倒计时
    setDemoCountdown(3)
    let count = 3
    const countdownTimer = setInterval(() => {
      count--
      if (count > 0) {
        setDemoCountdown(count)
      } else {
        clearInterval(countdownTimer)
        setDemoCountdown(0)
        // 倒计时结束，开始演示
        setIsDemoMode(true)
        setPlaybackState('playing')
      }
    }, 1000)
  }

  // 停止演示模式
  const stopDemoMode = () => {
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current)
      demoIntervalRef.current = null
    }
    setIsDemoMode(false)
    setDemoCurrentTime(0)
    setDemoCountdown(0)
    setPlaybackState('idle')
    setCurrentSentenceIndex(0)
  }

  // 演示模式：30秒内完成，显示真实音频时长倒计时
  const demoTimeRef = useRef(0)

  useEffect(() => {
    if (!isDemoMode) {
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current)
        demoIntervalRef.current = null
      }
      demoTimeRef.current = 0
      return
    }

    const realDuration = demoDuration || 30
    // 30秒内完成，每100ms更新一次，共300次
    const incrementPerTick = realDuration / 300
    demoTimeRef.current = 0

    demoIntervalRef.current = setInterval(() => {
      demoTimeRef.current += incrementPerTick
      const newTime = demoTimeRef.current

      setDemoCurrentTime(newTime)

      if (newTime >= realDuration) {
        clearInterval(demoIntervalRef.current!)
        demoIntervalRef.current = null
        setIsDemoMode(false)
        setPlaybackState('idle')
        // 演示完成，弹出成功提示
        setModalType('faster')
        setShowModal(true)
        return
      }

      // 更新当前句子索引（根据模拟时间）
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i]
        if (sentence.start_time !== null &&
            sentence.end_time !== null &&
            newTime >= sentence.start_time &&
            newTime < sentence.end_time) {
          setCurrentSentenceIndex(i)
          scrollToSentence(i)
          break
        }
      }
    }, 100)

    return () => {
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current)
      }
    }
  }, [isDemoMode, demoDuration, sentences])

  // 组件卸载时清理演示模式定时器
  useEffect(() => {
    return () => {
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current)
      }
    }
  }, [])

  // ========================================
  // 10. "我已背完"按钮点击处理
  // ========================================
  const handleFinishedMemorizing = () => {
    // 如果还没开始播放，提示用户先播放
    if (playbackState === 'idle' || !audioRef.current) {
      toast.info('请先播放音频，开始背诵后再点击')
      return
    }

    const currentTime = audioRef.current.currentTime

    // 获取音频总时长
    const duration = audioRef.current.duration || 0

    if (duration === 0) {
      toast.info('音频加载中，请稍后再试')
      return
    }

    // 计算用户完成时间占原音时长的百分比
    const timeProgress = (currentTime / duration) * 100

    // ±5% 范围内：接近原音速度
    // 例如：20秒的音频，19秒-21秒之间完成都算接近
    if (timeProgress >= 95 && timeProgress <= 105) {
      setModalType('close')
    } else if (timeProgress < 95) {
      // 快于原音（在95%之前完成）
      setModalType('faster')
    } else {
      // 慢于原音（在105%之后完成）
      setModalType('slower')
    }

    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
  }

  const handleRetry = () => {
    setShowModal(false)
    // 重置到开头
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      setCurrentSentenceIndex(0)
    }
  }

  const handleCompleteFromModal = async () => {
    setShowModal(false)
    await handleComplete()
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* 页面头部 - 控制台风格 */}
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
                <h1 className="text-4xl sm:text-5xl font-black text-black dark:text-white tracking-tight">
                  原音对比
                </h1>
                {/* 已完成印章 - 黑底白字方块 */}
                {isCompleted && (
                  <span className="px-4 py-2 bg-black dark:bg-gray-700 text-white dark:text-gray-200 font-bold text-sm border-2 border-black dark:border-gray-600 rounded-none">
                    ✓ 已完成
                  </span>
                )}
                {/* 学习目标图标按钮 */}
                {!showLearningGoal && (
                  <button
                    onClick={handleReopenLearningGoal}
                    className="w-8 h-8 flex items-center justify-center border-2 border-gray-300 dark:border-gray-600 hover:border-black dark:hover:border-gray-400 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 transition-all rounded-sm"
                    title="查看使用提示"
                  >
                    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 italic">
                  她说：在这个阶段把原文背出来做到和原音一样快，这篇就完成
                </p>
                {/* 右侧：完课按钮 */}
                {!isCompleted && (
                  <button
                    onClick={handleComplete}
                    disabled={isCompleting}
                    className={`
                      flex items-center gap-1 sm:gap-2 px-4 py-2 sm:px-6 sm:py-3 border-3 border-black dark:border-gray-700 rounded-none transition-all font-bold text-xs sm:text-sm whitespace-nowrap
                      ${isCompleting
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        : 'bg-white dark:bg-gray-800 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] hover:shadow-[2px_2px_0px_0px_#000] dark:hover:shadow-[2px_2px_0px_0px_#666] hover:-translate-y-0.5'
                      }
                    `}
                    title="语速达标结束本篇"
                  >
                    {isCompleting ? (
                      '保存中...'
                    ) : (
                      <>
                        <span>语速达标结束本篇</span>
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区 - KTV滚动显示 */}
      <div className="max-w-4xl mx-auto px-6 sm:px-6 lg:px-8 py-12">
        {/* 学习目标卡片 - 可关闭 */}
        {showLearningGoal && (
          <div className="p-8 rounded-none bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-700 shadow-[8px_8px_0px_0px_#000] dark:shadow-[8px_8px_0px_0px_#666] mb-8 relative">
            {/* 关闭按钮 */}
            <button
              onClick={handleCloseLearningGoal}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center border-2 border-black dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all"
              title="收起使用提示"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-xl font-black uppercase text-black dark:text-white mb-4 pb-3 border-b-2 border-black dark:border-gray-700 tracking-wide pr-12">
              使用提示
            </h2>

            {/* 按钮使用说明 */}
            <div>
              <ul className="space-y-3 text-sm text-black dark:text-gray-200">
                <li className="flex items-start gap-3 font-mono">
                  <span className="text-black dark:text-white">■</span>
                  <span><strong className="text-black dark:text-white">和原音开始比语速</strong>：开始倒计时后，和原音一起背诵，看能否跟上节奏</span>
                </li>
                <li className="flex items-start gap-3 font-mono">
                  <span className="text-black dark:text-white">■</span>
                  <span><strong className="text-black dark:text-white">再听一遍原音</strong>：验证自己的发音是否正确</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* 文章标题 */}
        <div className="mb-4 text-center">
          <h2 className="text-lg sm:text-2xl font-bold text-black dark:text-white">
            {article.title}
          </h2>
        </div>

        {/* 播放控制 */}
        <div className="mb-6 flex items-center justify-between gap-2 sm:gap-3">
          {/* 左侧：隐藏文本（弱化样式） + 演示模式倒计时 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowText(!showText)}
              onDoubleClick={() => {
                if (isDemoMode) {
                  stopDemoMode()
                } else {
                  startDemoMode()
                }
              }}
              className="flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-none transition-all text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
            title={showText ? '点击隐藏文本' : '点击显示文本'}
          >
            <svg className={`w-3 h-3 ${showText ? 'opacity-100' : 'opacity-50'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="hidden xs:inline">
              {showText ? '显示文本' : '隐藏文本'}
            </span>
          </button>
          {/* 演示模式倒计时 */}
          {isDemoMode && (
            <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
              {formatTime(demoDuration - demoCurrentTime)}
            </span>
          )}
          </div>

          {/* 右侧：播放控制按钮 */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 暂停按钮（播放时显示） */}
            {playbackState === 'playing' ? (
              <button
                onClick={handlePause}
                className="w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center border-3 border-black dark:border-gray-600 rounded-none transition-all duration-200 bg-white dark:bg-gray-700 text-black dark:text-white shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666]"
                title="暂停"
              >
                <Pause className="w-4 h-4 sm:w-6 sm:h-6" strokeWidth={3} />
              </button>
            ) : (
              <>
                {/* 和原音开始比语速按钮 */}
                <button
                  onClick={handleStartRace}
                  className="flex items-center gap-1 sm:gap-2 px-2 py-2 sm:px-5 sm:py-3 border-3 border-black dark:border-gray-600 rounded-none transition-all duration-200 font-bold text-xs sm:text-sm bg-[#B4F416] dark:bg-[#84cc16] text-black hover:bg-[#a3e014] shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#666] hover:shadow-[3px_3px_0px_0px_#000] hover:-translate-y-1"
                  title="和原音开始比语速"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="hidden sm:inline">和原音开始比语速</span>
                  <span className="sm:hidden">比语速</span>
                </button>

                {/* 再听一遍原音按钮 */}
                <button
                  onClick={() => handlePlayWithVolume(1.0)}
                  className="flex items-center gap-1 sm:gap-2 px-2 py-2 sm:px-5 sm:py-3 border-3 border-black dark:border-gray-600 rounded-none transition-all duration-200 font-bold text-xs sm:text-sm bg-white dark:bg-gray-700 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666]"
                  title="再听一遍原音"
                >
                  <Volume2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">再听一遍原音</span>
                  <span className="sm:hidden">再听原音</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* KTV 歌词显示 - 终端纸带风格，相对定位容器 */}
        <div className="relative border-y-4 border-black dark:border-gray-700 bg-white dark:bg-gray-900">
          {/* 倒计时显示 - 覆盖在字幕区上面，模糊盖住播放区 */}
          {countdown > 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md gap-6">
              <div className="px-12 py-8 bg-black/90 dark:bg-white/90 text-white dark:text-black text-8xl font-black rounded-none shadow-[8px_8px_0px_0px_#000] dark:shadow-[8px_8px_0px_0px_#666]">
                {countdown}
              </div>
              <p className="text-xl font-bold text-black dark:text-white bg-white/90 dark:bg-black/90 px-6 py-3 rounded-none border-2 border-black dark:border-gray-600">
                即将按原音音量10%播放 请开始准备背诵
              </p>
            </div>
          )}
          {/* 演示模式321倒计时显示 */}
          {demoCountdown > 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md gap-6">
              <div className="px-12 py-8 bg-[#B4F416] text-black text-8xl font-black rounded-none shadow-[8px_8px_0px_0px_#000]">
                {demoCountdown}
              </div>
              <p className="text-xl font-bold text-black bg-white/90 px-6 py-3 rounded-none border-2 border-black">
                原音速度对比即将开始
              </p>
            </div>
          )}
          {/* 字幕滚动区域 - 隐藏横滚动条 */}
          <div
            ref={containerRef}
            className={`max-h-[50vh] overflow-y-auto py-6 px-4 ${playbackState === 'playing' && !isCompleted ? 'pb-[200px]' : ''}`}
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <style>{`
              .scrollbar-hide::-webkit-scrollbar {
                display: none;
              }
              .scrollbar-hide {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}</style>
            <div className="scrollbar-hide">
              {sentences.map((sentence, index) => {
                const isActive = index === currentSentenceIndex
                const isPast = index < currentSentenceIndex
                const isFuture = index > currentSentenceIndex

                return (
                  <div
                    key={sentence.id || index}
                    data-sentence-index={index}
                    className={`
                      py-4 px-6 border-2 transition-all duration-200
                      ${isActive
                        ? 'bg-[#B4F416] dark:bg-[#84cc16] border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] scale-105'
                        : isPast
                        ? 'bg-transparent border-transparent text-gray-300 dark:text-gray-700'
                        : 'bg-transparent border-transparent text-gray-400 dark:text-gray-600'
                      }
                    `}
                  >
                    <div className="flex items-start gap-4">
                      {/* 序号 */}
                      <span className={`
                        flex-shrink-0 w-10 h-10 flex items-center justify-center font-mono text-sm font-bold rounded-sm
                        ${isActive
                          ? 'bg-black dark:bg-white text-white dark:text-black'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }
                      `}>
                        {index + 1}
                      </span>

                      {/* 文本 */}
                      <p className={`text-lg leading-relaxed flex-1 font-mono ${isActive ? 'text-black dark:text-black font-bold' : ''} ${!showText && !isHovered ? 'blur-[3px] select-none' : ''}`}>
                        {sentence.text}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 底部固定：进度条和按钮（播放时或演示模式时显示） */}
          {(playbackState === 'playing' || isDemoMode || demoCountdown > 0) && !isCompleted && (
            <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 py-4 px-6">
              {/* 当前句子显示 - 居中显示在按钮上方 */}
              <div className="text-black dark:text-gray-300 text-sm font-mono mb-3 text-center">
                <span className="font-bold text-[#B4F416] dark:text-[#84cc16]">{currentSentenceIndex + 1}</span> / {sentences.length}
              </div>

              {/* "我已背完"进度条按钮 / 演示模式进度条 */}
              {isDemoMode || demoCountdown > 0 ? (
                <button
                  onClick={() => {
                    stopDemoMode()
                    setModalType('faster')
                    setShowModal(true)
                  }}
                  className="relative w-full py-6 border-4 border-black dark:border-gray-600 rounded-none overflow-hidden cursor-pointer hover:border-gray-800 dark:hover:border-gray-500 transition-all"
                  style={{
                    background: `linear-gradient(to right, #B4F416 0%, #B4F416 ${(demoCurrentTime / demoDuration) * 100}%, white ${(demoCurrentTime / demoDuration) * 100}%, white 100%)`
                  }}
                >
                  <span
                    className="relative z-10 text-xl font-black"
                    style={{
                      color: 'white',
                      textShadow: '0 0 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.6), 2px 2px 0 rgba(0,0,0,0.5)'
                    }}
                  >
                    {demoCountdown > 0 ? '准备中...' : '我已背完'}
                  </span>
                </button>
              ) : (
                <button
                  onClick={handleFinishedMemorizing}
                  className="relative w-full py-6 border-4 border-black dark:border-gray-600 rounded-none overflow-hidden transition-all hover:border-gray-800 dark:hover:border-gray-500 group"
                  style={{
                    background: `linear-gradient(to right, #B4F416 0%, #B4F416 ${((currentSentenceIndex + 1) / sentences.length) * 100}%, white ${((currentSentenceIndex + 1) / sentences.length) * 100}%, white 100%)`
                  }}
                >
                  {/* 白色文字 - 使用 text-shadow 实现反色效果 */}
                  <span
                    className="relative z-10 text-xl font-black"
                    style={{
                      color: 'white',
                      textShadow: '0 0 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.6), 2px 2px 0 rgba(0,0,0,0.5)'
                    }}
                  >
                    我已背完
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* 完成状态提示 - 全屏遮罩层 */}
        {isCompleted && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-[#B4F416] dark:bg-[#84cc16] border-4 border-black dark:border-gray-700 rounded-none p-12 max-w-md w-full shadow-[12px_12px_0px_0px_#000] dark:shadow-[12px_12px_0px_0px_#666] text-center">
              <CheckCircle className="w-20 h-20 text-black mx-auto mb-6" strokeWidth={3} />
              <h3 className="text-3xl font-black text-black mb-4">
                🎉 恭喜完成！
              </h3>
              <p className="text-xl text-black font-medium mb-8">
                你已完成这篇文章的所有学习步骤
              </p>
              <div className="space-y-3">
                <button
                  onClick={goToSpeakerHome}
                  className="w-full py-4 px-8 border-3 border-black bg-white dark:bg-gray-800 text-black dark:text-white font-black text-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all shadow-[6px_6px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] hover:-translate-y-1 inline-flex items-center justify-center gap-3"
                >
                  <BookOpen className="w-5 h-5 text-current" strokeWidth={2.5} />
                  <span>学习更多</span>
                </button>
                <button
                  onClick={handleResetProgress}
                  className="w-full py-4 px-8 border-3 border-black bg-white dark:bg-gray-800 text-black dark:text-white font-black text-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all shadow-[6px_6px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] hover:-translate-y-1 inline-flex items-center justify-center gap-3"
                >
                  <RotateCcw className="w-5 h-5 text-current" strokeWidth={2.5} />
                  <span>重新学习</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 弹层：语速反馈 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 border-4 border-black dark:border-gray-600 rounded-none p-8 max-w-md w-full shadow-[12px_12px_0px_0px_#000] dark:shadow-[12px_12px_0px_0px_#666]">
            <h3 className="text-3xl font-black text-black dark:text-white mb-4 text-center">
              {modalType === 'faster' && '🚀 恭喜你的语速已经超过原音'}
              {modalType === 'slower' && '🐢 你的语速慢于原音'}
              {modalType === 'close' && '🎯 恭喜你的语速与原音基本接近'}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-center mb-8 text-lg">
              {modalType === 'faster' && '你的背诵速度超过了原音速度！'}
              {modalType === 'slower' && '你的背诵速度慢于原音，继续加油！'}
              {modalType === 'close' && '你的背诵速度与原音非常接近！'}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleRetry}
                className="flex-1 py-4 px-6 border-3 border-black dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white font-bold text-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-all"
              >
                再比一次
              </button>
              <button
                onClick={handleCompleteFromModal}
                className="flex-1 py-4 px-6 border-3 border-black dark:border-gray-600 bg-[#B4F416] dark:bg-[#84cc16] text-black font-bold text-lg hover:bg-[#a3e014] dark:hover:bg-[#a3e014] shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
              >
                语速达标完成本篇
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
