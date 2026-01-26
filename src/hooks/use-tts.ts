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
  /** 预加载音频（后台加载，不播放） */
  preload: (text: string, audioUrl?: string | null) => Promise<void>
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

  // 🆕 预加载缓存：记录已预加载的音频 URL
  const preloadedCacheRef = useRef<Set<string>>(new Set())

  // 🆕 组件卸载标记（防止异步操作在卸载后执行）
  const isMountedRef = useRef(true)

  /**
   * 播放音频文件（从 URL）
   * 🔧 修复：捕获 AbortError，避免快速切换时报错
   */
  const playAudioFile = useCallback(
    (url: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        // ========== 边界检查 ==========
        if (!url || typeof url !== 'string' || url.trim() === '') {
          console.warn(`⚠️ [useTTS] 无效的音频URL: "${url}"`)
          reject(new Error('Invalid audio URL'))
          return
        }

        // 清理之前的音频实例
        if (audioRef.current) {
          try {
            audioRef.current.pause()
            audioRef.current.currentTime = 0
          } catch (e) {
            // 忽略清理错误
          }
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
          if (isMountedRef.current) {
            setIsPlaying(false)
            setIsLoading(false)
          }
          audioRef.current = null
          resolve()
        }

        // 播放错误
        audio.onerror = (event) => {
          console.error(`❌ [useTTS] 音频播放错误:`, event)
          if (isMountedRef.current) {
            setIsPlaying(false)
            setIsLoading(false)
          }
          audioRef.current = null

          const error = new Error('Audio playback failed')
          reject(error)
        }

        // 开始播放
        audio.play().catch((err) => {
          // ========== 关键修复：捕获 AbortError ==========
          if (err.name === 'AbortError') {
            console.log(`⏸️ [useTTS] 播放被中断（用户行为，正常）`)
            if (isMountedRef.current) {
              setIsPlaying(false)
              setIsLoading(false)
            }
            audioRef.current = null
            resolve() // 🔥 不要 reject，因为这不算错误
            return
          }

          console.error(`❌ [useTTS] play() 调用失败:`, err)
          if (isMountedRef.current) {
            setIsPlaying(false)
            setIsLoading(false)
          }
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
      // ========== 边界检查 ==========
      if (!text || text.trim() === '') {
        console.warn(`⚠️ [useTTS] 文本为空，跳过API请求`)
        throw new Error('Text is empty')
      }

      if (text.length > 200) {
        console.warn(`⚠️ [useTTS] 文本过长(${text.length}字符)，跳过API请求`)
        throw new Error('Text too long')
      }

      const url = `/api/tts?text=${encodeURIComponent(text)}&type=${type}`

      console.log(`📡 [useTTS] 请求API: text="${text}", type=${type}`)

      // 添加超时保护
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超时

      try {
        const response = await fetch(url, { signal: controller.signal })
        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`)
        }

        // 直接返回音频流
        console.log(`📥 [useTTS] 接收音频流: ${response.headers.get('Content-Length')} bytes`)

        const blob = await response.blob()
        const objectUrl = URL.createObjectURL(blob)

        console.log(`🔗 [useTTS] 创建Blob URL: ${objectUrl}`)

        try {
          await playAudioFile(objectUrl)
        } finally {
          // 清理 Blob URL
          setTimeout(() => {
            if (isMountedRef.current) {
              URL.revokeObjectURL(objectUrl)
              console.log(`🗑️ [useTTS] 清理 Blob URL`)
            }
          }, 1000)
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.error(`❌ [useTTS] API请求超时`)
          throw new Error('API request timeout')
        }
        throw error
      }
    },
    [type, playAudioFile]
  )

  /**
   * 回退到 Web Speech API
   */
  const fallbackToWebSpeech = useCallback(
    (text: string): void => {
      // ========== 边界检查 ==========
      if (!text || text.trim() === '') {
        console.warn(`⚠️ [useTTS] 文本为空，跳过Web Speech`)
        return
      }

      console.log(`🔄 [useTTS] 回退到Web Speech: text="${text}"`)

      // 停止之前的语音
      stopSpeaking()

      // 使用 Web Speech API
      const success = webSpeechSpeak(text, {
        lang: type === '1' ? 'en-GB' : 'en-US',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        onEnd: () => {
          console.log(`✅ [useTTS] Web Speech播放完成`)
          if (isMountedRef.current) {
            setIsPlaying(false)
            setIsLoading(false)
          }
        },
        onError: (event) => {
          console.error(`❌ [useTTS] Web Speech错误:`, event)
          if (isMountedRef.current) {
            setIsPlaying(false)
            setIsLoading(false)
          }
        },
      })

      if (!success) {
        console.error(`❌ [useTTS] Web Speech API初始化失败`)
        if (isMountedRef.current) {
          setIsLoading(false)
        }
      }
    },
    [type]
  )

  /**
   * 🆕 预加载音频（后台静默加载，不播放）
   *
   * ⚠️ 重要：只预加载 OSS URL（可被浏览器 HTTP 缓存）
   * API 音频不预加载（Blob URL 无法缓存，预加载无意义）
   *
   * @param text - 要预加载的单词
   * @param audioUrl - 可选的音频URL
   * @returns Promise<void>
   */
  const preload = useCallback(
    async (text: string, audioUrl?: string | null): Promise<void> => {
      // ========== 边界检查 ==========
      if (!text || text.trim() === '') {
        return
      }

      // 🔥 只预加载 OSS URL（可被浏览器 HTTP 缓存）
      // API 音频是动态生成的 Blob URL，无法被缓存，预加载无意义
      if (!audioUrl || audioUrl.trim() === '') {
        return
      }

      // 生成缓存键
      const cacheKey = audioUrl

      // 检查是否已预加载过
      if (preloadedCacheRef.current.has(cacheKey)) {
        return
      }

      try {
        // 静默加载 OSS 音频（触发浏览器 HTTP 缓存）
        const audio = new Audio(audioUrl)

        // 监听加载完成
        audio.onloadeddata = () => {
          if (isMountedRef.current) {
            preloadedCacheRef.current.add(cacheKey)
          }
        }

        // 🔥 关键：只加载不播放
        // 这会触发浏览器下载并缓存音频文件
        audio.load()
      } catch (error) {
        // 预加载失败不影响主功能，静默处理
      }
    },
    [] // 不依赖任何其他函数
  )

  /**
   * 主播放函数
   * 🔧 优化：检查预加载缓存
   */
  const play = useCallback(
    async (text: string, audioUrl?: string | null): Promise<void> => {
      // ========== 边界检查 ==========
      if (!text || text.trim() === '') {
        console.warn(`⚠️ [useTTS] 空文本，忽略`)
        return
      }

      console.log(
        `🎯 [useTTS] 播放请求: text="${text}", type=${type}, audioUrl=${audioUrl || 'none'}`
      )

      setIsLoading(true)
      setIsPlaying(true)

      try {
        // 策略 1: 如果有现有的 OSS URL，直接使用
        if (audioUrl && audioUrl.trim() !== '') {
          console.log(`✅ [useTTS] 使用OSS URL: ${audioUrl}`)
          await playAudioFile(audioUrl)
          return
        }

        // 策略 2: 从 API 获取音频
        console.log(`🔄 [useTTS] 从API获取音频...`)
        await fetchFromAPI(text)
      } catch (error) {
        console.error(
          `❌ [useTTS] 音频获取失败，回退到Web Speech:`,
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
   * 🔧 修复：添加清理逻辑
   */
  const stop = useCallback(() => {
    console.log(`⏹️ [useTTS] 停止播放`)

    // 停止音频播放
    if (audioRef.current) {
      try {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      } catch (e) {
        // 忽略清理错误
      }
      audioRef.current = null
    }

    // 停止 Web Speech
    stopSpeaking()

    if (isMountedRef.current) {
      setIsPlaying(false)
      setIsLoading(false)
    }
  }, [])

  /**
   * 组件卸载时清理
   * 🔧 修复：设置卸载标记
   */
  useEffect(() => {
    isMountedRef.current = true

    return () => {
      console.log(`🧹 [useTTS] 组件卸载，清理资源`)
      isMountedRef.current = false
      stop()
    }
  }, [stop])

  return {
    play,
    stop,
    preload,  // 🆕 导出预加载函数
    isPlaying,
    isLoading,
  }
}
