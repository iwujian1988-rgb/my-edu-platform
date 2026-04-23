'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import type { Book } from '@/types/book'
import type { CoverType } from '@/components/FilterableBookGrid'
import { useTheme } from '@/contexts/ThemeContext'
import { useLoading } from '@/components/LoadingOverlay'

export function BookCard({ book, index }: { book: Book; index: number }) {
  const router = useRouter()
  const { theme, mounted } = useTheme()
  const { showLoading, hideLoading } = useLoading()

  // 服务器端和首次渲染使用浅色模式
  const isDark = mounted && theme === 'dark'

  // 记录点击到最近访问并跳转
  const handleClick = () => {
    // 显示加载动画
    showLoading()

    // ⚡ 性能优化：非阻塞式记录访问，不等待API响应
    fetch('/api/recent-books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId: book.id })
    }).catch(error => {
      console.error('Failed to record book access:', error)
    })

    // 立即跳转，不等待API调用完成
    router.push(`/library/${book.id}`)
  }

  // 根据封面类型确定配色（黑夜模式优化）
  const getColorClass = (coverType: CoverType | undefined): string => {
    if (isDark) {
      // 黑夜模式：深色渐变背景 + 质感
      const darkColorMap: Record<CoverType, string> = {
        cn: 'bg-gradient-to-br from-red-950/80 via-red-900/60 to-gray-900/80',
        global: 'bg-gradient-to-br from-blue-950/80 via-blue-900/60 to-gray-900/80',
        k12: 'bg-gradient-to-br from-yellow-950/80 via-yellow-900/60 to-gray-900/80',
        uni: 'bg-gradient-to-br from-purple-950/80 via-purple-900/60 to-gray-900/80'
      }
      return darkColorMap[coverType || 'uni']
    } else {
      // 浅色模式：保持原样
      const colorMap: Record<CoverType, string> = {
        cn: 'bg-red-50',
        global: 'bg-blue-50',
        k12: 'bg-yellow-50',
        uni: 'bg-purple-50'
      }
      return colorMap[coverType || 'uni']
    }
  }

  // 获取发光颜色类（增强黑暗模式效果）
  const getGlowClass = (coverType: CoverType | undefined): string => {
    if (isDark) {
      const darkGlowMap: Record<CoverType, string> = {
        cn: 'group-hover:shadow-[0_0_30px_rgba(248,113,113,0.5)] dark:group-hover:shadow-[0_0_40px_rgba(248,113,113,0.6)]',
        global: 'group-hover:shadow-[0_0_30px_rgba(96,165,250,0.5)] dark:group-hover:shadow-[0_0_40px_rgba(96,165,250,0.6)]',
        k12: 'group-hover:shadow-[0_0_30px_rgba(250,204,21,0.5)] dark:group-hover:shadow-[0_0_40px_rgba(250,204,21,0.6)]',
        uni: 'group-hover:shadow-[0_0_30px_rgba(192,132,252,0.5)] dark:group-hover:shadow-[0_0_40px_rgba(192,132,252,0.6)]'
      }
      return darkGlowMap[coverType || 'uni']
    }
    const glowMap: Record<CoverType, string> = {
      cn: 'group-hover:shadow-[0_0_20px_rgba(248,113,113,0.3)]',
      global: 'group-hover:shadow-[0_0_20px_rgba(96,165,250,0.3)]',
      k12: 'group-hover:shadow-[0_0_20px_rgba(250,204,21,0.3)]',
      uni: 'group-hover:shadow-[0_0_20px_rgba(192,132,252,0.3)]'
    }
    return glowMap[coverType || 'uni']
  }

  // 获取标签文字颜色
  const getLabelColor = (coverType: CoverType | undefined): string => {
    if (isDark) {
      const labelColorMap: Record<CoverType, string> = {
        cn: 'text-red-300',
        global: 'text-blue-300',
        k12: 'text-yellow-300',
        uni: 'text-purple-300'
      }
      return labelColorMap[coverType || 'uni']
    }
    return 'text-black'
  }

  // 根据文字长度自动调整字号（适配3列布局）
  const getFontSize = (code: string): string => {
    if (code.length > 5) return 'text-xl md:text-2xl lg:text-2xl'
    if (code.length > 3) return 'text-2xl md:text-3xl lg:text-3xl'
    return 'text-3xl md:text-4xl lg:text-4xl'
  }

  const code = book.code || book.title?.substring(0, 3).toUpperCase() || 'BK'
  const fontSize = getFontSize(code)
  const colorClass = getColorClass(book.coverType)
  const glowClass = getGlowClass(book.coverType)
  const labelColor = getLabelColor(book.coverType)

  return (
    <div className="group block" onClick={handleClick} suppressHydrationWarning>
      <div className="relative w-full cursor-pointer">

        {/* 卡片容器 */}
        <div className={`relative rounded-lg border overflow-hidden flex flex-col h-full transition-all duration-200 ${
          isDark
            ? 'bg-gray-900 border-gray-700 hover:border-gray-500 hover:-translate-y-1 shadow-sm hover:shadow-md'
            : 'bg-white border-gray-200 hover:border-gray-300 hover:-translate-y-1 shadow-sm hover:shadow-md'
        }`}>

          {/* --- 上半部分：封面区 --- */}
          <div className={`aspect-[4/3] relative flex flex-col items-center justify-center border-b p-2 md:p-3 lg:p-4 ${colorClass} ${
            isDark ? 'border-gray-700' : 'border-gray-200'
          }`}>

            {/* 分类标签 + 最近标记 */}
            <div className="absolute top-2 left-2 md:top-2.5 md:left-2.5 lg:top-3 lg:left-3 flex gap-1 md:gap-1.5 z-20">
              {book.categoryLabel && (
                <span className={`px-1.5 py-0.5 md:px-1.5 md:py-0.5 lg:px-2 lg:py-0.5 border text-[8px] md:text-[9px] lg:text-[10px] font-semibold uppercase shadow-sm rounded ${
                  isDark
                    ? 'border-gray-600 bg-gray-800/80 text-gray-200'
                    : 'border-gray-300 bg-white text-gray-700'
                }`}>
                  {book.categoryLabel}
                </span>
              )}
              {book.isRecent && (
                <span className={`text-[8px] md:text-[9px] lg:text-[10px] font-semibold px-1.5 py-0.5 md:px-1.5 md:py-0.5 lg:px-2 lg:py-0.5 border shadow-sm rounded ${
                  isDark
                    ? 'bg-yellow-500/20 border-yellow-600 text-yellow-300'
                    : 'bg-[#FFB800] border-yellow-600 text-white'
                }`}>
                  最近
                </span>
              )}
            </div>

            {/* 核心大字 - 显示 displayTitle（前6个字） */}
            <div className="flex flex-col items-center justify-center mt-4 md:mt-5 lg:mt-6">
              <h1 className={`${fontSize} font-black tracking-tighter leading-none z-10 transition-all duration-300 ${
                isDark
                  ? `${labelColor} drop-shadow-[0_0_20px_rgba(180,244,22,0.4)] group-hover:drop-shadow-[0_0_30px_rgba(180,244,22,0.7)] group-hover:scale-110`
                  : 'text-black drop-shadow-[4px_4px_0px_#fff] group-hover:scale-105'
              }`}>
                {book.displayTitle || book.title || '未命名'}
              </h1>

              {/* 中间的标签 - 显示 displayAbbr（前4个字母） */}
              {book.displayAbbr && (
                <div className={`mt-1.5 md:mt-1.5 lg:mt-2 px-2 py-0.5 md:px-2 md:py-0.5 lg:px-3 lg:py-1 text-[10px] md:text-[10px] lg:text-xs font-bold uppercase tracking-widest transform -rotate-2 group-hover:rotate-0 transition-transform rounded ${
                  isDark
                    ? 'bg-gray-800 text-gray-200 border border-gray-600 shadow-[0_0_10px_rgba(180,244,22,0.2)]'
                    : 'bg-black text-white'
                }`}>
                  {book.displayAbbr}
                </div>
              )}
            </div>

            {/* 背景纹理 */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                 style={{
                   backgroundImage: `radial-gradient(${isDark ? 'rgba(180,244,22,0.5)' : '#000'} 1px, transparent 1px)`,
                   backgroundSize: '12px 12px'
                 }} />

            {/* 黑暗模式光泽动画层 - 始终渲染，使用内联样式避免hydration问题 */}
            <div
              className="absolute inset-0 transition-opacity duration-500 pointer-events-none"
              style={{
                opacity: 'var(--glow-opacity, 0)',
                '--glow-opacity': isDark ? '1' : '0'
              } as React.CSSProperties}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent" />
            </div>
          </div>

          {/* --- 下半部分：信息区 --- */}
          <div className={`flex-1 p-2 md:p-3 lg:p-4 flex flex-col justify-between transition-colors relative ${
            isDark
              ? 'bg-gray-900 hover:bg-gray-800'
              : 'bg-white hover:bg-gray-50'
          }`}>
            {/* 终端风格的装饰性边角 */}
            <div className={`absolute top-1 right-1 font-mono text-[6px] select-none ${
              isDark ? 'text-gray-600' : 'text-gray-300'
            }`}>
              +
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`font-bold text-sm md:text-base lg:text-lg leading-tight line-clamp-1 ${
                  isDark ? 'text-gray-100' : 'text-gray-900'
                }`}>{book.title || '未命名词书'}</h3>
                {book.categoryLabel && (
                  <span className={`font-mono text-[8px] md:text-[9px] lg:text-[10px] px-1.5 py-0.5 border rounded ${
                    isDark
                      ? 'border-gray-600 bg-gray-800 text-gray-300'
                      : 'border-black bg-gray-100 text-gray-600'
                  }`}>
                    {book.categoryLabel.toUpperCase()}
                  </span>
                )}
              </div>
              <div className={`font-mono text-[10px] md:text-[11px] lg:text-xs mt-0.5 md:mt-1 flex items-center gap-2 ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}>
                <span className={isDark ? 'text-lime-400' : 'text-[#B4F416]'}>$</span>
                <span>{book.total_words?.toLocaleString() || 0} words</span>
              </div>
              {book.description && (
                <p className={`text-[10px] md:text-[11px] lg:text-xs line-clamp-2 min-h-[2.5em] mt-1 ${
                  isDark ? 'text-gray-500' : 'text-gray-400'
                }`}>{book.description}</p>
              )}
            </div>

            <div className="flex items-center justify-between mt-2 md:mt-3 lg:mt-4">
              {/* 终端风格的命令提示 */}
              <div className={`font-mono text-[8px] md:text-[9px] hidden sm:block ${
                isDark ? 'text-gray-500' : 'text-gray-400'
              }`}>
                $ ENTER
              </div>
              <button className={`w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 flex items-center justify-center border-2 rounded transition-all shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 active:shadow-none group ${
                isDark
                  ? 'border-gray-600 hover:border-lime-400 hover:bg-lime-400/10 text-gray-300 hover:text-lime-400'
                  : 'border-black hover:bg-[#B4F416] hover:text-black text-black'
              }`}>
                <ArrowRight className="w-3 h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={3} />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
