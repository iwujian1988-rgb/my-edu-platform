'use client'

/**
 * 发音要点 Tab 组件
 *
 * 设计风格：Neo-brutalism - 与 Speaker 模块保持一致
 */

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Volume2, Play, Loader2 } from 'lucide-react'
import type { VideoPronunciationTip } from '@/types/video'

// ============================================
// 类型定义
// ============================================

export interface PronunciationTipsTabProps {
  tips: VideoPronunciationTip[]
}

// ============================================
// 播放发音 Hook
// ============================================

function usePlayPronunciation() {
  const [playingWord, setPlayingWord] = useState<string | null>(null)

  const playWord = useCallback((word: string) => {
    if (!('speechSynthesis' in window)) return

    if (playingWord) {
      speechSynthesis.cancel()
    }

    setPlayingWord(word)

    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = 'fr-FR'
    utterance.rate = 0.8

    utterance.onend = () => setPlayingWord(null)
    utterance.onerror = () => setPlayingWord(null)

    speechSynthesis.speak(utterance)
  }, [playingWord])

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
  const isPlayingSound = playingWord === tip.sound_symbol

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
        {/* 播放按钮 */}
        <button
          onClick={() => playWord(tip.sound_symbol)}
          className={cn(
            "flex items-center gap-1 px-2 py-1 text-xs font-black border-[2px] border-black dark:border-gray-500 transition-all duration-150",
            isPlayingSound
              ? "bg-[#B4F416] text-black shadow-[2px_2px_0px_0px_#000]"
              : "bg-white dark:bg-gray-700 hover:bg-[#B4F416] hover:text-black"
          )}
        >
          {isPlayingSound ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Play className="w-3 h-3" />
          )}
          播放
        </button>
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
