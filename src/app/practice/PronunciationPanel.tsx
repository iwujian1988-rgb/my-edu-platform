/**
 * 发音设置子面板 - 灵动岛悬浮子面板
 */

"use client"

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, VolumeX, X, Repeat } from 'lucide-react'
import { SoundSettings } from './types'

interface PronunciationPanelProps {
  isOpen: boolean
  onClose: () => void
  settings: SoundSettings
  onChange: (settings: SoundSettings) => void
}

// 🔧 性能优化：使用React.memo避免不必要的重渲染
export const PronunciationPanel = React.memo(function PronunciationPanel({ isOpen, onClose, settings, onChange }: PronunciationPanelProps) {
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
                  <Volume2 size={18} className="text-blue-600" />
                  <h3 className="text-base font-bold text-gray-800">发音设置</h3>
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
                {/* 音标发音 */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">音标发音</p>
                    <p className="text-xs text-gray-500">显示音标</p>
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
                <p className={`text-xs ${settings.wordPronunciation ? 'text-blue-600' : 'text-gray-400'} pl-1`}>
                  {settings.wordPronunciation ? '已开启' : '已关闭'}
                </p>

                {/* 单词发音 */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">单词发音</p>
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
                <p className={`text-xs ${settings.wordPronunciation ? 'text-blue-600' : 'text-gray-400'} pl-1`}>
                  {settings.wordPronunciation ? '已开启' : '已关闭'}
                </p>

                {/* 发音方案 */}
                <div>
                  <p className="text-sm font-semibold text-gray-800 mb-2">发音方案</p>
                  <div className="flex gap-2">
                    {(['us', 'uk', 'auto'] as const).map((scheme) => (
                      <button
                        key={scheme}
                        onClick={() => onChange({ ...settings, pronunciationScheme: scheme })}
                        className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                          settings.pronunciationScheme === scheme
                            ? 'bg-blue-50 border-blue-600 text-blue-700'
                            : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {scheme === 'us' ? '美音' : scheme === 'uk' ? '英音' : '自动'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 快捷键提示 */}
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    💡 提示：点击音标旁喇叭按钮可播放发音
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
