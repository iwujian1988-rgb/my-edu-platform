'use client'

import { WordCard } from './WordCard'
import { PhraseCard } from './PhraseCard'
import { SentenceCard } from './SentenceCard'
import type { CardContent, Word, Phrase, Sentence } from '@/types/word'
import { isWord, isPhrase, isSentence } from '@/types/word'

/**
 * CardFactory Props
 */
export interface CardFactoryProps {
  /** 卡片内容数据 */
  data: CardContent
  /** 翻转状态 */
  isFlipped: boolean
  /** 翻转回调 */
  onFlip: () => void
  /** 音频播放回调 */
  onPlayAudio?: () => void
  /** 音频 URL */
  audioUrl?: string | null
  /** 额外的容器类名 */
  className?: string
}

/**
 * CardFactory - 卡片工厂组件
 *
 * 根据 data.type 自动选择并渲染对应的卡片组件：
 * - 'word' → WordCard
 * - 'phrase' → PhraseCard
 * - 'sentence' → SentenceCard
 *
 * @example
 * ```tsx
 * <CardFactory
 *   data={content}
 *   isFlipped={flipped}
 *   onFlip={() => setFlipped(!flipped)}
 *   onPlayAudio={() => play(content)}
 * />
 * ```
 */
export function CardFactory({
  data,
  isFlipped,
  onFlip,
  onPlayAudio,
  audioUrl,
  className,
}: CardFactoryProps) {
  // 单词卡片
  if (isWord(data)) {
    return (
      <WordCard
        data={data}
        isFlipped={isFlipped}
        onFlip={onFlip}
        onPlayAudio={onPlayAudio}
        audioUrl={audioUrl}
        className={className}
      />
    )
  }

  // 短语卡片
  if (isPhrase(data)) {
    return (
      <PhraseCard
        data={data}
        isFlipped={isFlipped}
        onFlip={onFlip}
        onPlayAudio={onPlayAudio}
        audioUrl={audioUrl}
        className={className}
      />
    )
  }

  // 句子卡片
  if (isSentence(data)) {
    return (
      <SentenceCard
        data={data}
        isFlipped={isFlipped}
        onFlip={onFlip}
        onPlayAudio={onPlayAudio}
        audioUrl={audioUrl}
        className={className}
      />
    )
  }

  // 未知类型 - 显示错误
  return (
    <div className="p-4 border-2 border-red-500 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
      未知卡片类型
    </div>
  )
}

export default CardFactory
