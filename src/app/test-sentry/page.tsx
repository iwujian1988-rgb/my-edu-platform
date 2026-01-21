"use client"

import * as Sentry from "@sentry/nextjs"
import { Button } from "@/components/ui/button"

export default function TestSentryPage() {
  const triggerError = () => {
    try {
      // 触发一个测试错误
      throw new Error("Sentry 测试错误 - 这是正常的测试错误")
    } catch (error) {
      // 发送到 Sentry
      Sentry.captureException(error)

      // 同时显示给用户
      alert("错误已发送到 Sentry！请检查 Sentry Dashboard。")
    }
  }

  const triggerMessage = () => {
    // 发送一条消息到 Sentry
    Sentry.captureMessage("这是一条测试消息", "info")

    alert("消息已发送到 Sentry！")
  }

  const addUserContext = () => {
    // 设置用户上下文
    Sentry.setUser({
      id: "test-user-123",
      email: "test@example.com",
      username: "测试用户",
    })

    alert("已设置用户上下文！")
  }

  const addBreadcrumb = () => {
    // 添加面包屑（用户操作轨迹）
    Sentry.addBreadcrumb({
      message: "用户点击了测试按钮",
      category: "test",
      level: "info",
    })

    alert("已添加面包屑！")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Sentry 测试页面
          </h1>

          <p className="text-gray-600 dark:text-gray-400 mb-6">
            点击下面的按钮测试 Sentry 集成。所有错误和消息都会发送到 Sentry Dashboard。
          </p>

          <div className="space-y-4">
            {/* 测试错误捕获 */}
            <div className="border rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                1. 测试错误捕获
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                触发一个测试错误，验证 Sentry 是否能捕获
              </p>
              <Button onClick={triggerError} variant="destructive">
                触发测试错误
              </Button>
            </div>

            {/* 测试消息发送 */}
            <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                2. 测试消息发送
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                发送一条消息到 Sentry
              </p>
              <Button onClick={triggerMessage}>
                发送测试消息
              </Button>
            </div>

            {/* 测试用户上下文 */}
            <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                3. 测试用户上下文
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                设置测试用户信息，方便追踪错误
              </p>
              <Button onClick={addUserContext} variant="outline">
                设置用户上下文
              </Button>
            </div>

            {/* 测试面包屑 */}
            <div className="border rounded-lg p-4 bg-yellow-50 dark:bg-yellow-900/20">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                4. 测试面包屑（操作轨迹）
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                添加用户操作轨迹，帮助重现错误
              </p>
              <Button onClick={addBreadcrumb} variant="outline">
                添加面包屑
              </Button>
            </div>
          </div>

          {/* Sentry 链接 */}
          <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Sentry Dashboard
            </h3>
            <a
              href="https://sentry.io/organizations/maxnote/projects/javascript-nextjs/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              查看 Sentry 控制台 →
            </a>
          </div>

          {/* 说明 */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              💡 提示
            </h3>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <li>• 点击按钮后，等待 1-2 分钟</li>
              <li>• 在 Sentry Dashboard 查看错误和消息</li>
              <li>• 可以看到完整的堆栈追踪、用户信息和浏览器信息</li>
              <li>• 生产环境会自动发送所有未捕获的错误</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
