/**
 * 错题本悬浮岛 - 居中大面板（90vw、卡片流）
 */

"use client"

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertCircle, Volume2, CheckCircle2, Trash2, Play } from 'lucide-react'
import { MistakeEntry } from './useMistakeBook'

interface MistakesPanelProps {
  isOpen: boolean
  onClose: () => void
  mistakes: MistakeEntry[]
  onPracticeWord: (word: string) => void
  onStartSpecialReview: () => void
  onClearMastered: () => void
  onPlayPronunciation: (word: string) => void
}

// 🔧 性能优化：使用React.memo避免不必要的重渲染
export const MistakesPanel = React.memo(function MistakesPanel({
  isOpen,
  onClose,
  mistakes,
  onPracticeWord,
  onStartSpecialReview,
  onClearMastered,
  onPlayPronunciation,
}: MistakesPanelProps) {
  if (!isOpen) return null

  const getMistakeColor = (count: number) => {
    if (count >= 10) return 'bg-red-600 text-white'
    if (count >= 7) return 'bg-red-500 text-white'
    if (count >= 5) return 'bg-orange-500 text-white'
    if (count >= 3) return 'bg-yellow-500 text-white'
    return 'bg-blue-500 text-white'
  }

  const getMistakeLabel = (count: number) => {
    if (count >= 10) return '困难'
    if (count >= 7) return '需加强'
    if (count >= 5) return '多错'
    if (count >= 3) return '常错'
    return '需关注'
  }

  const unmasteredCount = mistakes.filter((m) => !m.mastered).length
  const masteredCount = mistakes.filter((m) => m.mastered).length

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
            className="fixed inset-0 bg-black/20 z-40 flex items-center justify-center p-4"
            onClick={onClose}
          />

          {/* 居中大面板 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed z-50 left-0 top-0 right-0 bottom-0 flex items-center justify-center pointer-events-none p-4"
          >
            <div
              className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-gray-200/50 overflow-hidden flex flex-col pointer-events-auto"
              style={{
                width: '90vw',
                maxWidth: '896px',
                maxHeight: '80vh',
              }}
            >
              {/* 头部 */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                    <AlertCircle size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">错题本</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      共 {mistakes.length} 个错题 · {unmasteredCount} 个待复习
                      {masteredCount > 0 && ` · ${masteredCount} 个已掌握`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X size={22} className="text-gray-500" />
                </button>
              </div>

              {/* 内容区域 - 可滚动 */}
              <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
                {mistakes.length === 0 ? (
                  <div className="text-center py-16">
                    <CheckCircle2 size={64} className="mx-auto text-green-400 mb-4" />
                    <p className="text-xl font-semibold text-gray-700 mb-2">太棒了！暂无错题</p>
                    <p className="text-sm text-gray-500">继续保持，单词掌握得很好！</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {mistakes.map((mistake, index) => (
                      <motion.div
                        key={mistake.word}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={`group relative p-5 rounded-2xl border-2 transition-all duration-200 ${
                          mistake.mastered
                            ? 'bg-green-50/80 border-green-200 hover:bg-green-50'
                            : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md hover:scale-[1.01]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          {/* 左侧：单词和音标 */}
                          <div className="flex-1 flex items-center gap-3 min-w-0">
                            <div className="flex-shrink-0">
                              <span
                                className={`text-xl font-bold tracking-wide ${
                                  mistake.mastered ? 'text-green-700 line-through' : 'text-gray-800'
                                }`}
                              >
                                {mistake.word}
                              </span>
                              {mistake.phonetic && (
                                <span className="ml-2 text-sm text-gray-500 font-normal">
                                  {mistake.phonetic}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* 中间：中文释义 */}
                          <div className="flex-1 flex items-center justify-center">
                            <span className="text-base text-gray-700 font-medium truncate">
                              {mistake.trans}
                            </span>
                          </div>

                          {/* 右侧：错误频次标签 + 操作按钮 */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* 错误频次标签 */}
                            <span
                              className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${getMistakeColor(
                                mistake.mistakeCount
                              )}`}
                            >
                              {getMistakeLabel(mistake.mistakeCount)} {mistake.mistakeCount}次
                            </span>

                            {/* 发音按钮 */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onPlayPronunciation(mistake.word)
                              }}
                              className="p-2.5 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-colors"
                              title="发音"
                            >
                              <Volume2 size={18} />
                            </button>

                            {/* 练习按钮 */}
                            {!mistake.mastered && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onPracticeWord(mistake.word)
                                }}
                                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all text-sm font-semibold shadow-md"
                              >
                                练习
                              </button>
                            )}

                            {/* 已掌握标记 */}
                            {mistake.mastered && (
                              <div className="flex items-center gap-1.5 text-green-600 px-3 py-1.5 bg-green-100 rounded-xl">
                                <CheckCircle2 size={16} />
                                <span className="text-xs font-semibold">已掌握</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* 底部操作栏 */}
              {mistakes.length > 0 && (
                <div className="px-8 py-5 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={onStartSpecialReview}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all text-sm font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        <Play size={18} />
                        开始错题专项练习
                      </button>

                      {masteredCount > 0 && (
                        <button
                          onClick={onClearMastered}
                          className="flex items-center gap-2 px-5 py-3 bg-white text-gray-700 rounded-2xl hover:bg-gray-50 transition-all text-sm font-semibold border-2 border-gray-300 hover:border-gray-400"
                        >
                          <CheckCircle2 size={18} className="text-green-600" />
                          清空已掌握 ({masteredCount})
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        if (confirm('确定要清空所有错题吗？此操作不可恢复。')) {
                          onClearMastered()
                          // 这里需要调用外部清空全部的方法
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-3 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all text-sm font-semibold"
                    >
                      <Trash2 size={18} />
                      清空全部
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
})
