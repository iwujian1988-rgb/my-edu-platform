'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { BookOpen, Languages, Brain, Target } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

// 全局加载状态管理
let loadingCount = 0
const loadingListeners = new Set<(loading: boolean) => void>()

const notifyLoadingListeners = () => {
  const isLoading = loadingCount > 0
  loadingListeners.forEach(listener => listener(isLoading))
}

// 外语学习激励文案
const motivationalQuotes = [
  { text: "Practice makes perfect", cn: "熟能生巧", icon: BookOpen },
  { text: "Keep going!", cn: "坚持下去！", icon: Target },
  { text: "Learn smart, not hard", cn: "巧学，不是苦学", icon: Brain },
  { text: "Every word counts", cn: "每个词都很重要", icon: Languages },
  { text: "Small steps, big dreams", cn: "小步子，大梦想", icon: Target },
  { text: "Today's effort = tomorrow's fluency", cn: "今天的努力 = 明天的流利", icon: BookOpen },
  { text: "Consistency is key", cn: "坚持是关键", icon: Brain },
  { text: "Believe in yourself", cn: "相信自己", icon: Languages },
]

export function LoadingOverlay() {
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [quoteIndex, setQuoteIndex] = useState(0)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { theme, mounted } = useTheme()
  const isDark = mounted && theme === 'dark'
  const timeoutRef = useRef<NodeJS.Timeout>()

  // 初始化完成后显示
  useEffect(() => {
    setIsReady(true)
  }, [])

  // 监听全局加载状态
  useEffect(() => {
    const handleLoadingChange = (loading: boolean) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      if (loading) {
        setIsLoading(true)
        // 随机选择一条激励文案
        setQuoteIndex(Math.floor(Math.random() * motivationalQuotes.length))
      } else {
        // 优化：减少延迟隐藏时间，提升响应速度
        timeoutRef.current = setTimeout(() => {
          setIsLoading(false)
        }, 100)
      }
    }

    loadingListeners.add(handleLoadingChange)

    return () => {
      loadingListeners.delete(handleLoadingChange)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // 路由变化时自动显示并延迟隐藏加载层
  useEffect(() => {
    // 立即显示加载动画
    setIsLoading(true)
    // 随机选择一条激励文案
    setQuoteIndex(Math.floor(Math.random() * motivationalQuotes.length))

    // 路由变化后延迟隐藏（优化：减少延迟，提升响应速度）
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 200)  // 优化：从500ms减少到200ms，提升返回按钮响应速度

    return () => clearTimeout(timer)
  }, [pathname, searchParams])

  // 未初始化时不显示
  if (!isReady) return null

  const quote = motivationalQuotes[quoteIndex]
  const Icon = quote.icon

  return (
    <>
      {/* 加载遮罩层 */}
      {isLoading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center"
             style={{ backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)' }}>

          {/* Neo-Brutalism 加载卡片 */}
          <div className="relative px-8 md:px-12 py-10 md:py-14 border-[3px] border-black shadow-[8px_8px_0px_0px_#000] animate-in fade-in zoom-in duration-300"
               style={{ backgroundColor: '#B4F416' }}>

            {/* 图标 + 文字 */}
            <div className="flex flex-col items-center gap-6">

              {/* 旋转图标 */}
              <div className="relative">
                {/* 背景脉冲 */}
                <div className="absolute inset-0 bg-black/20 rounded animate-ping" />
                <div className="relative w-20 h-20 md:w-24 md:h-24 bg-black text-[#B4F416] rounded border-[3px] border-black shadow-[4px_4px_0px_0px_#B4F416] flex items-center justify-center">
                  <Icon className="w-10 h-10 md:w-12 md:h-12 animate-pulse" strokeWidth={3} />
                </div>
              </div>

              {/* 英文激励 */}
              <div className="text-center">
                <p className="text-xl md:text-2xl lg:text-3xl font-black leading-tight text-black mb-2">
                  {quote.text}
                </p>
                <div className="w-16 h-1 bg-black mx-auto rounded-full" />
              </div>

              {/* 中文翻译 */}
              <div className="px-6 py-3 bg-white border-[3px] border-black shadow-[3px_3px_0px_0px_#000] rounded">
                <p className="text-base md:text-lg font-bold text-black">
                  {quote.cn}
                </p>
              </div>

              {/* 加载提示 */}
              <div className="flex items-center gap-3 mt-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm font-bold text-black">加载中...</span>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  )
}

// 导出一个 hook 来手动控制加载状态
export function useLoading() {
  const [isLoading, setIsLoading] = useState(false)

  const showLoading = () => {
    loadingCount++
    notifyLoadingListeners()
    setIsLoading(true)
  }

  const hideLoading = () => {
    loadingCount = Math.max(0, loadingCount - 1)
    notifyLoadingListeners()
    if (loadingCount === 0) {
      setIsLoading(false)
    }
  }

  return { isLoading, showLoading, hideLoading }
}
