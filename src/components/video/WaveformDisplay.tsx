'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Play, Pause } from 'lucide-react'

const BAR_COUNT = 50
const BAR_GAP = 2
const BAR_MIN_HEIGHT = 3
const PLACEHOLDER_BAR_COUNT = 40

interface WaveformDisplayProps {
  audioSrc: string
  color: string            // Tailwind color for idle bars (e.g. '#3B82F6')
  playingColor: string     // Color for played portion (e.g. '#60A5FA')
  label: string            // Label text (e.g. '原声')
  isPlaying: boolean
  onPlay: () => void
  onEnded?: () => void
  /** External progress 0..1 for highlighting */
  progress?: number
  /** Skip fetch+decode, show placeholder peaks instantly (for video URLs where fetch is too slow) */
  usePlaceholderPeaks?: boolean
  /** Seed for deterministic placeholder peaks (e.g. subtitle start_time). Each seed = different shape */
  seed?: number
}

interface WaveformPeaks {
  peaks: number[]
  duration: number
}

/**
 * Fetch audio, decode, and downsample to BAR_COUNT peak amplitudes.
 * Works reliably for MP4/MP3. May fail for WebM in some browsers.
 */
async function extractPeaks(audioSrc: string): Promise<WaveformPeaks> {
  const response = await fetch(audioSrc)
  const arrayBuffer = await response.arrayBuffer()
  const audioContext = new AudioContext()
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    const channelData = audioBuffer.getChannelData(0)
    const sampleCount = channelData.length
    const blockSize = Math.floor(sampleCount / BAR_COUNT)
    const peaks: number[] = []

    for (let i = 0; i < BAR_COUNT; i++) {
      let max = 0
      const start = i * blockSize
      const end = Math.min(start + blockSize, sampleCount)
      for (let j = start; j < end; j++) {
        const abs = Math.abs(channelData[j])
        if (abs > max) max = abs
      }
      peaks.push(max)
    }

    return { peaks, duration: audioBuffer.duration }
  } finally {
    await audioContext.close()
  }
}

/**
 * Generate deterministic, varied placeholder peaks seeded by a number.
 * Different seeds produce visually distinct waveforms.
 */
function generatePlaceholderPeaks(seed: number): number[] {
  // Simple seeded pseudo-random (mulberry32)
  let s = seed | 0
  const rand = () => {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const freq1 = 2 + rand() * 4
  const freq2 = 4 + rand() * 6
  const phase1 = rand() * Math.PI * 2
  const phase2 = rand() * Math.PI * 2
  const amp1 = 0.2 + rand() * 0.25
  const amp2 = 0.1 + rand() * 0.15

  const peaks: number[] = []
  for (let i = 0; i < PLACEHOLDER_BAR_COUNT; i++) {
    const t = i / PLACEHOLDER_BAR_COUNT
    const v = 0.15
      + amp1 * Math.sin(t * Math.PI * freq1 + phase1)
      + amp2 * Math.sin(t * Math.PI * freq2 + phase2)
      + rand() * 0.12
    peaks.push(Math.max(0.08, Math.min(v, 0.95)))
  }
  return peaks
}

export function WaveformDisplay({
  audioSrc,
  color,
  playingColor,
  label,
  isPlaying,
  onPlay,
  onEnded,
  progress = 0,
  usePlaceholderPeaks = false,
  seed = 0,
}: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [peaks, setPeaks] = useState<number[] | null>(null)
  const [isFallback, setIsFallback] = useState(false)
  const [audioDuration, setAudioDuration] = useState(0)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const animFrameRef = useRef<number>(0)
  const internalProgressRef = useRef(0)

  // Extract peaks on mount
  useEffect(() => {
    if (usePlaceholderPeaks) {
      setPeaks(generatePlaceholderPeaks(seed))
      setIsFallback(true)
      return
    }

    let cancelled = false
    extractPeaks(audioSrc)
      .then(({ peaks: p, duration }) => {
        if (!cancelled) {
          setPeaks(p)
          setAudioDuration(duration)
        }
      })
      .catch(() => {
        // WebM decode failure — use placeholder bars
        if (!cancelled) {
          setPeaks(generatePlaceholderPeaks(seed))
          setIsFallback(true)
        }
      })
    return () => { cancelled = true }
  }, [audioSrc, usePlaceholderPeaks, seed])

  // Draw waveform bars with progress highlighting
  const drawWaveform = useCallback((currentProgress: number) => {
    const canvas = canvasRef.current
    if (!canvas || !peaks) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const displayWidth = canvas.clientWidth
    const displayHeight = canvas.clientHeight
    canvas.width = displayWidth * dpr
    canvas.height = displayHeight * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, displayWidth, displayHeight)

    const barCount = peaks.length
    const totalGap = (barCount - 1) * BAR_GAP
    const barWidth = Math.max(1, (displayWidth - totalGap) / barCount)
    const playedIndex = Math.floor(currentProgress * barCount)

    for (let i = 0; i < barCount; i++) {
      const x = i * (barWidth + BAR_GAP)
      const normalizedHeight = peaks[i] * (displayHeight - 4)
      const barHeight = Math.max(BAR_MIN_HEIGHT, normalizedHeight)
      const y = (displayHeight - barHeight) / 2

      ctx.fillStyle = i < playedIndex ? playingColor : color
      ctx.beginPath()
      ctx.roundRect(x, y, barWidth, barHeight, 1)
      ctx.fill()
    }
  }, [peaks, color, playingColor])

  // Static draw when peaks change or progress updates externally
  useEffect(() => {
    drawWaveform(progress)
  }, [drawWaveform, progress, peaks])

  // Animated progress tracking during playback
  // When usePlaceholderPeaks is true, parent drives progress via the `progress` prop — no internal Audio needed
  useEffect(() => {
    if (!isPlaying || usePlaceholderPeaks) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = 0
      }
      return
    }

    // For non-fallback (decoded peaks), use audio element for progress
    if (!isFallback && audioDuration > 0) {
      const audio = new Audio(audioSrc)
      audioElementRef.current = audio
      internalProgressRef.current = 0

      audio.addEventListener('ended', () => {
        internalProgressRef.current = 1
        drawWaveform(1)
        onEnded?.()
      })

      const trackProgress = () => {
        if (audio.duration && isFinite(audio.duration)) {
          const p = audio.currentTime / audio.duration
          internalProgressRef.current = p
          drawWaveform(p)
        }
        if (!audio.paused && !audio.ended) {
          animFrameRef.current = requestAnimationFrame(trackProgress)
        }
      }

      audio.play().catch(() => {
        onEnded?.()
      })
      animFrameRef.current = requestAnimationFrame(trackProgress)

      return () => {
        cancelAnimationFrame(animFrameRef.current)
        audio.pause()
        audio.src = ''
        audioElementRef.current = null
      }
    }

    // For fallback (placeholder bars), simulate progress over estimated duration
    const startTime = performance.now()
    const estimatedDuration = 3000 // rough estimate for animation
    const animate = (now: number) => {
      const elapsed = now - startTime
      const p = Math.min(elapsed / estimatedDuration, 1)
      internalProgressRef.current = p
      drawWaveform(p)
      if (p < 1) {
        animFrameRef.current = requestAnimationFrame(animate)
      } else {
        onEnded?.()
      }
    }
    animFrameRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [isPlaying, isFallback, audioSrc, audioDuration, drawWaveform, onEnded, usePlaceholderPeaks])

  // Expose a method to stop playback (used by parent)
  // Note: parent should toggle isPlaying to false to stop

  return (
    <div className="relative rounded-lg border-[2px] border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 overflow-hidden">
      {/* Label */}
      <div className="absolute top-1.5 left-2.5 z-10 text-xs font-bold text-gray-500 dark:text-gray-400">
        {label}
      </div>

      {/* Canvas waveform */}
      <canvas
        ref={canvasRef}
        className="w-full h-14"
        style={{ display: 'block' }}
      />

      {/* Play/Pause overlay button */}
      <button
        onClick={onPlay}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center border-[2px] transition-all hover:scale-110"
        style={{
          borderColor: color,
          backgroundColor: isPlaying ? color : 'rgba(255,255,255,0.9)',
          color: isPlaying ? '#fff' : color,
        }}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>
    </div>
  )
}
