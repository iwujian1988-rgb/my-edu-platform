'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import type { Book } from '@/types/book'
import type { CoverType } from '@/components/FilterableBookGrid'

export function BookCard({ book, index }: { book: Book; index: number }) {
  const router = useRouter()

  // 记录点击到最近访问
  const handleClick = () => {
    // 异步发送请求，不等待结果，让Link正常跳转
    fetch('/api/recent-books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId: book.id })
    }).catch(error => {
      console.error('Failed to record book access:', error)
    })
  }

  // 根据封面类型确定配色
  const getColorClass = (coverType: CoverType | undefined): string => {
    const colorMap: Record<CoverType, string> = {
      cn: 'bg-red-50',
      global: 'bg-blue-50',
      k12: 'bg-yellow-50',
      uni: 'bg-purple-50'
    }
    return colorMap[coverType || 'uni']
  }

  // 根据文字长度自动调整字号（整体缩小，手机端更小）
  const getFontSize = (code: string): string => {
    if (code.length > 5) return 'text-xl md:text-xl lg:text-2xl'
    if (code.length > 3) return 'text-2xl md:text-2xl lg:text-3xl'
    return 'text-3xl md:text-3xl lg:text-4xl'
  }

  const code = book.code || book.title?.substring(0, 3).toUpperCase() || 'BK'
  const fontSize = getFontSize(code)
  const colorClass = getColorClass(book.coverType)

  return (
    <Link href={`/library/${book.id}`} className="group block" onClick={handleClick}>
      <div className="relative w-full cursor-pointer">

        {/* 1. 整体阴影 (黑色硬块) */}
        <div className="absolute inset-0 bg-black rounded-lg md:rounded-xl translate-x-1.5 md:translate-x-2 translate-y-1.5 md:translate-y-2 transition-transform group-hover:translate-x-2 group-hover:translate-y-2 md:group-hover:translate-x-3 md:group-hover:translate-y-3" />

        {/* 2. 卡片容器 */}
        <div className="relative bg-white rounded-lg md:rounded-xl border-[2px] md:border-[3px] border-black overflow-hidden flex flex-col h-full">

          {/* --- 上半部分：封面区 --- */}
          <div className={`aspect-[4/3] relative flex flex-col items-center justify-center border-b-[2px] md:border-b-[3px] border-black p-2 md:p-3 lg:p-4 ${colorClass}`}>

            {/* 分类标签 + 最近标记 */}
            <div className="absolute top-2 left-2 md:top-2.5 md:left-2.5 lg:top-3 lg:left-3 flex gap-1 md:gap-1.5 z-20">
              {book.categoryLabel && (
                <span className="px-1.5 py-0.5 md:px-1.5 md:py-0.5 lg:px-2 lg:py-0.5 border border-black bg-white text-[8px] md:text-[9px] lg:text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_#000]">
                  {book.categoryLabel}
                </span>
              )}
              {book.isRecent && (
                <span className="bg-[#FFB800] text-black border-[2px] border-black text-[8px] md:text-[9px] lg:text-[10px] font-bold px-1.5 py-0.5 md:px-1.5 md:py-0.5 lg:px-2 lg:py-0.5 rounded-md shadow-[2px_2px_0px_0px_#000]">
                  最近
                </span>
              )}
            </div>

            {/* 核心大字 - 向下移动避免遮盖标签 */}
            <div className="flex flex-col items-center justify-center mt-4 md:mt-5 lg:mt-6">
              <h1 className={`${fontSize} font-black tracking-tighter leading-none text-black drop-shadow-[4px_4px_0px_#fff] z-10`}>
                {code}
              </h1>

              {/* 中间的标签 */}
              <div className="mt-1.5 md:mt-1.5 lg:mt-2 px-2 py-0.5 md:px-2 md:py-0.5 lg:px-3 lg:py-1 bg-black text-white text-[10px] md:text-[10px] lg:text-xs font-bold uppercase tracking-widest transform -rotate-2 group-hover:rotate-0 transition-transform">
                {book.title || '未命名'}
              </div>
            </div>

            {/* 背景纹理 */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                 style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
          </div>

          {/* --- 下半部分：信息区 --- */}
          <div className="flex-1 bg-white p-2 md:p-3 lg:p-4 flex flex-col justify-between hover:bg-gray-50 transition-colors relative">
            {/* 终端风格的装饰性边角 */}
            <div className="absolute top-1 right-1 font-mono text-[6px] text-gray-300 select-none">
              +
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-sm md:text-base lg:text-lg leading-tight text-gray-900 line-clamp-1">{book.title || '未命名词书'}</h3>
                {book.categoryLabel && (
                  <span className="font-mono text-[8px] md:text-[9px] lg:text-[10px] px-1.5 py-0.5 border border-black bg-gray-100 text-gray-600 rounded">
                    {book.categoryLabel.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="font-mono text-[10px] md:text-[11px] lg:text-xs text-gray-500 mt-0.5 md:mt-1 flex items-center gap-2">
                <span className="text-[#B4F416]">$</span>
                <span>{book.total_words?.toLocaleString() || 0} words</span>
              </div>
              {book.description && (
                <p className="text-[10px] md:text-[11px] lg:text-xs text-gray-400 line-clamp-1 md:line-clamp-2 mt-1">{book.description}</p>
              )}
            </div>

            <div className="flex items-center justify-between mt-2 md:mt-3 lg:mt-4">
              {/* 终端风格的命令提示 */}
              <div className="font-mono text-[8px] md:text-[9px] text-gray-400 hidden sm:block">
                $ ENTER
              </div>
              <button className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 flex items-center justify-center border-2 border-black rounded-lg hover:bg-[#B4F416] hover:text-black hover:border-black transition-all shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 active:shadow-none group">
                <ArrowRight className="w-3 h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={3} />
              </button>
            </div>
          </div>

        </div>
      </div>
    </Link>
  )
}
