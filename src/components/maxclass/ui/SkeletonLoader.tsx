'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/components/ui/SkeletonLoader.vue
 * 骨架屏：支持 card/hero/text/bar/pill/block 6 种形态；text/bar 可调宽高。
 */

export type SkeletonType = 'card' | 'hero' | 'text' | 'bar' | 'pill' | 'block'

export function SkeletonLoader({
  type = 'text',
  width = 'w-full',
  height = 'h-4',
}: {
  type?: SkeletonType
  width?: string
  height?: string
}) {
  return (
    <div className="animate-pulse">
      {type === 'card' ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="h-36 bg-gray-200" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-full" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
        </div>
      ) : type === 'hero' ? (
        <div className="bg-gray-200 rounded-xl h-48 md:h-64" />
      ) : type === 'text' ? (
        <div className={width}>
          <div className="space-y-3">
            <div className="h-5 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded" />
            <div className="h-3 bg-gray-100 rounded" />
            <div className="h-3 bg-gray-100 rounded w-5/6" />
          </div>
        </div>
      ) : type === 'bar' ? (
        <div className={`${height} ${width} bg-gray-200 rounded`} />
      ) : type === 'pill' ? (
        <div className="bg-gray-200 rounded-lg h-10 w-32" />
      ) : type === 'block' ? (
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-3 bg-gray-100 rounded" />
          <div className="h-3 bg-gray-100 rounded w-4/5" />
        </div>
      ) : (
        <div className="h-4 bg-gray-200 rounded w-full" />
      )}
    </div>
  )
}
