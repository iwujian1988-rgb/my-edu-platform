"use client"

import { useEffect } from "react"
import { captureException } from "@sentry/nextjs"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 将错误记录到 Sentry
    captureException(error)

    // 也可以记录到控制台
    console.error("应用错误:", error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
          {/* 错误图标 */}
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
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>

          {/* 标题 */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            出错了！
          </h1>

          {/* 描述 */}
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            抱歉，页面遇到了一些问题。错误已记录，我们会尽快修复。
          </p>

          {/* 错误详情（开发环境） */}
          {process.env.NODE_ENV === "development" && error.message && (
            <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-left">
              <p className="text-sm text-gray-700 dark:text-gray-300 font-mono break-all">
                {error.message}
              </p>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-3 justify-center">
            <Button
              onClick={reset}
              className="flex-1"
            >
              重试
            </Button>
            <Button
              onClick={() => window.location.href = "/"}
              variant="outline"
              className="flex-1"
            >
              返回首页
            </Button>
          </div>

          {/* 帮助信息 */}
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            如果问题持续存在，请联系客服或稍后再试
          </p>
        </div>
      </div>
    </div>
  )
}
