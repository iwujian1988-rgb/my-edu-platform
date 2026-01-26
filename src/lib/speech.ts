/**
 * Text-to-Speech (TTS) 工具函数
 * 解决Chrome浏览器的speechSynthesis激活问题
 */

import { useState, useEffect } from 'react'

// Chrome TTS引擎状态
let isTTSAvailable = false
let isTTSInitialized = false
let initializationAttempts = 0
const MAX_INIT_ATTEMPTS = 3

/**
 * 检查浏览器是否支持speechSynthesis
 */
export function supportsSpeechSynthesis(): boolean {
  return 'speechSynthesis' in window && window.speechSynthesis !== null
}

/**
 * 初始化TTS引擎（必须在用户交互事件中调用）
 * Chrome要求：必须在用户点击、触摸等交互后才能激活TTS
 */
export async function initializeTTS(): Promise<boolean> {
  if (!supportsSpeechSynthesis()) {
    console.warn('❌ TTS: Browser does not support speechSynthesis')
    return false
  }

  if (isTTSInitialized) {
    console.log('✅ TTS: Already initialized')
    return true
  }

  console.log('🔧 TTS: Initializing...')

  try {
    // 取消任何正在播放的内容
    window.speechSynthesis.cancel()

    // 创建一个简短的utterance来"唤醒"TTS引擎
    const utterance = new SpeechSynthesisUtterance('')
    utterance.volume = 0 // 静音，用户听不到
    utterance.rate = 1
    utterance.pitch = 1
    utterance.lang = 'en-US'

    // 尝试播放这个空的utterance
    window.speechSynthesis.speak(utterance)

    // 等待一小段时间
    await new Promise(resolve => setTimeout(resolve, 100))

    // 取消这个utterance
    window.speechSynthesis.cancel()

    // 检查是否可以获取语音列表
    const voices = window.speechSynthesis.getVoices()
    if (voices.length === 0) {
      // 如果语音列表为空，等待voiceschanged事件
      await new Promise<boolean>((resolve) => {
        const handler = () => {
          const updatedVoices = window.speechSynthesis.getVoices()
          if (updatedVoices.length > 0) {
            window.speechSynthesis.onvoiceschanged = null
            console.log(`✅ TTS: Initialized with ${updatedVoices.length} voices`)
            resolve(true)
          }
        }

        window.speechSynthesis.onvoiceschanged = handler

        // 超时处理：即使没有语音列表，也认为初始化成功
        setTimeout(() => {
          window.speechSynthesis.onvoiceschanged = null
          console.log('⚠️ TTS: Initialized but no voices loaded (timeout)')
          resolve(true)
        }, 1000)
      })
    } else {
      console.log(`✅ TTS: Initialized with ${voices.length} voices`)
    }

    isTTSInitialized = true
    isTTSAvailable = true
    return true
  } catch (error) {
    console.error('❌ TTS: Initialization failed', error)
    initializationAttempts++

    if (initializationAttempts < MAX_INIT_ATTEMPTS) {
      // 重试
      await new Promise(resolve => setTimeout(resolve, 500))
      return initializeTTS()
    }

    return false
  }
}

/**
 * 播放语音
 * @param text - 要朗读的文本
 * @param options - 可选参数
 */
export interface SpeakOptions {
  lang?: string
  rate?: number
  pitch?: number
  volume?: number
  onStart?: () => void
  onEnd?: () => void
  onError?: (error: SpeechSynthesisErrorEvent) => void
  voiceURI?: string // 指定特定的语音
}

export function speak(text: string, options: SpeakOptions = {}): boolean {
  if (!supportsSpeechSynthesis()) {
    console.warn('❌ TTS: Browser does not support speechSynthesis')
    return false
  }

  if (!text || text.trim() === '') {
    console.warn('⚠️ TTS: Empty text provided')
    return false
  }

  // 如果TTS尚未初始化，尝试初始化
  if (!isTTSInitialized) {
    console.warn('⚠️ TTS: Not initialized, attempting initialization now...')
    initializeTTS().then(success => {
      if (success) {
        speak(text, options)
      }
    })
    return false
  }

  try {
    // 取消任何正在播放的内容
    window.speechSynthesis.cancel()

    // 创建新的utterance
    const utterance = new SpeechSynthesisUtterance(text)

    // 设置参数
    utterance.lang = options.lang || 'en-US'
    utterance.rate = options.rate || 1.0
    utterance.pitch = options.pitch || 1.0
    utterance.volume = options.volume ?? 1.0

    // 如果指定了voiceURI，尝试使用该语音
    if (options.voiceURI) {
      const voices = window.speechSynthesis.getVoices()
      const selectedVoice = voices.find(v => v.voiceURI === options.voiceURI)
      if (selectedVoice) {
        utterance.voice = selectedVoice
      }
    }

    // 设置回调
    if (options.onStart) {
      utterance.onstart = options.onStart
    }

    if (options.onEnd) {
      utterance.onend = options.onEnd
    }

    if (options.onError) {
      utterance.onerror = (event) => {
        // 这些错误是正常的，不需要记录为错误
        const normalErrors = ['interrupted', 'canceled', 'not-allowed']
        if (!normalErrors.includes(event.error)) {
          console.error('❌ TTS: Speech error', event.error)
        } else if (event.error === 'not-allowed') {
          // 静默处理 - 这是预期的行为（用户还未交互）
          console.log('🔇 TTS: Speech not allowed (waiting for user interaction)')
        }
        options.onError?.(event)
      }
    } else {
      utterance.onerror = (event) => {
        // 这些错误是正常的，不需要记录为错误
        const normalErrors = ['interrupted', 'canceled', 'not-allowed']
        if (!normalErrors.includes(event.error)) {
          console.error('❌ TTS: Speech error', event.error)
        } else if (event.error === 'not-allowed') {
          // 静默处理 - 这是预期的行为（用户还未交互）
          console.log('🔇 TTS: Speech not allowed (waiting for user interaction)')
        }
      }
    }

    // 播放
    window.speechSynthesis.speak(utterance)

    // Chrome bug修复：某些情况下需要额外的"kick"
    setTimeout(() => {
      if (window.speechSynthesis.pending) {
        console.log('🔄 TTS: Kicking speech synthesis (Chrome bug fix)')
        window.speechSynthesis.pause()
        window.speechSynthesis.resume()
      }
    }, 100)

    console.log(`🔊 TTS: Speaking "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`)
    return true
  } catch (error) {
    console.error('❌ TTS: Failed to speak', error)
    return false
  }
}

/**
 * 停止播放
 */
export function stopSpeaking(): void {
  if (supportsSpeechSynthesis()) {
    window.speechSynthesis.cancel()
    console.log('⏹️ TTS: Stopped')
  }
}

/**
 * 暂停播放
 */
export function pauseSpeaking(): void {
  if (supportsSpeechSynthesis()) {
    window.speechSynthesis.pause()
    console.log('⏸️ TTS: Paused')
  }
}

/**
 * 继续播放
 */
export function resumeSpeaking(): void {
  if (supportsSpeechSynthesis()) {
    window.speechSynthesis.resume()
    console.log('▶️ TTS: Resumed')
  }
}

/**
 * 检查是否正在播放
 */
export function isSpeaking(): boolean {
  return supportsSpeechSynthesis() ? window.speechSynthesis.speaking : false
}

/**
 * 检查是否有待播放的内容
 */
export function hasPendingSpeech(): boolean {
  return supportsSpeechSynthesis() ? window.speechSynthesis.pending : false
}

/**
 * 获取可用的语音列表
 */
export function getVoices(): SpeechSynthesisVoice[] {
  return supportsSpeechSynthesis() ? window.speechSynthesis.getVoices() : []
}

/**
 * 获取英语语音（优先选择美式英语）
 */
export function getEnglishVoice(): SpeechSynthesisVoice | null {
  const voices = getVoices()

  // 优先选择美式英语
  const enUS = voices.find(v => v.lang === 'en-US')
  if (enUS) return enUS

  // 其次选择任何英语语音
  const enAny = voices.find(v => v.lang.startsWith('en'))
  if (enAny) return enAny

  // 最后返回第一个语音（如果有的话）
  return voices.length > 0 ? voices[0] : null
}

/**
 * React Hook: 使用Web Speech API TTS
 * 自动在首次用户交互时初始化TTS
 *
 * 注意：此函数已重命名为 useWebSpeechTTS，避免与 @/hooks/use-tts 冲突
 */
export function useWebSpeechTTS() {
  const [initialized, setInitialized] = useState(isTTSInitialized)

  useEffect(() => {
    // 监听用户交互事件
    const handleUserInteraction = () => {
      if (!isTTSInitialized) {
        initializeTTS().then(success => {
          if (success) {
            setInitialized(true)
          }
        })
      }
    }

    // 监听各种用户交互事件
    const events = ['click', 'touchstart', 'keydown']
    events.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { once: true })
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserInteraction)
      })
    }
  }, [])

  return {
    initialized,
    speak,
    stop: stopSpeaking,
    pause: pauseSpeaking,
    resume: resumeSpeaking,
    isSpeaking: isSpeaking(),
    hasPending: hasPendingSpeech(),
    getVoices,
    getEnglishVoice
  }
}
