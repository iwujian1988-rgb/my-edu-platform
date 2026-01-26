/**
 * TTS Hook - 混合策略实现
 *
 * 播放逻辑链（Chain of Responsibility）：
 * 1. 如果传入 audioUrl → 直接播放 OSS 音频
 * 2. 如果没有 audioUrl → 调用 /api/tts 获取音频
 * 3. 如果上述步骤失败 → 回退到 Web Speech API
 *
 * @example
 * const { play, isPlaying, isLoading } = useTTS()
 * await play('hello', existingAudioUrl)
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { speak as webSpeechSpeak, stopSpeaking } from '@/lib/speech'

export interface UseTTSOptions {
  /** 发音类型：1=英音, 2=美音 (默认: 2) */
  type?: '1' | '2'
  /** 是否在降级时显示 Toast 提示 (默认: true) */
  showFallbackToast?: boolean
}

export interface UseTTSReturn {
  /** 播放语音 */
  play: (text: string, audioUrl?: string | null) => Promise<void>
  /** 停止播放 */
  stop: () => void
  /** 是否正在播放 */
  isPlaying: boolean
  /** 是否正在加载 */
  isLoading: boolean
}

/**
 * TTS Hook
 */
export function useTTS(options: UseTTSOptions = {}): UseTTSReturn {
  const { type = '2', showFallbackToast = true } = options

  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // 使用 ref 存储 Audio 实例，支持组件卸载时清理
  const audioRef = useRef<HTMLAudioElement | null>(null)

  /**
   * 播放音频文件（从 URL）
   */
  const playAudioFile = useCallback(
    (url: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        // 清理之前的音频实例
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current.currentTime = 0
        }

        console.log(`🔊 [useTTS] 播放音频: ${url}`)

        const audio = new Audio(url)

        audioRef.current = audio

        // 加载完成后开始播放
        audio.onloadeddata = () => {
          console.log(`✅ [useTTS] 音频加载完成: ${audio.duration}s`)
        }

        // 播放开始
        audio.onplay = () => {
          console.log(`▶️ [useTTS] 开始播放`)
          setIsPlaying(true)
          setIsLoading(false)
        }

        // 播放结束
        audio.onended = () => {
          console.log(`✅ [useTTS] 播放完成`)
          setIsPlaying(false)
          setIsLoading(false)
          audioRef.current = null
          resolve()
        }

        // 播放错误
        audio.onerror = (event) => {
          console.error(`❌ [useTTS] 音频播放错误:`, event)
          setIsPlaying(false)
          setIsLoading(false)
          audioRef.current = null

          const error = new Error('Audio playback failed')
          reject(error)
        }

        // 开始播放
        audio.play().catch((err) => {
          console.error(`❌ [useTTS] play() 调用失败:`, err)
          setIsPlaying(false)
          setIsLoading(false)
          audioRef.current = null
          reject(err)
        })
      })
    },
    []
  )

  /**
   * 从 /api/tts 获取音频
   */
  const fetchFromAPI = useCallback(
    async (text: string): Promise<void> => {
      const url = `/api/tts?text=${encodeURIComponent(text)}&type=${type}`

      console.log(`📡 [useTTS] 请求 API: ${url}`)

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      // 直接返回音频流
      console.log(`📥 [useTTS] 接收音频流: ${response.headers.get('Content-Length')} bytes`)

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)

      console.log(`🔗 [useTTS] 创建 Blob URL: ${objectUrl}`)

      try {
        await playAudioFile(objectUrl)
      } finally {
        // 清理 Blob URL
        setTimeout(() => {
          URL.revokeObjectURL(objectUrl)
          console.log(`🗑️ [useTTS] 清理 Blob URL`)
        }, 1000)
      }
    },
    [type, playAudioFile]
  )

  /**
   * 回退到 Web Speech API
   */
  const fallbackToWebSpeech = useCallback(
    (text: string): void => {
      console.log(`🔄 [useTTS] 回退到 Web Speech API`)

      // 停止之前的语音
      stopSpeaking()

      // 使用 Web Speech API
      const success = webSpeechSpeak(text, {
        lang: type === '1' ? 'en-GB' : 'en-US',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        onEnd: () => {
          console.log(`✅ [useTTS] Web Speech 播放完成`)
          setIsPlaying(false)
          setIsLoading(false)
        },
        onError: (event) => {
          console.error(`❌ [useTTS] Web Speech 错误:`, event)
          setIsPlaying(false)
          setIsLoading(false)
        },
      })

      if (!success) {
        console.error(`❌ [useTTS] Web Speech API 初始化失败`)
        setIsLoading(false)
      }
    },
    [type]
  )

  /**
   * 主播放函数
   */
  const play = useCallback(
    async (text: string, audioUrl?: string | null) => {
      if (!text || text.trim() === '') {
        console.warn(`⚠️ [useTTS] 空文本，忽略`)
        return
      }

      console.log(
        `🎯 [useTTS] 播放请求: "${text}" (type=${type}, audioUrl=${audioUrl || 'none'})`
      )

      setIsLoading(true)
      setIsPlaying(true)

      try {
        // 策略 1: 如果有现有的 OSS URL，直接使用
        if (audioUrl && audioUrl.trim() !== '') {
          console.log(`✅ [useTTS] 使用现有 OSS URL: ${audioUrl}`)
          await playAudioFile(audioUrl)
          return
        }

        // 策略 2: 从 API 获取音频
        console.log(`🔄 [useTTS] 从 API 获取音频...`)
        await fetchFromAPI(text)
      } catch (error) {
        console.error(
          `❌ [useTTS] 音频获取失败，回退到 Web Speech API:`,
          error
        )

        // 策略 3: 回退到 Web Speech API
        if (showFallbackToast) {
          toast.warning('网络不佳，使用系统语音', {
            duration: 2000,
            position: 'top-center',
          })
        }

        fallbackToWebSpeech(text)
      }
    },
    [type, playAudioFile, fetchFromAPI, fallbackToWebSpeech, showFallbackToast]
  )

  /**
   * 停止播放
   */
  const stop = useCallback(() => {
    console.log(`⏹️ [useTTS] 停止播放`)

    // 停止音频播放
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }

    // 停止 Web Speech
    stopSpeaking()

    setIsPlaying(false)
    setIsLoading(false)
  }, [])

  /**
   * 组件卸载时清理
   */
  useEffect(() => {
    return () => {
      console.log(`🧹 [useTTS] 组件卸载，清理资源`)
      stop()
    }
  }, [stop])

  return {
    play,
    stop,
    isPlaying,
    isLoading,
  }
}
