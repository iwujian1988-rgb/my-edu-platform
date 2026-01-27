'use client'

/**
 * PWA 安装按钮组件
 * 固定在右上角，支持自动安装和手动安装指引
 * 遵循项目 Neo-Brutalism 设计风格
 */

'use client'

import { useState } from 'react'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { Download, X } from 'lucide-react'
import { InstallInstructions } from './InstallInstructions'

export function InstallPWAButton() {
  const {
    isInstallable,
    isInstalled,
    platform,
    promptInstall
  } = usePWAInstall()

  const [showInstructions, setShowInstructions] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // 已安装或被用户关闭时不显示
  if (isInstalled || dismissed) {
    return null
  }

  /**
   * 处理安装按钮点击
   * 如果环境不支持自动安装（isInstallable 为 false），直接显示指引
   */
  const handleInstallClick = async () => {
    // 如果环境不支持自动安装，直接显示指引
    if (!isInstallable) {
      setShowInstructions(true)
      return
    }

    try {
      // 尝试自动安装
      await promptInstall()
    } catch (error) {
      // 捕获所有无法自动安装的情况，统一显示指引
      console.log('无法自动安装，切换为手动指引:', error)
      setShowInstructions(true)
    }
  }

  /**
   * 关闭指引模态框
   */
  const handleCloseInstructions = () => {
    setShowInstructions(false)
  }

  /**
   * 完全隐藏按钮（用户不想安装）
   */
  const handleDismiss = () => {
    setDismissed(true)
  }

  return (
    <>
      {/* 右上角固定按钮 */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        {/* 主安装按钮 */}
        <div className="relative group">
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-2 px-4 py-2 bg-[#CCFF00] border-2 border-black text-black rounded-lg hover:shadow-[4px_4px_0px_0px_#000] hover:-translate-x-[4px] hover:-translate-y-[4px] transition-all font-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-none text-sm"
            aria-label="安装应用"
          >
            <Download className="w-4 h-4" strokeWidth={2.5} />
            <span>安装到桌面</span>
          </button>

          {/* Hover 提示 */}
          <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_#000] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
            <p className="text-xs font-bold text-black leading-relaxed">
              一键安装后可在您的桌面找到入口，方便下次学习
            </p>
            {/* 小三角 */}
            <div className="absolute -top-2 right-4 w-4 h-4 bg-white border-t-2 border-l-2 border-black transform rotate-45" />
          </div>
        </div>

        {/* 关闭按钮 */}
        <button
          onClick={handleDismiss}
          className="p-2 border-2 border-black rounded-lg hover:shadow-[3px_3px_0px_0px_#000] hover:-translate-x-[3px] hover:-translate-y-[3px] transition-all shadow-[1px_1px_0px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-none"
          style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}
          aria-label="关闭"
        >
          <X className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>

      {/* 安装指引模态框 */}
      <InstallInstructions
        isOpen={showInstructions}
        onClose={handleCloseInstructions}
        platform={platform}
      />
    </>
  )
}
