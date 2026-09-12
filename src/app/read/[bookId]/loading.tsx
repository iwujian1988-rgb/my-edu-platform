/**
 * /read/** 路由段 loading 骨架（目录 / 章节 / 复习共用）
 *
 * 动态页无法预取正文，点目录/翻章时先并行预取本骨架 → 立即给视觉反馈，
 * 不再等 RSC 渲染完才切页。
 */

const LINES = [88, 100, 72, 96, 84, 100, 66, 92, 78, 98, 58, 90]

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fbfcff] to-[#f7f9fd] dark:from-[#101626] dark:to-[#0c1120]">
      <div className="sticky top-0 z-30 border-b border-[#e7eaf2] bg-white/95 dark:border-[#273149] dark:bg-[#141b2d]/95">
        <div className="mx-auto flex h-14 max-w-[1140px] items-center justify-between px-4">
          <div className="h-5 w-14 animate-pulse rounded bg-[#e7eaf2] dark:bg-[#273149]" />
          <div className="h-5 w-48 animate-pulse rounded bg-[#e7eaf2] dark:bg-[#273149]" />
          <div className="h-5 w-12 animate-pulse rounded bg-[#e7eaf2] dark:bg-[#273149]" />
        </div>
        <div className="h-0.5 w-full bg-[#e7eaf2] dark:bg-[#273149]" />
      </div>

      <div className="mx-auto max-w-[760px] px-4 pt-8">
        <div className="mx-auto mb-10 h-7 w-64 animate-pulse rounded bg-[#e7eaf2] dark:bg-[#273149]" />
        <div className="space-y-4">
          {LINES.map((w, i) => (
            <div
              key={i}
              className="h-4 animate-pulse rounded bg-[#e7eaf2] dark:bg-[#273149]"
              style={{ width: `${w}%`, animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
