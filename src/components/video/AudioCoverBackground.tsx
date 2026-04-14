'use client'

/**
 * 音频封面背景 - 简化版
 *
 * 参考：播客专区的简单实现
 * - 如果有封面图：使用模糊封面图作为背景
 * - 如果无封面图：使用深色渐变背景
 */

import { cn } from '@/lib/utils'

interface AudioCoverBackgroundProps {
  imageUrl: string | undefined
  /** 是否渲染底部加深层 */
  darkenBottom?: boolean
  /** 额外 className */
  className?: string
}

export function AudioCoverBackground({
  imageUrl,
  darkenBottom = false,
  className,
}: AudioCoverBackgroundProps) {
  if (!imageUrl) {
    return (
      <div className={cn(
        'absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-black',
        className
      )} />
    )
  }

  return (
    <div className={cn('absolute inset-0', className)} aria-hidden>
      {/* 封面图作为背景，大幅模糊 */}
      <img
        src={imageUrl}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          filter: 'blur(60px) saturate(1.5)',
          transform: 'scale(1.2)',
        }}
      />

      {/* 暗色遮罩 */}
      <div className="absolute inset-0 bg-black/40" />

      {/* 底部加深层 */}
      {darkenBottom && (
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.4) 85%, rgba(0,0,0,0.7) 100%)',
          }}
        />
      )}
    </div>
  )
}
