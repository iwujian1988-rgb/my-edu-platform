'use client'

import { BaseCard, CardBackContent, CardBadge } from './BaseCard'
import type { Sentence } from '@/types/word'

/**
 * SentenceCard Props
 */
export interface SentenceCardProps {
  /** 句子数据 */
  data: Sentence
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
 * SentenceCard - 句子卡片组件
 *
 * 用于展示例句/常用句型学习卡片。
 * 句子较长，使用适中的字体大小以保证可读性。
 */
export function SentenceCard({
  data,
  isFlipped,
  onFlip,
  onPlayAudio,
  audioUrl,
  className = '',
}: SentenceCardProps) {
  // 正面内容 - 句子使用适中的字体
  const frontContent = (
    <div className="flex flex-col items-center justify-center gap-4 w-full">
      {/* Badge */}
      <CardBadge variant="default">Sentence</CardBadge>

      {/* 句子文本 - 使用适中的字体，保证长句子可读 */}
      <p className="text-xl md:text-2xl font-bold tracking-tight text-center text-gray-900 dark:text-white leading-relaxed px-2">
        {data.sentence}
      </p>

      {/* 音标 */}
      {data.phonetic && (
        <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
          {data.phonetic}
        </span>
      )}
    </div>
  )

  // 背面内容
  const backContent = (
    <CardBackContent
      sections={[
        // 英文翻译
        ...(data.translation_en
          ? [{ label: '英文翻译', content: data.translation_en }]
          : []),
        // 中文翻译
        ...(data.translation
          ? [{ label: '中文翻译', content: data.translation }]
          : []),
        // 来源单词
        ...(data.source_word_id
          ? [{ label: '来源单词 ID', content: data.source_word_id, className: 'text-xs text-gray-500' }]
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
      // 句子卡片高度可以稍大一些
      height={480}
    />
  )
}

export default SentenceCard
