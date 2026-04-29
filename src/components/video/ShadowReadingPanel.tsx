'use client'

/**
 * 跟读模式 — 全屏浮层
 *
 * 移动端: fixed inset-0 全屏覆盖
 * PC 端: 居中浮层 + 半透明遮罩
 * 内置 mini 视频窗口
 *
 * 数据流：
 *   打开时 → GET DB 进度 + IndexedDB 录音数量 → 渲染 Intro
 *   跟读中 → 每句 done 时 PUT DB + IndexedDB 存录音
 *   关闭时 → PUT DB 断点
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertCircle, Play, Pause } from 'lucide-react'
import { ShadowReadingIntro } from '@/components/video/ShadowReadingIntro'
import type { ShadowProgressData } from '@/components/video/ShadowReadingIntro'
import { ShadowReadingPlayer } from '@/components/video/ShadowReadingPlayer'
import type { VideoInfoSummary, NavigateTarget } from '@/components/video/ShadowReadingPlayer'
import { useShadowReading } from '@/hooks/useShadowReading'
import type { ProgressSnapshot } from '@/hooks/useShadowReading'
import { getAllRecordings } from '@/services/shadowRecordingStorage'
import type { SubtitleWithHighlights } from '@/types/video'
import type { ShadowMode, SpeedMultiplier } from '@/types/shadowReading'

interface ShadowReadingPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  videoId: string
  videoUrl: string | null
  subtitles: SubtitleWithHighlights[]
  currentVideoTime: number
  onPlaySegment: (startTime: number, endTime: number) => void
  onPauseMainVideo?: () => void
  onResumeMainVideo?: () => void
  /** 内容是否为纯音频（无视频画面） */
  isAudio?: boolean
  /** 视频摘要信息（移动端跟读界面展示用） */
  videoInfo?: VideoInfoSummary
  /** 快捷跳转回调（移动端） */
  onNavigateTo?: (target: NavigateTarget) => void
}

/** IndexedDB 中的一条录音 */
interface LocalRecording {
  subtitleId: string
  blob: Blob
  duration: number
}

/** 单条录音播放行 — 使用 IndexedDB blob */
function RecordingRow({ recording, subtitle }: { recording: LocalRecording; subtitle?: SubtitleWithHighlights }) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  const toggle = () => {
    if (!audioRef.current) {
      const url = URL.createObjectURL(recording.blob)
      blobUrlRef.current = url
      const audio = new Audio(url)
      audio.onended = () => setPlaying(false)
      audioRef.current = audio
    }
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => setPlaying(false))
      setPlaying(true)
    }
  }

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
      }
    }
  }, [])

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
      <button
        onClick={toggle}
        className="w-7 h-7 rounded-full bg-[#B4F416] border border-black flex items-center justify-center flex-shrink-0 cursor-pointer"
      >
        {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] lg:text-sm font-bold truncate">{subtitle?.original_text || '...'}</div>
        {subtitle?.chinese_text && (
          <div className="text-[9px] lg:text-xs text-gray-400 truncate">{subtitle.chinese_text}</div>
        )}
      </div>
      <span className="text-[9px] lg:text-xs text-gray-400 flex-shrink-0">{recording.duration.toFixed(1)}s</span>
    </div>
  )
}

type ViewMode = 'intro' | 'playing' | 'recordings'

function ShadowReadingContent({
  videoId,
  videoUrl,
  subtitles,
  onClose,
  isAudio,
  videoInfo,
  onNavigateTo,
}: {
  videoId: string
  videoUrl: string | null
  subtitles: SubtitleWithHighlights[]
  onClose: () => void
  isAudio?: boolean
  videoInfo?: VideoInfoSummary
  onNavigateTo?: (target: NavigateTarget) => void
}) {
  // ── 从 DB / IndexedDB 恢复的状态 ──
  const [dbProgress, setDbProgress] = useState<ShadowProgressData | null>(null)
  const [recordingCount, setRecordingCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // 录音回放列表
  const [localRecordings, setLocalRecordings] = useState<LocalRecording[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('intro')

  // 跟读会话参数
  const [activeMode, setActiveMode] = useState<ShadowMode>('recording')
  const [activeSpeed, setActiveSpeed] = useState<SpeedMultiplier>(1.0)
  const [startResumeIndex, setStartResumeIndex] = useState(0)
  const [startSignal, setStartSignal] = useState(0)

  // 进度同步 ref：避免 stale closure
  const practicedIdsRef = useRef<string[]>([])
  const activeModeRef = useRef<ShadowMode>('recording')
  const activeSpeedRef = useRef<SpeedMultiplier>(1.0)

  // 字幕 map（用于录音列表显示）
  const subtitleMap = useMemo(() => {
    const map = new Map<string, SubtitleWithHighlights>()
    for (const sub of subtitles) map.set(sub.id, sub)
    return map
  }, [subtitles])

  // ── 加载 DB 进度 + IndexedDB 录音数量 ──
  useEffect(() => {
    if (!videoId) return

    let cancelled = false

    const loadProgress = async () => {
      setIsLoading(true)
      try {
        // 并行加载 DB 进度 + IndexedDB 录音数量
        const [progressRes, count] = await Promise.all([
          fetch(`/api/user/shadow-reading-progress?video_id=${videoId}`, { cache: 'no-store' }),
          (async () => {
            try {
              const { getRecordingCount } = await import('@/services/shadowRecordingStorage')
              return getRecordingCount(videoId)
            } catch {
              return 0
            }
          })(),
        ])

        if (cancelled) return

        if (progressRes.ok) {
          const data = await progressRes.json()
          if (data.success && data.data) {
            const progress: ShadowProgressData = {
              practicedIds: data.data.practicedIds ?? [],
              resumeIndex: data.data.resumeIndex ?? 0,
              mode: data.data.mode ?? 'recording',
              speed: data.data.speed ?? 1.0,
              updatedAt: data.data.updatedAt ?? null,
            }
            setDbProgress(progress)
            setActiveMode(progress.mode as ShadowMode)
            setActiveSpeed(progress.speed as SpeedMultiplier)
            activeModeRef.current = progress.mode as ShadowMode
            activeSpeedRef.current = progress.speed as SpeedMultiplier
            practicedIdsRef.current = progress.practicedIds
          }
        } else {
          // GET 失败（401/500 等），当首次处理
        }

        setRecordingCount(count)
      } catch {
        // 网络错误 → 当首次处理
      } finally {
        setIsLoading(false)
      }
    }

    loadProgress()
    return () => { cancelled = true }
  }, [videoId])

  // ── 进度持久化回调 ──
  const handleProgressChange = useCallback((snapshot: ProgressSnapshot) => {
    practicedIdsRef.current = snapshot.practicedIds

    fetch('/api/user/shadow-reading-progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_id: videoId,
        practiced_subtitle_ids: snapshot.practicedIds,
        resume_index: snapshot.resumeIndex,
        mode: snapshot.mode,
        speed: snapshot.speed,
      }),
    }).catch(() => {
      // 网络错误不阻塞主流程，进度暂存内存
    })
  }, [videoId])

  // ── useShadowReading hook ──
  const {
    phase,
    currentIndex,
    currentSubtitle,
    ktvProgress,
    isStarted,
    isPaused,
    isFinished,
    isRecording,
    audioURL,
    micPermission,
    speedMultiplier,
    speakCountdown,
    practicedIds: hookPracticedIds,
    miniVideoRef,
    pause,
    resume,
    skipNext,
    skipPrev,
    skipPhase,
    replayPlayback,
    setSpeed,
    cleanup,
  } = useShadowReading({
    videoId,
    videoUrl,
    subtitles,
    mode: activeMode,
    resumeIndex: startResumeIndex,
    initialPracticedIds: dbProgress?.practicedIds ?? [],
    startSignal,
    onProgressChange: handleProgressChange,
  })

  // 同步 hook 的 practicedIds 到 ref
  useEffect(() => {
    practicedIdsRef.current = hookPracticedIds
  }, [hookPracticedIds])

  // ── 操作处理 ──
  const handleStart = useCallback((mode: ShadowMode) => {
    setActiveMode(mode)
    activeModeRef.current = mode
    setStartResumeIndex(0)
    setStartSignal(s => s + 1)
    setViewMode('playing')
  }, [])

  const handleContinue = useCallback(() => {
    const idx = dbProgress?.resumeIndex ?? 0
    setStartResumeIndex(idx)
    if (dbProgress?.mode) {
      setActiveMode(dbProgress.mode as ShadowMode)
      activeModeRef.current = dbProgress.mode as ShadowMode
    }
    if (dbProgress?.speed) {
      setActiveSpeed(dbProgress.speed as SpeedMultiplier)
      activeSpeedRef.current = dbProgress.speed as SpeedMultiplier
    }
    setStartSignal(s => s + 1)
    setViewMode('playing')
  }, [dbProgress])

  const handleRestart = useCallback(() => {
    // "从头开始"：resumeIndex=0，practicedIds 不清
    setStartResumeIndex(0)
    setStartSignal(s => s + 1)
    setViewMode('playing')
  }, [])

  const handleReviewRecordings = useCallback(async () => {
    try {
      const recordingsMap = await getAllRecordings(videoId)
      const recordingsList: LocalRecording[] = []
      // 按字幕顺序排列
      for (const sub of subtitles) {
        const rec = recordingsMap.get(sub.id)
        if (rec) {
          recordingsList.push({ subtitleId: sub.id, blob: rec.blob, duration: rec.duration })
        }
      }
      setLocalRecordings(recordingsList)
      setViewMode('recordings')
    } catch {
      // IndexedDB 读取失败
    }
  }, [videoId, subtitles])

  // ── videoUrl 为 null 时，整条链路不可用 ──
  if (!videoUrl) {
    return (
      <div className="relative flex flex-col h-full bg-white">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center justify-center flex-1 gap-4 p-8">
          <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-amber-500" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-black text-black">暂无音视频资源</h3>
            <p className="text-sm text-gray-500 mt-1">该内容暂未上传音频/视频，无法使用跟读功能</p>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-3 border-2 border-black rounded-xl bg-[#B4F416] text-black font-bold shadow-[2px_2px_0px_0px_#000] cursor-pointer transition-all"
          >
            返回
          </button>
        </div>
      </div>
    )
  }

  // ── 加载中 ──
  if (isLoading) {
    return (
      <div className="relative flex flex-col h-full bg-white">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center justify-center flex-1">
          <div className="text-sm text-gray-400">加载进度...</div>
        </div>
      </div>
    )
  }

  // ── 录音回放列表 ──
  if (viewMode === 'recordings') {
    return (
      <div className="relative flex flex-col h-full bg-white">
        <button
          onClick={() => setViewMode('intro')}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="text-center px-5 pt-4 pb-2 flex-shrink-0">
          <h2 className="text-base lg:text-lg font-black tracking-tight">回听录音</h2>
          <p className="text-[11px] lg:text-sm text-gray-500 mt-0.5">{localRecordings.length} 条录音</p>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-5 space-y-1.5">
          {localRecordings.map(rec => (
            <RecordingRow
              key={rec.subtitleId}
              recording={rec}
              subtitle={subtitleMap.get(rec.subtitleId)}
            />
          ))}
          {localRecordings.length === 0 && (
            <div className="text-center text-sm text-gray-400 py-8">暂无录音</div>
          )}
        </div>
        <div className="flex-shrink-0 px-5 pb-5 pt-2">
          <button
            onClick={() => setViewMode('intro')}
            className="w-full py-3 border-2 border-gray-200 rounded-2xl bg-white text-gray-600 font-bold text-sm cursor-pointer hover:border-gray-300 transition-all"
          >
            返回
          </button>
        </div>
      </div>
    )
  }

  // ── 跟读完成页 ──
  if (isFinished) {
    return (
      <div className="relative flex flex-col h-full bg-white">
        <button
          onClick={() => { cleanup(); onClose() }}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center justify-center flex-1 gap-3 p-6 overflow-y-auto">
          <div className="w-14 h-14 rounded-full bg-[#f0fdf4] border-2 border-[#86efac] flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">🎉</span>
          </div>
          <div className="text-center flex-shrink-0">
            <h3 className="text-lg lg:text-xl font-black text-black">全部完成！</h3>
            <p className="text-sm lg:text-base text-gray-500 mt-0.5">
              你已完成全部 {subtitles.length} 句跟读
            </p>
          </div>

          <button
            onClick={onClose}
            className="px-6 py-3 border-2 border-black rounded-xl bg-[#B4F416] text-black font-bold shadow-[2px_2px_0px_0px_#000] cursor-pointer transition-all flex-shrink-0"
          >
            返回
          </button>
        </div>
      </div>
    )
  }

  // ── 跟读进行中 ──
  if (isStarted) {
    return (
      <div className="relative flex flex-col h-full bg-white">
        <button
          onClick={() => { cleanup(); onClose() }}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <ShadowReadingPlayer
          phase={phase}
          currentIndex={currentIndex}
          totalCount={subtitles.length}
          currentSubtitle={currentSubtitle}
          subtitles={subtitles}
          ktvProgress={ktvProgress}
          isPaused={isPaused}
          isRecording={isRecording}
          audioURL={audioURL}
          micPermission={micPermission}
          speakCountdown={speakCountdown}
          speedMultiplier={speedMultiplier}
          mode={activeMode}
          videoUrl={videoUrl}
          isAudio={isAudio}
          miniVideoRef={miniVideoRef}
          onPause={pause}
          onResume={resume}
          onSkipNext={skipNext}
          onSkipPrev={skipPrev}
          onSkipPhase={skipPhase}
          onReplayPlayback={replayPlayback}
          videoInfo={videoInfo}
          onNavigateTo={onNavigateTo}
        />
      </div>
    )
  }

  // ── Intro 引导页 ──
  return (
    <div className="relative flex flex-col h-full bg-white">
      <button
        onClick={() => { cleanup(); onClose() }}
        className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
      <ShadowReadingIntro
        subtitleCount={subtitles.length}
        speedMultiplier={activeSpeed}
        onSpeedChange={setActiveSpeed}
        onStart={handleStart}
        onContinue={handleContinue}
        onRestart={handleRestart}
        onReviewRecordings={handleReviewRecordings}
        progress={dbProgress}
        recordingCount={recordingCount}
      />
    </div>
  )
}

export function ShadowReadingPanel({
  open,
  onOpenChange,
  videoId,
  videoUrl,
  subtitles,
  onPauseMainVideo,
  onResumeMainVideo,
  isAudio,
  videoInfo,
  onNavigateTo,
}: ShadowReadingPanelProps) {
  const handleClose = useCallback(() => {
    onOpenChange(false)
    onResumeMainVideo?.()
  }, [onOpenChange, onResumeMainVideo])

  // 检测 PC 端（>=1024px），用于动画方向和遮罩
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : false
  )

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // 打开时暂停主视频
  useEffect(() => {
    if (open) onPauseMainVideo?.()
  }, [open, onPauseMainVideo])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 遮罩层：移动端被全屏面板遮盖不可见，PC 端半透明 */}
          <motion.div
            key="shadow-overlay"
            className="fixed inset-0 z-40 bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />
          {/* 主面板：移动端全屏，PC 端居中浮层 */}
          <motion.div
            key="shadow-panel"
            className={`fixed z-50 ${isDesktop ? 'inset-0 flex items-center justify-center p-6 pointer-events-none' : 'inset-0 bg-white flex flex-col'}`}
            initial={isDesktop ? { opacity: 0, scale: 0.95 } : { opacity: 0, y: '100%' }}
            animate={isDesktop ? { opacity: 1, scale: 1 } : { opacity: 1, y: 0 }}
            exit={isDesktop ? { opacity: 0, scale: 0.95 } : { opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {isDesktop ? (
              <div className="bg-white rounded-2xl border-[3px] border-black shadow-[6px_6px_0px_0px_#000] w-full max-w-2xl h-[85vh] flex flex-col overflow-hidden pointer-events-auto">
                <ShadowReadingContent
                  videoId={videoId}
                  videoUrl={videoUrl}
                  subtitles={subtitles}
                  onClose={handleClose}
                  isAudio={isAudio}
                  videoInfo={videoInfo}
                  onNavigateTo={onNavigateTo}
                />
              </div>
            ) : (
              <ShadowReadingContent
                videoId={videoId}
                videoUrl={videoUrl}
                subtitles={subtitles}
                onClose={handleClose}
                isAudio={isAudio}
                videoInfo={videoInfo}
                onNavigateTo={onNavigateTo}
              />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
