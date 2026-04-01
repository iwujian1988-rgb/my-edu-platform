'use client'

/**
 * 词汇弹窗 — PC端极简版
 * 点击词汇 → 显示词典数据 + 播放按钮
 * 移动端保持原有逻辑不变
 */

import { useState, useEffect, useCallback, useRef, memo } from 'react'
import { createPortal } from 'react-dom'
import { Volume2, X, Loader2 } from 'lucide-react'
import { useDictionaryStore } from '@/hooks/useDictionaryStore'
import type { DictionaryLanguage } from '@/lib/dictionary/types'

export interface WordTooltipProps {
  word: string
  language?: DictionaryLanguage
  children: React.ReactNode
  className?: string
}

function WordTooltipInner({ word, language = 'fr', children, className }: WordTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [cardPos, setCardPos] = useState({ top: 0, left: 0 })
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { entry, loading, lookup } = useDictionaryStore()
  const currentEntry = entry?.word?.toLowerCase() === word.toLowerCase() ? entry : null
  const hasData = currentEntry && currentEntry.success !== false

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

  // ── 打开 ──
  const handleOpen = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    lookup(word, language)
    setIsOpen(true)

    // PC端：计算卡片位置
    if (window.innerWidth >= 1024) {
      requestAnimationFrame(() => {
        if (!triggerRef.current) return
        const rect = triggerRef.current.getBoundingClientRect()
        const CARD_H = 400
        const CARD_W = 288

        const spaceBelow = window.innerHeight - rect.bottom - 8
        const showAbove = spaceBelow < CARD_H && rect.top > spaceBelow

        let left = rect.left
        if (left + CARD_W > window.innerWidth - 16) left = window.innerWidth - CARD_W - 16
        if (left < 16) left = 16

        const top = showAbove
          ? Math.max(16, rect.top - CARD_H - 8)
          : rect.bottom + 8

        setCardPos({ top, left })
      })
    }
  }, [word, language, lookup])

  const handleClose = useCallback(() => setIsOpen(false), [])

  // 点击外部关闭（PC端）
  useEffect(() => {
    if (!isOpen || isMobile) return
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (triggerRef.current?.contains(target)) return
      if (cardRef.current?.contains(target)) return
      setIsOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [isOpen, isMobile])

  // ESC 关闭
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen])

  // ── TTS ──
  const playSound = useCallback(async () => {
    const target = currentEntry?.word || word
    if (!target) return
    try {
      const res = await fetch(`/api/tts?text=${encodeURIComponent(target)}&type=2&language=${language}`)
      if (!res.ok) {
        if ('speechSynthesis' in window) {
          speechSynthesis.cancel()
          const u = new SpeechSynthesisUtterance(target)
          u.lang = language === 'fr' ? 'fr-FR' : 'en-US'
          u.rate = 0.8
          speechSynthesis.speak(u)
        }
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => URL.revokeObjectURL(url)
      await audio.play()
    } catch (_err) {
      // 静默失败
    }
  }, [currentEntry?.word, word, language])

  // ── 词典内容 ──
  const renderContent = () => {
    if (loading && !currentEntry) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">查询中...</span>
        </div>
      )
    }
    if (!hasData) {
      return <div className="px-3 py-4 text-sm text-gray-500 text-center">未找到「{word}」</div>
    }

    const e = currentEntry!
    const phonetic = e.phonetic || e.uk_phonetic
    // 优先用 definitions 数组（逐条展示），避免 definition 字段（已 join 拼接）与数组重复
    const mainDef = e.definitions?.[0] || e.definition
    const extraDefs = e.definitions?.length ? e.definitions.slice(1) : []

    return (
      <div className="px-3 py-2 space-y-2 text-sm">
        {/* 标题：单词 + 音标 + 词性 + 播放 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-black text-base text-black dark:text-white">{e.word}</span>
          {phonetic && <span className="text-gray-500 dark:text-gray-400 text-xs">/{phonetic}/</span>}
          {(e.posDetail || e.pos) && (
            <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">
              {e.posDetail || e.pos}
            </span>
          )}
          {e.gender && (
            <span className="text-xs bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 px-1.5 py-0.5 rounded">
              {e.gender === 'm' ? '♂' : e.gender === 'f' ? '♀' : e.gender}
            </span>
          )}
          <button
            type="button"
            onClick={(ev) => { ev.stopPropagation(); playSound() }}
            className="ml-auto p-1.5 rounded border-2 border-black dark:border-gray-500 bg-indigo-200 dark:bg-indigo-800 hover:bg-indigo-300 dark:hover:bg-indigo-700 active:translate-y-[1px] cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 释义 */}
        {mainDef && <p className="text-gray-800 dark:text-gray-200 font-medium">{mainDef}</p>}
        {extraDefs.length > 0 && (
          <ul className="space-y-0.5 text-gray-600 dark:text-gray-400 text-xs">
            {extraDefs.slice(0, 5).map((d, i) => <li key={i}>• {d}</li>)}
          </ul>
        )}

        {/* 例句 */}
        {e.examples && e.examples.length > 0 && (
          <div className="pt-1 border-t border-gray-200 dark:border-gray-600 space-y-1">
            {e.examples.slice(0, 2).map((ex, i) => (
              <div key={i} className="text-xs text-gray-500 dark:text-gray-400">
                <p>{ex.fr || ex.en}</p>
                {ex.zh && <p className="text-gray-400 dark:text-gray-500">{ex.zh}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── 头部 ──
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
        className={className}
        onClick={handleOpen}
      >
        {children}
      </span>

      {mounted && isOpen && (
        isMobile ? (
          /* ── 移动端：底部 sheet（保持原有逻辑）── */
          createPortal(
            <>
              <div className="fixed inset-0 bg-black/50" style={{ zIndex: 99998 }} onClick={handleClose} />
              <div
                className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t-[3px] border-black dark:border-gray-600 shadow-[0_-4px_0px_0px_#000] dark:shadow-[0_-4px_0px_0px_#666] rounded-t-lg flex flex-col"
                style={{ zIndex: 99999, maxHeight: '80vh', minHeight: '280px' }}
                onClick={(e) => e.stopPropagation()}
              >
                {header}
                <div ref={scrollRef} className="overflow-y-auto overscroll-contain" style={{ flex: '1 1 auto', minHeight: 0, touchAction: 'pan-y' }}>
                  {renderContent()}
                </div>
              </div>
            </>,
            document.body
          )
        ) : (
          /* ── PC端：portal 到 body，pointerEvents:auto 对抗 react-remove-scroll ── */
          createPortal(
            <div
              ref={cardRef}
              onClick={(e) => e.stopPropagation()}
              onWheel={(e) => e.stopPropagation()}
              className="fixed bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#666] rounded-sm w-72 flex flex-col overflow-hidden"
              style={{
                top: cardPos.top,
                left: cardPos.left,
                zIndex: 99999,
                height: '400px',
                pointerEvents: 'auto',
              }}
            >
              {header}
              <div ref={scrollRef} className="overflow-y-auto overscroll-contain flex-1" style={{ minHeight: 0 }}>
                {renderContent()}
              </div>
            </div>,
            document.body
          )
        )
      )}
    </>
  )
}

export const WordTooltip = memo(WordTooltipInner)
export default WordTooltip
