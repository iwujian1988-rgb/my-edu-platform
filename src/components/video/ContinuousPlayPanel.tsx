'use client'

import { cn } from '@/lib/utils'
import type { PlaylistItem } from '@/types/video'

interface ContinuousPlayPanelProps {
  playlist: PlaylistItem[]
  currentVideoId: string
  canContinuousPlay: boolean
  enabled: boolean
  onToggle: (enabled: boolean) => void
  onNavigate: (videoId: string) => void
}

const STORAGE_KEY = 'video:continuous_play:enabled'

export function getStoredContinuousPlay(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function setStoredContinuousPlay(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled))
  } catch {
    // localStorage 不可用时静默失败
  }
}

export function ContinuousPlayPanel({
  playlist,
  currentVideoId,
  canContinuousPlay,
  enabled,
  onToggle,
}: ContinuousPlayPanelProps) {
  if (!canContinuousPlay || !playlist || playlist.length <= 1) return null

  const currentIndex = playlist.findIndex(v => v.id === currentVideoId)

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-1.5">
      {/* 进度：仅 xx/xx */}
      <div className="flex items-center bg-white/90 backdrop-blur rounded-full px-2.5 py-1 border border-gray-200 shadow-sm">
        <span className="text-[11px] font-bold text-gray-600 tabular-nums">
          {currentIndex + 1}/{playlist.length}
        </span>
      </div>

      {/* Toggle */}
      <label
        className={cn(
          'inline-flex items-center gap-1.5 cursor-pointer select-none',
          'px-2.5 py-1 rounded-full border border-gray-200',
          'bg-white/90 backdrop-blur shadow-sm transition-all hover:shadow-md',
          enabled && 'bg-[#B4F416]/20 border-[#B4F416]/50',
        )}
      >
        <span
          className={cn(
            'w-3 h-3 rounded-full border transition-colors flex items-center justify-center',
            enabled ? 'bg-[#B4F416] border-black/20' : 'bg-gray-200 border-gray-300',
          )}
        >
          {enabled && (
            <svg width="6" height="6" viewBox="0 0 10 10" fill="none">
              <path d="M2 5L4 7L8 3" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <span className={cn(
          'text-[11px] font-medium whitespace-nowrap',
          enabled ? 'text-black' : 'text-gray-500',
        )}>
          连续
        </span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={e => onToggle(e.target.checked)}
          className="sr-only"
        />
      </label>
    </div>
  )
}
