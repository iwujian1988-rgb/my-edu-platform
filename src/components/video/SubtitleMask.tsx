'use client'

import { useRef, useState } from 'react'
import { EyeOff } from 'lucide-react'

const INITIAL_MASK = { x: 8, y: 73, width: 84, height: 14 }
export function SubtitleMask() {
  const [visible, setVisible] = useState(false)
  const [mask, setMask] = useState(INITIAL_MASK)
  const drag = useRef<{ clientX: number; clientY: number; mode: 'move' | 'resize'; initial: typeof INITIAL_MASK } | null>(null)
  const start = (event: React.PointerEvent<HTMLDivElement>, mode: 'move' | 'resize') => {
    event.stopPropagation()
    drag.current = { clientX: event.clientX, clientY: event.clientY, mode, initial: mask }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current
    if (!state) return
    const bounds = event.currentTarget.closest('[data-subtitle-mask-host]')?.getBoundingClientRect()
    if (!bounds?.width || !bounds.height) return
    const dx = (event.clientX - state.clientX) / bounds.width * 100
    const dy = (event.clientY - state.clientY) / bounds.height * 100
    const base = state.initial
    setMask(state.mode === 'move' ? { ...base, x: Math.max(0, Math.min(100-base.width, base.x+dx)), y: Math.max(0, Math.min(100-base.height, base.y+dy)) } : { ...base, width: Math.max(20, Math.min(100-base.x, base.width+dx)), height: Math.max(8, Math.min(100-base.y, base.height+dy)) })
  }
  return <>
    <button type="button" aria-pressed={visible} onClick={event => { event.stopPropagation(); setVisible(!visible) }} className="absolute right-3 top-3 z-30 flex min-h-10 items-center gap-2 rounded-lg bg-black/80 px-3 text-xs font-semibold text-white"><EyeOff size={16} />{visible ? '显示字幕' : '遮挡字幕'}</button>
    {visible && <div role="group" aria-label="字幕遮挡区域，可拖动或缩放" onPointerDown={event => start(event, 'move')} onPointerMove={move} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }} className="absolute z-20 flex touch-none select-none items-center justify-center rounded bg-black text-xs text-gray-300" style={{ left: `${mask.x}%`, top: `${mask.y}%`, width: `${mask.width}%`, height: `${mask.height}%` }}>拖动调整遮挡位置<div onPointerDown={event => start(event, 'resize')} onPointerMove={move} onPointerUp={() => { drag.current = null }} className="absolute bottom-0 right-0 grid h-8 w-8 cursor-se-resize place-items-center">↘</div></div>}
  </>
}
