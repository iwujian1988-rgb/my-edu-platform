/**
 * 单词循环子面板 - 灵动岛悬浮子面板
 */

"use client"

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Repeat, X } from 'lucide-react'

interface LoopPanelProps {
  isOpen: boolean
  onClose: () => void
  loopCount: number
  onLoopCountChange: (count: number) => void
}

// 🔧 性能优化：使用React.memo避免不必要的重渲染
export const LoopPanel = React.memo(function LoopPanel({ isOpen, onClose, loopCount, onLoopCountChange }: LoopPanelProps) {
  if (!isOpen) return null

  const options = [
    { value: 1, label: '不循环' },
    { value: 3, label: '3遍' },
    { value: 5, label: '5遍' },
    { value: 9, label: '9遍' },
    { value: 0, label: '无限' },
  ]

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
              width: '280px',
            }}
          >
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden">
              {/* 头部 */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Repeat size={18} className="text-green-600" />
                  <h3 className="text-base font-bold text-gray-800">循环练习</h3>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={16} className="text-gray-500" />
                </button>
              </div>

              {/* 内容 */}
              <div className="px-5 py-4 space-y-2">
                {options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => onLoopCountChange(option.value)}
                    className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      loopCount === option.value
                        ? 'bg-green-50 text-green-700 border-2 border-green-600'
                        : 'text-gray-700 hover:bg-gray-50 border-2 border-transparent'
                    }`}
                  >
                    {option.label}
                    {loopCount === option.value && (
                      <span className="ml-2 text-xs text-green-600">当前</span>
                    )}
                  </button>
                ))}

                {/* 说明 */}
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    💡 选择每个单词的重复次数
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
