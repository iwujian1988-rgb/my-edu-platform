'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/components/layout/MainNav.vue
 * 白色 sticky 导航条：Logo + 三产品入口（MaxClass / MaxTube / MaxNote）+ 移动菜单按钮
 */

import Link from 'next/link'
import { useUiStore } from '@/lib/maxclass/uiStore'
import { t } from '@/lib/maxclass/i18n'
import { productLinks } from '@/data/maxclass'

export function MainNav() {
  const uiStore = useUiStore()
  return (
    <div className="bg-white border-b sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-lg text-primary-800 hover:text-primary-600 transition-colors shrink-0 mr-4"
          >
            <span className="text-2xl">🗼</span>
            <span className="hidden sm:inline">{t('nav.brand', 'MAX 外语')}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-2">
            <Link
              href={productLinks.maxClass}
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary-700 transition-colors"
            >
              {t('nav.maxClass', 'MaxClass')}
            </Link>
            <a
              href={productLinks.maxTube}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary-700 transition-colors"
            >
              {t('nav.maxTube', 'MaxTube')}
            </a>
            <a
              href={productLinks.maxNote}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary-700 transition-colors"
            >
              {t('nav.maxNote', 'MaxNote')}
            </a>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => uiStore.toggleMobileMenu()}
            className="md:hidden p-2 text-gray-600 hover:text-gray-800"
            aria-label={t('nav.menu', '菜单')}
          >
            {!uiStore.mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
