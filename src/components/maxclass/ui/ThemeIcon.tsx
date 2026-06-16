'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/components/ui/ThemeIcon.vue
 * 显示主题对应的 emoji 图标，未匹配时回落到 📄。
 */

import { themes } from '@/data/maxclass/mock'

export function ThemeIcon({ theme }: { theme: string }) {
  const found = themes.find(t => t.slug === theme)
  const icon = found?.icon ?? '📄'
  return <span className="text-xl">{icon}</span>
}
