/**
 * TTS (Text-to-Speech) 引擎模块
 *
 * 职责：
 * - 封装浏览器原生 speechSynthesis API
 * - 提供单词/中文发音功能
 * - 支持美音/英音自动切换
 * - 确保发音不影响打字性能（异步队列）
 *
 * 未来扩展：
 * - 可轻松替换为其他 TTS 服务（如 Azure TTS、Google TTS）
 * - 支持更多语言和方言
 */

// ==================== 类型定义 ====================

/**
 * 发音方案枚举
 * - us: 美式英语 (en-US)
 * - uk: 英式英语 (en-GB)
 * - auto: 自动选择（默认第一个可用声音）
 */
export type TTSLocale = 'us' | 'uk' | 'auto'

/**
 * TTS 配置选项
 */
export interface TTSOptions {
  volume: number       // 音量 0-1
  rate: number         // 语速 0.1-10（推荐 0.8-1.2）
  pitch: number        // 音高 0-2（推荐 0.8-1.2）
  locale: TTSLocale    // 语言/方言
}

/**
 * TTS 引擎类
 *
 * 使用示例：
 * ```typescript
 * const tts = new TTSEngine()
 * await tts.speak('hello', { volume: 0.8, rate: 1.0, locale: 'us' })
 * ```
 */
export class TTSEngine {
  private synth: SpeechSynthesis | null = null
  private voices: SpeechSynthesisVoice[] = []
  private isSpeaking = false

  constructor() {
    // 检测浏览器支持
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis
      this.loadVoices()
    }
  }

  /**
   * 加载可用声音列表
   *
   * 注意：浏览器加载声音是异步的，需要监听 voiceschanged 事件
   * 修复：避免在 constructor 中调用，防止 SSR 问题
   */
  private loadVoices() {
    if (!this.synth) return

    const load = () => {
      this.voices = this.synth!.getVoices()
      console.log('[TTS] Available voices loaded:', this.voices.length)
    }

    // 初始加载
    load()

    // 监听声音列表更新（Chrome 需要）
    // 修复：确保只在浏览器环境注册事件监听
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = load
    }
  }

  /**
   * 根据语言偏好选择合适的声音
   *
   * @param locale - 语言偏好 (us/uk/auto)
   * @returns 匹配的声音，未找到则返回第一个可用声音
   */
  private selectVoice(locale: TTSLocale): SpeechSynthesisVoice | null {
    if (this.voices.length === 0) return null

    // 查找特定语言的声音
    if (locale === 'us') {
      // 优先美音: en-US, en_US
      const usVoice = this.voices.find(v =>
        v.lang.includes('en-US') || v.lang.includes('en_US')
      )
      if (usVoice) return usVoice
    } else if (locale === 'uk') {
      // 优先英音: en-GB, en_UK
      const ukVoice = this.voices.find(v =>
        v.lang.includes('en-GB') || v.lang.includes('en_UK')
      )
      if (ukVoice) return ukVoice
    }

    // auto 或未找到特定语言，返回第一个英语声音
    const enVoice = this.voices.find(v => v.lang.startsWith('en'))
    return enVoice || this.voices[0]
  }

  /**
   * 播放语音（使用混合TTS策略）
   *
   * 策略：
   * 1. 优先调用 /api/tts（有道API + OSS缓存）
   * 2. 失败时回退到 Web Speech API
   *
   * @param text - 要朗读的文本
   * @param options - TTS 配置选项
   * @returns Promise，朗读完成时 resolve
   */
  async speak(text: string, options: Partial<TTSOptions> = {}): Promise<void> {
    // 应用配置
    const config: TTSOptions = {
      volume: options.volume ?? 1.0,
      rate: options.rate ?? 1.0,
      pitch: options.pitch ?? 1.0,
      locale: options.locale ?? 'auto',
    }

    // 将 locale 转换为 type 参数（1=英音, 2=美音）
    const type = config.locale === 'uk' ? '1' : '2'

    console.log(`[TTSEngine] 播放语音: "${text}" (type=${type})`)

    try {
      // 策略 1: 调用 /api/tts（有道API + OSS缓存）
      const apiUrl = `/api/tts?text=${encodeURIComponent(text)}&type=${type}`
      console.log(`[TTSEngine] 尝试从 API 获取: ${apiUrl}`)

      const response = await fetch(apiUrl)

      if (response.ok) {
        console.log(`[TTSEngine] API 响应成功，播放音频`)

        // 播放音频
        const blob = await response.blob()
        const audioUrl = URL.createObjectURL(blob)

        return new Promise((resolve, reject) => {
          const audio = new Audio(audioUrl)

          audio.onended = () => {
            this.isSpeaking = false
            URL.revokeObjectURL(audioUrl)
            console.log(`[TTSEngine] 音频播放完成`)
            resolve()
          }

          audio.onerror = (event) => {
            this.isSpeaking = false
            URL.revokeObjectURL(audioUrl)
            console.error(`[TTSEngine] 音频播放失败，回退到 Web Speech API`, event)
            reject(new Error('Audio playback failed'))
          }

          this.isSpeaking = true
          audio.play().catch((err) => {
            this.isSpeaking = false
            URL.revokeObjectURL(audioUrl)
            console.error(`[TTSEngine] audio.play() 失败，回退到 Web Speech API`, err)
            reject(err)
          })
        })
      } else {
        throw new Error(`API request failed: ${response.status}`)
      }
    } catch (error) {
      console.warn(`[TTSEngine] API 请求失败，回退到 Web Speech API:`, error)

      // 策略 2: 回退到 Web Speech API
      if (!this.synth) {
        console.warn('[TTSEngine] Browser does not support speechSynthesis')
        return
      }

      // 取消当前正在播放的语音（避免重叠）
      this.synth.cancel()

      // 创建语音实例
      const utterance = new SpeechSynthesisUtterance(text)

      utterance.volume = Math.max(0, Math.min(1, config.volume))
      utterance.rate = Math.max(0.1, Math.min(10, config.rate))
      utterance.pitch = Math.max(0, Math.min(2, config.pitch))

      // 选择声音
      const voice = this.selectVoice(config.locale)
      if (voice) {
        utterance.voice = voice
      }

      // 返回 Promise（异步不阻塞主线程）
      return new Promise((resolve) => {
        utterance.onend = () => {
          this.isSpeaking = false
          resolve()
        }

        utterance.onerror = (event) => {
          this.isSpeaking = false
          console.error('[TTSEngine] Speech error:', event.error)
          resolve() // 即使错误也 resolve，避免阻塞
        }

        this.isSpeaking = true
        this.synth!.speak(utterance)
      })
    }
  }

  /**
   * 播放英文单词发音
   *
   * @param word - 英文单词
   * @param options - TTS 配置
   */
  async speakWord(word: string, options?: Partial<TTSOptions>): Promise<void> {
    return this.speak(word, { ...options, rate: options?.rate ?? 0.9 })
  }

  /**
   * 播放中文释义发音
   *
   * @param text - 中文文本
   * @param options - TTS 配置
   */
  async speakTranslation(text: string, options?: Partial<TTSOptions>): Promise<void> {
    return this.speak(text, { ...options, rate: options?.rate ?? 1.0 })
  }

  /**
   * 停止当前语音播放
   */
  cancel(): void {
    if (this.synth) {
      this.synth.cancel()
      this.isSpeaking = false
    }
  }

  /**
   * 检查是否正在播放
   */
  get isActive(): boolean {
    return this.isSpeaking
  }

  /**
   * 获取所有可用声音（用于调试或设置面板）
   */
  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.voices
  }

  /**
   * 检查浏览器是否支持 TTS
   */
  get isSupported(): boolean {
    return this.synth !== null
  }
}

// ==================== 单例实例 ====================

/**
 * 全局 TTS 引擎实例（单例模式）
 *
 * 整个应用共享一个 TTSEngine 实例，避免重复初始化
 */
let ttsEngineInstance: TTSEngine | null = null

export function getTTSEngine(): TTSEngine {
  if (!ttsEngineInstance) {
    ttsEngineInstance = new TTSEngine()
  }
  return ttsEngineInstance
}

/**
 * 重置 TTS 引擎（用于测试或语言切换）
 */
export function resetTTSEngine() {
  if (ttsEngineInstance) {
    ttsEngineInstance.cancel()
    ttsEngineInstance = null
  }
}
