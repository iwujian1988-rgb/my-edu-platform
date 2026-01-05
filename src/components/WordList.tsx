'use client'

import { useState } from 'react'
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
}

export function WordList({ initialWords }: WordListProps) {
  const [words, setWords] = useState<Word[]>(initialWords)

  // 处理状态变更
  const handleStatusChange = (wordId: string, status: 'known' | 'fuzzy' | 'unknown') => {
    setWords(prevWords =>
      prevWords.map(word =>
        word.id === wordId ? { ...word, status } : word
      )
    )

    // TODO: 调用 API 保存到数据库
    console.log(`Word ${wordId} status changed to ${status}`)
  }

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {words.map((word, index) => (
        <WordCard
          key={word.id}
          word={word}
          index={index}
          onStatusChange={handleStatusChange}
        />
      ))}
    </section>
  )
}
