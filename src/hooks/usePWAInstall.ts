/**
 * PWA 安装 Hook
 * 监听 beforeinstallprompt 事件并提供安装方法
 * 增加平台检测：iOS、移动端、独立模式
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

// ==================== 平台检测函数 ====================

/**
 * 检测是否为 iOS 设备
 */
export const isIOS = (): boolean => {
  if (typeof window === 'undefined') return false

  const ua = window.navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes('Mac') && 'ontouchend' in document) // iPad OS 13+
}

/**
 * 检测是否为移动设备
 */
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false

  const ua = window.navigator.userAgent
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
    (ua.includes('Mac') && 'ontouchend' in document)
}

/**
 * 检测是否已作为独立应用运行（已安装 PWA）
 */
export const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false

  return (window.navigator as any).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
}

/**
 * 获取当前平台类型
 */
export type PlatformType = 'ios' | 'android' | 'desktop' | 'unknown'

export const getPlatform = (): PlatformType => {
  if (typeof window === 'undefined') return 'unknown'

  if (isIOS()) return 'ios'

  const ua = window.navigator.userAgent
  if (/Android/i.test(ua)) return 'android'

  return 'desktop'
}

// ==================== Hook ====================

export interface UsePWAInstallReturn {
  /** 是否可以安装（浏览器支持且未安装） */
  isInstallable: boolean
  /** 触发安装提示 */
  promptInstall: () => Promise<void>
  /** 是否为 iOS 设备 */
  isIOSDevice: boolean
  /** 是否为移动设备 */
  isMobileDevice: boolean
  /** 是否已安装（独立模式运行） */
  isInstalled: boolean
  /** 当前平台类型 */
  platform: PlatformType
}

export function usePWAInstall(): UsePWAInstallReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)

  // 平台检测结果
  const isIOSDevice = isIOS()
  const isMobileDevice = isMobile()
  const isInstalled = isStandalone()
  const platform = getPlatform()

  useEffect(() => {
    // 已安装时不需要监听
    if (isInstalled) {
      console.log('✅ [PWA] 应用已安装，运行在独立模式')
      return
    }

    // 监听 beforeinstallprompt 事件
    const handler = (e: BeforeInstallPromptEvent) => {
      // 阻止默认安装提示
      e.preventDefault()

      // 存储事件对象，稍后手动触发
      setDeferredPrompt(e)

      // 标记为可安装
      setIsInstallable(true)

      console.log('✅ [PWA] beforeinstallprompt 事件触发，可以安装')
      console.log(`📱 [PWA] 平台检测: iOS=${isIOSDevice}, Mobile=${isMobileDevice}, Platform=${platform}`)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [isIOSDevice, isMobileDevice, platform, isInstalled])

  /**
   * 手动触发安装提示
   */
  const promptInstall = async (): Promise<void> => {
    // iOS/移动设备不支持 beforeinstallprompt
    if (isIOSDevice || (isMobileDevice && platform === 'ios')) {
      console.warn('⚠️ [PWA] iOS 设备不支持自动安装，需要手动指引')
      throw new Error('IOS_NEED_MANUAL_INSTALL')
    }

    if (!deferredPrompt) {
      console.warn('⚠️ [PWA] 暂无可用安装提示')
      throw new Error('NO_INSTALL_PROMPT')
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
    isInstallable: isInstallable && !isInstalled,
    promptInstall,
    isIOSDevice,
    isMobileDevice,
    isInstalled,
    platform,
  }
}
