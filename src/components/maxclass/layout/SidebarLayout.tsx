'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/components/layout/SidebarLayout.vue
 * 通用两栏布局：主内容 + 右侧 sidebar（移动端堆叠）。
 *
 * Vue 用 slot；React 用 children + sidebar props。
 */

import { type ReactNode } from 'react'

export function SidebarLayout({
  children,
  sidebar,
}: {
  children: ReactNode
  sidebar: ReactNode
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 min-w-0">{children}</div>
        <div className="w-full lg:w-80 shrink-0">{sidebar}</div>
      </div>
    </div>
  )
}
