'use client'

/**
 * 跟读模式状态机 Hook
 *
 * 录音跟读: listen1 → listen2 → speak → playback → compare → done
 * 影子跟读: listen1 → listen2 → listen3 → done
 *
 * 所有 interval/timeout 回调通过 ref 读取最新值，杜绝闭包陈旧
 *
 * 存储分工:
 *   进度（practicedIds, resumeIndex, mode, speed）→ Supabase DB
 *   录音（blob）→ IndexedDB
 */

import { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react'
import { saveRecording } from '@/services/shadowRecordingStorage'
import type { SubtitleWithHighlights } from '@/types/video'
import type { ShadowPhase, ShadowMode, SpeedMultiplier, MicPermission } from '@/types/shadowReading'

const KTV_TICK_MS = 100
const DONE_DELAY_MS = 1500
const TIMESLICE_MS = 250
const MIN_RECORDING_SECONDS = 5
const RECORDING_START_TIMEOUT_MS = 10000

/** 录音 mimeType 检测：Safari 不支持 webm/opus */
const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
]

function detectSupportedMime(): string {
  if (typeof MediaRecorder.isTypeSupported !== 'function') return ''
  const supported = MIME_CANDIDATES.filter(m => MediaRecorder.isTypeSupported(m))
  const audio = document.createElement('audio')
  // 录制成功不代表同一浏览器可以回放该格式，优先选择两边都支持的格式。
  return supported.find(m => audio.canPlayType(m) !== '') || supported[0] || ''
}

interface UseShadowReadingOptions {
  videoId: string
  videoUrl: string | null
  subtitles: SubtitleWithHighlights[]
  mode: ShadowMode
  /** 从 DB 恢复的断点索引，start() 时跳到该句 */
  resumeIndex?: number
  /** 从 DB 恢复的已练习字幕 ID，start() 时以此为基数累积 */
  initialPracticedIds?: string[]
  /** 递增信号量：每次变化时自动调用 start() */
  startSignal?: number
  /** 进度保存回调：每句 done 时 + 面板关闭时调用 */
  onProgressChange: (data: ProgressSnapshot) => void
}

/** 进度快照：传给外部保存到 DB */
export interface ProgressSnapshot {
  practicedIds: string[]
  resumeIndex: number
  mode: ShadowMode
  speed: SpeedMultiplier
}

export interface UseShadowReadingResult {
  phase: ShadowPhase
  currentIndex: number
  currentSubtitle: SubtitleWithHighlights | null
  ktvProgress: number
  isStarted: boolean
  isPaused: boolean
  isFinished: boolean
  isRecording: boolean
  audioURL: string | null
  playbackBlocked: boolean
  recordingError: string | null
  micPermission: MicPermission
  speedMultiplier: SpeedMultiplier
  speakCountdown: number
  mode: ShadowMode
  miniVideoRef: React.RefObject<HTMLVideoElement | null>
  practicedIds: string[]
  start: () => void
  pause: () => void
  resume: () => void
  skipNext: () => void
  skipPrev: () => void
  skipPhase: () => void
  replayPlayback: () => void
  setSpeed: (speed: SpeedMultiplier) => void
  cleanup: () => void
}

export function useShadowReading({
  videoId,
  videoUrl,
  subtitles,
  mode,
  resumeIndex = 0,
  initialPracticedIds,
  startSignal,
  onProgressChange,
}: UseShadowReadingOptions): UseShadowReadingResult {
  const [phase, setPhase] = useState<ShadowPhase>('idle')
  const [currentIndex, setCurrentIndex] = useState(resumeIndex)
  const [speedMultiplier, setSpeedMultiplier] = useState<SpeedMultiplier>(1.0)
  const [startCount, setStartCount] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [ktvProgress, setKtvProgress] = useState(0)
  const [micPermission, setMicPermission] = useState<MicPermission>('unknown')
  const [speakCountdown, setSpeakCountdown] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [audioURL, setAudioURL] = useState<string | null>(null)
  const [playbackBlocked, setPlaybackBlocked] = useState(false)
  const [recordingError, setRecordingError] = useState<string | null>(null)

  // audioURL 的 ref 镜像，供 cancelRecordingInternal / clearAudioURL 读取，
  // 避免这两个 useCallback 依赖 audioURL state 导致 cleanupHook 不稳定。
  const audioURLRef = useRef<string | null>(null)

  // 已练习的字幕 ID 集合（来自 DB 初始值 + 会话内新增）
  const [practicedIds, setPracticedIds] = useState<string[]>([])

  // 录音相关 ref
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const recordedBlobRef = useRef<Blob | null>(null)
  const recordedMimeTypeRef = useRef<string>('')
  const currentSubtitleIdRef = useRef<string | null>(null)
  const stopResolveRef = useRef<(() => void) | null>(null)

  const miniVideoRef = useRef<HTMLVideoElement | null>(null)
  const segmentStartTimeRef = useRef(0)
  const segmentEndTimeRef = useRef(0)
  const ktvIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const phaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null)
  const playbackObjectURLRef = useRef<string | null>(null)
  const playbackContextRef = useRef<AudioContext | null>(null)
  const playbackSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const playbackFinishRef = useRef<(() => void) | null>(null)

  // ═══ Ref 持有最新值 ═══
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const currentIndexRef = useRef(currentIndex)
  currentIndexRef.current = currentIndex
  const isPausedRef = useRef(isPaused)
  isPausedRef.current = isPaused
  const subtitlesRef = useRef(subtitles)
  subtitlesRef.current = subtitles
  const speedMultiplierRef = useRef(speedMultiplier)
  speedMultiplierRef.current = speedMultiplier
  const resumeIndexInputRef = useRef(resumeIndex)
  resumeIndexInputRef.current = resumeIndex
  const modeRef = useRef(mode)
  modeRef.current = mode
  const practicedIdsRef = useRef(practicedIds)
  practicedIdsRef.current = practicedIds
  const onProgressChangeRef = useRef(onProgressChange)
  onProgressChangeRef.current = onProgressChange

  // Generation counter — 每次 skip/start 时递增，用于废弃过期的异步回调
  const generationRef = useRef(0)

  const isStarted = startCount > 0

  const currentSubtitle = isStarted && currentIndex < subtitles.length
    ? subtitles[currentIndex]
    : null

  // ═══ 录音控制 ═══
  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    mediaRecorderRef.current = null
    chunksRef.current = []
  }, [])

  const startRecordingInternal = useCallback(async (subtitleId: string): Promise<void> => {
    const generation = generationRef.current
    currentSubtitleIdRef.current = subtitleId
    chunksRef.current = []
    recordedBlobRef.current = null

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: 48000,
      },
    })
    if (generation !== generationRef.current || isPausedRef.current) {
      stream.getTracks().forEach(track => track.stop())
      throw new Error('录音请求已取消')
    }
    streamRef.current = stream

    if (typeof MediaRecorder === 'undefined') throw new Error('浏览器不支持音频录制')
    const selectedMime = detectSupportedMime()
    recordedMimeTypeRef.current = selectedMime

    const recorder = new MediaRecorder(stream, selectedMime
      ? { mimeType: selectedMime, audioBitsPerSecond: 128000 }
      : { audioBitsPerSecond: 128000 })
    mediaRecorderRef.current = recorder

    let ready = false
    let resolveReady: (() => void) | null = null
    let rejectReady: ((error: Error) => void) | null = null
    const readyPromise = new Promise<void>((resolve, reject) => {
      resolveReady = resolve
      rejectReady = reject
    })
    const readyTimeout = setTimeout(() => {
      rejectReady?.(new Error('麦克风启动超时'))
      rejectReady = null
      resolveReady = null
    }, RECORDING_START_TIMEOUT_MS)
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data)
        if (!ready && recorder.state === 'recording' && generation === generationRef.current && !isPausedRef.current) {
          ready = true
          clearTimeout(readyTimeout)
          setIsRecording(true)
          resolveReady?.()
          resolveReady = null
          rejectReady = null
        }
      }
    }
    recorder.onerror = () => {
      clearTimeout(readyTimeout)
      rejectReady?.(new Error('录音设备启动失败'))
      rejectReady = null
      resolveReady = null
    }

    recorder.onstop = () => {
      clearTimeout(readyTimeout)
      rejectReady?.(new Error('录音已停止'))
      rejectReady = null
      resolveReady = null
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
      recordedBlobRef.current = blob

      // 创建播放用 URL
      if (blob.size > 0) {
        const url = URL.createObjectURL(blob)
        audioURLRef.current = url
        setAudioURL(url)
      }

      cleanupStream()

      if (stopResolveRef.current) {
        stopResolveRef.current()
        stopResolveRef.current = null
      }
    }

    try {
      recorder.start(TIMESLICE_MS)
    } catch (error) {
      clearTimeout(readyTimeout)
      throw error
    }
    await readyPromise
  }, [cleanupStream])

  const stopRecordingInternal = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current
      if (!recorder || recorder.state === 'inactive') {
        resolve()
        return
      }
      stopResolveRef.current = resolve
      recorder.stop()
      setIsRecording(false)
    })
  }, [])

  const cancelRecordingInternal = useCallback(() => {
    cleanupStream()
    setIsRecording(false)
    recordedBlobRef.current = null
    if (audioURLRef.current) {
      URL.revokeObjectURL(audioURLRef.current)
      audioURLRef.current = null
      setAudioURL(null)
    }
  }, [cleanupStream])

  // ═══ 工具函数 ═══
  const clearAllTimers = useCallback(() => {
    if (ktvIntervalRef.current) { clearInterval(ktvIntervalRef.current); ktvIntervalRef.current = null }
    if (phaseTimeoutRef.current) { clearTimeout(phaseTimeoutRef.current); phaseTimeoutRef.current = null }
  }, [])

  const pauseMiniVideo = useCallback(() => {
    miniVideoRef.current?.pause()
  }, [])

  const stopPlaybackAudio = useCallback(() => {
    if (playbackSourceRef.current) {
      playbackSourceRef.current.onended = null
      playbackSourceRef.current.stop()
      playbackSourceRef.current = null
    }
    if (playbackContextRef.current) {
      const context = playbackContextRef.current
      playbackContextRef.current = null
      void context.close().catch((error: unknown) => { console.error('[shadow reading] AudioContext close failed', error) })
    }
    playbackFinishRef.current = null
    if (playbackAudioRef.current) {
      playbackAudioRef.current.onended = null
      playbackAudioRef.current.onerror = null
      playbackAudioRef.current.pause()
      playbackAudioRef.current.src = ''
      playbackAudioRef.current = null
    }
    if (playbackObjectURLRef.current) {
      URL.revokeObjectURL(playbackObjectURLRef.current)
      playbackObjectURLRef.current = null
    }
    setPlaybackBlocked(false)
  }, [])

  const clearAudioURL = useCallback(() => {
    if (audioURLRef.current) {
      URL.revokeObjectURL(audioURLRef.current)
      audioURLRef.current = null
    }
    setAudioURL(null)
    recordedBlobRef.current = null
  }, [])

  const fullCleanup = useCallback(() => {
    clearAllTimers()
    pauseMiniVideo()
    stopPlaybackAudio()
    setKtvProgress(0)
    setSpeakCountdown(0)
  }, [clearAllTimers, pauseMiniVideo, stopPlaybackAudio])

  // ═══ 进度持久化通知 ═══
  const notifyProgress = useCallback((overrides?: Partial<ProgressSnapshot>) => {
    onProgressChangeRef.current({
      practicedIds: overrides?.practicedIds ?? practicedIdsRef.current,
      resumeIndex: overrides?.resumeIndex ?? currentIndexRef.current,
      mode: overrides?.mode ?? modeRef.current,
      speed: overrides?.speed ?? speedMultiplierRef.current,
    })
  }, [])

  // ═══ Mini video 片段播放 ═══
  const playSegment = useCallback((startTime: number, endTime: number, onEnd: () => void) => {
    const video = miniVideoRef.current
    if (!video || !videoUrl) { onEnd(); return }

    const gen = generationRef.current
    segmentStartTimeRef.current = startTime
    segmentEndTimeRef.current = endTime
    setKtvProgress(0)

    const beginSegmentPlayback = () => {
      if (isPausedRef.current) return

      video.currentTime = startTime
      video.play().catch(() => {
        // play() 被拒（autoplay 限制或视频刚被 pause）：
        // 短暂延迟后重试一次，避免 listen 阶段瞬间串完跳到 speak
        setTimeout(() => {
          if (isPausedRef.current || generationRef.current !== gen) return
          video.play().catch(() => {
            // 二次失败才放弃，推进流程防止卡死
            if (ktvIntervalRef.current) {
              clearInterval(ktvIntervalRef.current)
              ktvIntervalRef.current = null
            }
            setKtvProgress(1)
            onEnd()
          })
        }, 100)
      })

      if (ktvIntervalRef.current) clearInterval(ktvIntervalRef.current)
      ktvIntervalRef.current = setInterval(() => {
        const v = miniVideoRef.current
        if (!v) return
        const segDuration = segmentEndTimeRef.current - segmentStartTimeRef.current
        if (segDuration <= 0) return
        const elapsed = v.currentTime - segmentStartTimeRef.current
        setKtvProgress(Math.min(Math.max(elapsed / segDuration, 0), 1))
        if (v.currentTime >= segmentEndTimeRef.current) {
          v.pause()
          clearInterval(ktvIntervalRef.current!)
          ktvIntervalRef.current = null
          setKtvProgress(1)
          onEnd()
        }
      }, KTV_TICK_MS)
    }

    if (video.readyState >= 1) {
      beginSegmentPlayback()
    } else {
      const gen = generationRef.current
      const handleLoaded = () => {
        if (generationRef.current !== gen) return
        beginSegmentPlayback()
      }
      video.addEventListener('loadedmetadata', handleLoaded, { once: true })
    }
  }, [videoUrl])

  // ═══ 阶段推进 ═══
  const startPhaseRef = useRef<(p: ShadowPhase, s: SubtitleWithHighlights) => void>(() => {})

  const startPhase = useCallback((newPhase: ShadowPhase, subtitle: SubtitleWithHighlights) => {
    setPhase(newPhase)

    switch (newPhase) {
      case 'listen1': {
        playSegment(subtitle.start_time, subtitle.end_time, () => {
          if (isPausedRef.current) return
          startPhaseRef.current('listen2', subtitle)
        })
        break
      }

      case 'listen2': {
        playSegment(subtitle.start_time, subtitle.end_time, () => {
          if (isPausedRef.current) return
          const nextPhase: ShadowPhase = modeRef.current === 'shadow' ? 'listen3' : 'speak'
          startPhaseRef.current(nextPhase, subtitle)
        })
        break
      }

      case 'listen3': {
        playSegment(subtitle.start_time, subtitle.end_time, () => {
          if (isPausedRef.current) return
          startPhaseRef.current('done', subtitle)
        })
        break
      }

      case 'speak': {
        const gen = generationRef.current
        setRecordingError(null)
        const segDuration = subtitle.end_time - subtitle.start_time
        const speakDuration = Math.max(MIN_RECORDING_SECONDS, segDuration * speedMultiplierRef.current)
        setSpeakCountdown(Math.ceil(speakDuration))

        startRecordingInternal(subtitle.id)
          .then(() => {
            if (generationRef.current !== gen || isPausedRef.current) return
            setMicPermission('granted')
            let remaining = speakDuration
            if (ktvIntervalRef.current) clearInterval(ktvIntervalRef.current)
            ktvIntervalRef.current = setInterval(() => {
              if (isPausedRef.current) return
              remaining -= KTV_TICK_MS / 1000
              setSpeakCountdown(Math.max(0, Math.ceil(remaining)))
              if (remaining <= 0) {
                clearInterval(ktvIntervalRef.current!)
                ktvIntervalRef.current = null
                stopRecordingInternal().then(() => {
                  if (generationRef.current !== gen || isPausedRef.current) return
                  if (!recordedBlobRef.current?.size) {
                    setRecordingError('没有收到录音数据，请检查麦克风后重试。')
                    isPausedRef.current = true
                    setIsPaused(true)
                    return
                  }
                  startPhaseRef.current('playback', subtitle)
                })
              }
            }, KTV_TICK_MS)
          })
          .catch((error: unknown) => {
            if (generationRef.current !== gen || isPausedRef.current) return
            cleanupStream()
            setMicPermission(error instanceof DOMException && error.name === 'NotAllowedError' ? 'denied' : 'unknown')
            setRecordingError('无法使用麦克风，请检查浏览器权限和设备后重试。')
            isPausedRef.current = true
            setIsPaused(true)
          })
        break
      }

      case 'playback': {
        const blob = recordedBlobRef.current
        if (!blob) { startPhaseRef.current('compare', subtitle); return }

        // audioURL 已在 stopRecording 的 onstop 中设置
        // 从 state 取最新的 audioURL，或直接从 blob 创建
        const url = URL.createObjectURL(blob)
        playbackObjectURLRef.current = url
        setPlaybackBlocked(false)
        setKtvProgress(0)
        const audio = new Audio(url)
        playbackAudioRef.current = audio
        audio.onerror = () => {
          if (playbackAudioRef.current === audio) setPlaybackBlocked(true)
        }
        const finishPlayback = () => {
          setKtvProgress(1)
          playbackAudioRef.current = null
          playbackFinishRef.current = null
          playbackSourceRef.current = null
          const context = playbackContextRef.current
          playbackContextRef.current = null
          if (context) void context.close().catch((error: unknown) => { console.error('[shadow reading] AudioContext close failed', error) })
          URL.revokeObjectURL(url)
          playbackObjectURLRef.current = null
          setPlaybackBlocked(false)
          if (isPausedRef.current) return
          startPhaseRef.current('compare', subtitle)
        }
        playbackFinishRef.current = finishPlayback
        audio.onended = finishPlayback
        audio.play().catch(() => {
          // 有些浏览器禁止异步自动播放；保留录音，等待用户主动点击播放。
          if (playbackAudioRef.current === audio) setPlaybackBlocked(true)
        })
        if (ktvIntervalRef.current) clearInterval(ktvIntervalRef.current)
        ktvIntervalRef.current = setInterval(() => {
          if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
            setKtvProgress(audio.currentTime / audio.duration)
          }
        }, KTV_TICK_MS)
        break
      }

      case 'compare': {
        playSegment(subtitle.start_time, subtitle.end_time, () => {
          if (isPausedRef.current) return
          startPhaseRef.current('done', subtitle)
        })
        break
      }

      case 'done': {
        // 标记已练习：用 ref 同步决策，避免 side effect 在 state updater 里
        const currentIds = practicedIdsRef.current
        if (!currentIds.includes(subtitle.id)) {
          const next = [...currentIds, subtitle.id]
          // 先同步 ref，确保 cleanup 能立刻读到最新值
          practicedIdsRef.current = next
          setPracticedIds(next)

          const nextResumeIndex = Math.min(currentIndexRef.current + 1, subtitlesRef.current.length)
          notifyProgress({ practicedIds: next, resumeIndex: nextResumeIndex })

          // 存录音到 IndexedDB（如果有 blob）
          const blob = recordedBlobRef.current
          if (blob) {
            const segDuration = subtitle.end_time - subtitle.start_time
            const speakDuration = Math.max(MIN_RECORDING_SECONDS, segDuration * speedMultiplierRef.current)
            saveRecording(videoId, subtitle.id, blob, speakDuration).catch(() => {
              // IndexedDB 写入失败不影响主流程
            })
          }
        }

        // 推进到下一句
        phaseTimeoutRef.current = setTimeout(() => {
          if (isPausedRef.current) return
          const nextIndex = currentIndexRef.current + 1
          if (nextIndex >= subtitlesRef.current.length) {
            setIsFinished(true)
            setPhase('done')
            return
          }
          setCurrentIndex(nextIndex)
          clearAudioURL()
          const nextSub = subtitlesRef.current[nextIndex]
          if (nextSub) startPhaseRef.current('listen1', nextSub)
        }, DONE_DELAY_MS)
        break
      }
    }
  }, [playSegment, startRecordingInternal, stopRecordingInternal, cleanupStream, clearAudioURL, notifyProgress, videoId])

  startPhaseRef.current = startPhase

  // ═══ 外部 actions ═══

  // 保留 DB 恢复的已练习 IDs 的 ref，start() 时以此为基数
  const initialPracticedIdsRef = useRef(initialPracticedIds)
  initialPracticedIdsRef.current = initialPracticedIds

  const start = useCallback(() => {
    if (subtitles.length === 0) return
    generationRef.current++
    clearAllTimers()
    hasStartedRef.current = true
    // 以 DB 恢复的已练习 IDs 为基数，避免后续 done 阶段覆盖历史进度
    const restoredIds = initialPracticedIdsRef.current ?? []
    setPracticedIds(restoredIds)
    practicedIdsRef.current = restoredIds
    setStartCount(c => c + 1)
    setIsPaused(false)
    isPausedRef.current = false
    setIsFinished(false)
    setCurrentIndex(resumeIndexInputRef.current)
    setMicPermission('unknown')
    setRecordingError(null)
  }, [subtitles, clearAllTimers])

  // startCount 递增时启动第一句 listen1
  useEffect(() => {
    if (startCount === 0) return
    const idx = currentIndexRef.current
    const sub = subtitlesRef.current[idx]
    if (sub) {
      startPhaseRef.current('listen1', sub)
    }
  }, [startCount])

  // startSignal 外部触发自动启动（useLayoutEffect 避免首帧闪烁）
  const startFnRef = useRef(start)
  startFnRef.current = start

  useLayoutEffect(() => {
    if (typeof startSignal !== 'number' || startSignal === 0) return
    startFnRef.current()
  }, [startSignal])

  const pause = useCallback(() => {
    generationRef.current++
    isPausedRef.current = true
    setIsPaused(true)
    fullCleanup()
    // 只在 speak 阶段取消录音
    if (phaseRef.current === 'speak') {
      cancelRecordingInternal()
    }
    // 保存断点
    notifyProgress()
  }, [fullCleanup, cancelRecordingInternal, notifyProgress])

  const resume = useCallback(() => {
    setIsPaused(false)
    isPausedRef.current = false  // 立即同步 ref，避免 startPhase 内检查到旧值
    const sub = subtitlesRef.current[currentIndexRef.current]
    if (!sub) return
    const p = phaseRef.current
    startPhaseRef.current(p === 'done' || p === 'idle' ? 'listen1' : p, sub)
  }, [])

  const skipNext = useCallback(() => {
    generationRef.current++
    fullCleanup()
    cancelRecordingInternal()
    clearAudioURL()
    // 重置视频状态，确保后续 playSegment 的 play() 不会因 pause 状态被拒
    const video = miniVideoRef.current
    if (video) {
      video.pause()
      video.currentTime = 0
    }
    const nextIdx = Math.min(currentIndexRef.current + 1, subtitlesRef.current.length - 1)
    if (nextIdx >= subtitlesRef.current.length) { setIsFinished(true); setPhase('done'); return }
    setCurrentIndex(nextIdx)
    const sub = subtitlesRef.current[nextIdx]
    if (sub) { setPhase('idle'); startPhaseRef.current('listen1', sub) }
    // skip 不计入 practicedIds，不通知进度
  }, [fullCleanup, cancelRecordingInternal, clearAudioURL])

  const skipPrev = useCallback(() => {
    generationRef.current++
    fullCleanup()
    cancelRecordingInternal()
    clearAudioURL()
    const video = miniVideoRef.current
    if (video) {
      video.pause()
      video.currentTime = 0
    }
    const prevIdx = Math.max(currentIndexRef.current - 1, 0)
    setCurrentIndex(prevIdx)
    const sub = subtitlesRef.current[prevIdx]
    if (sub) { setPhase('idle'); startPhaseRef.current('listen1', sub) }
  }, [fullCleanup, cancelRecordingInternal, clearAudioURL])

  /** 跳过当前阶段（不换句），进入同一句的下一个阶段 */
  const skipPhase = useCallback(() => {
    generationRef.current++
    fullCleanup()
    cancelRecordingInternal()
    stopPlaybackAudio()

    const sub = subtitlesRef.current[currentIndexRef.current]
    if (!sub) return

    const p = phaseRef.current
    let nextPhase: ShadowPhase

    switch (p) {
      case 'listen1': nextPhase = 'listen2'; break
      case 'listen2': nextPhase = modeRef.current === 'shadow' ? 'listen3' : 'speak'; break
      case 'listen3': nextPhase = 'done'; break
      case 'speak': nextPhase = 'compare'; break // 跳过录音回放，直接 compare
      case 'playback': nextPhase = 'compare'; break
      case 'compare': nextPhase = 'done'; break
      case 'done': {
        // done 阶段跳过等待，直接推进到下一句
        notifyProgress()
        const nextIndex = currentIndexRef.current + 1
        if (nextIndex >= subtitlesRef.current.length) {
          setIsFinished(true)
          setPhase('done')
          return
        }
        setCurrentIndex(nextIndex)
        clearAudioURL()
        const nextSub = subtitlesRef.current[nextIndex]
        if (nextSub) startPhaseRef.current('listen1', nextSub)
        return
      }
      default: return
    }

    clearAudioURL()
    startPhaseRef.current(nextPhase, sub)
  }, [fullCleanup, cancelRecordingInternal, stopPlaybackAudio, clearAudioURL, notifyProgress])

  const handleSetSpeed = useCallback((s: SpeedMultiplier) => {
    speedMultiplierRef.current = s
    setSpeedMultiplier(s)
  }, [])

  const replayPlayback = useCallback(() => {
    const audio = playbackAudioRef.current
    if (!audio) return
    const blob = recordedBlobRef.current
    if (playbackContextRef.current) return
    if (playbackBlocked && blob && typeof AudioContext !== 'undefined') {
      // 百度浏览器可能接管 blob 音频并播放失败；Web Audio 不依赖其媒体播放器。
      const context = new AudioContext()
      playbackContextRef.current = context
      audio.onerror = null
      audio.pause()
      const resumed = context.resume()
      void Promise.all([resumed, blob.arrayBuffer()])
        .then(async ([, data]) => context.decodeAudioData(data))
        .then(buffer => {
          if (playbackContextRef.current !== context) return
          const source = context.createBufferSource()
          source.buffer = buffer
          source.connect(context.destination)
          source.onended = () => playbackFinishRef.current?.()
          playbackSourceRef.current = source
          const startedAt = context.currentTime
          source.start()
          setPlaybackBlocked(false)
          if (ktvIntervalRef.current) clearInterval(ktvIntervalRef.current)
          ktvIntervalRef.current = setInterval(() => {
            setKtvProgress(Math.min((context.currentTime - startedAt) / buffer.duration, 1))
          }, KTV_TICK_MS)
        })
        .catch(() => {
          if (playbackContextRef.current !== context) return
          playbackContextRef.current = null
          void context.close().catch((error: unknown) => { console.error('[shadow reading] AudioContext close failed', error) })
          setPlaybackBlocked(true)
        })
      setKtvProgress(0)
      return
    }
    audio.currentTime = 0
    audio.play()
      .then(() => { if (playbackAudioRef.current === audio) setPlaybackBlocked(false) })
      .catch(() => { if (playbackAudioRef.current === audio) setPlaybackBlocked(true) })
    setKtvProgress(0)
  }, [playbackBlocked])

  // 跟踪会话是否已启动，防止未启动的 cleanup 用空数据覆盖 DB 进度
  const hasStartedRef = useRef(false)

  const cleanupHook = useCallback(() => {
    fullCleanup()
    cancelRecordingInternal()
    stopPlaybackAudio()
    // 只有真正开始过的会话才保存断点，避免空数据覆盖历史进度
    if (hasStartedRef.current) {
      notifyProgress()
    }
  }, [fullCleanup, cancelRecordingInternal, stopPlaybackAudio, notifyProgress])

  useEffect(() => { return () => { cleanupHook() } }, [cleanupHook])

  return {
    phase, currentIndex, currentSubtitle, ktvProgress,
    isStarted, isPaused, isFinished,
    isRecording, audioURL, playbackBlocked, recordingError,
    micPermission, speedMultiplier, speakCountdown,
    mode, practicedIds,
    miniVideoRef,
    start, pause, resume, skipNext, skipPrev, skipPhase, replayPlayback,
    setSpeed: handleSetSpeed, cleanup: cleanupHook,
  }
}
