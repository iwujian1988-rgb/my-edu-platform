'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/components/ui/LevelPill.vue
 *
 * 级别徽章：4 个 CEFR 级别（A1/A2/B1/B2），3 种尺寸（sm/md/lg）。
 * 颜色由 maxclass-components.css 中的 `.level-A1/A2/B1/B2` 提供。
 */

export type LevelCode = 'A1' | 'A2' | 'B1' | 'B2'
type PillSize = 'sm' | 'md' | 'lg'

const SIZE_CLASS: Record<PillSize, string> = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
}

export function LevelPill({
  level,
  size = 'sm',
}: {
  level: string
  size?: PillSize
}) {
  return (
    <span className={`level-badge ${SIZE_CLASS[size]} level-${level}`}>
      {level}
    </span>
  )
}
