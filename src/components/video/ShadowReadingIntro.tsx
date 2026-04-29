'use client'

/**
 * 跟读模式 - 引导页
 *
 * 三种状态:
 *   A. 首次（无进度 + 无录音）→ "开始跟读"
 *   B. 有进度回来 → "继续跟读" + "从头开始" + "回听录音"
 *   C. 全部练完 → "再练一遍" + "回听全部录音"
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Mic, Headphones, RotateCcw, Volume2 } from 'lucide-react'
import type { SpeedMultiplier, ShadowMode } from '@/types/shadowReading'
import { SPEED_OPTIONS } from '@/types/shadowReading'

/** 从 DB 恢复的进度数据 */
export interface ShadowProgressData {
  practicedIds: string[]
  resumeIndex: number
  mode: ShadowMode
  speed: SpeedMultiplier
  updatedAt: string | null
}

interface ShadowReadingIntroProps {
  subtitleCount: number
  speedMultiplier: SpeedMultiplier
  onSpeedChange: (speed: SpeedMultiplier) => void
  onStart: (mode: ShadowMode) => void
  onContinue: () => void
  onRestart: () => void
  onReviewRecordings: () => void
  /** DB 进度数据，null = 首次 */
  progress: ShadowProgressData | null
  /** IndexedDB 中的录音数量 */
  recordingCount: number
}

const MODE_CONFIG: Array<{
  value: ShadowMode
  icon: typeof Mic
  title: string
  desc: string
  steps: string[]
}> = [
  {
    value: 'recording',
    icon: Mic,
    title: '录音跟读',
    desc: '听→听→录→回放→对照',
    steps: ['听第 1 遍', '听第 2 遍', '录音跟读', '听自己的录音', '听原声对照'],
  },
  {
    value: 'shadow',
    icon: Headphones,
    title: '影子跟读',
    desc: '每句重复 3 遍，自动下一句',
    steps: ['听第 1 遍', '听第 2 遍', '听第 3 遍'],
  },
]

/** 格式化相对时间 */
function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  if (diffMinutes < 1) return '刚刚'
  if (diffMinutes < 60) return `${diffMinutes}分钟前`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}小时前`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}天前`
  return `${Math.floor(diffDays / 30)}个月前`
}

export function ShadowReadingIntro({
  subtitleCount,
  speedMultiplier,
  onSpeedChange,
  onStart,
  onContinue,
  onRestart,
  onReviewRecordings,
  progress,
  recordingCount,
}: ShadowReadingIntroProps) {
  const practicedCount = progress?.practicedIds.length ?? 0
  const isAllDone = practicedCount >= subtitleCount && subtitleCount > 0
  const hasProgress = practicedCount > 0

  // 恢复上次选择的模式
  const [selectedMode, setSelectedMode] = useState<ShadowMode>(
    progress?.mode ?? 'recording'
  )

  const activeConfig = MODE_CONFIG.find(m => m.value === selectedMode)!
  const progressPercent = subtitleCount > 0 ? (practicedCount / subtitleCount) * 100 : 0

  // ── 进度条区域 ──
  const renderProgressBar = () => {
    if (!hasProgress && !isAllDone) {
      return (
        <div className="text-center mb-3 lg:mb-4">
          <div className="text-xs lg:text-sm text-gray-400">
            共 {subtitleCount} 句 · 全部未练习
          </div>
          <div className="h-2 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
            <div className="h-full bg-gray-200 rounded-full w-full" />
          </div>
        </div>
      )
    }

    return (
      <div className="mb-3 lg:mb-4">
        {/* 进度条 */}
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              isAllDone ? 'bg-[#22C55E]' : 'bg-[#B4F416]',
            )}
            style={{ width: `${Math.max(progressPercent, 2)}%` }}
          />
        </div>
        {/* 进度文本 */}
        <div className="flex items-center justify-between mt-1">
          <span className={cn(
            'text-xs lg:text-sm font-black',
            isAllDone ? 'text-[#22C55E]' : 'text-black',
          )}>
            {practicedCount}/{subtitleCount}
          </span>
          {isAllDone ? (
            <span className="text-xs lg:text-sm text-[#22C55E] font-bold">全部练完!</span>
          ) : (
            <span className="text-[10px] lg:text-xs text-gray-400">
              上次练到第 {(progress?.resumeIndex ?? 0) + 1} 句 · {formatRelativeTime(progress?.updatedAt ?? null)}
            </span>
          )}
        </div>
      </div>
    )
  }

  // ── 主操作按钮区域 ──
  const renderMainAction = () => {
    if (isAllDone) {
      return (
        <div className="flex-shrink-0 px-5 pb-5 pt-2 space-y-2">
          <button
            onClick={() => onRestart()}
            className="w-full py-3.5 border-2 border-black rounded-2xl bg-[#B4F416] text-black font-black text-base lg:text-lg cursor-pointer shadow-[4px_4px_0px_0px_#000] -translate-x-[2px] -translate-y-[2px] active:shadow-[2px_2px_0px_0px_#000] active:translate-x-[-1px] active:translate-y-[-1px] transition-all"
          >
            再练一遍
          </button>
          {recordingCount > 0 && (
            <button
              onClick={onReviewRecordings}
              className="w-full py-3 border-2 border-gray-200 rounded-2xl bg-white text-black font-bold text-sm cursor-pointer hover:border-gray-300 transition-all flex items-center justify-center gap-2"
            >
              <Volume2 className="w-4 h-4" />
              回听全部录音 ({recordingCount})
            </button>
          )}
        </div>
      )
    }

    if (hasProgress) {
      return (
        <div className="flex-shrink-0 px-5 pb-5 pt-2 space-y-2">
          <button
            onClick={onContinue}
            className="w-full py-3.5 border-2 border-black rounded-2xl bg-[#B4F416] text-black font-black text-base lg:text-lg cursor-pointer shadow-[4px_4px_0px_0px_#000] -translate-x-[2px] -translate-y-[2px] active:shadow-[2px_2px_0px_0px_#000] active:translate-x-[-1px] active:translate-y-[-1px] transition-all flex items-center justify-center gap-2"
          >
            继续跟读（第 {(progress?.resumeIndex ?? 0) + 1} 句）
          </button>
          <div className="flex gap-2">
            <button
              onClick={onRestart}
              className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl bg-white text-gray-600 font-bold text-xs lg:text-sm cursor-pointer hover:border-gray-300 transition-all flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              从头开始
            </button>
            {recordingCount > 0 && (
              <button
                onClick={onReviewRecordings}
                className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl bg-white text-gray-600 font-bold text-xs lg:text-sm cursor-pointer hover:border-gray-300 transition-all flex items-center justify-center gap-1.5"
              >
                <Volume2 className="w-3 h-3" />
                回听录音({recordingCount})
              </button>
            )}
          </div>
        </div>
      )
    }

    // 首次状态
    return (
      <div className="flex-shrink-0 px-5 pb-5 pt-2">
        <button
          onClick={() => onStart(selectedMode)}
          className="w-full py-3.5 border-2 border-black rounded-2xl bg-[#B4F416] text-black font-black text-base lg:text-lg cursor-pointer shadow-[4px_4px_0px_0px_#000] -translate-x-[2px] -translate-y-[2px] active:shadow-[2px_2px_0px_0px_#000] active:translate-x-[-1px] active:translate-y-[-1px] transition-all"
        >
          开始跟读
        </button>
        <div className="text-center text-[10px] lg:text-xs text-gray-400 mt-1.5">
          共 {subtitleCount} 句 · 随时暂停或跳过
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 标题 */}
      <div className="text-center px-5 pt-4 pb-2 flex-shrink-0">
        <h2 className="text-base lg:text-lg font-black tracking-tight">跟读模式</h2>
        {!hasProgress && !isAllDone && (
          <p className="text-[11px] lg:text-sm text-gray-500 mt-0.5">选一种方式，跟着读就行</p>
        )}
      </div>

      {/* 进度条 */}
      <div className="px-5 flex-shrink-0">
        {renderProgressBar()}
      </div>

      {/* 可滚动中间区（模式 + 速度） */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5">
        {/* 模式选择 */}
        <div className="flex gap-2.5 lg:gap-3 mb-3 lg:mb-4">
          {MODE_CONFIG.map((cfg) => {
            const Icon = cfg.icon
            const isActive = selectedMode === cfg.value
            return (
              <button
                key={cfg.value}
                onClick={() => setSelectedMode(cfg.value)}
                className={cn(
                  'flex-1 p-3 lg:p-4 border-2 rounded-xl text-left transition-all cursor-pointer',
                  isActive
                    ? 'bg-[#B4F416] border-black shadow-[2px_2px_0px_0px_#000] -translate-x-[1px] -translate-y-[1px]'
                    : 'bg-white border-gray-200 hover:border-gray-300',
                )}
              >
                <Icon className={cn('w-4 h-4 mb-1', isActive ? 'text-black' : 'text-gray-400')} />
                <div className={cn('text-xs lg:text-sm font-black', isActive ? 'text-black' : 'text-gray-700')}>
                  {cfg.title}
                </div>
                <div className={cn('text-[9px] lg:text-xs mt-0.5', isActive ? 'text-black/50' : 'text-gray-400')}>
                  {cfg.desc}
                </div>
              </button>
            )
          })}
        </div>

        {/* 流程步骤 */}
        <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-2.5 lg:p-3.5 mb-3 lg:mb-4">
          <div className="flex items-center gap-1 flex-wrap">
            {activeConfig.steps.map((step, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="text-[10px] lg:text-xs font-bold text-gray-600 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                  {step}
                </span>
                {i < activeConfig.steps.length - 1 && (
                  <span className="text-gray-300 text-[10px] lg:text-xs">→</span>
                )}
              </span>
            ))}
          </div>
          <div className="text-center text-[9px] lg:text-xs text-gray-400 mt-1.5">
            走完自动进入下一句
          </div>
        </div>

        {/* 速度选择器 — 录音跟读才显示 */}
        {selectedMode === 'recording' && (
          <div className="mb-3 lg:mb-4">
            <div className="text-[10px] lg:text-xs font-bold text-gray-500 mb-1.5 pl-0.5">
              跟读间隔 = 原句时长 ×
            </div>
            <div className="flex gap-2">
              {SPEED_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onSpeedChange(opt.value)}
                  className={cn(
                    'flex-1 py-2 lg:py-2.5 border-2 rounded-xl text-center transition-all cursor-pointer',
                    speedMultiplier === opt.value
                      ? 'bg-[#B4F416] border-black shadow-[2px_2px_0px_0px_#000] -translate-x-[1px] -translate-y-[1px]'
                      : 'bg-white border-gray-200 hover:border-gray-300',
                  )}
                >
                  <div className={cn('text-xs lg:text-sm font-black', speedMultiplier === opt.value ? 'text-black' : 'text-gray-700')}>
                    {opt.label}
                  </div>
                  <div className={cn('text-[9px] lg:text-xs', speedMultiplier === opt.value ? 'text-black/40' : 'text-gray-400')}>
                    {opt.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 主操作按钮 */}
      {renderMainAction()}
    </div>
  )
}
