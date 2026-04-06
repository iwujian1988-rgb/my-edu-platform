'use client'

/**
 * Apple Music 风格音频封面背景
 *
 * 渲染策略（封面模糊为主 + 提取色增强）：
 * 1. 原始封面超大高斯模糊（主体）
 * 2. 提取主色调的多色径向渐变叠加（增强色彩）
 * 3. 暗角
 * 4. 底部加深（播放器场景）
 * 5. 噪点纹理
 */

import { cn } from '@/lib/utils'
import { useDominantColors } from '@/hooks/useDominantColors'

interface AudioCoverBackgroundProps {
  imageUrl: string | undefined
  /** 预提取的颜色，优先于 hook 内部提取（避免重复计算） */
  colors?: string[]
  /** 是否渲染底部加深层（播放器需要，列表卡片不需要） */
  darkenBottom?: boolean
  /** 额外 className */
  className?: string
}

export function AudioCoverBackground({
  imageUrl,
  colors: externalColors,
  darkenBottom = false,
  className,
}: AudioCoverBackgroundProps) {
  const hookColors = useDominantColors(imageUrl)
  const colors = externalColors || hookColors

  if (!imageUrl) {
    return <div className={cn('absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-950 to-black', className)} />
  }

  // 颜色增强渐变：用提取的主色增强封面色彩
  const colorGradient = `
    radial-gradient(ellipse 140% 100% at 20% 30%, ${colors[0]}aa 0%, transparent 55%),
    radial-gradient(ellipse 120% 110% at 80% 70%, ${colors[1]}88 0%, transparent 50%),
    radial-gradient(ellipse 100% 80% at 50% 50%, ${colors[2] || colors[0]}77 0%, transparent 45%),
    radial-gradient(ellipse 80% 60% at 70% 15%, ${colors[3] || colors[1]}66 0%, transparent 35%)
  `

  return (
    <div className={cn('absolute inset-0', className)} aria-hidden>
      {/* 层1：原始封面超大模糊（主体） */}
      <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scale(1.6)', filter: 'blur(80px) saturate(2.5) brightness(0.85)' }} />
      {/* 层2：提取主色调的多色径向渐变叠加 */}
      <div className="absolute inset-0" style={{ background: colorGradient }} />
      {/* 层3：柔化 */}
      <div className="absolute inset-0 backdrop-blur-[20px]" style={{ backgroundColor: 'rgba(0,0,0,0.05)' }} />
      {/* 层4：暗角 */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.2) 70%, rgba(0,0,0,0.45) 100%)',
      }} />
      {/* 层5：底部加深（可选） */}
      {darkenBottom && (
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.3) 85%, rgba(0,0,0,0.5) 100%)',
        }} />
      )}
      {/* 层6：噪点纹理 */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />
    </div>
  )
}
