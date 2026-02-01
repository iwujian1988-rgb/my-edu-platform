'use client'

/**
 * PWA 安装按钮组件
 * 固定在右上角，支持自动安装和手动安装指引
 * 遵循项目 Neo-Brutalism 设计风格
 *
 * ⚠️ 注意：此组件只在登录后的首页显示
 */

'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { Download } from 'lucide-react'
import { InstallInstructions } from './InstallInstructions'
import { createClient } from '@/lib/supabase/client'

export function InstallPWAButton() {
  const {
    isInstallable,
    isInstalled,
    platform,
    promptInstall
  } = usePWAInstall()

  const [showInstructions, setShowInstructions] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const pathname = usePathname()

  // 检查用户登录状态
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        setIsLoggedIn(!!session)
      } catch (error) {
        console.error('检查登录状态失败:', error)
        setIsLoggedIn(false)
      }
    }

    checkAuth()
  }, [])

  // 只在登录后的首页（/）显示，其他页面不显示
  const shouldShow = isLoggedIn && pathname === '/'

  // 已安装或不满足显示条件时不显示
  if (isInstalled || !shouldShow) {
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

  return (
    <>
      {/* 右上角固定按钮 */}
      <div className="fixed top-4 right-4 z-50">
        {/* 主安装按钮 - 无悬停交互 */}
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-2 px-4 py-2 bg-[#CCFF00] border-2 border-black text-black rounded shadow-[2px_2px_0px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-none font-black text-sm transition-none"
          aria-label="安装应用"
        >
          <Download className="w-4 h-4" strokeWidth={2.5} />
          <span>安装到桌面</span>
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
