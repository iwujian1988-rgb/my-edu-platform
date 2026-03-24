'use client'

/**
 * 词汇弹窗组件
 *
 * 点击词汇显示词典数据：音标、释义、例句等
 * 设计风格：Neo-brutalism - 与 Speaker 模块保持一致
 * 响应式：移动端全屏弹层，PC端悬浮卡片
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Volume2, X, Loader2 } from 'lucide-react'
import { useDictionary } from '@/hooks/useDictionary'
import type { DictionaryLanguage } from '@/lib/dictionary/types'

// ============================================
// 类型定义
// ============================================

export interface WordTooltipProps {
  word: string
  language?: DictionaryLanguage
  children: React.ReactNode
  className?: string
}

// ============================================
// 主组件
// ============================================

export function WordTooltip({
  word,
  language = 'fr',
  children,
  className,
}: WordTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const { entry, loading, error, lookup } = useDictionary()

  // 点击时查询词典
  const handleClick = useCallback(() => {
    setIsOpen(true)
    lookup(word, language)
  }, [word, language, lookup])

  // 关闭弹窗
  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  // 播放发音
  const playSound = useCallback(() => {
    if (!entry?.word) return

    const utterance = new SpeechSynthesisUtterance(entry.word)
    utterance.lang = language === 'fr' ? 'fr-FR' : language === 'en' ? 'en-US' : 'en-US'
    utterance.rate = 0.8
    speechSynthesis.speak(utterance)
  }, [entry?.word, language])

  return (
    <>
      {/* 触发按钮 */}
      <button
        ref={triggerRef}
        onClick={handleClick}
        className={cn(
          "cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/40 active:bg-indigo-200 dark:active:bg-indigo-900/60 transition-colors rounded-sm",
          className
        )}
      >
        {children}
      </button>

      {/* 弹窗 - 移动端全屏，PC端悬浮 */}
      {isOpen && (
        <>
          {/* 背景遮罩 - 移动端显示 */}
          <div
            className="fixed inset-0 z-[100] bg-black/50 lg:hidden"
            onClick={handleClose}
          />

          {/* 弹窗内容 */}
          <div
            className={cn(
              // 移动端：底部弹出
              "fixed z-[101] lg:z-[100]",
              "inset-x-0 bottom-0 max-h-[80vh] rounded-t-lg lg:rounded-t-none",
              // PC端：跟随触发元素
              "lg:absolute lg:inset-auto lg:bottom-auto lg:left-1/2 lg:-translate-x-1/2",
              "lg:top-full lg:mt-2 lg:w-72 lg:max-h-none",
              // 统一样式 - Neo-brutalism
              "border-[3px] border-black dark:border-gray-500 bg-white dark:bg-gray-800",
              "shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#666]",
              "overflow-hidden rounded-sm"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between px-3 py-2 bg-indigo-200 dark:bg-indigo-900/40 border-b-[3px] border-black dark:border-gray-500">
              <span className="font-black text-sm text-indigo-800 dark:text-indigo-200">
                词典查询
              </span>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-indigo-300 dark:hover:bg-indigo-800 active:bg-indigo-400 border-[2px] border-black dark:border-gray-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 拖动条 - 仅移动端 */}
            <div className="flex justify-center pt-2 lg:hidden">
              <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>

            {/* 内容 */}
            <div className="p-3 max-h-[60vh] lg:max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                </div>
              ) : error ? (
                <div className="text-center py-8 text-gray-500 text-sm font-bold">
                  查询失败: {error}
                </div>
              ) : !entry?.success ? (
                <div className="text-center py-8 text-gray-500 text-sm font-bold">
                  未找到「{word}」的词典数据
                </div>
              ) : (
                <div className="space-y-3">
                  {/* 单词和音标 */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-black text-xl text-black dark:text-white">{entry.word}</span>
                      {entry.phonetic && (
                        <span className="ml-2 text-sm text-gray-500 font-mono">
                          [{entry.phonetic}]
                        </span>
                      )}
                    </div>
                    <button
                      onClick={playSound}
                      className="p-2 bg-[#B4F416] hover:bg-[#a3e014] border-[2px] border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
                    >
                      <Volume2 className="w-5 h-5 text-black" />
                    </button>
                  </div>

                  {/* 词性 */}
                  {(entry.part_of_speech || entry.posDetail) && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold border-[2px] border-blue-300 dark:border-blue-700 rounded">
                        {entry.posDetail || entry.part_of_speech}
                      </span>
                      {entry.gender && (
                        <span className="px-2 py-1 bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 text-xs font-bold border-[2px] border-pink-300 dark:border-pink-700 rounded">
                          {entry.gender}
                        </span>
                      )}
                    </div>
                  )}

                  {/* 释义 */}
                  {entry.definition && (
                    <div>
                      <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">释义</div>
                      <p className="text-base text-gray-800 dark:text-gray-200 font-medium">
                        {entry.definition}
                      </p>
                    </div>
                  )}

                  {/* 例句 */}
                  {entry.examples && entry.examples.length > 0 && (
                    <div>
                      <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">例句</div>
                      <div className="space-y-2">
                        {entry.examples.slice(0, 2).map((ex, i) => (
                          <div
                            key={i}
                            className="p-2.5 bg-gray-50 dark:bg-gray-700/50 border-[2px] border-gray-200 dark:border-gray-600 rounded-sm"
                          >
                            <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                              {ex.fr || ex.en}
                            </p>
                            {ex.zh && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {ex.zh}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 搭配 */}
                  {entry.collocation && (
                    <div>
                      <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">常见搭配</div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                        {entry.collocation}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default WordTooltip
