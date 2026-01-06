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
  isSaving?: boolean
  globalHideChinese?: boolean
}

export function WordCard({ word, index, onStatusChange, isSaving = false, globalHideChinese = false }: WordCardProps) {
  const [showDefinition, setShowDefinition] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)

  // 词性映射：英文 → 中文
  const getPartOfSpeechLabel = (pos: string): string => {
    const posMap: Record<string, string> = {
      'noun': '名词',
      'verb': '动词',
      'adjective': '形容词',
      'adverb': '副词',
      'pronoun': '代词',
      'preposition': '介词',
      'conjunction': '连词',
      'interjection': '感叹词',
      'article': '冠词',
      'numeral': '数词',
      // 常见缩写
      'n': '名词',
      'v': '动词',
      'adj': '形容词',
      'adv': '副词',
      'pron': '代词',
      'prep': '介词',
      'conj': '连词',
      'int': '感叹词',
      'art': '冠词',
      'num': '数词',
      // 其他常见词性
      'auxiliary verb': '助动词',
      'modal verb': '情态动词',
      'phrasal verb': '短语动词',
      'transitive verb': '及物动词',
      'intransitive verb': '不及物动词',
    }
    return posMap[pos.toLowerCase()] || pos
  }

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

  // 计算是否显示中文（全局设置优先，然后是本地设置）
  const shouldShowChinese = !globalHideChinese && showDefinition

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
                  {getPartOfSpeechLabel(word.part_of_speech)}
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

          {/* 释义 - 中文可切换显示，英文始终显示 */}
          <div className="mb-3">
            {shouldShowChinese && (
              <p className="text-base md:text-lg font-semibold text-gray-900 mb-1">
                {word.definition}
              </p>
            )}
            <p className="text-sm text-gray-600">{word.definition_en}</p>
          </div>

          {/* 搭配 - 中文可切换显示，英文始终显示 */}
          {word.collocation_en && (
            <div className="mb-3 p-3 rounded-xl bg-blue-50 border border-blue-200">
              <p className="text-sm font-semibold text-blue-900 mb-1">
                💡 搭配: {word.collocation_en}
              </p>
              {shouldShowChinese && word.collocation && (
                <p className="text-xs text-blue-700">{word.collocation}</p>
              )}
            </div>
          )}

          {/* 例句 - 中文可切换显示，英文始终显示 */}
          {word.example_sentence_en && (
            <div className="mb-3 p-3 rounded-xl bg-green-50 border border-green-200">
              <p className="text-sm text-gray-800 mb-1">
                📝 例句: {word.example_sentence_en}
              </p>
              {shouldShowChinese && word.example_sentence && (
                <p className="text-xs text-gray-600">{word.example_sentence}</p>
              )}
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
              {showDefinition ? '隐藏中文' : '显示中文'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
