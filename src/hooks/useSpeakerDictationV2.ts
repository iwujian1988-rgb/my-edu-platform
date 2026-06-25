/**
 * Step 2 听写训练 - 状态管理 Hook
 *
 * 严格按照三个文档实现：
 * - shangwenjie.md 第 2.4 节（产品需求）
 * - TECHNICAL_MODIFICATION_PLAN.md 第 3.1 节（技术方案）
 * - AI_DEVELOPMENT_GUIDE.md（开发指南）
 *
 * 核心功能：
 * 1. 左栏遮罩状态管理
 * 2. 右栏输入流状态管理
 * 3. 双栏同步滚动
 * 4. 草稿自动保存
 * 5. 句子级别播放控制
 */

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { SpeakerSentence } from '@/types/speaker'
import { parseSentenceTokens, validateWordInput, gradeSentence } from '@/lib/speaker-utils'

/**
 * 单个单词的输入状态
 */
export interface WordInputState {
  value: string           // 用户输入的单词
  isSkipped: boolean      // 是否被右键放弃
  isFocused: boolean      // 是否当前聚焦
  isCorrect: boolean | null  // 判分结果（null = 未判分）
}
/**
 * 单个句子的遮罩状态
 */
export interface SentenceMaskState {
  sentenceIndex: number
  isHovered: boolean       // PC端：鼠标是否悬停
  isPlayed: boolean        // 是否播放过
}

/**
 * 听写训练总状态
 */
export interface DictationState {
  // 当前激活的句子索引
  activeSentenceIndex: number

  // 全局遮罩开关
  globalMaskEnabled: boolean

  // 左栏：每个句子的遮罩状态
  sentenceMasks: SentenceMaskState[]

  // 右栏：每个句子的输入状态
  // 结构：[句子索引][单词索引] = WordInputState
  wordInputs: WordInputState[][]

  // 音频播放状态
  isPlaying: boolean
  currentPlayingSentence: number | null

  // 是否已提交
  isSubmitted: boolean

  // 判分结果
  gradingResult: any | null
}

/**
 * 使用听写训练 Hook
 *
 * @param sentences - 句子数组
 * @param audioUrl - 音频 URL
 * @param articleId - 文章 ID
 */
export function useSpeakerDictationV2(
  sentences: SpeakerSentence[],
  audioUrl: string,
  articleId: string
) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timeUpdateHandlerRef = useRef<((this: HTMLAudioElement, ev: Event) => any) | null>(null)

  // ========================================
  // 1. 初始化状态
  // ========================================

  // 当前激活的句子索引
  const [activeSentenceIndex, setActiveSentenceIndex] = useState(0)

  // 全局遮罩开关（默认开启）
  const [globalMaskEnabled, setGlobalMaskEnabled] = useState(true)

  // 语速调节
  const [playbackRate, setPlaybackRate] = useState(1.0)

  // 左栏遮罩状态
  const [sentenceMasks, setSentenceMasks] = useState<SentenceMaskState[]>(
    sentences.map((_, index) => ({
      sentenceIndex: index,
      isHovered: false,
      isPlayed: false
    }))
  )

  // 右栏输入流状态
  const [wordInputs, setWordInputs] = useState<WordInputState[][]>(() => {
    // 初始化：为每个句子创建单词输入槽位（排除缩写词）
    return sentences.map(sentence => {
      const tokens = parseSentenceTokens(sentence.text_en)
      return tokens
        .filter(token => token.type === 'word' && !token.skipInput)
        .map(() => ({
          value: '',
          isSkipped: false,
          isFocused: false,
          isCorrect: null
        }))
    })
  })

  // 音频播放状态
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentPlayingSentence, setCurrentPlayingSentence] = useState<number | null>(null)

  // 提交状态
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [gradingResult, setGradingResult] = useState<any>(null)

  // ========================================
  // 2. 初始化音频元素（只在挂载时执行一次）
  // ========================================
  useEffect(() => {
    // 创建 Audio 元素
    audioRef.current = new Audio(audioUrl)
    audioRef.current.playbackRate = playbackRate

    // 定义事件处理函数（使用命名函数以便正确移除）
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentPlayingSentence(null)
    }

    // 添加事件监听器
    audioRef.current.addEventListener('ended', handleEnded)

    // cleanup：组件卸载时清理
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.removeEventListener('ended', handleEnded)
        audioRef.current = null  // 完全释放引用
      }
    }
  }, [])  // 空依赖：只在挂载/卸载时执行

  // 单独处理 audioUrl 变化
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.src = audioUrl
    }
  }, [audioUrl])

  // 单独处理 playbackRate 变化
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate
    }
  }, [playbackRate])

  // ========================================
  // 3. 播放单个句子（强制停止在句子结束点）
  // ========================================
  const playSentence = useCallback((sentenceIndex: number) => {
    const sentence = sentences[sentenceIndex]
    if (!sentence || !audioRef.current) return

    const audio = audioRef.current

    // 如果点击的是当前正在播放的句子 → 暂停
    if (currentPlayingSentence === sentenceIndex && isPlaying) {
      audio.pause()
      setIsPlaying(false)
      setCurrentPlayingSentence(null)
      return
    }

    // 检查时间戳
    const startTime = sentence.start_time ?? 0
    const endTime = sentence.end_time ?? (startTime + 5) // 默认5秒

    // 先移除之前的监听器（如果存在）
    if (timeUpdateHandlerRef.current) {
      audio.removeEventListener('timeupdate', timeUpdateHandlerRef.current)
    }

    // 先停止当前播放（如果正在播放其他句子）
    audio.pause()

    // 跳转到开始时间
    audio.currentTime = startTime

    // 应用语速
    audio.playbackRate = playbackRate

    // 播放
    audio.play().then(() => {
      setIsPlaying(true)
      setCurrentPlayingSentence(sentenceIndex)

      // 标记句子已播放
      setSentenceMasks(prev => prev.map((mask, idx) =>
        idx === sentenceIndex ? { ...mask, isPlayed: true } : mask
      ))
    }).catch(err => {
      console.error('[Dictation] 播放失败:', err)
    })

    // 监听播放进度，到达结束时间时强制暂停
    const handleTimeUpdate = () => {
      if (audio.currentTime >= endTime) {
        audio.pause()
        setIsPlaying(false)
        setCurrentPlayingSentence(null)
        audio.currentTime = startTime // 回到开始位置（方便重播）
        // 移除监听器
        if (timeUpdateHandlerRef.current) {
          audio.removeEventListener('timeupdate', timeUpdateHandlerRef.current)
          timeUpdateHandlerRef.current = null
        }
      }
    }

    // 保存监听器引用
    timeUpdateHandlerRef.current = handleTimeUpdate

    // 持续监听（不使用 once），到达 endTime 后手动移除
    audio.addEventListener('timeupdate', handleTimeUpdate)
  }, [sentences, currentPlayingSentence, isPlaying, playbackRate])

  // ========================================
  // 3-1. 从头播放句子（强制重新开始）
  // ========================================
  const playSentenceFromStart = useCallback((sentenceIndex: number) => {
    const sentence = sentences[sentenceIndex]
    if (!sentence || !audioRef.current) return

    const audio = audioRef.current
    const startTime = sentence.start_time ?? 0
    const endTime = sentence.end_time ?? (startTime + 5)

    // 先移除之前的监听器（如果存在）
    if (timeUpdateHandlerRef.current) {
      audio.removeEventListener('timeupdate', timeUpdateHandlerRef.current)
    }

    // 先停止当前播放
    audio.pause()

    // 跳转到开始时间
    audio.currentTime = startTime

    // 应用语速
    audio.playbackRate = playbackRate

    // 播放
    audio.play().then(() => {
      setIsPlaying(true)
      setCurrentPlayingSentence(sentenceIndex)

      // 标记句子已播放
      setSentenceMasks(prev => prev.map((mask, idx) =>
        idx === sentenceIndex ? { ...mask, isPlayed: true } : mask
      ))
    }).catch(err => {
      console.error('[Dictation] 从头播放失败:', err)
    })

    // 监听播放进度，到达结束时间时强制暂停
    const handleTimeUpdate = () => {
      if (audio.currentTime >= endTime) {
        audio.pause()
        setIsPlaying(false)
        setCurrentPlayingSentence(null)
        audio.currentTime = startTime
        // 移除监听器
        if (timeUpdateHandlerRef.current) {
          audio.removeEventListener('timeupdate', timeUpdateHandlerRef.current)
          timeUpdateHandlerRef.current = null
        }
      }
    }

    // 保存监听器引用
    timeUpdateHandlerRef.current = handleTimeUpdate

    audio.addEventListener('timeupdate', handleTimeUpdate)
  }, [sentences, playbackRate])

  // ========================================
  // 4. 更新单词输入
  // ========================================
  const updateWordInput = useCallback((sentenceIndex: number, wordIndex: number, value: string) => {
    setWordInputs(prev => {
      const newInputs = [...prev]
      newInputs[sentenceIndex][wordIndex] = {
        ...newInputs[sentenceIndex][wordIndex],
        value
      }
      return newInputs
    })

    // 自动保存草稿（debounce）
    saveDraftDebounced()
  }, [])

  // ========================================
  // 5. 空格键跳转到下一个单词
  // ========================================
  const moveToNextWord = useCallback((sentenceIndex: number, wordIndex: number) => {
    setWordInputs(prev => {
      const newInputs = [...prev]
      const sentenceInputs = newInputs[sentenceIndex]

      // 取消当前单词聚焦
      sentenceInputs[wordIndex].isFocused = false

      // 聚焦下一个单词
      if (wordIndex + 1 < sentenceInputs.length) {
        sentenceInputs[wordIndex + 1].isFocused = true
      }

      return newInputs
    })
  }, [])

  // ========================================
  // 6. 右键放弃（标记为 SKIPPED）
  // ========================================
  const skipWord = useCallback((sentenceIndex: number, wordIndex: number) => {
    setWordInputs(prev => {
      const newInputs = [...prev]
      newInputs[sentenceIndex][wordIndex] = {
        ...newInputs[sentenceIndex][wordIndex],
        isSkipped: true,
        value: ''
      }

      // 自动跳到下一个单词
      const sentenceInputs = newInputs[sentenceIndex]
      if (wordIndex + 1 < sentenceInputs.length) {
        sentenceInputs[wordIndex + 1].isFocused = true
      }

      return newInputs
    })

    saveDraftDebounced()
  }, [])

  // ========================================
  // 7. 取消放弃（反悔）
  // ========================================
  const unskipWord = useCallback((sentenceIndex: number, wordIndex: number) => {
    setWordInputs(prev => {
      const newInputs = [...prev]
      newInputs[sentenceIndex][wordIndex] = {
        ...newInputs[sentenceIndex][wordIndex],
        isSkipped: false,
        isFocused: true
      }
      return newInputs
    })

    saveDraftDebounced()
  }, [])

  // ========================================
  // 7-1. 一键清除单个句子（清除该句所有输入）
  // ========================================
  const clearSentence = useCallback((sentenceIndex: number) => {
    setWordInputs(prev => {
      const newInputs = [...prev]
      const sentenceInputs = newInputs[sentenceIndex]
      if (!sentenceInputs) return prev

      // 重置该句子所有单词为初始状态
      newInputs[sentenceIndex] = sentenceInputs.map(() => ({
        value: '',
        isSkipped: false,
        isFocused: false,
        isCorrect: null
      }))

      // 聚焦第一个单词
      if (newInputs[sentenceIndex].length > 0) {
        newInputs[sentenceIndex][0].isFocused = true
      }

      return newInputs
    })

    saveDraftDebounced()
  }, [])

  // ========================================
  // 7-2. 检查句子对错（不进入魔鬼生词本，仅显示结果）
  // ========================================
  const checkSentence = useCallback((sentenceIndex: number) => {
    const sentence = sentences[sentenceIndex]
    if (!sentence) return { correct: 0, wrong: 0, skipped: 0 }

    const tokens = parseSentenceTokens(sentence.text_en)
    const correctWords = tokens
      .filter(t => t.type === 'word' && !t.skipInput)
      .map(t => t.text)

    const sentenceInputs = wordInputs[sentenceIndex]
    if (!sentenceInputs) return { correct: 0, wrong: 0, skipped: 0 }

    let correct = 0
    let wrong = 0
    let skipped = 0

    // 更新每个单词的判分状态
    setWordInputs(prev => {
      const newInputs = [...prev]
      const currentSentenceInputs = [...newInputs[sentenceIndex]]

      currentSentenceInputs.forEach((input, idx) => {
        if (input.isSkipped) {
          skipped++
          return { ...input, isCorrect: false }
        }

        const userValue = input.value.trim().toLowerCase()
        const correctWord = correctWords[idx]?.toLowerCase() || ''

        if (!userValue) {
          wrong++
          return { ...input, isCorrect: false }
        }

        if (userValue === correctWord) {
          correct++
          return { ...input, isCorrect: true }
        } else {
          wrong++
          return { ...input, isCorrect: false }
        }
      })

      newInputs[sentenceIndex] = currentSentenceInputs
      return newInputs
    })

    return { correct, wrong, skipped }
  }, [sentences, wordInputs])

  // ========================================
  // 8. 双栏同步滚动（联动逻辑）
  // ========================================
  const setActiveSentence = useCallback((sentenceIndex: number) => {
    setActiveSentenceIndex(sentenceIndex)

    // 右栏：自动聚焦到该句子的第一个单词输入框
    setWordInputs(prev => {
      // 边界检查：确保句子索引有效且该句子有单词
      if (sentenceIndex < 0 || sentenceIndex >= prev.length) {
        return prev
      }

      const sentenceInputs = prev[sentenceIndex]
      if (!sentenceInputs || sentenceInputs.length === 0) {
        return prev
      }

      const newInputs = [...prev]
      newInputs[sentenceIndex] = [...sentenceInputs]
      newInputs[sentenceIndex][0].isFocused = true
      return newInputs
    })
  }, [])

  // ========================================
  // 9. 提交判分
  // ========================================
  const submitDictation = useCallback(async () => {
    // 收集所有单词输入
    const allUserInputs: Array<string | null>[] = []
    const allCorrectWords: string[][] = []

    sentences.forEach((sentence, sentenceIndex) => {
      const tokens = parseSentenceTokens(sentence.text_en)
      const wordTokens = tokens.filter(t => t.type === 'word')

      const userInputs = wordInputs[sentenceIndex].map(input => {
        if (input.isSkipped) return null
        return input.value || null
      })

      const correctWords = wordTokens.map(t => t.text)

      allUserInputs.push(userInputs)
      allCorrectWords.push(correctWords)
    })

    setIsSubmitted(true)
  }, [sentences, wordInputs])

  // ========================================
  // 10. 草稿自动保存（debounce）
  // ========================================
  const saveDraftTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 使用 ref 保存最新数据，解决闭包问题
  const latestDataRef = useRef({ articleId, wordInputs, activeSentenceIndex })

  // 更新 ref（每次状态变化时）
  useEffect(() => {
    latestDataRef.current = { articleId, wordInputs, activeSentenceIndex }
  }, [articleId, wordInputs, activeSentenceIndex])

  const saveDraft = useCallback(async () => {
    // 使用 ref 中的最新数据
    const { articleId, wordInputs, activeSentenceIndex } = latestDataRef.current

    try {
      const response = await fetch('/api/speaker/draft', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId,
          draft: {
            wordInputs,
            activeSentenceIndex,
            skippedWords: wordInputs.flat().map((w, i) => w.isSkipped ? i : -1).filter(i => i >= 0),
            savedAt: new Date().toISOString()
          }
        })
      })

      if (!response.ok) {
        console.error('[Dictation Hook] ❌ 草稿自动保存失败:', response.status)
      }
    } catch (error) {
      console.error('[Dictation Hook] ❌ 保存草稿异常:', error)
    }
  }, []) // 空依赖，使用 ref 获取最新数据

  const saveDraftDebounced = useCallback(() => {
    if (saveDraftTimeoutRef.current) {
      clearTimeout(saveDraftTimeoutRef.current)
    }

    saveDraftTimeoutRef.current = setTimeout(() => {
      saveDraft()
    }, 1000) // 1秒 debounce
  }, [saveDraft])

  // 组件卸载时强制保存草稿（使用 keepalive 确保请求完成）
  // 使用 ref 保存最新数据，避免每次状态变化都触发保存
  const draftDataRef = useRef({ articleId, wordInputs, activeSentenceIndex })

  // 更新 ref
  useEffect(() => {
    draftDataRef.current = { articleId, wordInputs, activeSentenceIndex }
  }, [articleId, wordInputs, activeSentenceIndex])

  // 组件卸载时保存
  useEffect(() => {
    return () => {
      // 清除 debounce timer
      if (saveDraftTimeoutRef.current) {
        clearTimeout(saveDraftTimeoutRef.current)
      }

      // 使用 ref 中的最新数据
      const { articleId, wordInputs, activeSentenceIndex } = draftDataRef.current

      const draftData = {
        articleId,
        draft: {
          wordInputs,
          activeSentenceIndex,
          skippedWords: wordInputs.flat().map((w, i) => w.isSkipped ? i : -1).filter(i => i >= 0),
          savedAt: new Date().toISOString()
        }
      }

      // 使用 fetch keepalive 在组件卸载时保存草稿
      fetch('/api/speaker/draft', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftData),
        keepalive: true
      }).catch(err => {
        console.warn('[Dictation] 组件卸载时保存草稿失败:', err)
      })
    }
  }, [])  // 空依赖：只在组件真正卸载时执行

  // ========================================
  // 11. 恢复草稿（用于断点续传）
  // ========================================
  const restoreDraft = useCallback(async (draft: any) => {
    if (!draft) {
      console.warn('[Dictation Hook] 草稿数据为空，跳过恢复')
      return
    }

    try {
      // 恢复 activeSentenceIndex
      if (draft.activeSentenceIndex !== undefined) {
        setActiveSentenceIndex(draft.activeSentenceIndex)
      }

      // 恢复 wordInputs
      if (draft.wordInputs && Array.isArray(draft.wordInputs)) {
        setWordInputs(draft.wordInputs)
      } else {
        console.warn('[Dictation Hook] wordInputs 数据无效:', draft.wordInputs)
      }

    } catch (error) {
      console.error('[Dictation Hook] ❌ 恢复草稿失败:', error)
    }
  }, [])

  // ========================================
  // 返回状态和操作
  // ========================================
  const state: DictationState = {
    activeSentenceIndex,
    globalMaskEnabled,
    sentenceMasks,
    wordInputs,
    isPlaying,
    currentPlayingSentence,
    isSubmitted,
    gradingResult
  }

  const actions = {
    setActiveSentence,
    setGlobalMaskEnabled,
    playSentence,
    playSentenceFromStart,
    updateWordInput,
    moveToNextWord,
    skipWord,
    unskipWord,
    clearSentence,
    checkSentence,
    submitDictation,
    restoreDraft,
    setPlaybackRate,
    playbackRate,
    simulatePlaySentence: (sentenceIndex: number | null) => {
      setCurrentPlayingSentence(sentenceIndex)
    }
  }

  return [state, actions] as const
}
