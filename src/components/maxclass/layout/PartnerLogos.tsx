'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/components/layout/PartnerLogos.vue
 * 占位的合作机构 logo 列表（原版即占位）。
 */

export function PartnerLogos() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6 opacity-60">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="w-20 h-10 bg-gray-300 rounded flex items-center justify-center text-xs text-gray-500"
        >
          Partenaire {i + 1}
        </div>
      ))}
    </div>
  )
}
