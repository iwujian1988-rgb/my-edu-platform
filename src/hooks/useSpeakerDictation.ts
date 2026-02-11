/**
 * 演说家模块 - Step 2 听写状态管理 Hook
 *
 * 参考：
 * - AI_DEVELOPMENT_GUIDE.md 第 4.2 节（状态管理）
 * - shangwenjie.md 第 2.4 节（听写交互流程）
 */

'use client'

import { useState, useCallback, useRef } from 'react'
import type { SpeakerSentence } from '@/types/speaker'
import {
  parseSentenceWords,
  generateDictationMask,
  validateWordInput,
  isSentenceComplete,
  calculateAccuracy,
  getEncouragementMessage,
  type WordMask,
  type WordFillResult
} from '@/lib/speaker-utils'

/**
 * 听写状态
 */
export interface DictationState {
  currentSentenceIndex: number
  currentWords: WordMask[]
  isPlaying: boolean
  isCompleted: boolean
  accuracy: number
  fillResults: WordFillResult[]
  encouragement: string
}

/**
 * 听写操作
 */
export interface DictationActions {
  playCurrentSentence: () => void
  pauseAudio: () => void
  handleWordFill: (wordIndex: number, userInput: string) => void
  revealWord: (wordIndex: number) => void
  nextSentence: () => void
  previousSentence: () => void
  resetCurrentSentence: () => void
}

/**
 * 使用听写训练 Hook
 *
 * @param sentences - 句子数组
 * @param level - 难度等级
 * @param audioUrl - 音频URL
 * @returns [状态, 操作]
 */
export function useSpeakerDictation(
  sentences: SpeakerSentence[],
  level: 2 | 3,
  audioUrl: string
): [DictationState, DictationActions] {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 当前句子索引
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0)

  // 当前句子的单词掩码状态
  const [currentWords, setCurrentWords] = useState<WordMask[]>([])

  // 播放状态
  const [isPlaying, setIsPlaying] = useState(false)

  // 完成状态
  const [isCompleted, setIsCompleted] = useState(false)

  // 填空结果
  const [fillResults, setFillResults] = useState<WordFillResult[]>([])

  // 准确率
  const [accuracy, setAccuracy] = useState(0)

  // 鼓励语句
  const [encouragement, setEncouragement] = useState('')

  // 初始化音频元素
  const initializeAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl)
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false)
      })
    }
  }, [audioUrl])

  /**
   * 播放当前句子
   */
  const playCurrentSentence = useCallback(() => {
    const sentence = sentences[currentSentenceIndex]
    if (!sentence) return

    initializeAudio()

    const audio = audioRef.current
    if (!audio) return

    // 跳转到当前句子的开始时间
    audio.currentTime = sentence.start_time
    audio.play()
    setIsPlaying(true)

    // 设置定时器在句子结束时停止
    const duration = sentence.end_time - sentence.start_time
    setTimeout(() => {
      audio.pause()
      setIsPlaying(false)
    }, duration * 1000 + 200) // 多给200ms缓冲
  }, [currentSentenceIndex, sentences, initializeAudio])

  /**
   * 暂停音频
   */
  const pauseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }, [])

  /**
   * 处理单词填空
   */
  const handleWordFill = useCallback((wordIndex: number, userInput: string) => {
    const word = currentWords[wordIndex]
    if (!word || !word.isMasked) return

    const result = validateWordInput(userInput, word.word)

    // 更新单词状态（如果正确，则显示）
    const newWords = [...currentWords]
    if (result.isCorrect) {
      newWords[wordIndex] = {
        ...word,
        isRevealed: true
      }
    }

    setCurrentWords(newWords)

    // 记录填空结果
    setFillResults(prev => [...prev, result])

    // 检查是否完成所有填空
    if (isSentenceComplete(newWords)) {
      const newAccuracy = calculateAccuracy([...fillResults, result])
      setAccuracy(newAccuracy)
      setEncouragement(getEncouragementMessage(newAccuracy))
      setIsCompleted(true)
    }
  }, [currentWords, fillResults])

  /**
   * 提示单词（用户请求提示）
   */
  const revealWord = useCallback((wordIndex: number) => {
    const newWords = [...currentWords]
    newWords[wordIndex] = {
      ...newWords[wordIndex],
      isRevealed: true
    }
    setCurrentWords(newWords)

    // 检查是否完成
    if (isSentenceComplete(newWords)) {
      const newAccuracy = calculateAccuracy(fillResults)
      setAccuracy(newAccuracy)
      setEncouragement(getEncouragementMessage(newAccuracy))
      setIsCompleted(true)
    }
  }, [currentWords, fillResults])

  /**
   * 下一句
   */
  const nextSentence = useCallback(() => {
    if (currentSentenceIndex < sentences.length - 1) {
      const nextIndex = currentSentenceIndex + 1
      setCurrentSentenceIndex(nextIndex)

      // 解析并掩码新句子
      const sentence = sentences[nextIndex]
      const words = parseSentenceWords(sentence.text_en)
      const maskedWords = generateDictationMask(words, level)
      setCurrentWords(maskedWords)

      // 重置状态
      setIsCompleted(false)
      setFillResults([])
      setAccuracy(0)
      setEncouragement('')
    }
  }, [currentSentenceIndex, sentences, level])

  /**
   * 上一句
   */
  const previousSentence = useCallback(() => {
    if (currentSentenceIndex > 0) {
      const prevIndex = currentSentenceIndex - 1
      setCurrentSentenceIndex(prevIndex)

      // 解析并掩码新句子
      const sentence = sentences[prevIndex]
      const words = parseSentenceWords(sentence.text_en)
      const maskedWords = generateDictationMask(words, level)
      setCurrentWords(maskedWords)

      // 重置状态
      setIsCompleted(false)
      setFillResults([])
      setAccuracy(0)
      setEncouragement('')
    }
  }, [currentSentenceIndex, sentences, level])

  /**
   * 重置当前句子
   */
  const resetCurrentSentence = useCallback(() => {
    const sentence = sentences[currentSentenceIndex]
    const words = parseSentenceWords(sentence.text_en)
    const maskedWords = generateDictationMask(words, level)
    setCurrentWords(maskedWords)
    setIsCompleted(false)
    setFillResults([])
    setAccuracy(0)
    setEncouragement('')
  }, [currentSentenceIndex, sentences, level])

  // 初始化第一句
  useState(() => {
    const sentence = sentences[0]
    const words = parseSentenceWords(sentence.text_en)
    const maskedWords = generateDictationMask(words, level)
    setCurrentWords(maskedWords)
  })

  const state: DictationState = {
    currentSentenceIndex,
    currentWords,
    isPlaying,
    isCompleted,
    accuracy,
    fillResults,
    encouragement
  }

  const actions: DictationActions = {
    playCurrentSentence,
    pauseAudio,
    handleWordFill,
    revealWord,
    nextSentence,
    previousSentence,
    resetCurrentSentence
  }

  return [state, actions]
}
