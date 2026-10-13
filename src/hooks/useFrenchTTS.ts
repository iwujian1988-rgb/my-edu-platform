'use client'

/**
 * 法语发音 Hook：显式音频 URL 优先；有法语系统声音时直接朗读，
 * 否则使用有道 dictvoice，失败后降级到浏览器 speechSynthesis('fr-FR')。
 * 系统朗读重试必须在用户点击中同步发起，避免异步降级失去播放权限。
 *
 * 用法：const { speak, stop, status, error } = useFrenchTTS()
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { logger } from '@/lib/logger'

const START_TIMEOUT_MS = 8000
const FRENCH_LANGUAGE = 'fr-FR'
const FRENCH_RATE = 0.92
const DICTVOICE_URL = 'https://dict.youdao.com/dictvoice'
const DICTIONARY_LANGUAGE = 'fr'
const RETRY_MESSAGE = '发音未能播放，请再点一次重试；仍无声音可尝试在 Safari 中打开。'
const UNAVAILABLE_MESSAGE = '当前无法播放法语发音，请检查网络或尝试在 Safari 中打开。'
type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'error'

const norm = (s: string) =>
  s.trim().toLowerCase().replace(/[’‘´`]/g, "'").replace(/\s+/g, ' ')

export function useFrenchTTS() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestRef = useRef(0)
  const retrySynthesisRef = useRef(false)
  const [status, setStatus] = useState<PlaybackStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  const cancelPlayback = useCallback(() => {
    // Invalidate callbacks before pause/cancel, which can themselves dispatch errors.
    requestRef.current += 1
    clearTimer()
    if (audioRef.current) {
      audioRef.current.onplaying = null
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current.pause()
    }
    if (utteranceRef.current) {
      utteranceRef.current.onstart = null
      utteranceRef.current.onend = null
      utteranceRef.current.onerror = null
      utteranceRef.current = null
      window.speechSynthesis?.cancel()
    }
  }, [clearTimer])

  const fail = useCallback((request: number, message: string, reason: unknown) => {
    if (request !== requestRef.current) return
    logger.warn('[FrenchTTS] Playback failed', reason)
    cancelPlayback()
    setStatus('error')
    setError(message)
  }, [cancelPlayback])

  const speakWithSynthesis = useCallback((text: string, request: number) => {
    if (request !== requestRef.current) return
    clearTimer()
    const synth = window.speechSynthesis
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
      fail(request, UNAVAILABLE_MESSAGE, 'speech-synthesis-unavailable')
      return
    }
    try {
      const u = new SpeechSynthesisUtterance(text)
      u.lang = FRENCH_LANGUAGE
      u.rate = FRENCH_RATE
      const voice = synth.getVoices().find(v => v.lang.toLowerCase().startsWith('fr'))
      if (voice) u.voice = voice
      // Retain the utterance until completion and observe actual playback, not enqueueing.
      utteranceRef.current = u
      u.onstart = () => {
        if (request !== requestRef.current) return
        clearTimer()
        setStatus('playing')
      }
      u.onend = () => {
        if (request !== requestRef.current) return
        clearTimer()
        utteranceRef.current = null
        setStatus('idle')
      }
      u.onerror = event => fail(request, RETRY_MESSAGE, event.error)
      timerRef.current = setTimeout(() => fail(request, RETRY_MESSAGE, 'speech-start-timeout'), START_TIMEOUT_MS)
      synth.cancel()
      synth.speak(u)
    } catch (reason) {
      fail(request, RETRY_MESSAGE, reason)
    }
  }, [clearTimer, fail])

  const speak = useCallback((text: string, audioUrl?: string | null) => {
    const clean = text.trim()
    if (!clean || typeof window === 'undefined') return
    cancelPlayback()
    const request = requestRef.current
    setError(null)
    setStatus('loading')

    // A known French voice avoids network delay and keeps iPhone speech in the click gesture.
    try {
      const hasFrenchVoice = window.speechSynthesis?.getVoices().some(v => v.lang.toLowerCase().startsWith('fr'))
      if (retrySynthesisRef.current || (!audioUrl && hasFrenchVoice)) {
        speakWithSynthesis(clean, request)
        return
      }
    } catch (reason) {
      logger.warn('[FrenchTTS] Voice discovery failed', reason)
    }

    let fallbackStarted = false
    const fallback = (reason: unknown) => {
      if (request !== requestRef.current || fallbackStarted) return
      fallbackStarted = true
      clearTimer()
      if (audioRef.current) {
        audioRef.current.onplaying = null
        audioRef.current.onended = null
        audioRef.current.onerror = null
        audioRef.current.pause()
      }
      logger.warn('[FrenchTTS] Using speech fallback', reason)
      // The next click bypasses the failed network request and supplies a fresh user gesture.
      retrySynthesisRef.current = true
      speakWithSynthesis(clean, request)
    }
    try {
      // Reuse the media element so mobile playback authorization survives between words.
      if (!audioRef.current) audioRef.current = new Audio()
      // Use the dictionary's audio endpoint; the old pronunciation path failed to return media.
      const query = new URLSearchParams({ audio: norm(clean), le: DICTIONARY_LANGUAGE })
      audioRef.current.src = audioUrl || `${DICTVOICE_URL}?${query.toString()}`
      audioRef.current.onplaying = () => {
        if (request !== requestRef.current || fallbackStarted) return
        clearTimer()
        setStatus('playing')
      }
      audioRef.current.onended = () => {
        if (request !== requestRef.current || fallbackStarted) return
        clearTimer()
        setStatus('idle')
      }
      audioRef.current.onerror = () => fallback(audioRef.current?.error)
      timerRef.current = setTimeout(() => fallback('audio-start-timeout'), START_TIMEOUT_MS)
      // Call play synchronously; fetching first would lose the original user gesture.
      void audioRef.current.play().catch(fallback)
    } catch (reason) {
      fallback(reason)
    }
  }, [cancelPlayback, clearTimer, speakWithSynthesis])

  const stop = useCallback(() => {
    cancelPlayback()
    setStatus('idle')
    setError(null)
  }, [cancelPlayback])

  useEffect(() => cancelPlayback, [cancelPlayback])
  return { speak, stop, status, error }
}
