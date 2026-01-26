/**
 * PWA 安装 Hook
 * 监听 beforeinstallprompt 事件并提供安装方法
 */
import { useState, useEffect } from 'react'

// ==================== 类型定义 ====================

/**
 * 扩展 Window 接口，添加 beforeinstallprompt 事件支持
 */
declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}

/**
 * beforeinstallprompt 事件类型定义
 */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  prompt(): Promise<void>
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
}

// ==================== Hook ====================

export interface UsePWAInstallReturn {
  /** 是否可以安装（浏览器支持且未安装） */
  isInstallable: boolean
  /** 触发安装提示 */
  promptInstall: () => Promise<void>
}

export function usePWAInstall(): UsePWAInstallReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)

  useEffect(() => {
    // 监听 beforeinstallprompt 事件
    const handler = (e: BeforeInstallPromptEvent) => {
      // 阻止默认安装提示
      e.preventDefault()

      // 存储事件对象，稍后手动触发
      setDeferredPrompt(e)

      // 标记为可安装
      setIsInstallable(true)

      console.log('✅ [PWA] beforeinstallprompt 事件触发，可以安装')
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  /**
   * 手动触发安装提示
   */
  const promptInstall = async (): Promise<void> => {
    if (!deferredPrompt) {
      console.warn('⚠️ [PWA] 暂无可用安装提示')
      return
    }

    // 显示安装提示
    deferredPrompt.prompt()

    // 等待用户选择
    const { outcome } = await deferredPrompt.userChoice

    console.log(`📱 [PWA] 用户选择: ${outcome}`)

    // 清除存储的事件对象（只能触发一次）
    setDeferredPrompt(null)
    setIsInstallable(false)
  }

  return {
    isInstallable,
    promptInstall,
  }
}
