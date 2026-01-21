"use client"

import { useEffect } from "react"
import { captureException } from "@sentry/nextjs"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 记录全局错误到 Sentry
    captureException(error, {
      level: "fatal",
      tags: {
        errorType: "global",
      },
    })
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 dark:from-gray-900 dark:to-red-900/20">
          <div className="max-w-md w-full mx-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
              {/* 严重错误图标 */}
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>

              {/* 标题 */}
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                严重错误
              </h1>

              {/* 描述 */}
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                应用遇到了严重错误。错误已记录，请刷新页面或返回首页。
              </p>

              {/* 操作按钮 */}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={reset}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  刷新页面
                </button>
                <button
                  onClick={() => window.location.href = "/"}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  返回首页
                </button>
              </div>

              {/* 错误 ID（用于追踪） */}
              {error.digest && (
                <p className="mt-6 text-xs text-gray-500 dark:text-gray-400">
                  错误 ID: {error.digest}
                </p>
              )}
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
