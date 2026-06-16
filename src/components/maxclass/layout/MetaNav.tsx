'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/components/layout/MetaNav.vue
 * 顶部暗灰条：品牌标识 + 语言选择 + 搜索按钮 + 进度入口
 */

import Link from 'next/link'
import { useUiStore } from '@/lib/maxclass/uiStore'
import { t } from '@/lib/maxclass/i18n'
import { LanguageSelector } from './LanguageSelector'

export function MetaNav() {
  const uiStore = useUiStore()
  return (
    <div className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-10 text-sm">
        <div className="flex items-center gap-4">
          <span className="font-bold text-xs tracking-wider uppercase">
            {t('nav.brand', 'MAX 外语')} · {t('nav.brandContext', '法语')}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSelector />
          <button
            onClick={() => uiStore.toggleSearch()}
            className="p-1 hover:text-gray-300 transition-colors"
            title={t('nav.search', '搜索')}
            aria-label={t('nav.search', '搜索')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
          <Link
            href="/progression"
            className="p-1 hover:text-gray-300 transition-colors"
            title={t('nav.progress', '学习进度')}
            aria-label={t('nav.progress', '学习进度')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
