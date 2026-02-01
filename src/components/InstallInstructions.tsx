'use client'

/**
 * PWA 安装指引模态框
 * 根据不同平台（iOS/Android/Desktop）显示相应的手动安装图文指引
 * 遵循项目 Neo-Brutalism 设计风格
 */

import { X, Apple, Chrome, Globe, Share2, Plus } from 'lucide-react'

interface InstallInstructionsProps {
  /** 是否显示模态框 */
  isOpen: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 平台类型 */
  platform: 'ios' | 'android' | 'desktop' | 'unknown'
}

/**
 * iOS 安装指引内容
 */
const IOSInstructions = () => (
  <div className="space-y-4">
    <div className="flex items-start gap-4 p-4 bg-[#CCFF00] border-2 border-black rounded shadow-[2px_2px_0px_0px_#000]">
      <Globe className="w-8 h-8 flex-shrink-0 mt-1" strokeWidth={2.5} />
      <div>
        <h3 className="font-black text-lg mb-1">第一步：打开分享菜单</h3>
        <p className="text-sm font-bold">点击浏览器底部的 <span className="bg-black text-[#CCFF00] px-2 py-0.5 rounded">分享</span> 按钮</p>
      </div>
    </div>

    <div className="flex items-start gap-4 p-4 bg-[#CCFF00] border-2 border-black rounded shadow-[2px_2px_0px_0px_#000]">
      <Share2 className="w-8 h-8 flex-shrink-0 mt-1" strokeWidth={2.5} />
      <div>
        <h3 className="font-black text-lg mb-1">第二步：找到添加选项</h3>
        <p className="text-sm font-bold">向下滚动，点击 <span className="bg-black text-[#CCFF00] px-2 py-0.5 rounded">添加到主屏幕</span></p>
      </div>
    </div>

    <div className="flex items-start gap-4 p-4 bg-[#CCFF00] border-2 border-black rounded shadow-[2px_2px_0px_0px_#000]">
      <Plus className="w-8 h-8 flex-shrink-0 mt-1" strokeWidth={2.5} />
      <div>
        <h3 className="font-black text-lg mb-1">第三步：确认添加</h3>
        <p className="text-sm font-bold">点击右上角的 <span className="bg-black text-[#CCFF00] px-2 py-0.5 rounded">添加</span> 按钮完成安装</p>
      </div>
    </div>
  </div>
)

/**
 * Android 安装指引内容
 */
const AndroidInstructions = () => (
  <div className="space-y-4">
    <div className="flex items-start gap-4 p-4 bg-[#CCFF00] border-2 border-black rounded shadow-[2px_2px_0px_0px_#000]">
      <Chrome className="w-8 h-8 flex-shrink-0 mt-1" strokeWidth={2.5} />
      <div>
        <h3 className="font-black text-lg mb-1">第一步：打开菜单</h3>
        <p className="text-sm font-bold">点击浏览器右上角的 <span className="bg-black text-[#CCFF00] px-2 py-0.5 rounded">三个点</span> 菜单</p>
      </div>
    </div>

    <div className="flex items-start gap-4 p-4 bg-[#CCFF00] border-2 border-black rounded shadow-[2px_2px_0px_0px_#000]">
      <Plus className="w-8 h-8 flex-shrink-0 mt-1" strokeWidth={2.5} />
      <div>
        <h3 className="font-black text-lg mb-1">第二步：安装应用</h3>
        <p className="text-sm font-bold">点击 <span className="bg-black text-[#CCFF00] px-2 py-0.5 rounded">安装应用</span> 或 <span className="bg-black text-[#CCFF00] px-2 py-0.5 rounded">添加到主屏幕</span></p>
      </div>
    </div>

    <div className="flex items-start gap-4 p-4 bg-[#CCFF00] border-2 border-black rounded shadow-[2px_2px_0px_0px_#000]">
      <Share2 className="w-8 h-8 flex-shrink-0 mt-1" strokeWidth={2.5} />
      <div>
        <h3 className="font-black text-lg mb-1">第三步：确认安装</h3>
        <p className="text-sm font-bold">按照屏幕提示完成安装即可</p>
      </div>
    </div>
  </div>
)

/**
 * Desktop 安装指引内容
 */
const DesktopInstructions = () => (
  <div className="space-y-4">
    <div className="flex items-start gap-4 p-4 bg-[#CCFF00] border-2 border-black rounded shadow-[2px_2px_0px_0px_#000]">
      <Chrome className="w-8 h-8 flex-shrink-0 mt-1" strokeWidth={2.5} />
      <div>
        <h3 className="font-black text-lg mb-1">Chrome/Edge 浏览器</h3>
        <p className="text-sm font-bold">
          点击地址栏右侧的 <span className="bg-black text-[#CCFF00] px-2 py-0.5 rounded">安装图标</span> 或
          在菜单中选择 <span className="bg-black text-[#CCFF00] px-2 py-0.5 rounded">安装应用</span>
        </p>
      </div>
    </div>

    <div className="flex items-start gap-4 p-4 bg-[#CCFF00] border-2 border-black rounded shadow-[2px_2px_0px_0px_#000]">
      <Globe className="w-8 h-8 flex-shrink-0 mt-1" strokeWidth={2.5} />
      <div>
        <h3 className="font-black text-lg mb-1">Safari 浏览器</h3>
        <p className="text-sm font-bold">
          点击 <span className="bg-black text-[#CCFF00] px-2 py-0.5 rounded">分享</span> 按钮，
          选择 <span className="bg-black text-[#CCFF00] px-2 py-0.5 rounded">添加到主屏幕</span>
        </p>
      </div>
    </div>
  </div>
)

/**
 * InstallInstructions: PWA 安装指引模态框
 */
export function InstallInstructions({ isOpen, onClose, platform }: InstallInstructionsProps) {
  // 未打开时不渲染
  if (!isOpen) return null

  const renderContent = () => {
    switch (platform) {
      case 'ios':
        return <IOSInstructions />
      case 'android':
        return <AndroidInstructions />
      case 'desktop':
        return <DesktopInstructions />
      default:
        return <DesktopInstructions />
    }
  }

  const getPlatformTitle = () => {
    switch (platform) {
      case 'ios':
        return 'iOS 设备安装指南'
      case 'android':
        return 'Android 设备安装指南'
      case 'desktop':
        return '桌面设备安装指南'
      default:
        return '安装指南'
    }
  }

  const getPlatformIcon = () => {
    switch (platform) {
      case 'ios':
        return <Apple className="w-8 h-8" strokeWidth={2.5} />
      case 'android':
        return <Globe className="w-8 h-8" strokeWidth={2.5} />
      default:
        return <Globe className="w-8 h-8" strokeWidth={2.5} />
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="border-2 border-black rounded shadow-[6px_6px_0px_0px_#000] max-w-lg w-full max-h-[90vh] overflow-y-auto transition-colors duration-300"
        style={{ backgroundColor: 'var(--card-bg)' }}
      >
        {/* 标题栏 */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b-2 border-black z-10" style={{ backgroundColor: 'var(--card-bg)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#CCFF00] border-2 border-black rounded shadow-[2px_2px_0px_0px_#000]">
              {getPlatformIcon()}
            </div>
            <h2 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
              {getPlatformTitle()}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-black/10 rounded transition-colors"
            aria-label="关闭"
          >
            <X className="w-6 h-6" strokeWidth={2.5} />
          </button>
        </div>

        {/* 内容区 */}
        <div className="p-6">
          <p className="text-sm font-bold mb-4 p-3 bg-black/5 border-2 border-black rounded" style={{ color: 'var(--text-secondary)' }}>
            💡 您的设备需要手动安装，请按照以下步骤操作：
          </p>

          {renderContent()}

          {/* 提示信息 */}
          <div className="mt-6 p-4 border-2 border-black rounded shadow-[2px_2px_0px_0px_#000]" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <p className="text-sm font-bold text-center" style={{ color: 'var(--text-primary)' }}>
              ✅ 安装后可在桌面找到应用图标，方便下次学习！
            </p>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="sticky bottom-0 p-6 border-t-2 border-black" style={{ backgroundColor: 'var(--card-bg)' }}>
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-[#CCFF00] border-2 border-black text-black rounded hover:shadow-[4px_4px_0px_0px_#000] hover:-translate-x-[4px] hover:-translate-y-[4px] transition-all font-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-none"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  )
}
