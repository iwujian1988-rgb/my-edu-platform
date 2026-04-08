'use client'

/**
 * Apple Music 风格背景 — 色块网格 + Glassmorphism 模糊
 *
 * 实现参考：frigopedro/Apple-Music-Background
 * 原理：
 * 1. 从封面图提取主色调（复用 useDominantColors）
 * 2. 生成 6×6 色块网格，每格随机填入提取色
 * 3. 用 backdrop-filter: blur(90px) 毛玻璃覆盖，将网格模糊为自然渐变
 * 4. 暗色遮罩增加对比度
 */

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useDominantColors } from '@/hooks/useDominantColors'

const GRID_SIZE = 6
const GRID_COLS = 6

interface AudioCoverBackgroundProps {
  imageUrl: string | undefined
  /** 预提取的颜色，优先于 hook 内部提取（避免重复计算） */
  colors?: string[]
  /** 是否渲染底部加深层（播放器需要，列表卡片不需要） */
  darkenBottom?: boolean
  /** 额外 className */
  className?: string
}

/** 简单字符串哈希，生成确定性的伪随机色块排列 */
function hashString(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/** 将 "rgb(r,g,b)" 解析为 [r, g, b] */
function parseRgb(color: string): [number, number, number] {
  const m = color.match(/(\d+)/g)
  if (m && m.length >= 3) return [Number(m[0]), Number(m[1]), Number(m[2])]
  return [128, 128, 128]
}

/** 提亮 + 增饱和：让颜色在 blur 后依然鲜艳 */
function brighten(color: string): string {
  let [r, g, b] = parseRgb(color)
  // 增饱和：拉大通道差距
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max - min < 40 && max < 180) {
    // 灰暗色：大幅提亮
    r = Math.min(255, r + 80)
    g = Math.min(255, g + 80)
    b = Math.min(255, b + 80)
  }
  // 整体提亮 +30%（但不超过 240）
  r = Math.min(240, Math.round(r * 1.3 + 20))
  g = Math.min(240, Math.round(g * 1.3 + 20))
  b = Math.min(240, Math.round(b * 1.3 + 20))
  return `rgb(${r},${g},${b})`
}

export function AudioCoverBackground({
  imageUrl,
  colors: externalColors,
  darkenBottom = false,
  className,
}: AudioCoverBackgroundProps) {
  const hookColors = useDominantColors(imageUrl)
  const rawColors = externalColors || hookColors

  // 提亮颜色 + 生成确定性色块网格
  const grid = useMemo(() => {
    if (!imageUrl || rawColors.length === 0) return []
    const colors = rawColors.map(brighten)
    const seed = hashString(imageUrl)
    const result: string[] = []
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      const idx = Math.abs(seed + i * 7 + i * i * 3) % colors.length
      result.push(colors[idx])
    }
    return result
  }, [imageUrl, rawColors])

  if (!imageUrl) {
    return <div className={cn('absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-950 to-black', className)} />
  }

  return (
    <div className={cn('absolute inset-0', className)} aria-hidden>
      {/* 层1：色块网格（底层） */}
      <div
        className="absolute inset-0 grid"
        style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }}
      >
        {grid.map((color, i) => (
          <div key={i} style={{ backgroundColor: color }} />
        ))}
      </div>
      {/* 层2：Glassmorphism 毛玻璃覆盖 — 将底层网格模糊为自然渐变 */}
      <div
        className="absolute inset-0"
        style={{
          backdropFilter: 'blur(80px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(80px) saturate(1.8)',
          background: 'rgba(0, 0, 0, 0.1)',
        }}
      />
      {/* 层3：底部加深（播放器场景可选） */}
      {darkenBottom && (
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.3) 85%, rgba(0,0,0,0.5) 100%)',
        }} />
      )}
    </div>
  )
}
