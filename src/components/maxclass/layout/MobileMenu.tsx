'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/components/layout/MobileMenu.vue
 * 移动端全屏菜单：三产品大卡片入口
 */

import Link from 'next/link'
import { useUiStore } from '@/lib/maxclass/uiStore'
import { t } from '@/lib/maxclass/i18n'
import { productLinks } from '@/data/maxclass'

export function MobileMenu() {
  const uiStore = useUiStore()
  if (!uiStore.mobileMenuOpen) return null

  return (
    <div className="fixed inset-0 top-0 bg-white z-50 overflow-y-auto md:hidden">
      <div className="flex items-center justify-between px-4 h-14 border-b">
        <span className="font-bold text-lg text-primary-800">{t('nav.brand', 'MAX 外语')}</span>
        <button onClick={() => uiStore.closeMobileMenu()} className="p-2 text-gray-600" aria-label="关闭菜单">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-3">
        <Link
          href={productLinks.maxClass}
          onClick={() => uiStore.closeMobileMenu()}
          className="block rounded-xl border border-gray-200 px-4 py-4"
        >
          <p className="font-semibold text-gray-800">{t('nav.maxClass', 'MaxClass')}</p>
          <p className="text-sm text-gray-500 mt-1">{t('pages.home.card1Desc', '系统化课程，按级别循序渐进。')}</p>
        </Link>

        <a
          href={productLinks.maxTube}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => uiStore.closeMobileMenu()}
          className="block rounded-xl border border-gray-200 px-4 py-4"
        >
          <p className="font-semibold text-gray-800">{t('nav.maxTube', 'MaxTube')}</p>
          <p className="text-sm text-gray-500 mt-1">{t('pages.home.card2Desc', '真实法语视频，双语字幕跟读。')}</p>
        </a>

        <a
          href={productLinks.maxNote}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => uiStore.closeMobileMenu()}
          className="block rounded-xl border border-gray-200 px-4 py-4"
        >
          <p className="font-semibold text-gray-800">{t('nav.maxNote', 'MaxNote')}</p>
          <p className="text-sm text-gray-500 mt-1">{t('pages.home.card3Desc', 'AI 智能笔记，整理学习要点。')}</p>
        </a>
      </div>
    </div>
  )
}
