/**
 * 录音跟读面板组件
 *
 * 对应 PRD: VIDEO_MODULE_PRD.md - Section 2.3
 * 功能：
 * - 播放速度切换（0.5x / 0.75x / 1x / 1.25x）
 * - 复读区间设置（起止时间滑块）
 * - 循环播放
 * - 录音跟读
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import {
  Mic,
  Square,
  Play,
  RotateCcw,
  CheckCircle,
  XCircle,
  Volume2,
  Loader2,
  Repeat,
  Gauge,
} from 'lucide-react'
import { useRecordings } from '@/hooks/useRecordings'
import type { SubtitleWithHighlights } from '@/types/video'

// 播放速度选项
const SPEED_OPTIONS = [
  { value: 0.5, label: '0.5x' },
  { value: 0.75, label: '0.75x' },
  { value: 1, label: '1x' },
  { value: 1.25, label: '1.25x' },
]

interface RecordingPanelProps {
  videoId: string
  subtitles: SubtitleWithHighlights[]
  currentVideoTime: number
  onSpeedChange?: (speed: number) => void
  onLoopChange?: (startTime: number, endTime: number) => void
  onLoopToggle?: (isLooping: boolean) => void
}

export function RecordingPanel({
  videoId,
  subtitles,
  currentVideoTime,
  onSpeedChange,
  onLoopChange,
  onLoopToggle,
}: RecordingPanelProps) {
  // 找到当前字幕
  const currentSubtitleIndex = subtitles.findIndex(
    (sub) =>
      currentVideoTime >= sub.start_time &&
      currentVideoTime < sub.end_time
  )
  const currentSubtitle =
    currentSubtitleIndex >= 0 ? subtitles[currentSubtitleIndex] : null

  // 播放速度状态
  const [playbackSpeed, setPlaybackSpeed] = useState(1)

  // 复读区间状态
  const [loopStartTime, setLoopStartTime] = useState<number | null>(null)
  const [loopEndTime, setLoopEndTime] = useState<number | null>(null)
  const [isLoopEnabled, setIsLoopEnabled] = useState(false)

  // 录音状态
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string | null>(
    null
  )
  const [isPlayingRecording, setIsPlayingRecording] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  const {
    isRecording,
    isUploading,
    recordings,
    startRecording,
    stopRecording,
    deleteRecording,
    uploadRecording,
  } = useRecordings({
    videoId,
  })

  // 停止录音并上传
  const handleStopRecording = useCallback(async () => {
    await stopRecording()
    if (selectedSubtitleId) {
      await uploadRecording(selectedSubtitleId)
    }
  }, [stopRecording, uploadRecording, selectedSubtitleId])

  // 选中的字幕录音
  const selectedRecording = selectedSubtitleId
    ? recordings.find((r) => r.subtitle_id === selectedSubtitleId)
    : null

  // 播放速度切换
  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed)
    onSpeedChange?.(speed)
  }, [onSpeedChange])

  // 设置复读区间
  const handleLoopRangeChange = useCallback((values: number[]) => {
    if (!currentSubtitle) return

    const startTime = values[0]
    const endTime = values[1]

    setLoopStartTime(startTime)
    setLoopEndTime(endTime)
    onLoopChange?.(startTime, endTime)
  }, [currentSubtitle, onLoopChange])

  // 切换循环播放
  const handleLoopToggle = useCallback(() => {
    setIsLoopEnabled(!isLoopEnabled)
    onLoopToggle?.(!isLoopEnabled)
  }, [isLoopEnabled, onLoopToggle])

  // 播放录音
  const playRecording = useCallback((audioUrl: string) => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    audioRef.current = new Audio(audioUrl)
    audioRef.current.onended = () => setIsPlayingRecording(false)
    audioRef.current.playbackRate = playbackSpeed
    audioRef.current.play()
    setIsPlayingRecording(true)
  }, [playbackSpeed])

  // 停止播放
  const stopPlaying = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setIsPlayingRecording(false)
  }, [])

  // 开始录音
  const handleStartRecording = useCallback(() => {
    if (!currentSubtitle) return
    setSelectedSubtitleId(currentSubtitle.id)
    startRecording(currentSubtitle.id)
  }, [currentSubtitle, startRecording])

  // 设置当前字幕为复读区间
  const setLoopToCurrentSubtitle = useCallback(() => {
    if (!currentSubtitle) return
    setLoopStartTime(currentSubtitle.start_time)
    setLoopEndTime(currentSubtitle.end_time)
  }, [currentSubtitle])

  // 清理
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [])

  if (!currentSubtitle) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Mic className="w-12 h-12 mb-4 opacity-50" />
        <p>等待字幕开始...</p>
        <p className="text-sm mt-2">播放视频后，在此处进行跟读录音</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 播放速度控制 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">播放速度:</span>
        {SPEED_OPTIONS.map((option) => (
          <Button
            key={option.value}
            variant={playbackSpeed === option.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSpeedChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* 复读区间控制 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">复读区间:</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={setLoopToCurrentSubtitle}
            >
              <Gauge className="w-4 h-4 mr-1" />
              设置当前字幕
            </Button>
            <Button
              variant={isLoopEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={handleLoopToggle}
            >
              <Repeat className={cn('w-4 h-4 mr-1', isLoopEnabled && 'text-primary')} />
              {isLoopEnabled ? '循环中' : '循环'}
            </Button>
          </div>
        </div>

        {currentSubtitle && (
          <div className="px-2">
            <Slider
              value={[
                loopStartTime ?? currentSubtitle.start_time,
                loopEndTime ?? currentSubtitle.end_time,
              ]}
              min={currentSubtitle.start_time}
              max={currentSubtitle.end_time}
              step={0.1}
              onValueChange={(values) => handleLoopRangeChange(values)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>
                {loopStartTime !== null
                  ? `${Math.floor(loopStartTime / 60)}:${String(Math.floor(loopStartTime % 60)).padStart(2, '0')}`
                  : '开始'}
              </span>
              <span>
                {loopEndTime !== null
                  ? `${Math.floor(loopEndTime / 60)}:${String(Math.floor(loopEndTime % 60)).padStart(2, '0')}`
                  : '结束'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 当前字幕 */}
      <div className="p-4 rounded-lg bg-muted/50">
        <div className="text-xs text-muted-foreground mb-2">
          当前字幕 #{currentSubtitleIndex + 1}
        </div>
        <p className="text-lg font-medium">{currentSubtitle.original_text}</p>
        {currentSubtitle.translation && (
          <p className="text-sm text-muted-foreground mt-2">
            {currentSubtitle.translation}
          </p>
        )}
      </div>

      {/* 录音控制 */}
      <div className="flex items-center justify-center gap-4">
        {isRecording ? (
          <Button
            variant="destructive"
            size="lg"
            onClick={handleStopRecording}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                上传中...
              </>
            ) : (
              <>
                <Square className="w-4 h-4 mr-2" />
                停止录音
              </>
            )}
          </Button>
        ) : (
          <Button size="lg" onClick={handleStartRecording}>
            <Mic className="w-4 h-4 mr-2" />
            开始录音
          </Button>
        )}
      </div>

      {/* 录音状态提示 */}
      {isRecording && (
        <div className="flex items-center justify-center gap-2 text-red-500">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <span className="text-sm">正在录音...</span>
        </div>
      )}

      {/* 当前字幕的录音 */}
      {selectedRecording && (
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline">我的录音</Badge>
              {selectedRecording.score !== null && (
                <Badge
                  variant={
                    selectedRecording.score >= 80
                      ? 'default'
                      : selectedRecording.score >= 60
                        ? 'secondary'
                        : 'destructive'
                  }
                >
                  评分: {selectedRecording.score}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isPlayingRecording ? (
                <Button variant="outline" size="sm" onClick={stopPlaying}>
                  <Square className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => playRecording(selectedRecording.audio_url)}
                >
                  <Play className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => deleteRecording(selectedRecording.id)}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* 评估结果 */}
          {selectedRecording.evaluation && (
            <div className="text-sm space-y-1">
              <div className="flex items-center gap-2">
                {selectedRecording.evaluation.overall >= 80 ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span>
                  发音准确度: {selectedRecording.evaluation.pronunciation}%
                </span>
              </div>
              <p className="text-muted-foreground">
                {selectedRecording.evaluation.feedback}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 历史录音列表 */}
      {recordings.length > 1 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">
            历史录音 ({recordings.length})
          </div>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {recordings.map((recording) => {
              const subtitle = subtitles.find(
                (s) => s.id === recording.subtitle_id
              )
              return (
                <div
                  key={recording.id}
                  className={cn(
                    'flex items-center justify-between p-2 rounded border',
                    recording.subtitle_id === selectedSubtitleId &&
                      'bg-muted/50'
                  )}
                >
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="text-sm truncate">
                      {subtitle?.original_text || '未知字幕'}
                    </p>
                    {recording.score !== null && (
                      <span className="text-xs text-muted-foreground">
                        评分: {recording.score}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setSelectedSubtitleId(recording.subtitle_id)
                        playRecording(recording.audio_url)
                      }}
                    >
                      <Volume2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 使用提示 */}
      <div className="text-xs text-muted-foreground text-center">
        <p>1. 选择播放速度（0.5x-1.25x）</p>
        <p>2. 设置复读区间后开启循环播放</p>
        <p>3. 点击"开始录音"跟读当前字幕</p>
      </div>
    </div>
  )
}
