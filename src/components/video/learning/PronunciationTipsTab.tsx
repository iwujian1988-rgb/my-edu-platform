'use client'

/**
 * 发音要点 Tab 组件
 *
 * 设计风格：Neo-brutalism - 与 Speaker 模块保持一致
 */

import { useState, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Volume2, Play, Loader2 } from 'lucide-react'
import type { VideoPronunciationTip } from '@/types/video'

// ============================================
// 类型定义
// ============================================

export interface PronunciationTipsTabProps {
  tips: VideoPronunciationTip[]
}

/** IPA 特有字符（正常法语单词中不会出现） */
const IPA_CHAR_PATTERN = /[ɑɔɛøœəʏʁʃʒɲŋː]/

// ============================================
// 播放发音 Hook — 缓存 + IPA 快速路径
// ============================================

function usePlayPronunciation() {
  const [playingWord, setPlayingWord] = useState<string | null>(null)
  /** 音频 blob 缓存：word → Object URL */
  const audioCacheRef = useRef<Map<string, string>>(new Map())

  /** 浏览器 SpeechSynthesis 播放 */
  const speakWithBrowser = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      setPlayingWord(null)
      return
    }
    speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'fr-FR'
    utterance.rate = 0.8
    const voices = speechSynthesis.getVoices()
    const frVoice = voices.find(v => v.lang.startsWith('fr'))
    if (frVoice) utterance.voice = frVoice
    utterance.onend = () => setPlayingWord(null)
    utterance.onerror = () => setPlayingWord(null)
    speechSynthesis.speak(utterance)
    // Chrome bug: onend 可能不触发，加超时保护
    setTimeout(() => setPlayingWord(prev => prev === text ? null : prev), 5000)
  }, [])

  const playWord = useCallback(async (word: string) => {
    speechSynthesis.cancel()
    setPlayingWord(word)

    try {
      // 1. 缓存命中 → 瞬间播放
      const cachedUrl = audioCacheRef.current.get(word)
      if (cachedUrl) {
        const audio = new Audio(cachedUrl)
        audio.onended = () => setPlayingWord(null)
        audio.onerror = () => setPlayingWord(null)
        await audio.play()
        return
      }

      // 2. IPA 音标 → 跳过 API，直接用 SpeechSynthesis（API 不认识 IPA）
      if (IPA_CHAR_PATTERN.test(word)) {
        speakWithBrowser(word)
        return
      }

      // 3. 真实法语单词 → 调用后端 TTS API
      const response = await fetch(`/api/tts?text=${encodeURIComponent(word)}&type=2&language=fr`)

      if (response.ok) {
        const blob = await response.blob()
        const blobUrl = URL.createObjectURL(blob)
        audioCacheRef.current.set(word, blobUrl)

        const audio = new Audio(blobUrl)
        audio.onended = () => setPlayingWord(null)
        audio.onerror = () => setPlayingWord(null)
        await audio.play()
        return
      }

      // 4. API 失败 → 回退 SpeechSynthesis
      speakWithBrowser(word)
    } catch (error) {
      console.warn('[PronunciationTips TTS] 播放失败:', error)
      speakWithBrowser(word)
    }
  }, [speakWithBrowser])

  return { playWord, playingWord }
}

// ============================================
// 组件
// ============================================

export function PronunciationTipsTab({ tips }: PronunciationTipsTabProps) {
  const { playWord, playingWord } = usePlayPronunciation()

  if (!tips || tips.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <Volume2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="font-bold">暂无发音要点</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {tips.map((tip, index) => (
        <PronunciationCard
          key={tip.id}
          tip={tip}
          index={index + 1}
          playWord={playWord}
          playingWord={playingWord}
        />
      ))}
    </div>
  )
}

// ============================================
// 发音卡片 - Neo-brutalism
// ============================================

interface PronunciationCardProps {
  tip: VideoPronunciationTip
  index: number
  playWord: (word: string) => void
  playingWord: string | null
}

function PronunciationCard({ tip, index, playWord, playingWord }: PronunciationCardProps) {

  return (
    <div className="bg-white dark:bg-gray-800 border-[2px] border-black dark:border-gray-600 rounded-sm shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666] transition-all duration-150 hover:shadow-[4px_4px_0px_0px_#000] dark:hover:shadow-[4px_4px_0px_0px_#666] hover:-translate-y-0.5">
      {/* 头部 */}
      <div className="flex items-center justify-between px-3 py-2 bg-teal-100 dark:bg-teal-900/30 border-b-[2px] border-black dark:border-gray-600">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-6 h-6 bg-teal-400 text-black text-xs font-black border-[2px] border-black">
            {index}
          </span>
          <span className="text-xl font-black text-black dark:text-white">
            {tip.sound_symbol}
          </span>
        </div>
      </div>

      {/* 内容 */}
      <div className="p-3 space-y-3">
        {/* 示例单词 */}
        {tip.example_words && tip.example_words.length > 0 && (
          <div>
            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">
              剧中示例单词
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tip.example_words.map((word, i) => {
                const isPlayingThis = playingWord === word
                return (
                  <button
                    key={i}
                    onClick={() => playWord(word)}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 text-xs font-bold border-[2px] border-black dark:border-gray-500 transition-all duration-150",
                      isPlayingThis
                        ? "bg-[#B4F416] text-black shadow-[2px_2px_0px_0px_#000]"
                        : "bg-gray-50 dark:bg-gray-700 hover:bg-[#B4F416] hover:text-black"
                    )}
                  >
                    {isPlayingThis ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                    {word}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* 发音指导 */}
        {tip.instruction && (
          <div>
            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
              发音指导
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
              {tip.instruction}
            </p>
          </div>
        )}

        {/* 练习技巧 */}
        {tip.practice_tip && (
          <div className="p-2 bg-green-50 dark:bg-green-900/20 border-[2px] border-green-300 dark:border-green-700 rounded-sm">
            <p className="text-xs font-bold text-green-700 dark:text-green-300 mb-0.5">
              练习技巧
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">
              {tip.practice_tip}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default PronunciationTipsTab
