'use client'

import { useState, useEffect } from 'react'
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
}

interface WordListProps {
  initialWords: Word[]
  bookId: string
  globalHideChinese?: boolean
}

export function WordList({ initialWords, bookId, globalHideChinese = false }: WordListProps) {
  const [words, setWords] = useState<Word[]>(initialWords)
  const [isSaving, setIsSaving] = useState(false)

  // 组件加载时获取用户的单词状态
  useEffect(() => {
    async function fetchWordProgress() {
      try {
        const response = await fetch(`/api/word-progress?book_id=${bookId}`)
        if (response.ok) {
          const { data } = await response.json()

          // 更新单词状态
          setWords(prevWords =>
            prevWords.map(word => {
              const progress = data[word.id]
              if (progress) {
                // 映射数据库状态到前端状态
                // 'known' -> 'known'
                // 'vague' -> 'fuzzy'
                // 'unknown' -> 'unknown'
                const statusMap: Record<string, 'known' | 'fuzzy' | 'unknown'> = {
                  'known': 'known',
                  'vague': 'fuzzy',
                  'unknown': 'unknown'
                }
                return {
                  ...word,
                  status: statusMap[progress.status] || 'unknown'
                }
              }
              return word
            })
          )
        }
      } catch (error) {
        console.error('Failed to fetch word progress:', error)
      }
    }

    fetchWordProgress()
  }, [bookId])

  // 处理状态变更并保存到数据库
  const handleStatusChange = async (wordId: string, status: 'known' | 'fuzzy' | 'unknown') => {
    // 乐观更新 UI
    setWords(prevWords =>
      prevWords.map(word =>
        word.id === wordId ? { ...word, status } : word
      )
    )

    // 映射前端状态到数据库状态
    const statusMap: Record<string, 'new' | 'known' | 'vague' | 'unknown'> = {
      'known': 'known',
      'fuzzy': 'vague',
      'unknown': 'unknown'
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/word-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          word_id: wordId,
          book_id: bookId,
          status: statusMap[status]
        })
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Failed to save word progress:', error)

        // 回滚 UI 状态
        setWords(prevWords =>
          prevWords.map(word =>
            word.id === wordId ? { ...word, status: word.status } : word
          )
        )
      } else {
        console.log(`✅ Word ${wordId} status saved: ${status}`)
      }
    } catch (error) {
      console.error('Error saving word progress:', error)

      // 回滚 UI 状态
      setWords(prevWords =>
        prevWords.map(word =>
          word.id === wordId ? { ...word, status: word.status } : word
        )
      )
    } finally {
      setIsSaving(false)
    }
  }

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
