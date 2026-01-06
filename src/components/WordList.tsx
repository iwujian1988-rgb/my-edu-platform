'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { WordCard } from './WordCard'

interface Word {
  id: string
  word: string
  phonetic: string
  definition: string
  definition_en: string
  collocation: string
  collocation_en: string
  example_sentence: string
  example_sentence_en: string
  part_of_speech: string
  status: 'known' | 'fuzzy' | 'unknown'
  theme?: string
  scene?: string
}

interface WordListProps {
  initialWords: Word[]
  bookId: string
  globalHideChinese?: boolean
}

export function WordList({ initialWords, bookId, globalHideChinese = false }: WordListProps) {
  // 组件初始化时立即从 localStorage 读取状态
  const getInitialState = () => {
    if (typeof window === 'undefined') {
      return initialWords
    }

    const localKey = `word-progress-${bookId}`
    const localData = localStorage.getItem(localKey)

    if (!localData) {
      return initialWords
    }

    try {
      const statusMap = JSON.parse(localData)
      return initialWords.map(word => ({
        ...word,
        status: statusMap[word.id] || word.status
      }))
    } catch (error) {
      console.error('Failed to parse localStorage data:', error)
      return initialWords
    }
  }

  const [words, setWords] = useState<Word[]>(initialWords)
  const [wordProgress, setWordProgress] = useState<Record<string, 'known' | 'fuzzy' | 'unknown'>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // 使用 ref 避免循环更新
  const isUpdatingRef = useRef(false)
  const updatingWordRef = useRef<string | null>(null)

  // 当 initialWords 变化（筛选/排序）时，更新 words 但保留已标记的状态
  useEffect(() => {
    // 从 localStorage 重新读取状态
    if (typeof window !== 'undefined') {
      const localKey = `word-progress-${bookId}`
      const localData = localStorage.getItem(localKey)
      const statusMap = localData ? JSON.parse(localData) : {}

      setWords(initialWords.map(word => ({
        ...word,
        status: statusMap[word.id] || word.status
      })))
      setInitialized(true)
    } else {
      setWords(initialWords)
    }
  }, [initialWords, bookId])

  // 组件加载时从 localStorage 恢复状态（优先级最高）
  useEffect(() => {
    if (initialized || typeof window === 'undefined') return

    const localKey = `word-progress-${bookId}`
    const localData = localStorage.getItem(localKey)

    if (localData) {
      try {
        const statusMap = JSON.parse(localData)
        console.log('🔄 [Init] Restoring from localStorage:', statusMap)

        setWords(prevWords => prevWords.map(word => ({
          ...word,
          status: statusMap[word.id] || word.status
        })))
      } catch (error) {
        console.error('Failed to restore from localStorage:', error)
      }
    }

    setInitialized(true)
  }, [bookId, initialized])

  // 组件加载时获取用户的单词状态（仅用于真实数据库数据）
  useEffect(() => {
    async function fetchWordProgress() {
      try {
        const response = await fetch(`/api/word-progress?book_id=${bookId}`)
        if (response.ok) {
          const { data } = await response.json()

          // 构建单词状态映射
          const statusMap: Record<string, 'known' | 'fuzzy' | 'unknown'> = {}
          const dbStatusMap: Record<string, 'known' | 'fuzzy' | 'unknown'> = {
            'known': 'known',
            'vague': 'fuzzy',
            'unknown': 'unknown'
          }

          Object.entries(data).forEach(([wordId, progress]: [string, any]) => {
            statusMap[wordId] = dbStatusMap[progress.status] || 'unknown'
          })

          setWordProgress(statusMap)

          // 更新单词状态（数据库状态优先）
          setWords(prevWords =>
            prevWords.map(word => ({
              ...word,
              status: statusMap[word.id] || word.status
            }))
          )
        }
        // 401 或其他错误时，localStorage 已经在初始化时读取了，不需要额外处理
      } catch (error) {
        console.error('Failed to fetch word progress:', error)
      }
    }

    fetchWordProgress()
  }, [bookId])

  // 处理状态变更并保存
  const handleStatusChange = useCallback(async (wordId: string, status: 'known' | 'fuzzy' | 'unknown') => {
    // 立即保存到 localStorage
    const localKey = `word-progress-${bookId}`
    const localData = localStorage.getItem(localKey) || '{}'
    const statusMap = JSON.parse(localData)
    statusMap[wordId] = status
    localStorage.setItem(localKey, JSON.stringify(statusMap))

    // 直接更新状态
    setWords(prevWords => prevWords.map(w =>
      w.id === wordId ? { ...w, status } : w
    ))
  }, [bookId])

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {words.map((word, index) => (
        <WordCard
          key={word.id}
          word={word}
          index={index}
          onStatusChange={handleStatusChange}
          isSaving={isSaving}
          globalHideChinese={globalHideChinese}
        />
      ))}
    </section>
  )
}
