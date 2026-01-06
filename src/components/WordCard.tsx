'use client'

import { useState, useRef, useEffect } from 'react'
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
  const [isExpanded, setIsExpanded] = useState(false)

  // Refs for detecting overflow
  const collocationRef = useRef<HTMLDivElement>(null)
  const exampleRef = useRef<HTMLDivElement>(null)
  const [collocationOverflow, setCollocationOverflow] = useState(false)
  const [exampleOverflow, setExampleOverflow] = useState(false)

  // Check for overflow on mount and when content changes
  useEffect(() => {
    const checkOverflow = (ref: React.RefObject<HTMLDivElement>, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
      if (ref.current) {
        const isOverflow = ref.current.scrollHeight > 96 // max-h-24 = 96px
        setter(isOverflow)
      }
    }

    // Delay check to ensure DOM is rendered
    const timer = setTimeout(() => {
      checkOverflow(collocationRef, setCollocationOverflow)
      checkOverflow(exampleRef, setExampleOverflow)
    }, 100)

    return () => clearTimeout(timer)
  }, [word.collocation_en, word.example_sentence_en, showDefinition])

  // 词性映射：英文 → 英文+中文格式
  const getPartOfSpeechLabel = (pos: string): string => {
    const posMap: Record<string, string> = {
      'noun': 'n名词',
      'verb': 'v动词',
      'adjective': 'adj形容词',
      'adverb': 'adv副词',
      'pronoun': 'pron代词',
      'preposition': 'prep介词',
      'conjunction': 'conj连词',
      'interjection': 'int感叹词',
      'article': 'art冠词',
      'numeral': 'num数词',
      // 常见缩写
      'n': 'n名词',
      'v': 'v动词',
      'adj': 'adj形容词',
      'adv': 'adv副词',
      'pron': 'pron代词',
      'prep': 'prep介词',
      'conj': 'conj连词',
      'int': 'int感叹词',
      'art': 'art冠词',
      'num': 'num数词',
      // 其他常见词性
      'auxiliary verb': 'aux助动词',
      'modal verb': 'modal情态动词',
      'phrasal verb': 'phr短语动词',
      'transitive verb': 'vt及物动词',
      'intransitive verb': 'vi不及物动词',
    }
    return posMap[pos.toLowerCase()] || pos
  }

  // 发音功能 - 支持单词、搭配、例句
  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      setIsPlaying(true)
      const utterance = new SpeechSynthesisUtterance(text)
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
  // 逻辑改进：当全局隐藏时，本地按钮可以强制显示中文
  const shouldShowChinese = showDefinition && !globalHideChinese

  // 本地按钮点击逻辑：切换本地显示状态
  const handleToggleLocal = () => {
    setShowDefinition(!showDefinition)
  }

  return (
    <div className="clay-card p-5 md:p-6 hover:scale-[1.01] transition-transform flex flex-col">
      <div className="flex gap-3 flex-1">
        {/* 左侧：序号 */}
        <div className="flex flex-col items-center pt-1 flex-shrink-0">
          <span className="text-xs font-bold text-gray-300">{index + 1}</span>
        </div>

        {/* 右侧：单词内容 */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* 单词、音标和状态按钮 */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-2xl md:text-3xl font-black text-gray-900">
                  {word.word}
                </h3>
                {/* 单词发音按钮 - 小图标 */}
                <button
                  onClick={() => handleSpeak(word.word)}
                  disabled={isPlaying}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="朗读单词"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-gray-600 font-mono">{word.phonetic}</span>
                <span className="px-2 py-1 text-xs font-semibold text-purple-600 bg-purple-50 rounded-full">
                  {getPartOfSpeechLabel(word.part_of_speech)}
                </span>
              </div>
            </div>

            {/* 本地隐藏按钮 - 移到顶部 */}
            <button
              onClick={handleToggleLocal}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0 self-start"
              title={showDefinition ? "隐藏中文" : "显示中文"}
            >
              {showDefinition ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </button>
          </div>

          {/* 可滚动内容区域 */}
          <div className="flex-1 overflow-y-auto">
            {/* 释义 - 中文可切换显示，英文始终显示 */}
            <div className="mb-3">
              <p className="text-sm text-gray-600 mb-1">{word.definition_en}</p>
              {shouldShowChinese ? (
                <p className="text-sm text-gray-600">
                  中文：{word.definition}
                </p>
              ) : (
                <p className="text-sm text-gray-400">
                  中文：______________________
                </p>
              )}
            </div>

            {/* 搭配 - 固定高度，超出折叠 */}
            {word.collocation_en && (
              <div className="mb-3 relative">
                <div
                  ref={collocationRef}
                  className={`p-3 rounded-xl bg-blue-50 border border-blue-200 transition-all duration-200 ${
                    !isExpanded && collocationOverflow ? 'max-h-24 overflow-hidden' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-blue-900 font-semibold">
                      💡 搭配: {word.collocation_en}
                    </p>
                    <button
                      onClick={() => handleSpeak(word.collocation_en)}
                      disabled={isPlaying}
                      className="text-blue-400 hover:text-blue-600 transition-colors"
                      title="朗读搭配"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                  {shouldShowChinese ? (
                    <p className="text-xs text-blue-700 mt-1">中文：{word.collocation}</p>
                  ) : (
                    <p className="text-xs text-blue-400 mt-1">中文：______________________</p>
                  )}
                </div>
                {/* 半透明遮罩 + 展开按钮 - 仅在内容溢出且未展开时显示 */}
                {collocationOverflow && !isExpanded && (
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-blue-50 via-blue-50/95 to-transparent flex items-end justify-center pb-2">
                    <button
                      onClick={() => setIsExpanded(true)}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm"
                    >
                      展开
                    </button>
                  </div>
                )}
                {/* 收起按钮 - 展开后显示 */}
                {isExpanded && collocationOverflow && (
                  <div className="flex justify-center mt-1">
                    <button
                      onClick={() => setIsExpanded(false)}
                      className="text-xs text-gray-400 hover:text-gray-500 transition-colors"
                    >
                      收起
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 例句 - 固定高度，超出折叠 */}
            {word.example_sentence_en && (
              <div className="mb-3 relative">
                <div
                  ref={exampleRef}
                  className={`p-3 rounded-xl bg-green-50 border border-green-200 transition-all duration-200 ${
                    !isExpanded && exampleOverflow ? 'max-h-24 overflow-hidden' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <p className="text-sm text-gray-800 flex-1">
                      📝 例句: {word.example_sentence_en}
                    </p>
                    <button
                      onClick={() => handleSpeak(word.example_sentence_en)}
                      disabled={isPlaying}
                      className="text-green-400 hover:text-green-600 transition-colors flex-shrink-0 ml-2"
                      title="朗读例句"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                  {shouldShowChinese ? (
                    <p className="text-xs text-gray-600 mt-1">中文：{word.example_sentence}</p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">中文：______________________</p>
                  )}
                </div>
                {/* 半透明遮罩 + 展开按钮 - 仅在内容溢出且未展开时显示 */}
                {exampleOverflow && !isExpanded && (
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-green-50 via-green-50/95 to-transparent flex items-end justify-center pb-2">
                    <button
                      onClick={() => setIsExpanded(true)}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm"
                    >
                      展开
                    </button>
                  </div>
                )}
                {/* 收起按钮 - 展开后显示 */}
                {isExpanded && exampleOverflow && (
                  <div className="flex justify-center mt-1">
                    <button
                      onClick={() => setIsExpanded(false)}
                      className="text-xs text-gray-400 hover:text-gray-500 transition-colors"
                    >
                      收起
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 操作按钮 - 固定在底部 */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-200 mt-auto">
            {/* 状态标记按钮 - 移到底部 */}
            <div className="flex gap-1.5">
              <button
                onClick={() => handleStatusChange('known')}
                className={`flex flex-col items-center gap-0.5 transition-all ${
                  word.status === 'known'
                    ? 'text-green-600'
                    : 'text-gray-300 hover:text-green-400'
                }`}
                title="认识"
              >
                <div className={`w-5 h-5 rounded-full border-2 transition-all ${
                  word.status === 'known'
                    ? 'bg-green-500 border-green-600'
                    : 'bg-white border-gray-300'
                }`}></div>
                <span className="text-xs leading-none">认识</span>
              </button>
              <button
                onClick={() => handleStatusChange('fuzzy')}
                className={`flex flex-col items-center gap-0.5 transition-all ${
                  word.status === 'fuzzy'
                    ? 'text-yellow-600'
                    : 'text-gray-300 hover:text-yellow-400'
                }`}
                title="模糊"
              >
                <div className={`w-5 h-5 rounded-full border-2 transition-all ${
                  word.status === 'fuzzy'
                    ? 'bg-yellow-400 border-yellow-500'
                    : 'bg-white border-gray-300'
                }`}></div>
                <span className="text-xs leading-none">模糊</span>
              </button>
              <button
                onClick={() => handleStatusChange('unknown')}
                className={`flex flex-col items-center gap-0.5 transition-all ${
                  word.status === 'unknown'
                    ? 'text-red-600'
                    : 'text-gray-300 hover:text-red-400'
                }`}
                title="不认识"
              >
                <div className={`w-5 h-5 rounded-full border-2 transition-all ${
                  word.status === 'unknown'
                    ? 'bg-red-500 border-red-600'
                    : 'bg-white border-gray-300'
                }`}></div>
                <span className="text-xs leading-none">不认识</span>
              </button>
            </div>

            {/* 提示文本 */}
            {globalHideChinese && (
              <span className="text-xs text-gray-300">全局隐藏中</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
