'use client'

/**
 * 法语发音 Hook - 三层降级
 *
 * 1. word.audio_url（预留，数据库字段有值时优先生效）
 * 2. 有道 dictvoice 运行时拼接（零后端）
 * 3. 浏览器 speechSynthesis('fr-FR')
 *
 * 用法：
 *   const speak = useFrenchTTS()
 *   speak('la caution')
 */

import { useCallback, useRef } from 'react'

const norm = (s: string) =>
  s.trim().toLowerCase().replace(/[’‘´`]/g, "'").replace(/\s+/g, ' ')

export function useFrenchTTS() {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const speakWithSynthesis = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return false
    try {
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'fr-FR'
      u.rate = 0.92
      const voice = window.speechSynthesis
        .getVoices()
        .find((v) => v.lang && v.lang.toLowerCase().startsWith('fr'))
      if (voice) u.voice = voice
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(u)
      return true
    } catch {
      return false
    }
  }, [])

  const speak = useCallback(
    (text: string, audioUrl?: string | null) => {
      const clean = (text || '').trim()
      if (!clean) return

      // 层1：显式音频 URL（预留字段）
      if (audioUrl) {
        try {
          audioRef.current?.pause()
          const audio = new Audio(audioUrl)
          audioRef.current = audio
          audio.play().catch(() => {
            // 音频 URL 失败 → 降级
            speakWithSynthesis(clean)
          })
          return
        } catch {
          // 落到下一层
        }
      }

      // 层2：有道 dictvoice（带词形时用原形查询更稳）
      try {
        const query = encodeURIComponent(norm(clean))
        const audio = new Audio(`https://dictvoice.youdao.com/pronunciation/fr/${query}`)
        audioRef.current?.pause()
        audioRef.current = audio
        audio.play().catch(() => {
          // 层3：speechSynthesis
          speakWithSynthesis(clean)
        })
        return
      } catch {
        speakWithSynthesis(clean)
      }
    },
    [speakWithSynthesis]
  )

  const stop = useCallback(() => {
    audioRef.current?.pause()
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
  }, [])

  return { speak, stop }
}
