/**
 * 视频详情页加载骨架屏
 *
 * 解决 1-2 秒页面空白问题
 * 配合 Next.js Suspense 机制即时显示
 *
 * 样式：Neo-brutalism 风格
 */

interface VideoBasicInfo {
  id: string
  title: string
  original_title?: string | null
  thumbnail_url?: string | null
  video_url?: string | null
}

interface VideoLoadingProps {
  video?: VideoBasicInfo
}

export default function VideoLoading({ video }: VideoLoadingProps) {
  return (
    <div className="min-h-screen bg-gray-50 transition-colors duration-300">
      {/* ===== 移动端布局 ===== */}
      <div className="lg:hidden">
        {/* 视频区 - 吸顶 */}
        <div className="sticky top-0 z-40 bg-gray-50 dark:bg-gray-900">
          {/* 返回按钮 */}
          <div className="px-3 py-1.5">
            <div className="h-7 w-14 bg-gray-200 dark:bg-gray-700 animate-pulse border-[2px] border-black dark:border-gray-600" />
          </div>

          {/* 视频播放器骨架 */}
          <div className="aspect-video bg-gray-200 dark:bg-gray-700 border-[3px] border-t-0 border-black dark:border-gray-600 flex items-center justify-center">
            {video?.thumbnail_url ? (
              <img
                src={video.thumbnail_url}
                alt={video.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-300 dark:bg-gray-600 border-[3px] border-black dark:border-gray-500 flex items-center justify-center animate-pulse">
                <span className="text-2xl text-gray-400">▶</span>
              </div>
            )}
          </div>

          {/* 功能按钮导航骨架 */}
          <div className="bg-white dark:bg-gray-800 border-b-[3px] border-black dark:border-gray-600 px-3 py-2">
            <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 animate-pulse mb-2 border-[2px] border-gray-300 dark:border-gray-600" />
            <div className="flex items-center justify-end gap-1">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-9 w-9 bg-gray-200 dark:bg-gray-700 animate-pulse border-[2px] border-black dark:border-gray-600" />
              ))}
            </div>
          </div>
        </div>

        {/* 内容区骨架 */}
        <div className="bg-white dark:bg-gray-800 border-[3px] border-t-0 border-black dark:border-gray-600 h-[60vh] p-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-3 border-[2px] border-black dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
              <div className="h-4 w-full bg-gray-200 dark:bg-gray-600 animate-pulse mb-2" />
              <div className="h-3 w-2/3 bg-gray-200 dark:bg-gray-600 animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* ===== PC端布局 ===== */}
      <div className="hidden lg:block w-full mx-auto px-2 lg:px-4 py-2">
        <div className="grid grid-cols-12 gap-3">
          {/* 左侧：视频区 */}
          <div className="col-span-8">
            <div className="sticky top-2 z-30 space-y-3">
              {/* 返回按钮 */}
              <div className="h-10 w-28 bg-white dark:bg-gray-800 border-[2px] border-black dark:border-gray-600 shadow-[3px_3px_0px_0px_#000] animate-pulse" />

              {/* 视频播放器骨架 */}
              <div className="aspect-video bg-gray-200 dark:bg-gray-700 border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] flex items-center justify-center">
                {video?.thumbnail_url ? (
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-300 dark:bg-gray-600 border-[3px] border-black dark:border-gray-500 flex items-center justify-center animate-pulse">
                    <span className="text-3xl text-gray-400">▶</span>
                  </div>
                )}
              </div>

              {/* 视频信息骨架 */}
              <div className="bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] p-4">
                <div className="h-7 w-3/4 bg-gray-200 dark:bg-gray-700 animate-pulse mb-2 border-[2px] border-gray-300 dark:border-gray-600" />
                <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 animate-pulse mb-1 border-[2px] border-gray-300 dark:border-gray-600" />
                <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 animate-pulse mb-3 border-[2px] border-gray-300 dark:border-gray-600" />
                <div className="flex gap-2">
                  <div className="h-7 w-16 bg-[#B4F416] border-[2px] border-black animate-pulse" />
                  <div className="h-7 w-12 bg-gray-200 dark:bg-gray-700 border-[2px] border-black animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：学习区骨架 */}
          <div className="col-span-4">
            <div className="sticky top-2 z-30">
              {/* 占位符：与左侧返回按钮高度对齐 */}
              <div className="h-10 mb-4" />

              <div className="bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] overflow-hidden">
                {/* Tab 骨架 */}
                <div className="flex border-b-[3px] border-black dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2">
                  <div className="w-[52px]" />
                  <div className="flex items-center gap-1 flex-1 justify-end">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="h-9 w-9 bg-gray-200 dark:bg-gray-600 border-[2px] border-black dark:border-gray-500 animate-pulse" />
                    ))}
                  </div>
                </div>

                {/* 内容骨架 */}
                <div className="p-4 space-y-3" style={{ height: '500px', overflow: 'hidden' }}>
                  {Array.from({ length: 10 }).map((_, i) => (
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
      </div>
    </div>
  )
}
