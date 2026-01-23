'use client'

// src/app/study/[bookId]/dictation/page.tsx
// 对应方案：Neo-Brutalism 设计稿 1:1 还原



import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  X,
  Eye,
  EyeOff,
  PlusSquare,
  ChevronDown,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  CornerDownLeft,
  Volume2
} from 'lucide-react'
import Link from 'next/link'
import { speak as speakText, pauseSpeaking } from '@/lib/speech'
import { PermissionGate } from '@/components/PermissionDisplay'
import { FEATURE_PERMISSIONS } from '@/lib/permission-constants'
import { validateScope, validateHashIndex } from '@/lib/urlValidation'

// Hooks
import { useDictationStats } from '@/hooks/useDictationStats'
import { useDictationProgress } from '@/hooks/useDictationProgress'
import { useDictationWords } from '@/hooks/useDictationWords'
import { useDictationPageState } from '@/hooks/useDictationPageState'
import { useDictationProgressService } from '@/hooks/useProgressService'
import { useResumeState } from '@/hooks/useResumeState'
import { DictationScopeDialog } from '@/components/DictationScopeDialog'
import { DictationCompleteDialog } from '@/components/DictationCompleteDialog'
import { DictationScopeType, DICTATION_SCOPE_LABELS } from '@/types/dictation'

type Word = {
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
}

/**
 * 听写主页面（Neo-Brutalism 设计稿 1:1 还原）
 */
export default function DictationPageClient() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookId = params.bookId as string

  // ⭐ 智能跳转逻辑：检测 resume 参数
  const isFromHomepageResume = searchParams.get('resume') === 'true'

  // 状态管理
  const [isPlaying, setIsPlaying] = useState(false)
  const [hideChinese, setHideChinese] = useState(false)
  const [autoAddToMistakes, setAutoAddToMistakes] = useState(true)
  // ⭐ 从首页进入时不显示对话框，从书架进入时显示对话框
  const [showScopeDialog, setShowScopeDialog] = useState(!isFromHomepageResume)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)

  // ⭐ 进度恢复：从 URL 参数或 hash 中获取索引（优化版本）
  // 支持两种格式：
  // 1. Hash 格式：/study/[bookId]/dictation#word-50
  // 2. 查询参数格式：/study/[bookId]/dictation?resume=true&index=50
  const getIndexFromURL = () => {
    // 优先从 hash 获取（最高优先级）
    const hashIndex = validateHashIndex(window.location.hash)
    if (hashIndex !== undefined && hashIndex > 0) {
      return hashIndex
    }

    // 从查询参数获取（容错）
    const indexParam = searchParams.get('index')
    if (indexParam) {
      const parsedIndex = parseInt(indexParam, 10)
      if (!isNaN(parsedIndex) && parsedIndex > 0) {
        return parsedIndex
      }
    }

    return undefined
  }

  // 🔥 性能优化：缓存结果，避免调用两次
  const restoredIndex = getIndexFromURL()
  const shouldRestoreIndex = isFromHomepageResume && restoredIndex !== undefined
  const initialIndex = shouldRestoreIndex ? restoredIndex : undefined
  const [currentIndex, setCurrentIndex] = useState(initialIndex !== undefined ? initialIndex : 0)

  const [userInput, setUserInput] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false)
  const [targetIndex, setTargetIndex] = useState<number | null>(null)  // 🔥 进度恢复的目标索引（等待懒加载）

  // ⭐ 如果从首页进入，使用 URL 参数中的 scope；否则使用默认值 'all'
  const scopeParam = searchParams.get('scope')
  const [scopeType, setScopeType] = useState<DictationScopeType>(
    isFromHomepageResume ? (validateScope(scopeParam) as DictationScopeType) : 'all'
  )
  const [hasSelectedScope, setHasSelectedScope] = useState(isFromHomepageResume) // ⭐ 从首页进入时标记为已选择

  // Hooks
  const { stats, loading: statsLoading, getScopeOptions } = useDictationStats(bookId)
  // ⚡️ 关键修改：使用带懒加载的hook
  const { words, loading: wordsLoading, error: wordsError, totalWords, loadMore, hasMore, isLoadingMoreRef } = useDictationWords(bookId, scopeType, false)

  // 🔥 懒加载：当接近末尾时自动加载下一批
  // 🔥 修复：直接使用 hook 返回的 ref，避免同步问题
  useEffect(() => {
    const loadThreshold = 10  // 还剩10个单词时加载
    const remaining = words.length - currentIndex

    // 🔥 检查 isLoadingMoreRef.current（同步值），而不是 state（异步值）
    if (remaining <= loadThreshold && hasMore && !isLoadingMoreRef.current && !wordsLoading) {
      console.log(`🔄 [Dictation] 接近末尾，加载更多单词（还剩${remaining}个）`)
      loadMore()
    }
  }, [currentIndex, words.length, hasMore, wordsLoading, loadMore])

  // 使用新的进度服务（支持断点续做）
  const { saveProgress: saveNewProgress, markWord } = useDictationProgressService(bookId)
  const { resumeState: recentProgress, loading: resumeLoading } = useResumeState(bookId)

  // 旧的进度hook（用于恢复状态，但不保存）
  const { progress } = useDictationProgress(bookId, scopeType, words.length)
  const { pageState, canOperate, executeOperation } = useDictationPageState()

  /**
   * 保存进度的包装函数，兼容旧接口
   */
  const saveProgress = useCallback(async (currentIndex: number) => {
    // 🔥 改进的守卫子句：只有在确实无法保存时才阻止
    // 允许 totalWords = 0 的情况保存（用于调试和容错）
    if (words.length === 0 && !wordsLoading) {
      // words 为空且不在加载中，可能是筛选结果为空
      console.warn('[Dictation Page] saveProgress skipped: no words loaded and not loading')
      return
    }

    // 🔥 关键修复：使用 totalWords 而不是 words.length
    // totalWords 是真实的总数（固定值，例如 3000）
    // words.length 是当前已加载的数量（动态值，例如 50 → 100 → 150）
    console.log('[Dictation Page] saveProgress called:', {
      scopeType,
      currentIndex,
      totalWords: totalWords || words.length, // 🔥 容错：如果 totalWords 为 0，使用 words.length
      loadedWords: words.length
    })

    // 🔥 安全访问 currentWord，处理索引超出范围的情况
    const currentWord = (currentIndex >= 0 && currentIndex < words.length)
      ? words[currentIndex]
      : undefined

    if (currentIndex >= words.length && words.length > 0) {
      console.warn(`[Dictation Page] currentIndex ${currentIndex} exceeds loaded words ${words.length}, currentWord will be undefined`)
    }

    // 🔥 优先使用 totalWords，如果为 0 则回退到 words.length
    const effectiveTotalWords = totalWords > 0 ? totalWords : words.length

    await saveNewProgress(scopeType, currentIndex, effectiveTotalWords, currentWord ? {
      id: currentWord.id,
      word: currentWord.word
    } : undefined)
  }, [scopeType, totalWords, words, wordsLoading, saveNewProgress])

  // Refs
  const inputRef = useRef<HTMLInputElement>(null)

  // ⭐ Hash 定位逻辑：从首页进入时，自动跳转到指定位置
  useEffect(() => {
    if (isFromHomepageResume && initialHashIndex !== undefined && !wordsLoading && words.length > 0) {
      console.log('[Dictation] Hash positioning: jumping to word', initialHashIndex + 1)

      // 如果当前索引与 hash 不匹配，调整到 hash 位置
      if (currentIndex !== initialHashIndex) {
        setCurrentIndex(initialHashIndex)
      }

      // 使用 scrollIntoView 定位到当前题目
      const timer = setTimeout(() => {
        const element = document.getElementById(`word-${initialHashIndex}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          console.log('[Dictation] Scrolled to word element:', initialHashIndex + 1)
        }
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [isFromHomepageResume, initialHashIndex, wordsLoading, words.length, currentIndex])
  const hasPlayedOnceRef = useRef(false)
  const shouldLoadWordsRef = useRef(false) // 控制是否应该加载单词

  // 🔥 初始化进度（严格版本，解决所有边界问题）
  // 逻辑说明：
  // 1. 只在非首页恢复时，从进度数据恢复
  // 2. 使用 totalWords 判断进度有效性（而不是 words.length）
  // 3. 如果索引超出已加载范围，设置 targetIndex 等待懒加载
  const hasInitializedRef = useRef(false)
  const hasUserStartedRef = useRef(false)  // 检测用户是否已经开始学习
  const prevScopeRef = useRef<DictationScopeType | null>(null)  // 追踪 scope 变化

  // 🔥 阶段1：确定目标索引或立即恢复
  useEffect(() => {
    // 检测 scope 是否变化
    if (prevScopeRef.current !== scopeType) {
      console.log(`🔄 [Scope Changed] ${prevScopeRef.current} → ${scopeType}, 重置初始化状态`)
      hasInitializedRef.current = false
      hasUserStartedRef.current = false
      setTargetIndex(null)
      prevScopeRef.current = scopeType
    }

    // 如果是从首页恢复，跳过进度恢复逻辑（由 hash 定位处理）
    if (isFromHomepageResume) {
      hasInitializedRef.current = true
      return
    }

    // 🔥 防止在用户已经开始学习后恢复进度（避免覆盖用户操作）
    if (hasUserStartedRef.current) {
      console.log('⚠️ [Progress Restore] 用户已开始学习，跳过进度恢复并清除待恢复索引')
      setTargetIndex(null)  // 🔥 关键修复：清除 targetIndex，防止后续覆盖
      hasInitializedRef.current = true
      return
    }

    // 只在首次加载进度时恢复
    if (progress && !hasInitializedRef.current && totalWords > 0) {
      // 类型安全检查
      const savedIndex = Number(progress.currentIndex)
      if (isNaN(savedIndex) || !isFinite(savedIndex)) {
        console.error(`❌ [Progress Restore] 无效的进度索引: ${progress.currentIndex}，从头开始`)
        hasInitializedRef.current = true
        return
      }

      const isValidIndex = savedIndex >= 0 && savedIndex < totalWords

      if (isValidIndex) {
        if (savedIndex < words.length) {
          // ✅ 在已加载范围内，立即恢复
          console.log(`📋 [Progress Restore] 立即恢复: ${savedIndex}/${totalWords} (已加载: ${words.length})`)
          setCurrentIndex(savedIndex)
          hasInitializedRef.current = true
        } else {
          // ⏳ 索引超出当前加载范围，设置目标索引等待懒加载
          console.log(`⏳ [Progress Restore] 设置目标索引: ${savedIndex}, 已加载: ${words.length}/${totalWords}`)
          setTargetIndex(savedIndex)
          hasInitializedRef.current = true
        }
      } else {
        console.warn(`⚠️ [Progress Restore] 进度索引超出范围: ${savedIndex}/${totalWords}，从头开始`)
        hasInitializedRef.current = true
      }
    }
  }, [progress, totalWords, isFromHomepageResume, scopeType, words.length])

  // 🔥 阶段2：等待懒加载完成后恢复
  useEffect(() => {
    if (targetIndex !== null && targetIndex < words.length) {
      // 🔥 关键修复：再次检查用户是否已经开始学习
      if (hasUserStartedRef.current) {
        console.log('⚠️ [Progress Restore] 用户已开始学习，取消待恢复索引')
        setTargetIndex(null)
        return
      }
      console.log(`📋 [Progress Restore] 懒加载完成，恢复到索引: ${targetIndex} (已加载: ${words.length})`)
      setCurrentIndex(targetIndex)
      setTargetIndex(null)
    }
  }, [targetIndex, words.length])

  // 🔥 追踪用户是否已经开始学习（答题或切题）
  useEffect(() => {
    if (currentIndex > 0 || feedback !== null) {
      hasUserStartedRef.current = true
      // 🔥 关键修复：清除待恢复索引
      if (targetIndex !== null) {
        console.log('⚠️ [Progress Restore] 用户开始学习，清除待恢复索引')
        setTargetIndex(null)
      }
    }
  }, [currentIndex, feedback, targetIndex])

  // 自动显示范围选择对话框（不加载单词）
  useEffect(() => {
    // 只加载统计数据，不加载单词列表
    // ⭐ 只有在非首页恢复时才自动显示对话框
    if (!statsLoading && stats && stats.all > 0 && !isFromHomepageResume) {
      setShowScopeDialog(true)
    }
  }, [statsLoading, stats, isFromHomepageResume])

  const currentWord = words[currentIndex]

  // 🔥 边界检查：如果 currentWord 不存在，显示错误
  if (!currentWord && !wordsLoading && !error) {
    return (
      <div className="min-h-screen bg-[#f4f4f5] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-black text-lg mb-4">单词加载失败</p>
          <p className="text-sm text-gray-600 mb-4">
            当前索引 {currentIndex + 1} 超出范围（共 {words.length} 个单词）
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-black text-white rounded-lg font-bold"
          >
            重新加载
          </button>
        </div>
      </div>
    )
  }

  // 标记用户是否首次交互（用于控制首次播放）
  const hasUserInteractedRef = useRef(false)

  // 播放单词发音
  const playWordAudio = async () => {
    if (!currentWord) return

    setIsPlaying(true)
    try {
      await speakText(currentWord.word, {
        lang: 'en-US',
        rate: 0.8,
        pitch: 1.0,
        volume: 1.0,
        onEnd: () => {
          setIsPlaying(false)
        },
        onError: () => {
          setIsPlaying(false)
        }
      })
    } catch (error) {
      console.error('播放发音失败:', error)
      setIsPlaying(false)
    }
  }

  // 暂停播放
  const handlePause = () => {
    pauseSpeaking()
    setIsPlaying(false)
  }

  // 上一个单词
  const handlePrevious = async () => {
    if (!canOperate || currentIndex <= 0) return

    await executeOperation(
      '切题',
      'saving',
      async () => {
        await saveProgress(currentIndex)
        setFeedback(null)
        setShowCorrectAnswer(false)
        setUserInput('')
        hasPlayedOnceRef.current = false

        const prevIndex = currentIndex - 1
        setCurrentIndex(prevIndex)
      }
    )
  }

  // 自动播放TTS（只在用户选择范围后才触发）
  useEffect(() => {
    // ⚡️ 关键修改：只有用户选择范围后，才自动播放
    if (currentWord && !wordsLoading && !feedback && hasSelectedScope) {
      const timer = setTimeout(() => {
        playWordAudio()
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [currentIndex, currentWord, wordsLoading, feedback, hasSelectedScope])

  // 输入框焦点处理
  const handleInputFocus = () => {
    if (hasPlayedOnceRef.current && !isPlaying && !feedback && currentWord) {
      playWordAudio()
    }
  }

  // 自动聚焦输入框：切词后自动聚焦
  useEffect(() => {
    if (currentWord && !wordsLoading && feedback === null && inputRef.current) {
      // 延迟 100ms 确保渲染完成
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [currentIndex, currentWord, wordsLoading, feedback])

  // 播放反馈音效（正确/错误）
  const playSound = (type: 'correct' | 'wrong') => {
    if (type === 'correct') {
      playCorrectSound()
    } else {
      playErrorSound()
    }
  }

  // ⭐ 音效系统 - 复用 AudioContext
  const audioContextRef = useRef<AudioContext | null>(null)

  // 组件卸载时关闭 AudioContext
  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(err => {
          console.warn('[Dictation] Failed to close AudioContext:', err)
        })
      }
    }
  }, [])

  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume()
    }
    return audioContextRef.current
  }

  // ⭐ 老式打字机音效 - 多层声音叠加
  const playTypewriterSound = () => {
    try {
      const audioContext = getAudioContext()
      const now = audioContext.currentTime

      // 第一层：敲击声（高频短促）
      const clickOsc = audioContext.createOscillator()
      const clickGain = audioContext.createGain()
      clickOsc.type = 'square'
      clickOsc.frequency.setValueAtTime(1500, now)
      clickOsc.frequency.exponentialRampToValueAtTime(800, now + 0.01)
      clickGain.gain.setValueAtTime(0.15, now)
      clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.02)

      // 第二层：金属回响（中频）
      const metalOsc = audioContext.createOscillator()
      const metalGain = audioContext.createGain()
      metalOsc.type = 'triangle'
      metalOsc.frequency.setValueAtTime(2000, now)
      metalOsc.frequency.exponentialRampToValueAtTime(1200, now + 0.03)
      metalGain.gain.setValueAtTime(0.08, now)
      metalGain.gain.exponentialRampToValueAtTime(0.01, now + 0.04)

      // 第三层：机身震动（低频）
      const bodyOsc = audioContext.createOscillator()
      const bodyGain = audioContext.createGain()
      bodyOsc.type = 'sine'
      bodyOsc.frequency.setValueAtTime(200, now)
      bodyGain.gain.setValueAtTime(0.2, now)
      bodyGain.gain.exponentialRampToValueAtTime(0.01, now + 0.06)

      // 连接节点
      clickOsc.connect(clickGain).connect(audioContext.destination)
      metalOsc.connect(metalGain).connect(audioContext.destination)
      bodyOsc.connect(bodyGain).connect(audioContext.destination)

      // 播放
      clickOsc.start(now)
      clickOsc.stop(now + 0.02)
      metalOsc.start(now + 0.005)
      metalOsc.stop(now + 0.045)
      bodyOsc.start(now)
      bodyOsc.stop(now + 0.06)

    } catch (error) {
      console.error('打字机音效播放失败:', error)
    }
  }

  // ⭐ 错误音效 - 有质感的嗡嗡声
  const playErrorSound = () => {
    try {
      const audioContext = getAudioContext()
      const now = audioContext.currentTime

      // 主振荡器：低频嗡嗡声
      const osc1 = audioContext.createOscillator()
      const gain1 = audioContext.createGain()
      osc1.type = 'sawtooth'
      osc1.frequency.setValueAtTime(150, now)
      osc1.frequency.linearRampToValueAtTime(100, now + 0.3)
      gain1.gain.setValueAtTime(0.2, now)
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3)

      // 调制振荡器：增加粗糙感
      const osc2 = audioContext.createOscillator()
      const gain2 = audioContext.createGain()
      osc2.type = 'square'
      osc2.frequency.setValueAtTime(30, now)
      gain2.gain.setValueAtTime(0.05, now)
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.2)

      // 连接
      osc1.connect(gain1).connect(audioContext.destination)
      osc2.connect(gain2).connect(audioContext.destination)

      // 播放
      osc1.start(now)
      osc1.stop(now + 0.3)
      osc2.start(now)
      osc2.stop(now + 0.2)

    } catch (error) {
      console.error('错误音效播放失败:', error)
    }
  }

  // ⭐ 正确音效 - 清脆的叮声
  const playCorrectSound = () => {
    try {
      const audioContext = getAudioContext()
      const now = audioContext.currentTime

      // 高频正弦波
      const osc = audioContext.createOscillator()
      const gain = audioContext.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(800, now)
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1)
      gain.gain.setValueAtTime(0.15, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15)

      osc.connect(gain).connect(audioContext.destination)
      osc.start(now)
      osc.stop(now + 0.15)

    } catch (error) {
      console.error('正确音效播放失败:', error)
    }
  }

  // 防抖：使用 ref 存储最后播放时间
  const lastPlayTimeRef = useRef(0)

  const playTypewriterSoundThrottled = () => {
    const now = Date.now()
    if (now - lastPlayTimeRef.current > 80) {
      lastPlayTimeRef.current = now
      playTypewriterSound()
    }
  }

  // Tab键提示首字母
  const handleTabKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' && currentWord) {
      e.preventDefault()
      const firstLetter = currentWord.word.charAt(0).toLowerCase()
      setUserInput(prev => prev + firstLetter)
    }
  }

  // 提交答案
  const handleSubmit = async () => {
    if (!currentWord) return

    // 检查是否为空输入
    const isEmptyInput = userInput.trim() === ''
    const isCorrect = !isEmptyInput && userInput.trim().toLowerCase() === currentWord.word.toLowerCase()

    if (isCorrect) {
      setFeedback('correct')
      playSound('correct')

      // ✅ 更新单词状态：答对 → known
      // 使用乐观更新策略：先更新UI，后台静默更新API
      markWord(currentWord.id, 'new', 'known').catch(error => {
        console.warn('[Dictation] 更新单词状态失败:', error)
      })

      // 答对：快速反馈后进入下一个（500ms）
      setTimeout(async () => {
        await handleNext()
      }, 500)
    } else {
      // 空输入或答错都显示错误反馈
      setFeedback('wrong')
      setShowCorrectAnswer(true)
      playSound('wrong')

      // ✅ 只有在有输入的情况下才更新单词状态：答错 → unknown
      // 空输入不更新状态（不算答题）
      if (!isEmptyInput) {
        markWord(currentWord.id, 'new', 'unknown').catch(error => {
          console.warn('[Dictation] 更新单词状态失败:', error)
        })

        if (autoAddToMistakes) {
          console.log('自动加入错题本:', currentWord.word)
        }
      }

      // 答错：显示答案后，用户可以：
      // 1. 立即按回车跳过（输入框保持可用）
      // 2. 点击"下一个"按钮
      // 3. 等待 3 秒后自动切题（给用户足够时间看答案）
      setTimeout(async () => {
        await handleNext()
      }, 3000)
    }
  }

  // 在显示错误答案时，按回车可以立即跳过
  const handleKeyPressInErrorState = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && feedback === 'wrong' && showCorrectAnswer) {
      e.preventDefault()
      handleNext()
    }
  }

  // 下一个单词
  const handleNext = async () => {
    if (!canOperate) {
      console.warn('⚠️ 无法切题：正在保存中或切换中')
      return
    }

    await executeOperation(
      '切题',
      'saving',
      async () => {
        // 计算下一个索引
        const nextIndex = currentIndex + 1

        // 检查是否完成（检查是否到达总数的末尾）
        const isComplete = totalWords > 0 && nextIndex >= totalWords
        const reachedLoadedEnd = nextIndex >= words.length

        if (isComplete) {
          // 真正完成了所有单词
          setShowCompleteDialog(true)
          await saveProgress(currentIndex)
          return
        }

        if (reachedLoadedEnd && hasMore) {
          // 到达已加载的末尾，但还有更多单词
          // 等待懒加载完成，不要前进
          console.log('⏳ [Dictation] At end of loaded words, waiting for lazy load...')
          return
        }

        if (reachedLoadedEnd && !hasMore) {
          // 没有更多单词了，显示完成
          setShowCompleteDialog(true)
          await saveProgress(currentIndex)
          return
        }

        // ⭐ 关键修复：先切换索引，再保存进度（保存的是下一个词的索引）
        setCurrentIndex(nextIndex)
        await saveProgress(nextIndex)

        // 重置所有状态
        setFeedback(null)
        setShowCorrectAnswer(false)
        setUserInput('')
        hasPlayedOnceRef.current = false

        console.log(`📖 切换单词: ${currentIndex} → ${nextIndex}, 总数: ${words.length}`)
      }
    )
  }

  // 切换范围
  const handleScopeChange = async (newScope: DictationScopeType) => {
    if (!canOperate) {
      console.warn('⚠️ 无法切换范围：正在保存中')
      return
    }

    await executeOperation(
      '切换范围',
      'switching',
      async () => {
        await saveProgress(currentIndex)
        setScopeType(newScope)
        setCurrentIndex(0)
        setShowScopeDialog(false)

        // 🔥 重置所有学习状态（确保新 scope 不会受旧状态影响）
        setFeedback(null)
        setUserInput('')
        setShowCorrectAnswer(false)
        setHasSelectedScope(true)
        shouldLoadWordsRef.current = true
      }
    )
  }

  // 重新开始
  const handleRestart = () => {
    setShowCompleteDialog(false)
    setCurrentIndex(0)
    setUserInput('')
    setFeedback(null)
    setShowCorrectAnswer(false)
  }

  // 返回
  const handleBack = () => {
    router.push(`/library/${bookId}`)
  }

  // 返回首页
  const handleHome = () => {
    router.push('/')
  }

  // 加载状态
  if (statsLoading || wordsLoading) {
    return (
      <div className="min-h-screen bg-[#f4f4f5] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-black border-t-[#ccff00] mb-6 mx-auto"></div>
          <p className="text-black font-black text-lg">加载中...</p>
        </div>
      </div>
    )
  }

  // 计算进度（使用真实的总数）
  const progressPercent = totalWords > 0 ? ((currentIndex + 1) / totalWords) * 100 : 0

  return (
    <>
      {/* 最外层容器：响应式背景切换 */}
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 transition-colors duration-300 font-sans py-8" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>

        {/* ================= HEADER ================= */}
        {/* ================= 顶部控制区 (试卷头风格) ================= */}
        <div className="w-full max-w-5xl mx-auto px-6 pt-6">

          {/* 第一行：导航与统计 (两端对齐) */}
          <div className="flex justify-between items-start mb-6">
            {/* 左侧：返回与标题 */}
            <div className="flex items-center gap-4">
              <Link
                href={`/library/${bookId}`}
                className="w-12 h-12 rounded-xl flex items-center justify-center shadow-[4px_4px_0px_0px_#000] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000] transition-all border-2 border-black"
                style={{ backgroundColor: 'var(--card-bg)' }}
              >
                <ArrowLeft size={24} strokeWidth={2.5} style={{ color: 'var(--text-primary)' }} />
              </Link>
              <h1 className="text-2xl font-black italic tracking-tighter hidden sm:block" style={{ color: 'var(--text-primary)' }}>听写练习</h1>
            </div>

            {/* 右侧：统计卡片与退出 */}
            <div className="flex gap-2 items-center">
              {/* Stats Box (4列: 未标注 | 不认识 | 模糊 | 认识) */}
              <div className="flex border-2 border-black rounded-lg overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" style={{ backgroundColor: 'var(--card-bg)' }}>
                <div className="px-3 py-1.5 border-r-2 border-black flex flex-col items-center min-w-[55px]">
                  <span className="text-[9px] font-bold" style={{ color: 'var(--text-tertiary)' }}>未标注</span>
                  <span className="text-lg font-black leading-none" style={{ color: 'var(--text-tertiary)' }}>{stats?.new || 0}</span>
                </div>
                <div className="px-3 py-1.5 border-r-2 border-black flex flex-col items-center min-w-[55px]">
                  <span className="text-[9px] font-bold" style={{ color: 'var(--text-tertiary)' }}>不认识</span>
                  <span className="text-lg font-black text-red-500 leading-none">{stats?.unknown || 0}</span>
                </div>
                <div className="px-3 py-1.5 border-r-2 border-black flex flex-col items-center min-w-[55px]">
                  <span className="text-[9px] font-bold" style={{ color: 'var(--text-tertiary)' }}>模糊</span>
                  <span className="text-lg font-black text-yellow-500 leading-none">{stats?.fuzzy || 0}</span>
                </div>
                <div className="px-3 py-1.5 flex flex-col items-center min-w-[55px]">
                  <span className="text-[9px] font-bold" style={{ color: 'var(--text-tertiary)' }}>认识</span>
                  <span className="text-lg font-black text-green-600 leading-none">{stats?.known || 0}</span>
                </div>
              </div>

              {/* 退出按钮 */}
              <button
                onClick={() => router.push('/')}
                className="w-10 h-10 border-2 border-black rounded-lg flex items-center justify-center transition-colors duration-300"
                style={{ backgroundColor: 'var(--card-bg)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--card-bg)'}
              >
                <X size={20} strokeWidth={2.5} style={{ color: 'var(--text-primary)' }} />
              </button>
            </div>
          </div>

          {/* 第二行：功能设置栏 (工具栏) */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
            {/* 左侧：范围选择器 */}
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setShowScopeDialog(true)}
                className="flex items-center justify-between gap-3 px-4 py-2 border-2 border-black rounded-lg font-bold shadow-[2px_2px_0px_0px_#000] hover:translate-y-[1px] hover:shadow-none transition-all min-w-[140px] transition-colors duration-300"
                style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}
              >
                <span>{DICTATION_SCOPE_LABELS[scopeType]}</span>
                <ChevronDown size={16} />
              </button>
            </div>

            {/* 右侧：功能按钮组 */}
            <div className="flex gap-3">
              <button
                onClick={() => setHideChinese(!hideChinese)}
                className={`flex items-center gap-2 px-4 py-2 border-2 rounded-lg font-bold text-sm transition-all transition-colors duration-300 ${
                  hideChinese
                    ? 'bg-[#ccff00] border-black shadow-[2px_2px_0px_0px_#000]'
                    : 'border-black'
                }`}
                style={hideChinese ? {} : { backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}
                onMouseEnter={(e) => {
                  if (!hideChinese) e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                }}
                onMouseLeave={(e) => {
                  if (!hideChinese) e.currentTarget.style.backgroundColor = 'var(--card-bg)'
                }}
              >
                {hideChinese ? <EyeOff size={16} /> : <Eye size={16} />}
                隐藏中文
              </button>
              <button
                onClick={() => setAutoAddToMistakes(!autoAddToMistakes)}
                className={`flex items-center gap-2 px-4 py-2 border-2 rounded-lg font-bold text-sm transition-all transition-colors duration-300 ${
                  autoAddToMistakes
                    ? 'bg-[#ccff00] border-black shadow-[2px_2px_0px_0px_#000] hover:translate-y-[1px] hover:shadow-none'
                    : 'border-black'
                }`}
                style={autoAddToMistakes ? {} : { backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}
                onMouseEnter={(e) => {
                  if (!autoAddToMistakes) e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                }}
                onMouseLeave={(e) => {
                  if (!autoAddToMistakes) e.currentTarget.style.backgroundColor = 'var(--card-bg)'
                }}
              >
                <PlusSquare size={16} />
                错题入本
              </button>
            </div>
          </div>

          {/* ✨ 注入灵魂：试卷分割虚线 ✨ */}
          <div className="w-full border-b-2 border-dashed mt-4 mb-12" style={{ borderColor: 'var(--border)' }}></div>

        </div>

        {/* ================= MAIN CARD ================= */}
        {currentWord && (
          <div
            data-word={currentWord.word}
            className="w-full max-w-[800px] border-2 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden min-h-[400px] flex flex-col lg:border-none lg:shadow-none lg:rounded-none lg:bg-transparent lg:w-full lg:max-w-full lg:min-h-0 transition-colors duration-300"
            style={{ backgroundColor: 'var(--card-bg)' }}
          >

            {/* Top Progress Bar */}
            <div className="absolute top-0 left-0 w-full h-1.5" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <div className="h-full bg-[#ccff00] transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
            </div>

            {/* ================= 中间核心内容区 ================= */}
            <div className="flex-1 w-full flex flex-col items-center justify-center gap-10 mt-8 p-8 md:p-12">

              {/* 1. 进度胶囊：显示真实进度 */}
              <div className="bg-black text-white px-5 py-1.5 rounded-full text-sm font-bold tracking-widest shadow-[4px_4px_0px_0px_#ccff00]">
                {currentIndex + 1} / {totalWords || words.length}
              </div>

              {/* 2. 单词释义：关键修改！限制最大宽度，增加行高 */}
              {!hideChinese && (
                <div className="w-full max-w-2xl px-4">
                  <h2 className="text-2xl md:text-3xl font-black text-center leading-relaxed break-words" style={{ color: 'var(--text-primary)' }}>
                    {currentWord.definition}
                    {currentWord.example_sentence && (
                      <>
                        <br className="hidden md:block"/>
                        <span className="text-lg font-bold mt-4 block" style={{ color: 'var(--text-secondary)' }}>
                          {currentWord.example_sentence}
                        </span>
                      </>
                    )}
                  </h2>
                </div>
              )}

              {/* 3. 播放器：稍微放大 */}
              <div className="transform scale-110">
                {/* Play Controls */}
                <div className="flex items-center gap-12">
                  <button
                    onClick={handlePrevious}
                    disabled={!canOperate || currentIndex <= 0}
                    className={`transition-colors duration-300 ${
                      !canOperate || currentIndex <= 0
                        ? 'cursor-not-allowed'
                        : ''
                    }`}
                    style={{
                      color: (!canOperate || currentIndex <= 0) ? 'var(--text-tertiary)' : 'var(--text-secondary)'
                    }}
                    onMouseEnter={(e) => {
                      if (canOperate && currentIndex > 0) e.currentTarget.style.color = 'var(--text-primary)'
                    }}
                    onMouseLeave={(e) => {
                      if (canOperate && currentIndex > 0) e.currentTarget.style.color = 'var(--text-secondary)'
                    }}
                  >
                    <SkipBack size={28} strokeWidth={2.5} />
                  </button>

                  <button
                    onClick={isPlaying ? handlePause : playWordAudio}
                    className="w-20 h-20 bg-[#ccff00] border-2 border-black rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[4px] active:shadow-none transition-all"
                  >
                    {isPlaying ? (
                      <Pause size={36} fill="black" className="ml-0" />
                    ) : (
                      <Play size={36} fill="black" className="ml-1" />
                    )}
                  </button>

                  <button
                    onClick={handleNext}
                    disabled={!canOperate}
                    className={`transition-colors duration-300 ${
                      !canOperate
                        ? 'cursor-not-allowed'
                        : ''
                    }`}
                    style={{
                      color: !canOperate ? 'var(--text-tertiary)' : 'var(--text-secondary)'
                    }}
                    onMouseEnter={(e) => {
                      if (canOperate) e.currentTarget.style.color = 'var(--text-primary)'
                    }}
                    onMouseLeave={(e) => {
                      if (canOperate) e.currentTarget.style.color = 'var(--text-secondary)'
                    }}
                  >
                    <SkipForward size={28} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

            </div>

            {/* ================= 沉浸式输入区 v2.0 (宽敞版) ================= */}
            <div className="w-full max-w-4xl mx-auto flex flex-col items-center mt-8 mb-2">

              {/* 1. 输入线：独占一行，没有任何阻挡 */}
              <div className="w-full px-8 relative group">
                  <input
                    ref={inputRef}
                    type="text"
                    value={userInput}
                    onChange={(e) => {
                      setUserInput(e.target.value)
                      // ⭐ 触发打字机音效（只在有新输入且没有反馈时）
                      if (e.target.value && feedback === null) {
                        playTypewriterSoundThrottled()
                      }
                    }}
                    onKeyPress={(e) => {
                      if (feedback === 'wrong' && showCorrectAnswer) {
                        handleKeyPressInErrorState(e)
                      } else if (e.key === 'Enter') {
                        handleSubmit()
                      }
                    }}
                    onKeyDown={handleTabKeyPress}
                    onFocus={handleInputFocus}
                    placeholder="在此书写..."
                    disabled={feedback === 'correct'}
                    className="w-full py-4 text-3xl font-black text-center bg-transparent border-b-4 focus:outline-none transition-all placeholder:font-bold placeholder:text-2xl"
                    style={{ caretColor: '#ccff00', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    onFocus={(e) => e.currentTarget.style.borderColor = 'var(--text-primary)'}
                    onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                    autoFocus
                  />
                  {/* 动态底线动画 */}
                  <div className="absolute bottom-0 left-0 w-0 h-1 bg-black transition-all duration-500 ease-out group-focus-within:w-full group-focus-within:left-0"></div>
                </div>

                {/* 2. 操作区：下移，与书写区分离 */}
                <div className="h-16 mt-6 flex items-center justify-center">
                  {/* 这里的回车键可以做成：只有当用户输入了内容才显示高亮，否则是灰色的 */}
                  <button
                    onClick={handleSubmit}
                    disabled={userInput.trim() === '' || feedback !== null}
                    className={`flex items-center gap-2 px-6 py-3 text-white border-2 border-black rounded-full transition-all ${
                      userInput.trim() === '' || feedback !== null
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-black shadow-[4px_4px_0px_0px_#ccff00] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#ccff00] active:translate-y-[4px] active:shadow-none'
                    }`}
                  >
                    <span className="text-sm font-bold">提交</span>
                    <CornerDownLeft size={18} strokeWidth={3} />
                  </button>
                </div>

              </div>

              {/* Feedback Messages */}
              {feedback === 'correct' && (
                <div className="mt-4 text-center">
                  <p className="text-green-600 font-black text-lg">✓ 正确！</p>
                </div>
              )}

              {feedback === 'wrong' && showCorrectAnswer && (
                <div className="mt-4 text-center">
                  <p className="text-red-600 font-black text-lg mb-2">✗ 拼写错误</p>
                  <p className="font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>
                    正确拼写：<span className="font-black text-xl">{currentWord.word}</span>
                  </p>
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                    💡 按回车立即跳过，或等待 3 秒自动跳过
                  </p>
                </div>
              )}

          </div>
        )}

        {/* ================= FOOTER ================= */}
        <div className="mt-12">
          <div className="px-5 py-2 bg-[#fffbeb] border border-[#fcd34d] text-[#b45309] rounded-lg text-xs font-medium">
            iPad 用户: 请打开「随手写」并切换至当前语种的输入法
          </div>
        </div>

      </div>

      {/* Dialogs */}
      <DictationScopeDialog
        isOpen={showScopeDialog}
        onClose={() => setShowScopeDialog(false)}
        onSelectScope={handleScopeChange}
        scopeOptions={getScopeOptions()}
        loading={statsLoading || resumeLoading}
        recentProgress={recentProgress}
      />

      <DictationCompleteDialog
        isOpen={showCompleteDialog}
        scopeType={scopeType}
        scopeLabel={DICTATION_SCOPE_LABELS[scopeType]}
        completedCount={currentIndex + 1}
        totalCount={words.length}
        onRestart={handleRestart}
        onBack={handleBack}
        onHome={handleHome}
      />

      {/* Page Status Indicator */}
      {!canOperate && (
        <div className="fixed bottom-6 right-6 bg-[#ccff00] border-2 border-black text-black px-6 py-3 rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black">
          正在{pageState === 'saving' ? '保存' : '切换'}...
        </div>
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
          20%, 40%, 60%, 80% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </>
  )
}
