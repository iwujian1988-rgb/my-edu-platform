'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/components/layout/NewsletterSignup.vue
 */

import { t } from '@/lib/maxclass/i18n'

export function NewsletterSignup() {
  return (
    <div className="bg-gray-100 rounded-lg p-6">
      <h3 className="font-bold text-lg mb-2">{t('common.newsletter', '订阅资讯')}</h3>
      <p className="text-sm text-gray-600 mb-3">{t('common.newsletterDesc', '订阅以获取最新课程与练习更新。')}</p>
      <form onSubmit={(e) => e.preventDefault()} className="flex gap-2">
        <input
          type="email"
          placeholder={t('common.emailPlaceholder', '邮箱地址')}
          className="flex-1 px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-primary-300 outline-none"
        />
        <button type="submit" className="btn-primary text-sm">
          {t('common.subscribe', '订阅')}
        </button>
      </form>
    </div>
  )
}
