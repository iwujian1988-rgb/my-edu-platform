'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/components/ui/Pagination.vue
 * 分页：当 totalPages>1 显示；显示首尾页 + 当前 ±1 + 省略号。
 *
 * Vue 用 modelValue/update:modelValue；React 用 value/onChange。
 */

type PageItem = number | '...'

function computeVisiblePages(current: number, total: number): PageItem[] {
  const pages: PageItem[] = []
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
    return pages
  }
  pages.push(1)
  if (current > 3) pages.push('...')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}

export function Pagination({
  value,
  totalPages,
  onChange,
}: {
  value: number
  totalPages: number
  onChange: (page: number) => void
}) {
  if (totalPages <= 1) return null
  const visiblePages = computeVisiblePages(value, totalPages)

  const prevDisabled = value <= 1
  const nextDisabled = value >= totalPages

  const baseBtn = 'px-3 py-1.5 text-sm rounded border transition-all'
  const enabledCls = 'text-gray-600 border-gray-200 hover:bg-gray-50'
  const disabledCls = 'text-gray-300 border-gray-100'

  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={prevDisabled}
        className={`${baseBtn} ${prevDisabled ? disabledCls : enabledCls}`}
      >
        ←
      </button>
      {visiblePages.map((p, idx) =>
        p === '...' ? (
          <span key={`gap-${idx}`} className="px-2 text-gray-400">...</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`${baseBtn} ${
              p === value ? 'bg-primary-600 text-white border-primary-600' : enabledCls
            }`}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={nextDisabled}
        className={`${baseBtn} ${nextDisabled ? disabledCls : enabledCls}`}
      >
        →
      </button>
    </div>
  )
}
