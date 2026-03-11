/**
 * 听写页面 Loading 猈界 - 临时加载状态组件
 */
export function DictationLoading() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* 加载动画 */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-black dark:border-gray-600"></div>
          <div className="absolute inset-0 border-4 border-[#B4F416] animate-pulse"></div>
          <div className="absolute inset-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-black dark:text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 1.41-5.66 1.42 1.41 5.66 1.42-5.66L7.89-5.66-1.42-1.41-5.66-1.42-5.66L7.89 5.66 1.42 5.66 1.42 5.66L7.89 1.41 5.66 1.41 5.66-7.89 5.66-1.42-1.41-5.66-1.42-5.66L-7.89-5.66-1.42-1.41-5.66-1.42-5.66L7.89-5.66 1.42-5.66 1.42-5.66 7.89-5.66 1.41 5.66 1.41 5.66-7.89 5.66-1.42-1.41-5.66-1.42-5.66Z" />
          </svg>
          </div>
        </div>
        {/* 加载文字 */}
        <p className="text-lg font-black tracking-tight text-black dark:text-white animate-pulse">
          Loading...
        </p>
        <p className="text-sm font-mono text-gray-600 dark:text-gray-400">
          正在加载听写内容
        </p>
      </div>
    </div>
  )
}
