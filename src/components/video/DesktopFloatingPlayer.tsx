'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { logger } from '@/lib/logger'

const PREFERENCE_KEY = 'video.desktopFloating.enabled'
const TOP_INSET = 48

export function DesktopFloatingPlayer({ desktop, children }: { desktop: boolean; children: ReactNode }) {
  const slotRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = useState(true)
  const [scrolledPast, setScrolledPast] = useState(false)
  const [height, setHeight] = useState(0)
  const floating = desktop && enabled && scrolledPast

  useEffect(() => {
    // SSR 不读取浏览器存储；挂载后恢复偏好，保证服务端与客户端首屏一致。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { setEnabled(localStorage.getItem(PREFERENCE_KEY) !== 'false') }
    catch (error) { logger.warn('无法读取悬浮播放器偏好', error) }
  }, [])

  useEffect(() => {
    if (!desktop) return
    const measure = () => {
      const slot = slotRef.current
      const player = playerRef.current
      if (!slot || !player) return
      if (!floating) setHeight(player.getBoundingClientRect().height)
      // 使用原位置占位区域判断，而不是悬浮窗口，防止悬浮/还原之间来回跳动。
      setScrolledPast(slot.getBoundingClientRect().bottom <= TOP_INSET)
    }
    measure()
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    const observer = new ResizeObserver(measure)
    if (playerRef.current) observer.observe(playerRef.current)
    return () => {
      window.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
      observer.disconnect()
    }
  }, [desktop, floating])

  const toggle = (value: boolean) => {
    setEnabled(value)
    try { localStorage.setItem(PREFERENCE_KEY, String(value)) }
    catch (error) { logger.warn('无法保存悬浮播放器偏好', error) }
  }

  return (
    <div ref={slotRef} data-testid="floating-player-slot" style={floating ? { height } : undefined}>
      {/* 只改变容器定位，不切换渲染树，以保留播放进度、缓冲和播放器引用。 */}
      <div ref={playerRef} data-testid="floating-player-frame" data-floating={floating} className={floating ? 'fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] overflow-hidden rounded-xl border border-gray-600 bg-black shadow-2xl' : 'relative'}>
        {desktop && <div className="flex items-center justify-between bg-gray-900 px-3 text-xs text-white">
          <button type="button" aria-pressed={enabled} onClick={() => toggle(!enabled)} className="min-h-11 cursor-pointer font-semibold hover:text-indigo-200">{enabled ? '滚动悬浮：已开启' : '开启滚动悬浮'}</button>
          {floating && <button type="button" aria-label="关闭悬浮播放" onClick={() => toggle(false)} className="grid h-11 w-11 cursor-pointer place-items-center hover:bg-gray-700"><X size={18} /></button>}
        </div>}
        {children}
      </div>
    </div>
  )
}
