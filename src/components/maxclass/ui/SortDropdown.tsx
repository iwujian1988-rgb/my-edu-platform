'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/components/ui/SortDropdown.vue
 * 通用 select 下拉，options: { value, label }[]。
 */

export interface SortOption {
  value: string | number
  label: string
}

export function SortDropdown({
  value,
  options,
  onChange,
}: {
  value: string | number
  options: SortOption[]
  onChange: (value: string) => void
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-300 outline-none bg-white"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}
