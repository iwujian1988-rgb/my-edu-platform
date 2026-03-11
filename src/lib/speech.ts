/**
 * Text-to-Speech (TTS) 工具函数
 * 解决Chrome浏览器的speechSynthesis激活问题
 *
 * Updated: 2026-03-11 - 添加多语言支持
 */

import { useState, useEffect } from 'react'

// ============================================
// 多语言配置
// ============================================

/** 支持的语言代码 */
export type SupportedLanguage = 'en' | 'fr' | 'de' | 'es' | 'ja' | 'it' | 'ru'

/** 语言代码到 Web Speech API lang 的映射 */
export const LANGUAGE_TO_WEB_SPEECH_MAP: Record<SupportedLanguage, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  de: 'de-DE',
  es: 'es-ES',
  ja: 'ja-JP',
  it: 'it-IT',
  ru: 'ru-RU'
}

/** 语言代码到有道 TTS 类型的映射 */
export const LANGUAGE_TO_YOUDAO_TYPE: Record<SupportedLanguage, '1' | '2'> = {
  en: '2',  // 美音
  fr: '1',
  de: '1',
  es: '1',
  ja: '1',
  it: '1',
  ru: '1'
}

/** 获取语言的 Web Speech API lang 值 */
export function getWebSpeechLang(language: SupportedLanguage): string {
  return LANGUAGE_TO_WEB_SPEECH_MAP[language] || 'en-US'
}

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
  lang?: string           // Web Speech API lang 值（如 'en-US', 'fr-FR'）
  language?: SupportedLanguage  // 简化的语言代码（如 'en', 'fr'）
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

    // 确定语言设置：优先使用 language 参数，其次 lang 参数，最后默认英语
    const langToUse = options.language
      ? getWebSpeechLang(options.language)
      : (options.lang || 'en-US')

    // 设置参数
    utterance.lang = langToUse
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
    } else {
      // 自动选择最匹配的语音
      const voices = window.speechSynthesis.getVoices()
      const bestVoice = findBestVoice(voices, langToUse)
      if (bestVoice) {
        utterance.voice = bestVoice
        console.log(`🎙️ TTS: Using voice "${bestVoice.name}" (${bestVoice.lang})`)
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

    console.log(`🔊 TTS: Speaking "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}" in ${langToUse}`)
    return true
  } catch (error) {
    console.error('❌ TTS: Failed to speak', error)
    return false
  }
}

/**
 * 查找最佳匹配的语音
 */
function findBestVoice(voices: SpeechSynthesisVoice[], targetLang: string): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null

  // 1. 精确匹配语言代码
  const exactMatch = voices.find(v => v.lang === targetLang)
  if (exactMatch) return exactMatch

  // 2. 匹配语言前缀（如 'fr' 匹配 'fr-FR', 'fr-CA'）
  const langPrefix = targetLang.split('-')[0]
  const prefixMatch = voices.find(v => v.lang.startsWith(langPrefix))
  if (prefixMatch) return prefixMatch

  // 3. 对于英语，优先选择美式英语
  if (langPrefix === 'en') {
    const enUS = voices.find(v => v.lang === 'en-US')
    if (enUS) return enUS
    const enAny = voices.find(v => v.lang.startsWith('en'))
    if (enAny) return enAny
  }

  // 4. 返回默认语音
  return voices[0]
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
 * 获取指定语言的语音
 */
export function getVoiceForLanguage(language: SupportedLanguage): SpeechSynthesisVoice | null {
  const voices = getVoices()
  const targetLang = getWebSpeechLang(language)
  return findBestVoice(voices, targetLang)
}

/**
 * 获取英语语音（优先选择美式英语）
 * @deprecated 使用 getVoiceForLanguage('en') 替代
 */
export function getEnglishVoice(): SpeechSynthesisVoice | null {
  return getVoiceForLanguage('en')
}

/**
 * 获取法语语音
 */
export function getFrenchVoice(): SpeechSynthesisVoice | null {
  return getVoiceForLanguage('fr')
}

/**
 * 获取所有支持语言的语音
 */
export function getVoicesByLanguage(): Record<SupportedLanguage, SpeechSynthesisVoice[]> {
  const voices = getVoices()
  const result: Record<string, SpeechSynthesisVoice[]> = {}

  for (const lang of Object.keys(LANGUAGE_TO_WEB_SPEECH_MAP)) {
    const targetLang = LANGUAGE_TO_WEB_SPEECH_MAP[lang as SupportedLanguage]
    const langPrefix = targetLang.split('-')[0]
    result[lang] = voices.filter(v => v.lang.startsWith(langPrefix))
  }

  return result
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
    getEnglishVoice,
    getFrenchVoice,
    getVoiceForLanguage,
    getVoicesByLanguage
  }
}
