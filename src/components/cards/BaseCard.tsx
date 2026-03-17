'use client'

import { ReactNode, useCallback, useRef, useState } from 'react'
import { Volume2, ArrowDown } from 'lucide-react'

/**
 * BaseCard Props
 * 基础卡片组件，作为所有学习卡片（单词/短语/句子）的容器
 */
export interface BaseCardProps {
  /** 翻转状态 */
  isFlipped: boolean
  /** 翻转回调 */
  onFlip: () => void
  /** 正面内容 */
  frontContent: ReactNode
  /** 背面内容 */
  backContent: ReactNode
  /** 音频 URL（可选，用于播放音频） */
  audioUrl?: string
  /** 音频播放回调（可选） */
  onPlayAudio?: () => void
  /** 播放按钮是否显示在正面（默认 true） */
  showPlayButton?: boolean
  /** 卡片宽度（默认 340px） */
  width?: number | string
  /** 卡片高度（默认 440px） */
  height?: number | string
  /** 额外的容器类名 */
  className?: string
  /** 是否禁用翻转（默认 false） */
  disableFlip?: boolean
  /** 翻转提示文字（默认 "Tap to Flip"） */
  flipHint?: string
  /** 是否显示翻转提示（默认 true） */
  showFlipHint?: boolean
}

/**
 * BaseCard - 基础卡片组件
 *
 * 提供翻转动画和正反面布局，作为所有学习卡片的容器。
 * 样式采用 Neo-Brutalism 风格（粗边框、偏移阴影）。
 *
 * @example
 * ```tsx
 * <BaseCard
 *   isFlipped={flipped}
 *   onFlip={() => setFlipped(!flipped)}
 *   frontContent={<div>正面内容</div>}
 *   backContent={<div>背面内容</div>}
 *   audioUrl="https://..."
 *   onPlayAudio={() => play('hello')}
 * />
 * ```
 */
export function BaseCard({
  isFlipped,
  onFlip,
  frontContent,
  backContent,
  audioUrl,
  onPlayAudio,
  showPlayButton = true,
  width = 340,
  height = 440,
  className = '',
  disableFlip = false,
  flipHint = 'Tap to Flip',
  showFlipHint = true,
}: BaseCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  // 处理卡片点击（翻转）
  const handleClick = useCallback(() => {
    if (!disableFlip) {
      onFlip()
    }
  }, [disableFlip, onFlip])

  // 处理播放按钮点击
  const handlePlayClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onPlayAudio?.()
  }, [onPlayAudio])

  // 标准化尺寸
  const cardWidth = typeof width === 'number' ? `${width}px` : width
  const cardHeight = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      ref={cardRef}
      className={`
        rounded flex flex-col p-6 text-center cursor-pointer
        bg-white dark:bg-[#0f172a]
        transition-colors duration-300
        ${className}
      `}
      style={{
        position: 'relative',
        width: cardWidth,
        height: cardHeight,
        border: '4px solid #000',
        boxShadow: '12px 12px 0px 0px #000',
        perspective: '1000px',
      }}
      onClick={handleClick}
    >
      {/* 翻转容器 */}
      <div
        className="flex flex-col w-full h-full"
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.6s',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* 正面 */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            padding: '1.5rem 1.5rem 0.75rem 1.5rem',
          }}
        >
          {/* 主内容区域 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
            {frontContent}
          </div>

          {/* 音频播放按钮（仅正面显示） */}
          {showPlayButton && audioUrl && onPlayAudio && (
            <div className="flex justify-center mb-4">
              <button
                onClick={handlePlayClick}
                className="w-10 h-10 flex items-center justify-center bg-[#B4F416] border-2 border-black rounded-full shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all hover:bg-[#a8e000]"
                aria-label="播放音频"
              >
                <Volume2 size={18} strokeWidth={2.5} />
              </button>
            </div>
          )}

          {/* 翻转提示 */}
          {showFlipHint && !disableFlip && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
              <ArrowDown size={20} className="animate-bounce text-black dark:text-white" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-black dark:text-white">
                {flipHint}
              </p>
            </div>
          )}
        </div>

        {/* 背面 */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '1.5rem 1.5rem 0.75rem 1.5rem',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflowY: 'auto',
          }}
        >
          {backContent}
        </div>
      </div>
    </div>
  )
}

/**
 * 创建正面内容的辅助组件
 */
export function CardFrontContent({
  title,
  subtitle,
  badge,
  children,
}: {
  /** 主标题（如单词） */
  title?: ReactNode
  /** 副标题（如音标） */
  subtitle?: ReactNode
  /** 徽章（如词性） */
  badge?: ReactNode
  /** 额外内容 */
  children?: ReactNode
}) {
  return (
    <>
      {/* 徽章 */}
      {badge && (
        <div className="mb-4">
          {badge}
        </div>
      )}

      {/* 主标题 */}
      {title && (
        <h1 className="text-5xl md:text-6xl font-black tracking-tight text-center text-gray-900 dark:text-white">
          {title}
        </h1>
      )}

      {/* 副标题 */}
      {subtitle && (
        <span className="font-mono text-lg text-gray-600 dark:text-gray-400">
          {subtitle}
        </span>
      )}

      {/* 额外内容 */}
      {children}
    </>
  )
}

/**
 * 创建背面内容的辅助组件
 */
export function CardBackContent({
  sections,
  children,
}: {
  /** 内容区块列表 */
  sections?: Array<{
    label: string
    content: ReactNode
    className?: string
  }>
  /** 额外内容 */
  children?: ReactNode
}) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      {sections?.map((section, index) => (
        <div key={index} className={`mb-3 ${section.className || ''}`}>
          <p className="text-sm font-bold mb-1 text-gray-500 dark:text-gray-400">
            {section.label}
          </p>
          <p className="text-base font-black leading-snug break-words text-gray-900 dark:text-white">
            {section.content}
          </p>
        </div>
      ))}
      {children}
    </div>
  )
}

/**
 * 创建徽章的辅助组件
 */
export function CardBadge({
  children,
  variant = 'default',
}: {
  children: ReactNode
  /** 徽章变体 */
  variant?: 'default' | 'new' | 'review' | 'custom'
}) {
  const variantStyles = {
    default: 'bg-[#B4F416] text-black',
    new: 'bg-[#B4F416] text-black',
    review: 'bg-[#FACC15] text-black',
    custom: 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white',
  }

  return (
    <div
      className={`
        px-3 py-1 rounded-full text-xs font-black border-2 border-black
        ${variantStyles[variant]}
      `}
      style={{ boxShadow: '2px 2px 0px 0px #000' }}
    >
      {children}
    </div>
  )
}

export default BaseCard
