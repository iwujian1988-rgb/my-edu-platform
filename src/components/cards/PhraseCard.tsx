'use client'

import { BaseCard, CardFrontContent, CardBackContent, CardBadge } from './BaseCard'
import type { Phrase } from '@/types/word'

/**
 * PhraseCard Props
 */
export interface PhraseCardProps {
  /** 短语数据 */
  data: Phrase
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
 * PhraseCard - 短语卡片组件
 *
 * 用于展示短语/习语学习卡片，字体大小适中。
 */
export function PhraseCard({
  data,
  isFlipped,
  onFlip,
  onPlayAudio,
  audioUrl,
  className = '',
}: PhraseCardProps) {
  // 正面内容 - 短语使用稍小的字体
  const frontContent = (
    <div className="flex flex-col items-center justify-center gap-4 w-full">
      {/* Badge */}
      <CardBadge variant="default">Phrase</CardBadge>

      {/* 短语文本 - 使用较大但不是超大字体 */}
      <h2 className="text-3xl md:text-4xl font-black tracking-tight text-center text-gray-900 dark:text-white leading-tight">
        {data.phrase}
      </h2>

      {/* 音标 */}
      {data.phonetic && (
        <span className="font-mono text-base text-gray-600 dark:text-gray-400">
          {data.phonetic}
        </span>
      )}
    </div>
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

export default PhraseCard
