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
 * @param userId - 用户 ID（用于草稿保存）
 * @param articleId - 文章 ID
 */
export function useSpeakerDictationV2(
  sentences: SpeakerSentence[],
  audioUrl: string,
  userId: string,
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
  // 2. 初始化音频元素
  // ========================================
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl)
      audioRef.current.playbackRate = playbackRate  // 应用初始语速

      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false)
        setCurrentPlayingSentence(null)
      })
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.removeEventListener('ended', () => {})
      }
    }
  }, [audioUrl, playbackRate])  // 添加 playbackRate 依赖

  // ========================================
  // 3. 播放单个句子（强制停止在句子结束点）
  // ========================================
  const playSentence = useCallback((sentenceIndex: number) => {
    const sentence = sentences[sentenceIndex]
    if (!sentence || !audioRef.current) return

    const audio = audioRef.current

    // 如果点击的是当前正在播放的句子 → 暂停
    if (currentPlayingSentence === sentenceIndex && isPlaying) {
      console.log('[Dictation] 暂停句子:', sentenceIndex)
      audio.pause()
      setIsPlaying(false)
      setCurrentPlayingSentence(null)
      return
    }

    console.log('[Dictation] 播放句子:', {
      index: sentenceIndex,
      text: sentence.text_en?.substring(0, 50),
      start_time: sentence.start_time,
      end_time: sentence.end_time
    })

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

    console.log('[Dictation] 从头播放句子:', sentenceIndex)

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
  // 8. 双栏同步滚动（联动逻辑）
  // ========================================
  const setActiveSentence = useCallback((sentenceIndex: number) => {
    setActiveSentenceIndex(sentenceIndex)

    // 右栏：自动聚焦到该句子的第一个单词输入框
    setWordInputs(prev => {
      const newInputs = [...prev]
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

    // 判分（数据准备好，由组件调用 API 提交）
    console.log('[Dictation] 提交判分', { allUserInputs, allCorrectWords })

    setIsSubmitted(true)
  }, [sentences, wordInputs])

  // ========================================
  // 10. 草稿自动保存（debounce）
  // ========================================
  const saveDraftTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const saveDraft = useCallback(async () => {
    try {
      const response = await fetch('/api/speaker/draft', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId,
          userId,
          draft: {
            wordInputs,
            activeSentenceIndex,
            skippedWords: wordInputs.flat().map((w, i) => w.isSkipped ? i : -1).filter(i => i >= 0),
            savedAt: new Date().toISOString()
          }
        })
      })

      if (response.ok) {
        console.log('[Dictation] 草稿保存成功')
      }
    } catch (error) {
      console.error('[Dictation] 保存草稿失败:', error)
    }
  }, [articleId, userId, wordInputs, activeSentenceIndex])

  const saveDraftDebounced = useCallback(() => {
    if (saveDraftTimeoutRef.current) {
      clearTimeout(saveDraftTimeoutRef.current)
    }

    saveDraftTimeoutRef.current = setTimeout(() => {
      saveDraft()
    }, 1000) // 1秒 debounce
  }, [saveDraft])

  // ========================================
  // 11. 恢复草稿（用于断点续传）
  // ========================================
  const restoreDraft = useCallback(async (draft: any) => {
    console.log('[Dictation Hook] 开始恢复草稿:', draft)

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
      }

      console.log('[Dictation Hook] ✅ 草稿恢复成功')
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
    submitDictation,
    restoreDraft,
    setPlaybackRate,
    playbackRate
  }

  return [state, actions] as const
}

/**
 * 类型守卫：导出类型供组件使用
 */
export type { DictationState, WordInputState, SentenceMaskState }
