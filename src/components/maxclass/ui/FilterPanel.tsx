'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/components/ui/FilterPanel.vue
 * 过滤面板：主题 chips + 系列 chips + 排序 select + 清除按钮。
 *
 * Vue 用 modelValue/update:modelValue；React 用 value/onChange。
 * 数据 themes/collections 来自 src/data/maxclass/mock（与原版路径一致）。
 */

import { t } from '@/lib/maxclass/i18n'
import { themes, collections } from '@/data/maxclass/mock'

export interface FilterValue {
  level?: string | null
  theme?: string | null
  collection?: number | null
  sort?: string
}

export function FilterPanel({
  value,
  onChange,
  showThemes = true,
  showCollections = true,
}: {
  value: FilterValue
  onChange: (next: FilterValue) => void
  showThemes?: boolean
  showCollections?: boolean
}) {
  const hasFilters = Boolean(value.theme) || Boolean(value.collection) || (value.sort && value.sort !== 'default')

  function toggleTheme(slug: string) {
    const theme = value.theme === slug ? null : slug
    onChange({ ...value, theme })
  }
  function toggleCollection(id: number) {
    const collection = value.collection === id ? null : id
    onChange({ ...value, collection })
  }
  function clearAll() {
    onChange({ level: value.level, theme: null, collection: null, sort: 'default' })
  }

  return (
    <div className="bg-white rounded-lg border p-4 space-y-4">
      {showThemes ? (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('nav.themes')}</h4>
          <div className="flex flex-wrap gap-2">
            {themes.map(theme => {
              const active = value.theme === theme.slug
              return (
                <button
                  key={theme.slug}
                  type="button"
                  onClick={() => toggleTheme(theme.slug)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    active
                      ? 'bg-primary-100 border-primary-300 text-primary-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {theme.icon} {theme.label}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {showCollections ? (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('nav.collections')}</h4>
          <div className="flex flex-wrap gap-2">
            {collections.map(col => {
              const active = value.collection === col.id
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => toggleCollection(col.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    active
                      ? 'bg-primary-100 border-primary-300 text-primary-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {col.title}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">{t('common.sort')} :</span>
        <select
          value={value.sort ?? 'default'}
          onChange={e => onChange({ ...value, sort: e.target.value })}
          className="text-sm border rounded px-2 py-1 focus:ring-2 focus:ring-primary-300 outline-none"
        >
          <option value="default">{t('common.sortDefault')}</option>
          <option value="newest">{t('common.sortNewest')}</option>
          <option value="oldest">{t('common.sortOldest')}</option>
        </select>
        {hasFilters ? (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-primary-600 hover:text-primary-800 ml-auto"
          >
            {t('common.clearFilters')}
          </button>
        ) : null}
      </div>
    </div>
  )
}
