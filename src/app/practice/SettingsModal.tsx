/**
 * 设置悬浮岛组件 - 从右上角控制条底部延伸
 *
 * 包含4个标签页：
 * 1. 音效设置
 * 2. 高级设置
 * 3. 显示设置
 * 4. 数据设置
 */

"use client"

import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, VolumeX, Settings, X, RotateCcw, Download, Upload, AlertCircle } from 'lucide-react'
import { SoundSettings, AdvancedSettings, DisplaySettings, SettingsTabType } from './types'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  activeTab: SettingsTabType
  onTabChange: (tab: SettingsTabType) => void
  soundSettings: SoundSettings
  onSoundSettingsChange: (settings: SoundSettings) => void
  advancedSettings: AdvancedSettings
  onAdvancedSettingsChange: (settings: AdvancedSettings) => void
  displaySettings: DisplaySettings
  onDisplaySettingsChange: (settings: DisplaySettings) => void
  onResetProgress: () => void
  onResetFont: () => void
}

export function SettingsModal({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  soundSettings,
  onSoundSettingsChange,
  advancedSettings,
  onAdvancedSettingsChange,
  displaySettings,
  onDisplaySettingsChange,
  onResetProgress,
  onResetFont,
}: SettingsModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  const tabs = [
    { id: 'sound' as SettingsTabType, label: '音效', icon: Volume2 },
    { id: 'display' as SettingsTabType, label: '显示', icon: Settings },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 半透明背景遮罩 - 点击关闭 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/10 z-40"
            onClick={onClose}
          />

          {/* 悬浮岛设置面板 - 从右上角控制条底部延伸 */}
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{
              type: 'spring',
              damping: 20,
              stiffness: 300,
              opacity: { duration: 0.15 }
            }}
            className="fixed z-50"
            style={{
              top: '88px', // 在右上角控制条（top-6 = 24px + 控制条高度约64px）下方
              right: '24px',
              width: '400px',
              maxHeight: 'calc(100vh - 120px)', // 留出底部呼吸空间
            }}
          >
            {/* 悬浮卡片 */}
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden">
              {/* 头部 - 紧凑设计 */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-800">设置</h2>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  title="关闭"
                >
                  <X size={18} className="text-gray-500" />
                </button>
              </div>

              {/* 标签页导航 - 紧凑布局 */}
              <div className="flex border-b border-gray-200 px-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors relative ${
                      activeTab === tab.id ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <tab.icon size={14} />
                    {tab.label}
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeTabSettings"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* 内容区域 - 滚动 */}
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 240px)' }}>
                <div className="px-5 py-4">
                  <AnimatePresence mode="wait">
                    {activeTab === 'sound' && <SoundSettingsTab settings={soundSettings} onChange={onSoundSettingsChange} />}
                    {activeTab === 'advanced' && <AdvancedSettingsTab settings={advancedSettings} onChange={onAdvancedSettingsChange} />}
                    {activeTab === 'display' && (
                      <DisplaySettingsTab settings={displaySettings} onChange={onDisplaySettingsChange} onResetFont={onResetFont} />
                    )}
                    {activeTab === 'data' && <DataSettingsTab onResetProgress={onResetProgress} />}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ==================== 音效设置标签页 ====================

function SoundSettingsTab({
  settings,
  onChange,
}: {
  settings: SoundSettings
  onChange: (settings: SoundSettings) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      {/* 单词发音 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">单词发音</h3>
            <p className="text-xs text-gray-500">自动朗读</p>
          </div>
          <button
            onClick={() => onChange({ ...settings, wordPronunciation: !settings.wordPronunciation })}
            className={`w-10 h-5 rounded-full transition-colors ${
              settings.wordPronunciation ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <div
              className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                settings.wordPronunciation ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {settings.wordPronunciation && (
          <div className="pl-3 space-y-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">音量: {settings.wordVolume}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.wordVolume}
                onChange={(e) => onChange({ ...settings, wordVolume: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">倍速: {settings.wordSpeed}x</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={settings.wordSpeed}
                onChange={(e) => onChange({ ...settings, wordSpeed: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div>
              <select
                value={settings.pronunciationScheme}
                onChange={(e) => onChange({ ...settings, pronunciationScheme: e.target.value as any })}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="us">美式英语</option>
                <option value="uk">英式英语</option>
                <option value="auto">自动选择</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 按键音 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">按键音</h3>
            <p className="text-xs text-gray-500">打字音效</p>
          </div>
          <button
            onClick={() => onChange({ ...settings, keySound: !settings.keySound })}
            className={`w-10 h-5 rounded-full transition-colors ${
              settings.keySound ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <div
              className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                settings.keySound ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {settings.keySound && (
          <div className="pl-3 space-y-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">音量: {settings.keyVolume}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.keyVolume}
                onChange={(e) => onChange({ ...settings, keyVolume: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div>
              <select
                value={settings.keySoundType}
                onChange={(e) => onChange({ ...settings, keySoundType: e.target.value as any })}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="default">默认</option>
                <option value="mech">机械键盘</option>
                <option value="soft">柔和</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ==================== 高级设置标签页 ====================

function AdvancedSettingsTab({
  settings,
  onChange,
}: {
  settings: AdvancedSettings
  onChange: (settings: AdvancedSettings) => void
}) {
  const options = [
    { key: 'shuffle' as const, label: '章节乱序', desc: '随机排序' },
    { key: 'showContextWords' as const, label: '显示前后单词', desc: '显示导航' },
    { key: 'ignoreCase' as const, label: '忽略大小写', desc: '不区分大小写' },
    { key: 'allowTextSelection' as const, label: '允许选择文本', desc: '支持选择' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-3"
    >
      {options.map((option) => (
        <div key={option.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">{option.label}</h3>
            <p className="text-xs text-gray-500">{option.desc}</p>
          </div>
          <button
            onClick={() => onChange({ ...settings, [option.key]: !settings[option.key] })}
            className={`w-10 h-5 rounded-full transition-colors ${
              settings[option.key] ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <div
              className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                settings[option.key] ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      ))}
    </motion.div>
  )
}

// ==================== 显示设置标签页 ====================

function DisplaySettingsTab({
  settings,
  onChange,
  onResetFont,
}: {
  settings: DisplaySettings
  onChange: (settings: DisplaySettings) => void
  onResetFont: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      {/* 外语字体大小 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">英文单词</h3>
            <p className="text-xs text-gray-500">调整大小</p>
          </div>
          <span className="text-xs font-medium text-blue-600">{settings.foreignFontSize}px</span>
        </div>
        <input
          type="range"
          min="20"
          max="100"
          value={settings.foreignFontSize}
          onChange={(e) => onChange({ ...settings, foreignFontSize: parseInt(e.target.value) })}
          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
      </div>

      {/* 中文字体大小 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">中文释义</h3>
            <p className="text-xs text-gray-500">调整大小</p>
          </div>
          <span className="text-xs font-medium text-blue-600">{settings.chineseFontSize}px</span>
        </div>
        <input
          type="range"
          min="12"
          max="50"
          value={settings.chineseFontSize}
          onChange={(e) => onChange({ ...settings, chineseFontSize: parseInt(e.target.value) })}
          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
      </div>

      {/* 深色模式 */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">深色模式</h3>
          <p className="text-xs text-gray-500">切换主题</p>
        </div>
        <button
          onClick={() => onChange({ ...settings, darkMode: !settings.darkMode })}
          className={`w-10 h-5 rounded-full transition-colors ${
            settings.darkMode ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <div
            className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
              settings.darkMode ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* 重置按钮 */}
      <button
        onClick={onResetFont}
        className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-center gap-2 text-gray-700 text-sm"
      >
        <RotateCcw size={14} />
        重置字体
      </button>
    </motion.div>
  )
}

// ==================== 数据设置标签页 ====================

function DataSettingsTab({ onResetProgress }: { onResetProgress: () => void }) {
  const [exportProgress, setExportProgress] = useState(0)
  // 🔧 内存泄露修复：使用 ref 保存 interval 引用，便于清理
  const exportIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const handleExport = () => {
    // 清理之前的 interval（防止多次点击）
    if (exportIntervalRef.current) {
      clearInterval(exportIntervalRef.current)
    }

    // 模拟导出进度
    setExportProgress(0)
    exportIntervalRef.current = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 100) {
          if (exportIntervalRef.current) {
            clearInterval(exportIntervalRef.current)
            exportIntervalRef.current = null
          }
          return 100
        }
        return prev + 10
      })
    }, 200)

    // 实际导出逻辑
    const data = localStorage.getItem('typingPracticeData')
    if (data) {
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `typing-practice-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  // 🔧 内存泄露修复：组件卸载时清理 interval
  useEffect(() => {
    return () => {
      if (exportIntervalRef.current) {
        clearInterval(exportIntervalRef.current)
        exportIntervalRef.current = null
      }
    }
  }, [])

  const handleImport = () => {
    // 触发文件选择
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target?.result as string)
            localStorage.setItem('typingPracticeData', JSON.stringify(data))
            alert('导入成功！')
            window.location.reload()
          } catch (error) {
            alert('导入失败：文件格式错误')
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      {/* 数据导出 */}
      <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Download className="text-blue-600" size={16} />
            <h3 className="text-sm font-semibold text-gray-800">数据导出</h3>
          </div>
          <button
            onClick={handleExport}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
          >
            导出
          </button>
        </div>
        <p className="text-xs text-gray-600">备份到本地</p>
      </div>

      {/* 数据导入 */}
      <div className="p-3 bg-orange-50 rounded-xl border border-orange-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Upload className="text-orange-600" size={16} />
            <h3 className="text-sm font-semibold text-gray-800">数据导入</h3>
          </div>
          <button
            onClick={handleImport}
            className="px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-xs font-medium"
          >
            导入
          </button>
        </div>
        <p className="text-xs text-orange-700">将覆盖当前数据</p>
      </div>

      {/* 重置进度 */}
      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <RotateCcw className="text-gray-600" size={16} />
          <h3 className="text-sm font-semibold text-gray-800">重置进度</h3>
        </div>
        <button
          onClick={onResetProgress}
          className="w-full px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors text-xs font-medium text-gray-700"
        >
          清除所有数据
        </button>
      </div>
    </motion.div>
  )
}

function useState<T>(initialValue: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void] {
  return React.useState(initialValue)
}
