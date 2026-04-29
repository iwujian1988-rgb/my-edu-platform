'use client'

import { useState } from 'react'

/**
 * 跟读模式 - 播放视图
 *
 * 布局（从上到下）:
 * - mini 视频窗口（16:9） / 音频可视化占位
 * - 阶段 pill
 * - 句子堆栈 KTV / speak 阶段突出字幕+倒计时
 * - 底部控制条
 */

import { cn } from '@/lib/utils'
import {
  BookOpen,
  Headphones,
  MessageSquareText,
  Mic,
  MicOff,
  Pause,
  PenLine,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
} from 'lucide-react'
import { WaveformDisplay } from '@/components/video/WaveformDisplay'
import type { SubtitleWithHighlights } from '@/types/video'
import type { ShadowPhase, ShadowMode, SpeedMultiplier, MicPermission } from '@/types/shadowReading'
import { getPhaseGroup, getPhaseLabel } from '@/types/shadowReading'

/** 字幕超过此长度视为长文本，缩小字号防止溢出 */
const LONG_TEXT_THRESHOLD = 50

/** 移动端跟读界面展示的视频摘要信息 */
export interface VideoInfoSummary {
  title: string
  description: string | null
  wordCount: number
  expressionCount: number
  grammarPointCount: number
  exerciseCount: number
  exerciseTypes: string[]
}

/** 跳转目标 */
export type NavigateTarget = 'words' | 'expressions' | 'grammar' | 'exercises'

interface ShadowReadingPlayerProps {
  phase: ShadowPhase
  currentIndex: number
  totalCount: number
  currentSubtitle: SubtitleWithHighlights | null
  subtitles: SubtitleWithHighlights[]
  ktvProgress: number // 0..1
  isPaused: boolean
  isRecording: boolean
  audioURL: string | null
  micPermission: MicPermission
  speakCountdown: number
  speedMultiplier: SpeedMultiplier
  mode: ShadowMode
  videoUrl: string | null
  isAudio?: boolean
  miniVideoRef: React.RefObject<HTMLVideoElement | null>
  onPause: () => void
  onResume: () => void
  onSkipNext: () => void
  onSkipPrev: () => void
  onSkipPhase: () => void
  onReplayPlayback: () => void
  videoInfo?: VideoInfoSummary
  onNavigateTo?: (target: NavigateTarget) => void
}

/** pill 样式映射 */
const PILL_STYLES: Record<string, string> = {
  listen: 'bg-[#eef2ff] text-[#4f46e5]',
  speak: 'bg-[#B4F416] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] -translate-x-[1px] -translate-y-[1px]',
  compare: 'bg-[#fff7ed] text-[#c2410c]',
  done: 'bg-[#f0fdf4] text-[#16a34a]',
}

const DOT_STYLES: Record<string, string> = {
  listen: 'bg-[#4f46e5]',
  speak: 'bg-black',
  compare: 'bg-[#c2410c]',
  done: 'bg-[#16a34a]',
}

/** KTV 逐字高亮：避免 clipPath 在多行文本上整块变色的视觉错误 */
function KTKText({ text, progress }: { text: string; progress: number }) {
  const chars = Array.from(text)
  const highlightCount = Math.round(progress * chars.length)
  return (
    <>
      {chars.map((char, i) => (
        <span key={i} className={i < highlightCount ? 'text-[#B4F416]' : ''}>
          {char}
        </span>
      ))}
    </>
  )
}

export function ShadowReadingPlayer({
  phase,
  currentIndex,
  totalCount,
  currentSubtitle,
  subtitles,
  ktvProgress,
  isPaused,
  isRecording,
  audioURL,
  micPermission,
  speakCountdown,
  speedMultiplier,
  mode,
  videoUrl,
  isAudio,
  miniVideoRef,
  onPause,
  onResume,
  onSkipNext,
  onSkipPrev,
  onSkipPhase,
  onReplayPlayback,
  videoInfo,
  onNavigateTo,
}: ShadowReadingPlayerProps) {
  const [confirmTarget, setConfirmTarget] = useState<NavigateTarget | null>(null)
  const group = getPhaseGroup(phase)
  const label = getPhaseLabel(phase)
  const isListenPhase = phase === 'listen1' || phase === 'listen2'
  const isSpeakPhase = phase === 'speak'
  const isPlaybackPhase = phase === 'playback'
  const isComparePhase = phase === 'compare'
  const isDonePhase = phase === 'done'

  const showVideoDimmed = false

  // 长文本检测：缩小字号防溢出
  const isLongText = (currentSubtitle?.original_text?.length ?? 0) > LONG_TEXT_THRESHOLD

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── 视频标题 / 描述（移动端直播展示用） ── */}
      {videoInfo && (
        <div className="px-4 pt-3 pb-2 flex-shrink-0">
          <div className="text-sm font-black text-black truncate leading-tight">
            {videoInfo.title}
          </div>
          {videoInfo.description && (
            <div className="text-[11px] text-gray-400 truncate mt-0.5 leading-tight">
              {videoInfo.description}
            </div>
          )}
        </div>
      )}

      {/* ── Mini 视频窗口 / 音频可视化 ── */}
      <div className="relative flex-shrink-0 bg-black">
        <video
          ref={miniVideoRef}
          src={videoUrl || undefined}
          className={cn("w-full aspect-video object-cover", isAudio && "opacity-0 absolute inset-0")}
          playsInline
          preload="auto"
          style={!isAudio ? { opacity: showVideoDimmed ? 0.15 : 1, transition: 'opacity 0.4s' } : undefined}
        />

        {/* 音频可视化占位 */}
        {isAudio && (
          <div className="w-full aspect-video bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Headphones className="w-8 h-8 lg:w-10 lg:h-10 text-white/30" />
              <div className="flex items-end gap-1 h-8">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-[#B4F416]/50 rounded-full"
                    style={{ animation: `audioBar ${0.8 + i * 0.1}s ease-in-out ${i * 0.1}s infinite alternate` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 视频进度条 */}
        {(isListenPhase || isComparePhase) && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10">
            <div
              className="h-full bg-[#B4F416] transition-[width] duration-100"
              style={{ width: `${ktvProgress * 100}%` }}
            />
          </div>
        )}

        {/* Speak 阶段：半透明遮罩 + 录音中提示 */}
        {isSpeakPhase && !isAudio && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            {micPermission === 'denied' ? (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-red-500/20 border-2 border-red-400/40 flex items-center justify-center">
                  <MicOff className="w-5 h-5 text-white" />
                </div>
                <div className="text-white text-xs lg:text-sm font-bold mt-2">麦克风权限被拒绝</div>
                <div className="text-white/60 text-[10px] lg:text-xs mt-0.5">请在浏览器设置中允许</div>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <Mic className="w-4 h-4 text-white" />
                <span className="text-white font-black text-sm tracking-wider">录音中</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 中间可滚动区 ── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* 阶段 pill */}
        <div className="flex justify-center pt-2.5 px-5 flex-shrink-0">
          <div className={cn('inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs lg:text-sm font-extrabold tracking-tight transition-all', PILL_STYLES[group])}>
            <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', DOT_STYLES[group])} />
            <span>{label}</span>
          </div>
        </div>

        {/* ── Speak 阶段：字幕突出 + 倒计时在下方 + 跳过按钮 ── */}
        {isSpeakPhase && currentSubtitle && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 lg:px-8 min-h-0">
            {/* 原文 — 大号突出，长文本自动缩小 */}
            <div className={cn(
              "font-black leading-relaxed text-center text-black max-w-lg",
              isLongText ? "text-base lg:text-lg" : "text-2xl lg:text-3xl"
            )}>
              {currentSubtitle.original_text}
            </div>
            {currentSubtitle.chinese_text && (
              <div className={cn(
                "text-gray-500 mt-2 text-center",
                isLongText ? "text-xs lg:text-sm" : "text-sm lg:text-base"
              )}>
                {currentSubtitle.chinese_text}
              </div>
            )}

            {/* 倒计时 */}
            <div className="mt-5 flex flex-col items-center">
              <div className="text-5xl lg:text-6xl font-black text-gray-300 tabular-nums leading-none">
                {speakCountdown}
              </div>
              <div className="text-xs text-gray-400 mt-1">秒</div>
            </div>

            {/* 跳过按钮 */}
            <button
              onClick={onSkipNext}
              className="mt-4 px-4 py-1.5 text-xs lg:text-sm text-gray-400 hover:text-gray-700 border border-gray-200 hover:border-gray-400 rounded-full transition-colors cursor-pointer"
            >
              跳过这句
            </button>
          </div>
        )}

        {/* ── 非 Speak 阶段：KTV 句子堆栈（多行渐隐） ── */}
        {!isSpeakPhase && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 lg:px-8 min-h-0 overflow-y-auto">
            {/* 跳过当前阶段按钮 */}
            {!isDonePhase && (
              <button
                onClick={onSkipPhase}
                className="mb-2 px-3 py-1 text-[11px] lg:text-xs text-gray-400 hover:text-gray-700 border border-gray-200 hover:border-gray-400 rounded-full transition-colors flex-shrink-0 cursor-pointer"
              >
                跳过
              </button>
            )}

            {/* 多行渐隐字幕 */}
            {(() => {
              const VISIBLE_RANGE = 3
              const startIdx = Math.max(0, currentIndex - VISIBLE_RANGE)
              const endIdx = Math.min(subtitles.length - 1, currentIndex + VISIBLE_RANGE)
              const rows: React.ReactNode[] = []
              for (let i = startIdx; i <= endIdx; i++) {
                const sub = subtitles[i]
                const distance = Math.abs(i - currentIndex)
                if (i === currentIndex) {
                  // 当前句 — KTV 高亮
                  rows.push(
                    <div key={sub.id} className={cn(
                      'text-center w-full relative flex-shrink-0',
                      isDonePhase && 'animate-[slideUp_0.45s_cubic-bezier(0.22,1,0.36,1)]',
                    )}>
                      <div className="relative inline-block max-w-full">
                        <div className={cn(
                          "font-black leading-relaxed tracking-tight text-black break-words",
                          isLongText ? "text-sm lg:text-base" : "text-lg lg:text-xl"
                        )}>
                          {!isPlaybackPhase
                            ? <KTKText text={sub.original_text} progress={ktvProgress} />
                            : sub.original_text
                          }
                        </div>
                      </div>
                      {sub.chinese_text && (
                        <div className="text-xs lg:text-sm text-gray-500 mt-1 leading-snug">
                          {sub.chinese_text}
                        </div>
                      )}
                      <div className="text-[11px] lg:text-sm text-gray-400 mt-2 font-bold tracking-wide">
                        <span className="text-gray-600 font-extrabold">{currentIndex + 1}</span> / {totalCount}
                      </div>
                    </div>
                  )
                } else {
                  // 远处的句子 — 距离越远越淡
                  const opacity = Math.max(0.08, 0.35 - distance * 0.12)
                  rows.push(
                    <div key={sub.id} className="text-center w-full mb-0.5 mt-0.5 flex-shrink-0" style={{ opacity }}>
                      <div className="text-xs lg:text-sm font-semibold text-gray-400 truncate">
                        {sub.original_text}
                      </div>
                    </div>
                  )
                }
              }
              return rows
            })()}
          </div>
        )}

        {/* Playback 阶段 — 明确的"正在播放你的录音"提示 */}
        {isPlaybackPhase && audioURL && currentSubtitle && (
          <div className="mx-5 mb-2 flex-shrink-0">
            <div className="flex items-center gap-2 mb-1.5">
              <Volume2 className="w-4 h-4 text-green-600" />
              <span className="text-xs lg:text-sm font-bold text-green-700">正在播放你的录音</span>
            </div>
            <WaveformDisplay
              audioSrc={audioURL}
              color="#22C55E"
              playingColor="#4ADE80"
              label="点击可重听"
              isPlaying={true}
              onPlay={onReplayPlayback}
              usePlaceholderPeaks
              seed={currentSubtitle.start_time * 1000 + 1}
              progress={ktvProgress}
            />
          </div>
        )}
      </div>

      {/* ── 底部控制区（固定在底部） ── */}
      <div className="flex-shrink-0 border-t-2 border-gray-200 bg-white">
        {/* 快捷跳转按钮行 */}
        {videoInfo && onNavigateTo && (
          <div className="grid grid-cols-4 gap-1.5 px-4 pt-2.5 pb-1">
            {videoInfo.wordCount > 0 && (
              <button onClick={() => setConfirmTarget('words')} className="flex flex-col items-center gap-0.5 py-1.5 bg-gray-50 active:bg-[#B4F416] active:scale-95 transition-all cursor-pointer border border-transparent active:border-black">
                <BookOpen className="w-4 h-4 text-gray-500" />
                <span className="text-[10px] font-black text-black leading-none">{videoInfo.wordCount}</span>
                <span className="text-[9px] text-gray-400 leading-none">词</span>
              </button>
            )}
            {videoInfo.expressionCount > 0 && (
              <button onClick={() => setConfirmTarget('expressions')} className="flex flex-col items-center gap-0.5 py-1.5 bg-gray-50 active:bg-[#B4F416] active:scale-95 transition-all cursor-pointer border border-transparent active:border-black">
                <MessageSquareText className="w-4 h-4 text-gray-500" />
                <span className="text-[10px] font-black text-black leading-none">{videoInfo.expressionCount}</span>
                <span className="text-[9px] text-gray-400 leading-none">表达</span>
              </button>
            )}
            {videoInfo.grammarPointCount > 0 && (
              <button onClick={() => setConfirmTarget('grammar')} className="flex flex-col items-center gap-0.5 py-1.5 bg-gray-50 active:bg-[#B4F416] active:scale-95 transition-all cursor-pointer border border-transparent active:border-black">
                <Volume2 className="w-4 h-4 text-gray-500" />
                <span className="text-[10px] font-black text-black leading-none">{videoInfo.grammarPointCount}</span>
                <span className="text-[9px] text-gray-400 leading-none">语法</span>
              </button>
            )}
            {videoInfo.exerciseCount > 0 && (
              <button onClick={() => setConfirmTarget('exercises')} className="flex flex-col items-center gap-0.5 py-1.5 bg-gray-50 active:bg-[#B4F416] active:scale-95 transition-all cursor-pointer border border-transparent active:border-black">
                <PenLine className="w-4 h-4 text-gray-500" />
                <span className="text-[10px] font-black text-black leading-none">{videoInfo.exerciseCount}</span>
                <span className="text-[9px] text-gray-400 leading-none">练习</span>
              </button>
            )}
          </div>
        )}

        {/* 播放控制条 */}
        <div className="flex items-center gap-3 px-5 py-3">
        <button
          onClick={onSkipPrev}
          className="w-11 h-11 lg:w-12 lg:h-12 border-2 border-black bg-gray-50 flex items-center justify-center flex-shrink-0 cursor-pointer active:scale-[0.88] transition-transform"
        >
          <SkipBack className="w-4 h-4 text-gray-600" />
        </button>

        {isRecording ? (
          <div className="flex-1 h-11 lg:h-12 border-2 border-gray-300 bg-gray-100 text-gray-400 font-black text-sm flex items-center justify-center gap-2">
            <Mic className="w-4 h-4" />
            <span>录音中</span>
          </div>
        ) : (
          <button
            onClick={isPaused ? onResume : onPause}
            className="flex-1 h-11 lg:h-12 border-2 border-black bg-[#B4F416] text-black font-black text-sm flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_#000] -translate-x-[1px] -translate-y-[1px] cursor-pointer transition-all"
          >
            {isPaused ? (
              <><Play className="w-4 h-4 text-black" fill="currentColor" />继续</>
            ) : (
              <><Pause className="w-4 h-4 text-black" fill="currentColor" />暂停</>
            )}
          </button>
        )}

        <button
          onClick={onSkipNext}
          className="w-11 h-11 lg:w-12 lg:h-12 border-2 border-black bg-gray-50 flex items-center justify-center flex-shrink-0 cursor-pointer active:scale-[0.88] transition-transform"
        >
          <SkipForward className="w-4 h-4 text-gray-600" />
        </button>
        </div>
      </div>

      {/* ── 跳转确认弹窗 ── */}
      {confirmTarget && onNavigateTo && (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center px-8">
          <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000] p-5 w-full max-w-xs">
            <div className="text-sm font-black text-black mb-1">离开跟读模式？</div>
            <div className="text-xs text-gray-500 mb-4">将跳转到{confirmTarget === 'exercises' ? '随堂练习' : confirmTarget === 'words' ? '词汇学习' : confirmTarget === 'expressions' ? '地道表达' : '语法点'}</div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmTarget(null)}
                className="flex-1 py-2 border-2 border-gray-200 bg-white text-gray-600 font-bold text-xs cursor-pointer hover:border-gray-300 transition-all"
              >
                取消
              </button>
              <button
                onClick={() => { onNavigateTo(confirmTarget); setConfirmTarget(null) }}
                className="flex-1 py-2 border-2 border-black bg-[#B4F416] text-black font-black text-xs cursor-pointer shadow-[2px_2px_0px_0px_#000] -translate-x-[1px] -translate-y-[1px] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all"
              >
                去看看
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS 动画 */}
      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(36px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes audioBar {
          0% { height: 15%; }
          100% { height: 85%; }
        }
      `}</style>
    </div>
  )
}
