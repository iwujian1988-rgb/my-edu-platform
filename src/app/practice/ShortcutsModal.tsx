/**
 * 快捷键提示对话框
 *
 * 按 Ctrl+J 显示所有可用的快捷键
 */

"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { X, Keyboard } from 'lucide-react'

interface Shortcut {
  key: string
  action: string
  description: string
}

interface ShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

const shortcuts: Shortcut[] = [
  { key: 'Enter', action: '开始练习', description: '开始或继续打字练习' },
  { key: 'Ctrl + V', action: '切换打字音', description: '开启/关闭按键音效' },
  { key: 'Ctrl + M', action: '切换默写模式', description: '开启/关闭单词隐藏' },
  { key: 'Ctrl + Shift + V', action: '切换释义显示', description: '开启/关闭中文释义' },
  { key: 'Ctrl + J', action: '显示快捷键', description: '查看所有可用快捷键' },
  { key: 'Esc', action: '关闭对话框', description: '关闭设置或快捷键提示' },
  { key: 'Backspace', action: '删除字符', description: '删除上一个输入的字符' },
]

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  if (!isOpen) return null

  // ESC 键关闭
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      ></motion.div>

      {/* 对话框 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Keyboard className="text-blue-600" size={20} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">快捷键列表</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="关闭 (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6">
          <div className="space-y-3">
            {shortcuts.map((shortcut, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <kbd className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg shadow-sm font-mono text-sm font-medium text-gray-700">
                    {shortcut.key}
                  </kbd>
                  <div>
                    <h3 className="font-semibold text-gray-800">{shortcut.action}</h3>
                    <p className="text-sm text-gray-500">{shortcut.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* 提示 */}
          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-sm text-blue-700">
              💡 <strong>提示：</strong>使用快捷键可以大幅提高学习效率，建议牢记常用快捷键！
            </p>
          </div>
        </div>

        {/* 底部 */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            知道了 (Esc)
          </button>
        </div>
      </motion.div>
    </div>
  )
}
