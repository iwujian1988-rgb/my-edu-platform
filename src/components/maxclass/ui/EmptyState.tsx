'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/components/ui/EmptyState.vue
 * 空状态：图标 + 标题 + 描述 + 可选「返回首页」按钮 + 可选 slot 内容。
 *
 * Vue 用 <router-link to="/">；React 用 <Link href="/">。
 * Vue 用 <slot />；React 用 children。
 */

import Link from 'next/link'
import { type ReactNode } from 'react'

export function EmptyState({
  title,
  description = '',
  icon = '',
  iconBg = 'bg-gray-100',
  showHome = false,
  homeLabel = '返回首页',
  children,
}: {
  title: string
  description?: string
  icon?: string
  iconBg?: string
  showHome?: boolean
  homeLabel?: string
  children?: ReactNode
}) {
  return (
    <div className="text-center py-16">
      <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${iconBg}`}>
        {icon ? (
          <span className="text-3xl">{icon}</span>
        ) : (
          <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        )}
      </div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
      {description ? (
        <p className="text-gray-400 text-sm max-w-md mx-auto">{description}</p>
      ) : null}
      {showHome ? (
        <Link
          href="/"
          className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {homeLabel}
        </Link>
      ) : null}
      {children}
    </div>
  )
}
