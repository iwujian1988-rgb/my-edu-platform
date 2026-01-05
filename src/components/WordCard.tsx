'use client'

import { useState } from 'react'
import { Volume2, Eye, EyeOff } from 'lucide-react'

interface Word {
  id: string
  word: string
  phonetic: string
  definition: string
  definition_en: string
  collocation: string
  collocation_en: string
  example_sentence: string
  example_sentence_en: string
  part_of_speech: string
  status: 'known' | 'fuzzy' | 'unknown'
}

interface WordCardProps {
  word: Word
  index: number
  onStatusChange: (wordId: string, status: 'known' | 'fuzzy' | 'unknown') => void
}

export function WordCard({ word, index, onStatusChange }: WordCardProps) {
  const [showDefinition, setShowDefinition] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)

  // 发音功能
  const handleSpeak = () => {
    if ('speechSynthesis' in window) {
      setIsPlaying(true)
      const utterance = new SpeechSynthesisUtterance(word.word)
      utterance.lang = 'en-US'
      utterance.rate = 0.8
      utterance.onend = () => setIsPlaying(false)
      speechSynthesis.speak(utterance)
    }
  }

  // 状态标记
  const handleStatusChange = (status: 'known' | 'fuzzy' | 'unknown') => {
    onStatusChange(word.id, status)
  }

  return (
    <div className="clay-card p-5 md:p-6 hover:scale-[1.01] transition-transform">
      <div className="flex flex-col md:flex-row md:items-start gap-4">
        {/* 左侧：序号 */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
          <span className="text-sm font-bold text-purple-700">{index + 1}</span>
        </div>

        {/* 中间：单词内容 */}
        <div className="flex-1 min-w-0">
          {/* 单词和音标 */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1">
              <h3 className="text-2xl md:text-3xl font-black text-gray-900 mb-1">
                {word.word}
              </h3>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-gray-600 font-mono">{word.phonetic}</span>
                <span className="px-2 py-1 text-xs font-semibold text-purple-600 bg-purple-50 rounded-full">
                  {word.part_of_speech}
                </span>
              </div>
            </div>

            {/* 状态标记按钮 */}
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => handleStatusChange('known')}
                className={`w-10 h-10 rounded-full border-2 transition-all ${
                  word.status === 'known'
                    ? 'bg-green-500 border-green-600'
                    : 'bg-white border-gray-300 hover:border-green-400'
                }`}
                title="认识"
              />
              <button
                onClick={() => handleStatusChange('fuzzy')}
                className={`w-10 h-10 rounded-full border-2 transition-all ${
                  word.status === 'fuzzy'
                    ? 'bg-yellow-400 border-yellow-500'
                    : 'bg-white border-gray-300 hover:border-yellow-400'
                }`}
                title="模糊"
              />
              <button
                onClick={() => handleStatusChange('unknown')}
                className={`w-10 h-10 rounded-full border-2 transition-all ${
                  word.status === 'unknown'
                    ? 'bg-red-500 border-red-600'
                    : 'bg-white border-gray-300 hover:border-red-400'
                }`}
                title="不认识"
              />
            </div>
          </div>

          {/* 释义 - 可切换显示 */}
          {showDefinition && (
            <div className="mb-3">
              <p className="text-base md:text-lg font-semibold text-gray-900 mb-1">
                {word.definition}
              </p>
              <p className="text-sm text-gray-600">{word.definition_en}</p>
            </div>
          )}

          {/* 搭配 */}
          {word.collocation && (
            <div className="mb-3 p-3 rounded-xl bg-blue-50 border border-blue-200">
              <p className="text-sm font-semibold text-blue-900 mb-1">
                💡 搭配: {word.collocation}
              </p>
              <p className="text-xs text-blue-700">{word.collocation_en}</p>
            </div>
          )}

          {/* 例句 */}
          {word.example_sentence && (
            <div className="mb-3 p-3 rounded-xl bg-green-50 border border-green-200">
              <p className="text-sm text-gray-800 mb-1">
                📝 {word.example_sentence}
              </p>
              <p className="text-xs text-gray-600">{word.example_sentence_en}</p>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
            <button
              onClick={handleSpeak}
              disabled={isPlaying}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-green-400 to-green-500 text-white text-sm font-semibold hover:shadow-lg transition-all disabled:opacity-50"
            >
              <Volume2 className="w-4 h-4" />
              {isPlaying ? '播放中...' : '发音'}
            </button>
            <button
              onClick={() => setShowDefinition(!showDefinition)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:border-purple-300 hover:text-purple-600 transition-all"
            >
              {showDefinition ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showDefinition ? '隐藏释义' : '显示释义'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
