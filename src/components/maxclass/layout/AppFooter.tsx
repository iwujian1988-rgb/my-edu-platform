'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/components/layout/AppFooter.vue
 */

import Link from 'next/link'
import { t } from '@/lib/maxclass/i18n'
import { productLinks } from '@/data/maxclass'

export function AppFooter() {
  return (
    <footer className="bg-gray-950 text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr] gap-8 items-start">
          <div>
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <span className="text-2xl">🗼</span>
              {t('footer.brand', 'MAX 外语')}
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xl">
              {t('footer.brandDesc', '围绕真实内容和系统学习路径构建的外语学习产品体系。')}
            </p>
          </div>

          <div>
            <h4 className="font-bold text-sm uppercase text-gray-400 mb-3">
              {t('footer.productsTitle', '产品')}
            </h4>
            <div className="flex flex-col gap-3 text-sm text-gray-300">
              <Link href={productLinks.maxClass} className="hover:text-white transition-colors">
                {t('nav.maxClass', 'MaxClass')}
              </Link>
              <a href={productLinks.maxTube} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                {t('nav.maxTube', 'MaxTube')}
              </a>
              <a href={productLinks.maxNote} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                {t('nav.maxNote', 'MaxNote')}
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">{t('footer.copyrightNotice', '本网站内容仅供学习交流使用。')}</p>
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} {t('footer.copyright', 'MAX 外语')}
          </p>
        </div>
      </div>
    </footer>
  )
}
