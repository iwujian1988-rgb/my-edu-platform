'use client'

import { BaseCard, CardFrontContent, CardBackContent, CardBadge } from './BaseCard'
import type { Word } from '@/types/word'

/**
 * WordCard Props
 */
export interface WordCardProps {
  /** 单词数据 */
  data: Word
  /** 翻转状态 */
  isFlipped: boolean
  /** 翻转回调 */
  onFlip: () => void
  /** 音频播放回调 */
  onPlayAudio?: () => void
  /** 音频 URL（可选） */
  audioUrl?: string | null
  /** 额外的容器类名 */
  className?: string
}

/**
 * WordCard - 单词卡片组件
 *
 * 用于展示单词学习卡片，包含正面（单词、音标、词性）和背面（释义、例句等）。
 */
export function WordCard({
  data,
  isFlipped,
  onFlip,
  onPlayAudio,
  audioUrl,
  className = '',
}: WordCardProps) {
  // 正面内容
  const frontContent = (
    <CardFrontContent
      title={data.word}
      subtitle={data.phonetic}
      badge={
        data.part_of_speech ? (
          <CardBadge variant="custom">{data.part_of_speech}</CardBadge>
        ) : undefined
      }
    />
  )

  // 背面内容
  const backContent = (
    <CardBackContent
      sections={[
        // 英文释义
        ...(data.definition_en
          ? [{ label: '英文释义', content: data.definition_en }]
          : []),
        // 中文释义
        ...(data.definition
          ? [{ label: '中文释义', content: data.definition }]
          : []),
        // 英文搭配
        ...(data.collocation_en
          ? [{ label: '英文搭配', content: data.collocation_en, className: 'text-sm' }]
          : []),
        // 中文搭配
        ...(data.collocation
          ? [{ label: '搭配', content: data.collocation, className: 'text-sm' }]
          : []),
        // 英文例句
        ...(data.example_sentence_en
          ? [{
              label: '英文例句',
              content: data.example_sentence_en,
              className: 'text-sm bg-gray-100 dark:bg-slate-800 p-3 border-2 border-black rounded'
            }]
          : []),
        // 中文例句
        ...(data.example_sentence
          ? [{ label: '例句', content: data.example_sentence, className: 'text-sm' }]
          : []),
      ]}
    />
  )

  return (
    <BaseCard
      isFlipped={isFlipped}
      onFlip={onFlip}
      frontContent={frontContent}
      backContent={backContent}
      audioUrl={audioUrl}
      onPlayAudio={onPlayAudio}
      className={className}
    />
  )
}

export default WordCard
