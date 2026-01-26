'use client'

/**
 * PWA 安装按钮组件
 * 固定在屏幕右下角，仅在可安装时显示
 */
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { Download } from 'lucide-react'

export function InstallPWAButton() {
  const { isInstallable, promptInstall } = usePWAInstall()

  // 不可安装时完全隐藏
  if (!isInstallable) {
    return null
  }

  return (
    <button
      onClick={promptInstall}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl hover:from-indigo-600 hover:to-purple-700 active:scale-95 transition-all duration-200 font-medium text-sm"
      aria-label="安装应用"
    >
      <Download className="w-5 h-5" />
      <span>安装 App</span>
    </button>
  )
}
