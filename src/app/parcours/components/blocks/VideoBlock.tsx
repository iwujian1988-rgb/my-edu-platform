'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/components/blocks/VideoBlock.vue
 *
 * 数据支持两种形式：
 *   - block.videoUrl（扁平）
 *   - block.asset.videoUrl（嵌套 asset，含字幕/教材 URL）
 *
 * 与原版一致：原生 <video controls>，非 iframe；含 loading skeleton 和 error fallback；
 * fallback 显示 asset.channel / asset.segmentId。
 */

import { useState } from 'react'
import type { Block } from '@/data/parcours-mock'

export function VideoBlock({ block }: { block: Block }) {
  const [buffering, setBuffering] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

  const resolvedUrl = block.videoUrl || block.asset?.videoUrl || null

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      {block.title && (
        <div className="px-5 pb-2 pt-4">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">{block.title}</h3>
        </div>
      )}

      {!resolvedUrl ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">视频暂不可用</p>
        </div>
      ) : (
        <div className="relative bg-black">
          {buffering && !loadFailed && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-gray-900">
              <div className="text-center">
                <div className="mx-auto mb-2 h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <p className="text-xs text-gray-400">加载视频中...</p>
              </div>
            </div>
          )}

          <video
            controls
            className="aspect-video w-full"
            poster={block.poster || undefined}
            preload="metadata"
            onLoadedData={() => setBuffering(false)}
            onWaiting={() => setBuffering(true)}
            onCanPlay={() => setBuffering(false)}
            onError={() => {
              setLoadFailed(true)
              setBuffering(false)
            }}
          >
            <source src={resolvedUrl} />
            您的浏览器不支持视频播放。
          </video>

          {loadFailed && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center">
                <svg
                  className="mx-auto mb-2 h-12 w-12 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-sm text-gray-300">视频暂不可用</p>
                {block.asset?.channel && (
                  <p className="mt-1 text-xs text-gray-500">
                    {block.asset.channel} / {block.asset.segmentId}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
