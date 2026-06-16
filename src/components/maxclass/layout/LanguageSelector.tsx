'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/components/layout/LanguageSelector.vue
 * 界面语言下拉选择器。Phase 1：localStorage 存档，不触发 i18n 切换（i18n 只支持 zh）。
 */

import { useEffect, useRef, useState } from 'react'
import { t, setLocale, getLocale } from '@/lib/maxclass/i18n'

const LANGUAGES: Array<{ code: string; label: string }> = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'pt', label: 'Português' },
  { code: 'ar', label: 'العربية' },
  { code: 'ru', label: 'Русский' },
]

export function LanguageSelector() {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState<string>('zh')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 与原版一致：从 localStorage 取（默认 fr），但本项目 i18n 只实现了 zh
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('locale') : null
    const initial = stored || 'zh'
    setCurrent(initial)
    setLocale('zh') // Phase 1 强制 zh（其它 locale 字典未导入）
  }, [])

  function select(code: string) {
    setCurrent(code)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('locale', code)
    }
    setOpen(false)
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const currentLabel = LANGUAGES.find((l) => l.code === current)?.label || 'Français'

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs hover:text-gray-300 transition-colors"
      >
        <span>{currentLabel}</span>
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
          <path d="M5 8l5 5 5-5z" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white text-gray-800 rounded shadow-lg border z-50 min-w-[160px] py-1">
          <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase">
            {t('lang.label', '界面语言')}
          </div>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => select(lang.code)}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-primary-50 transition-colors ${
                current === lang.code ? 'font-bold text-primary-700' : ''
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// 防止 getLocale 未使用警告（保留导出供外部使用）
void getLocale
