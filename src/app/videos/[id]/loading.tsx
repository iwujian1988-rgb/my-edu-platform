/**
 * 视频详情页加载骨架屏
 *
 * 解决 1-2 秒页面空白问题
 * 配合 Next.js Suspense 机制即时显示
 *
 * 样式：Neo-brutalism 风格
 */

export default function VideoLoading() {
  return (
    <div className="min-h-screen bg-gray-50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* 返回按钮骨架 */}
        <div className="h-9 w-24 mb-4 bg-gray-200 dark:bg-gray-700 animate-pulse border-[2px] border-black dark:border-gray-600" />

        {/* 主布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 左侧：视频区 */}
          <div className="lg:col-span-2 space-y-4">
            {/* 视频播放器骨架 */}
            <div className="aspect-video bg-gray-200 dark:bg-gray-700 border-[3px] border-black dark:border-gray-600 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#666] flex items-center justify-center animate-pulse">
              <div className="w-16 h-16 bg-gray-300 dark:bg-gray-600 border-[3px] border-black dark:border-gray-500 flex items-center justify-center">
                <span className="text-2xl text-gray-400">▶</span>
              </div>
            </div>

            {/* 视频信息骨架 */}
            <div className="bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] p-4 transition-colors duration-300">
              <div className="h-7 w-3/4 bg-gray-200 dark:bg-gray-700 animate-pulse mb-2 border-[2px] border-gray-300 dark:border-gray-600" />
              <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 animate-pulse mb-1 border-[2px] border-gray-300 dark:border-gray-600" />
              <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 animate-pulse mb-3 border-[2px] border-gray-300 dark:border-gray-600" />
              <div className="flex gap-2">
                <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 animate-pulse border-[2px] border-gray-300 dark:border-gray-600" />
                <div className="h-6 w-12 bg-gray-200 dark:bg-gray-700 animate-pulse border-[2px] border-gray-300 dark:border-gray-600" />
              </div>
            </div>
          </div>

          {/* 右侧：学习区骨架 */}
          <div className="bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] overflow-hidden transition-colors duration-300">
            {/* Tab 骨架 */}
            <div className="flex border-b-[3px] border-black dark:border-gray-600">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex-1 p-3 flex justify-center border-r-[2px] border-black dark:border-gray-600 last:border-r-0">
                  <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 animate-pulse" />
                </div>
              ))}
            </div>

            {/* 内容骨架 */}
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-3 border-[2px] border-black dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                  <div className="h-4 w-full bg-gray-200 dark:bg-gray-600 animate-pulse mb-2" />
                  <div className="h-3 w-2/3 bg-gray-200 dark:bg-gray-600 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
