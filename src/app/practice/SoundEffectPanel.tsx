/**
 * 音效设置子面板 - 灵动岛悬浮子面板
 */

"use client"

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, VolumeX, X } from 'lucide-react'
import { SoundSettings } from './types'

interface SoundEffectPanelProps {
  isOpen: boolean
  onClose: () => void
  settings: SoundSettings
  onChange: (settings: SoundSettings) => void
}

// 🔧 性能优化：使用React.memo避免不必要的重渲染
export const SoundEffectPanel = React.memo(function SoundEffectPanel({ isOpen, onClose, settings, onChange }: SoundEffectPanelProps) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 半透明背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/10 z-40"
            onClick={onClose}
          />

          {/* 悬浮岛子面板 */}
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed z-50"
            style={{
              top: '100px',
              right: '24px',
              width: '320px',
            }}
          >
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden">
              {/* 头部 */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Volume2 size={18} className="text-purple-600" />
                  <h3 className="text-base font-bold text-gray-800">音效设置</h3>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={16} className="text-gray-500" />
                </button>
              </div>

              {/* 内容 */}
              <div className="px-5 py-4 space-y-4">
                {/* 按键音 */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">按键音</p>
                    <p className="text-xs text-gray-500">打字音效</p>
                  </div>
                  <button
                    onClick={() => onChange({ ...settings, keySound: !settings.keySound })}
                    className={`w-10 h-5 rounded-full transition-colors ${
                      settings.keySound ? 'bg-purple-600' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        settings.keySound ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
                <p className={`text-xs ${settings.keySound ? 'text-purple-600' : 'text-gray-400'} pl-1`}>
                  {settings.keySound ? '已开启' : '已关闭'}
                </p>

                {/* 音量控制 */}
                {settings.keySound && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-2">音量: {settings.keyVolume}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.keyVolume}
                      onChange={(e) => onChange({ ...settings, keyVolume: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                  </div>
                )}

                {/* 效果音 */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">效果音</p>
                    <p className="text-xs text-gray-500">正误提示</p>
                  </div>
                  <button
                    onClick={() => onChange({ ...settings, effectSound: !settings.effectSound })}
                    className={`w-10 h-5 rounded-full transition-colors ${
                      settings.effectSound ? 'bg-purple-600' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        settings.effectSound ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
                <p className={`text-xs ${settings.effectSound ? 'text-purple-600' : 'text-gray-400'} pl-1`}>
                  {settings.effectSound ? '已开启' : '已关闭'}
                </p>

                {/* 快捷键提示 */}
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    💡 提示：使用 Ctrl+V 快速切换按键音
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
})
