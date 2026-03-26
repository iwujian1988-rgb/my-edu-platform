'use client'

/**
 * 词汇弹窗组件
 *
 * 点击词汇显示词典数据：音标、释义、例句等
 * 设计风格：Neo-brutalism - 与 Speaker 模块保持一致
 * 响应式：移动端全屏弹层，PC端悬浮卡片
 *
 * 修复：
 * 1. 根据页面位置智能判断弹层向上/向下展示
 * 2. 使用更高的 z-index 确保在 Dialog 内部正常显示
 * 3. TTS 播放前取消之前的语音
 */

import { useState, useEffect, useCallback, useRef, memo } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { Volume2, X, Loader2 } from 'lucide-react'
import { useDictionaryStore } from '@/hooks/useDictionaryStore'
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

// ─── 全局状态：确保同时只有一个 tooltip 打开 ───
let currentOpenId: string | null = null
const openListeners = new Set<(id: string | null) => void>()

function setOpenId(id: string | null) {
  currentOpenId = id
  openListeners.forEach(fn => fn(currentOpenId))
}

function useOpenId() {
  const [openId, setOpenId] = useState<string | null>(currentOpenId)
  useEffect(() => {
    openListeners.add(setOpenId)
    return () => { openListeners.delete(setOpenId) }
  }, [])
  return openId
}

// ============================================
// 主组件
// ============================================

function WordTooltipInner({ word, language = 'fr', children, className }: WordTooltipProps) {
  // 用 word + 随机数作为唯一 ID
  const [tooltipId] = useState(() => `${word}_${Math.random().toString(36).slice(2, 9)}`)
  const openId = useOpenId()
  const isOpen = openId === tooltipId

  const [position, setPosition] = useState({ top: 0, left: 0, showAbove: false })
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { entry, loading, error, lookup } = useDictionaryStore()
  const currentEntry = entry?.word?.toLowerCase() === word.toLowerCase() ? entry : null
  // 缓存的失败结果 success=false，视为无数据
  const hasValidEntry = currentEntry && currentEntry.success !== false
  const isCurrentLoading = loading && !currentEntry

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // 移动端锁定 body 滚动
  useEffect(() => {
    if (!isOpen || !isMobile) return
    const scrollY = window.scrollY
    const prev = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    }
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    return () => {
      document.body.style.overflow = prev.overflow
      document.body.style.position = prev.position
      document.body.style.top = prev.top
      document.body.style.width = prev.width
      window.scrollTo(0, scrollY)
    }
  }, [isOpen, isMobile])

  // 计算弹层位置 - 根据触发元素位置判断向上/向下展示
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return { top: 0, left: 0, showAbove: false }
    const rect = triggerRef.current.getBoundingClientRect()
    const CARD_H = 400
    const CARD_W = 288

    // 判断是否有足够空间在下方显示
    const spaceBelow = window.innerHeight - rect.bottom - 8
    const showAbove = spaceBelow < CARD_H && rect.top > spaceBelow

    let left = rect.left
    if (left + CARD_W > window.innerWidth - 16) left = window.innerWidth - CARD_W - 16
    if (left < 16) left = 16

    const top = showAbove
      ? Math.max(16, rect.top - CARD_H - 8)
      : rect.bottom + 8

    return { top, left, showAbove }
  }, [])

  const handleOpen = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setPosition(calculatePosition())
    setOpenId(tooltipId)
    lookup(word, language)
  }, [word, language, lookup, calculatePosition, tooltipId])

  const handleClose = useCallback(() => {
    setOpenId(null)
  }, [])

  const playSound = useCallback(async () => {
    const target = currentEntry?.word || word
    if (!target) return

    try {
      // 调用后端 TTS API（有道 + 百度兜底）
      const response = await fetch(`/api/tts?text=${encodeURIComponent(target)}&type=2&language=${language}`)

      if (!response.ok) {
        // API 失败，回退到浏览器 TTS
        console.warn('[WordTooltip TTS] API 失败，回退到浏览器 TTS')
        if ('speechSynthesis' in window) {
          speechSynthesis.cancel()
          const utterance = new SpeechSynthesisUtterance(target)
          utterance.lang = language === 'fr' ? 'fr-FR' : 'en-US'
          utterance.rate = 0.8
          speechSynthesis.speak(utterance)
        }
        return
      }

      // 播放音频
      const blob = await response.blob()
      const audioUrl = URL.createObjectURL(blob)
      const audio = new Audio(audioUrl)

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl)
      }

      await audio.play()
    } catch (error) {
      console.warn('[WordTooltip TTS] 播放失败:', error)
    }
  }, [currentEntry?.word, word, language])

  // ─── 内容 JSX ───────────────────────────────────────────────
  const content = (
    <div className="p-3">
      {isCurrentLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      ) : error && !hasValidEntry ? (
        <div className="text-center py-8 text-amber-600 dark:text-amber-400 text-sm font-bold">
          词典收录中···
        </div>
      ) : !hasValidEntry ? (
        <div className="text-center py-8 text-amber-600 dark:text-amber-400 text-sm font-bold">
          词典收录中···
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-black text-xl text-black dark:text-white truncate">
                {currentEntry.word}
              </div>
              {currentEntry.phonetic && (
                <div className="text-sm text-gray-500 font-mono truncate">
                  [{currentEntry.phonetic}]
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); playSound() }}
              className="shrink-0 p-2 bg-[#B4F416] hover:bg-[#a3e014] active:bg-[#96cf12] border-[2px] border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all cursor-pointer"
            >
              <Volume2 className="w-5 h-5 text-black" />
            </button>
          </div>

          {currentEntry.posDetail && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold border-[2px] border-blue-300 dark:border-blue-700 rounded">
                {currentEntry.posDetail}
              </span>
              {currentEntry.gender && (
                <span className="px-2 py-1 bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 text-xs font-bold border-[2px] border-pink-300 dark:border-pink-700 rounded">
                  {currentEntry.gender}
                </span>
              )}
            </div>
          )}

          {currentEntry.definition && (
            <div>
              <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">释义</div>
              <p className="text-base text-gray-800 dark:text-gray-200 font-medium">
                {currentEntry.definition}
              </p>
            </div>
          )}

          {currentEntry.examples && currentEntry.examples.length > 0 && (
            <div>
              <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">例句</div>
              <div className="space-y-2">
                {currentEntry.examples.slice(0, 2).map((ex, i) => (
                  <div key={i} className="p-2 bg-gray-50 dark:bg-gray-700/50 border-[2px] border-gray-200 dark:border-gray-600 rounded-sm">
                    <p className="text-sm text-gray-800 dark:text-gray-200">{ex.fr || ex.en}</p>
                    {ex.zh && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{ex.zh}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )

  // ─── 头部 JSX ───────────────────────────────────────────────
  const header = (
    <div className="flex items-center justify-between px-3 py-2 bg-indigo-200 dark:bg-indigo-900/40 border-b-[3px] border-black dark:border-gray-600 shrink-0">
      <span className="font-black text-sm text-indigo-800 dark:text-indigo-200">词典查询</span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); handleClose() }}
        className="p-1 hover:bg-indigo-300 dark:hover:bg-indigo-800 active:bg-indigo-400 border-[2px] border-black dark:border-gray-500 cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )

  return (
    <>
      <span
        ref={triggerRef}
        onClick={handleOpen}
        className={cn(
          'cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors rounded-sm inline',
          className
        )}
      >
        {children}
      </span>

      {mounted && isOpen && createPortal(
        <>
          {/* 背景层：阻止所有事件穿透，点击关闭 */}
          <div
            className="fixed inset-0"
            style={{ zIndex: 99998 }}
            onClick={handleClose}
            onWheel={(e) => e.preventDefault()}
            onTouchMove={(e) => e.preventDefault()}
          />

          {isMobile ? (
            /* ── 移动端：底部 sheet ── */
            <div
              className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t-[3px] border-black dark:border-gray-600 shadow-[0_-4px_0px_0px_#000] rounded-t-lg flex flex-col"
              style={{ zIndex: 99999, maxHeight: '80vh', minHeight: '280px' }}
              onClick={(e) => e.stopPropagation()}
            >
              {header}
              <div
                ref={scrollRef}
                className="overflow-y-auto overscroll-contain"
                style={{ flex: '1 1 auto', minHeight: 0, touchAction: 'pan-y' }}
              >
                {content}
              </div>
            </div>
          ) : (
            /* ── 桌面端：浮动卡片 ── */
            <div
              className="fixed bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#666] rounded-sm w-72 flex flex-col"
              style={{
                zIndex: 99999,
                top: position.top,
                left: position.left,
                height: '400px',
              }}
              onClick={(e) => e.stopPropagation()}
              onWheel={(e) => e.stopPropagation()}
            >
              {header}
              <div
                ref={scrollRef}
                className="overflow-y-auto overscroll-contain"
                style={{ flex: '1 1 auto', minHeight: 0 }}
              >
                {content}
              </div>
            </div>
          )}
        </>,
        document.body
      )}
    </>
  )
}

export const WordTooltip = memo(WordTooltipInner)
export default WordTooltip
