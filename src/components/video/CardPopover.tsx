'use client'

/**
 * 卡片弹窗组件 - 纯展示版本
 *
 * 功能：
 * - 展示单词/短语/地道表达的详细信息
 * - 移动端友好
 * - 纯展示，无交互按钮
 */

import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import type {
  VideoCard,
  VideoWordCard,
  VideoPhraseCard,
  VideoExpressionCard,
  CardType,
  CardStatus,
  VideoLanguage,
} from '@/types/video'

interface CardPopoverProps {
  card: VideoCard
  cardType: CardType
  videoLanguage: VideoLanguage
  onClose: () => void
  position?: { x: number; y: number } | null
}

// 类型标签配置
const TYPE_CONFIG: Record<CardType, { label: string; color: string }> = {
  word: { label: '单词', color: 'bg-blue-100 text-blue-700' },
  phrase: { label: '短语', color: 'bg-green-100 text-green-700' },
  expression: { label: '地道表达', color: 'bg-purple-100 text-purple-700' },
}

export function CardPopover({
  card,
  cardType,
  videoLanguage,
  onClose,
  position,
}: CardPopoverProps) {
  const typeConfig = TYPE_CONFIG[cardType]

  // 获取卡片文本
  const getText = () => {
    if (cardType === 'word') return (card as VideoWordCard).word
    if (cardType === 'phrase') return (card as VideoPhraseCard).phrase
    if (cardType === 'expression') return (card as VideoExpressionCard).expression
    return ''
  }

  // 渲染单词内容
  const renderWordContent = (c: VideoWordCard) => (
    <div className="space-y-2">
      {/* 音标和词性 */}
      <div className="flex items-center gap-2 flex-wrap">
        {c.phonetic && (
          <span className="text-sm text-gray-500 font-mono">[{c.phonetic}]</span>
        )}
        {c.part_of_speech && (
          <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
            {c.part_of_speech}
          </span>
        )}
      </div>

      {/* 释义 */}
      <p className="font-medium">{c.chinese_definition}</p>

      {/* 视频例句 */}
      {c.example_from_video && (
        <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-sm">
          <p>{c.example_from_video}</p>
          {c.example_translation && (
            <p className="text-gray-500 mt-1">{c.example_translation}</p>
          )}
        </div>
      )}
    </div>
  )

  // 渲染短语内容
  const renderPhraseContent = (c: VideoPhraseCard) => (
    <div className="space-y-2">
      {/* 音标 */}
      {c.phonetic && (
        <span className="text-sm text-gray-500 font-mono">[{c.phonetic}]</span>
      )}

      {/* 释义 */}
      <p className="font-medium">{c.chinese_definition}</p>

      {/* 同义词 */}
      {c.synonyms && (
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs text-gray-400">同义：</span>
          {c.synonyms.split(',').map((syn, i) => (
            <span key={i} className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
              {syn.trim()}
            </span>
          ))}
        </div>
      )}

      {/* 语境 */}
      {c.context && (
        <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-sm">
          <p>{c.context}</p>
          {c.context_translation && (
            <p className="text-gray-500 mt-1">{c.context_translation}</p>
          )}
        </div>
      )}
    </div>
  )

  // 渲染地道表达内容
  const renderExpressionContent = (c: VideoExpressionCard) => (
    <div className="space-y-2">
      {/* 语境 */}
      {c.context && (
        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded text-sm">
          <p>{c.context}</p>
          {c.context_translation && (
            <p className="text-gray-500 mt-1">{c.context_translation}</p>
          )}
        </div>
      )}

      {/* 用法说明 / 语法公式 */}
      {c.formula && (
        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
          <span className="text-xs text-blue-600 dark:text-blue-400">用法说明：</span>
          <p className="font-medium mt-0.5">{c.formula}</p>
        </div>
      )}

      {/* 含义 */}
      {c.meaning && (
        <div>
          <span className="text-xs text-gray-400">核心含义</span>
          <p className="mt-0.5">{c.meaning}</p>
        </div>
      )}

      {/* 使用说明 */}
      {c.usage_note && (
        <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-sm">
          <span className="text-xs text-amber-600 dark:text-amber-400">使用说明：</span>
          <p className="mt-0.5">{c.usage_note}</p>
        </div>
      )}

      {/* 例句 */}
      {c.examples && c.examples.length > 0 && (
        <div>
          <span className="text-xs text-gray-400">举一反三</span>
          <div className="mt-1 space-y-1">
            {c.examples.slice(0, 2).map((ex, i) => (
              <div key={i} className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-sm">
                <p>{ex.original}</p>
                {ex.cn && <p className="text-gray-500 mt-0.5">{ex.cn}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  // 计算弹层位置
  const getPopoverStyle = () => {
    if (!position) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    }

    const popoverWidth = 320
    const popoverHeight = 300
    const padding = 16

    let left = position.x
    let top = position.y + 10 // 点击位置下方

    // 确保不超出右边界
    if (left + popoverWidth + padding > window.innerWidth) {
      left = window.innerWidth - popoverWidth - padding
    }

    // 确保不超出底部
    if (top + popoverHeight + padding > window.innerHeight) {
      top = position.y - popoverHeight - 10 // 改为点击位置上方
    }

    // 确保不超出左边界
    if (left < padding) {
      left = padding
    }

    return { top: `${top}px`, left: `${left}px` }
  }

  return (
    <>
      {/* 透明点击层 - 点击任意位置关闭 */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* 弹层 - 定位在点击位置 */}
      <div
        className={cn(
          "fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl w-80 overflow-hidden",
          "border-2 border-black dark:border-gray-600"
        )}
        style={getPopoverStyle()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-3 py-2 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <span className={cn("text-xs font-medium px-2 py-0.5 rounded", typeConfig.color)}>
            {typeConfig.label}
          </span>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-3 max-h-[50vh] overflow-y-auto">
          {/* 标题 */}
          <h3 className="text-lg font-bold mb-2">{getText()}</h3>

          {/* 根据类型渲染内容 */}
          {cardType === 'word' && renderWordContent(card as VideoWordCard)}
          {cardType === 'phrase' && renderPhraseContent(card as VideoPhraseCard)}
          {cardType === 'expression' && renderExpressionContent(card as VideoExpressionCard)}
        </div>
      </div>
    </>
  )
}
