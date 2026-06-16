'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/components/exercises/VideoPlayer.vue
 *
 * 自托管视频播放器（非 iframe）：
 *   - 原生 <video controls crossorigin="anonymous">
 *   - 隐藏原生字幕（track.mode='hidden'），自定义底部字幕区
 *   - cuechange 监听切换字幕文本，支持 1-2 行（按 \n 分割）
 *   - CC 按钮切换字幕开关
 *
 * Vue 用 ref + watch + onMounted；React 用 useRef + useEffect。
 * cue 监听通过 setTimeout 延迟挂载（原版同样做法，等待 <track> 加载）。
 */

import { useEffect, useRef, useState } from 'react'

export interface VideoPlayerData {
  url?: string
  subtitles?: string | null
}

export function VideoPlayer({ video }: { video: VideoPlayerData }) {
  const videoElRef = useRef<HTMLVideoElement | null>(null)
  const [showSubtitles, setShowSubtitles] = useState(true)
  const [currentCueText, setCurrentCueText] = useState('')

  const videoSrc = video?.url ?? ''
  const subtitleUrl = video?.subtitles ?? null

  function setupCueListener() {
    const track = videoElRef.current?.textTracks?.[0]
    if (!track) return
    track.mode = 'hidden' // 不在视频上原生渲染
    track.addEventListener('cuechange', () => {
      if (!showSubtitles) return
      const activeCue = track.activeCues?.[0]
      // @ts-expect-error VTTCue.text exists at runtime
      setCurrentCueText(activeCue?.text ?? '')
    })
  }

  useEffect(() => {
    if (!videoElRef.current) return
    const t1 = setTimeout(setupCueListener, 200)
    return () => clearTimeout(t1)
    // 依赖 videoSrc/subtitleUrl — 切换视频时重新挂载
  }, [videoSrc, subtitleUrl])

  // 字幕关闭时清空当前文本
  useEffect(() => {
    if (!showSubtitles) setCurrentCueText('')
  }, [showSubtitles])

  if (!videoSrc) {
    return (
      <div className="bg-black rounded-lg overflow-hidden">
        <div className="relative" style={{ aspectRatio: '16 / 9' }}>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <svg className="w-16 h-16 mb-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            <p className="text-sm">Vidéo — remplacez par votre fichier</p>
          </div>
        </div>
      </div>
    )
  }

  const cueLines = currentCueText.split('\n')

  return (
    <div className="bg-black rounded-lg overflow-hidden">
      <div className="relative" style={{ aspectRatio: '16 / 9' }}>
        <video
          ref={videoElRef}
          className="w-full h-full"
          controls
          crossOrigin="anonymous"
        >
          <source src={videoSrc} type="video/mp4" />
          {subtitleUrl ? (
            <track
              kind="subtitles"
              src={subtitleUrl}
              srcLang="fr"
              label="Français"
              default
            />
          ) : null}
        </video>

        {subtitleUrl ? (
          <button
            type="button"
            onClick={() => setShowSubtitles(s => !s)}
            className={`absolute top-3 right-12 z-10 px-2 py-1 rounded text-xs font-bold transition-colors ${
              showSubtitles ? 'bg-white/90 text-gray-900' : 'bg-black/50 text-white hover:bg-black/70'
            }`}
          >
            CC
          </button>
        ) : null}
      </div>

      {subtitleUrl && showSubtitles ? (
        <div className="bg-gray-900 text-white text-center py-3 px-4 min-h-[3.5rem] flex items-center justify-center">
          {cueLines.length >= 2 ? (
            <div>
              <p className="text-base leading-relaxed">{cueLines[0]}</p>
              <p className="text-sm text-gray-300 leading-relaxed mt-0.5">{cueLines[1]}</p>
            </div>
          ) : (
            <p className="text-base leading-relaxed whitespace-pre-wrap">
              {currentCueText || ' '}
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}
