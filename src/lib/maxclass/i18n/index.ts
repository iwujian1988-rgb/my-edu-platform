/**
 * maxclass i18n — 极简实现，对应原版 vue-i18n 的 t() 调用。
 *
 * Phase 1：默认 locale='zh'，从 locales/zh.json 字典查。
 * Phase 2：可接入 next-intl 或保留此实现并扩展 locale 切换。
 */

import zh from './locales/zh.json'

export type Locale = 'zh' | 'fr'

const DICTS: Record<Locale, Record<string, unknown>> = {
  zh: zh as Record<string, unknown>,
  fr: {} as Record<string, unknown>, // lazy-loaded on demand
}

let currentLocale: Locale = 'zh'

export function setLocale(loc: Locale): void {
  currentLocale = loc
}

export function getLocale(): Locale {
  return currentLocale
}

function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    params[k] !== undefined ? String(params[k]) : `{${k}}`,
  )
}

/**
 * t — translate a dotted key to localized string.
 * Usage mirrors vue-i18n:
 *   t('nav.brand')                          // "MAX 外语"
 *   t('nav.search', '搜索')                  // with fallback
 *   t('common.exercises', { count: 100 })    // "100 个练习"
 */
export function t(key: string, fallbackOrParams?: string | Record<string, string | number>): string {
  const params = typeof fallbackOrParams === 'object' ? fallbackOrParams : undefined
  const raw = getByPath(DICTS[currentLocale], key)
  if (typeof raw === 'string') return interpolate(raw, params)
  if (typeof fallbackOrParams === 'string') return fallbackOrParams
  return key
}
