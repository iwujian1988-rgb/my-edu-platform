'use client'

import { useState, useRef, useEffect } from 'react'
import { Volume2, Eye, EyeOff } from 'lucide-react'
import { speak, initializeTTS, stopSpeaking } from '@/lib/speech'
import { stripHtmlTags } from '@/lib/utils/text'
import { useTheme } from '@/contexts/ThemeContext'

interface Word {
  id: string
  word: string
  phonetic: string
  uk_phonetic?: string
  us_phonetic?: string
  definition: string
  definition_en: string
  collocation: string
  collocation_en: string
  example_sentence: string
  example_sentence_en: string
  part_of_speech: string
  status: 'known' | 'fuzzy' | 'unknown' | 'new'
}

interface WordCardProps {
  word: Word
  index: number
  onStatusChange: (wordId: string, status: 'known' | 'fuzzy' | 'unknown') => void
  isSaving?: boolean
  globalHideChinese?: boolean
}

export function WordCard({ word, index, onStatusChange, isSaving = false, globalHideChinese = false }: WordCardProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // 调试日志
  console.log(`🎨 [WordCard ${word.word}] theme:`, theme, 'isDark:', isDark)

  // 初始状态根据全局设置：如果全局隐藏，则默认不显示；否则显示
  const [showDefinition, setShowDefinition] = useState(!globalHideChinese)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  // 调试：渲染时输出
  console.log(`🎨 [WordCard ${index}] Rendering with status:`, word.status, `| word.id:`, word.id)

  // 调试：检查按钮颜色是否正确
  const isKnown = word.status === 'known'
  const buttonClass = `flex flex-col items-center gap-0.5 transition-all ${
    word.status === 'known'
      ? 'text-green-600'
      : 'text-gray-300 hover:text-green-400'
  }`
  console.log(`  ✓ Button color check: isKnown=${isKnown}`)
  console.log(`  📝 Button className:`, buttonClass)

  // 同步全局设置变化到本地状态
  useEffect(() => {
    setShowDefinition(!globalHideChinese)
  }, [globalHideChinese])

  // Refs for detecting overflow
  const collocationRef = useRef<HTMLDivElement>(null)
  const exampleRef = useRef<HTMLDivElement>(null)
  const [collocationOverflow, setCollocationOverflow] = useState(false)
  const [exampleOverflow, setExampleOverflow] = useState(false)

  // Check for overflow on mount and when content changes
  useEffect(() => {
    const checkOverflow = (ref: React.RefObject<HTMLDivElement | null>, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
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

  // 词性映射：保持纯英文缩写格式
  const getPartOfSpeechLabel = (pos: string): string => {
    const posMap: Record<string, string> = {
      // 全称转换为缩写
      'noun': 'n',
      'verb': 'v',
      'adjective': 'adj',
      'adverb': 'adv',
      'pronoun': 'pron',
      'preposition': 'prep',
      'conjunction': 'conj',
      'interjection': 'int',
      'article': 'art',
      'numeral': 'num',
      'auxiliary verb': 'aux',
      'modal verb': 'modal',
      'phrasal verb': 'phr',
      'transitive verb': 'vt',
      'intransitive verb': 'vi',
      // 缩写保持不变
      'n': 'n',
      'v': 'v',
      'vt': 'vt',
      'vi': 'vi',
      'adj': 'adj',
      'adv': 'adv',
      'pron': 'pron',
      'prep': 'prep',
      'conj': 'conj',
      'int': 'int',
      'art': 'art',
      'num': 'num',
      'aux': 'aux',
      'modal': 'modal',
      'phr': 'phr',
    }

    // 处理多个词性（逗号分隔），转换为统一缩写格式
    return pos
      .split(',')
      .map(p => {
        const trimmed = p.trim().toLowerCase()
        return posMap[trimmed] || trimmed
      })
      .join(', ')
  }

  // 发音功能 - 支持单词、搭配、例句（使用新的TTS工具）
  const handleSpeak = async (text: string) => {
    // 确保TTS已初始化
    if (!(await initializeTTS())) {
      console.warn('⚠️ WordCard: TTS initialization failed')
      return
    }

    setIsPlaying(true)

    // 使用新的speak函数
    speak(text, {
      lang: 'en-US',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      onStart: () => {
        console.log('✅ WordCard: Speech STARTED for', text)
      },
      onEnd: () => {
        console.log('✅ WordCard: Speech ENDED for', text)
        setIsPlaying(false)
      },
      onError: (event) => {
        console.error('❌ WordCard: Speech error', event.error)
        setIsPlaying(false)
      }
    })
  }

  // 状态标记
  const handleStatusChange = (status: 'known' | 'fuzzy' | 'unknown') => {
    console.log('🔘 WordCard: Button clicked', { wordId: word.id, status })
    onStatusChange(word.id, status)
  }

  // 计算是否显示中文：本地按钮完全控制，可以覆盖全局设置
  const shouldShowChinese = showDefinition

  // 计算实际隐藏状态（用于按钮图标显示）
  const actualHide = !showDefinition

  // 本地按钮点击逻辑：切换本地显示状态
  const handleToggleLocal = () => {
    setShowDefinition(!showDefinition)
  }

  return (
    <div
      className={`p-5 md:p-6 hover:scale-[1.01] transition-transform flex flex-col border-2 transition-all duration-300 ${
        isDark
          ? 'rounded-xl border-[#B4F264]/20 bg-gradient-to-br from-[#B4F264]/3 to-[#B4F416]/5 hover:from-[#B4F264]/5 hover:to-[#B4F416]/8 hover:border-[#B4F264]/30 hover:shadow-[0_0_20px_rgba(180,244,22,0.08)]'
          : 'clay-card'
      }`}
      suppressHydrationWarning
    >
      <div className="flex gap-3 flex-1">
        {/* 左侧：序号 */}
        <div className="flex flex-col items-center pt-1 flex-shrink-0">
          <span className={`text-xs font-bold transition-colors duration-300 ${isDark ? 'text-gray-400' : 'text-gray-300'}`}>{index + 1}</span>
        </div>

        {/* 右侧：单词内容 */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* 单词、音标和状态按钮 */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`text-2xl md:text-3xl font-black transition-colors duration-300 ${isDark ? 'text-white' : 'text-gray-900'}`}>
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
                {/* 显示音标：优先显示英标和美标 */}
                {word.uk_phonetic || word.us_phonetic ? (
                  <>
                    {word.uk_phonetic && (
                      <span className={`text-xs font-mono transition-colors duration-300 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>UK {word.uk_phonetic}</span>
                    )}
                    {word.us_phonetic && (
                      <span className={`text-xs font-mono transition-colors duration-300 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>US {word.us_phonetic}</span>
                    )}
                  </>
                ) : (
                  <span className={`text-sm font-mono transition-colors duration-300 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{word.phonetic}</span>
                )}
                <span className={`px-2 py-1 text-xs font-semibold rounded-full transition-colors duration-300 ${
                  isDark ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-purple-600 bg-purple-50'
                }`}>
                  {getPartOfSpeechLabel(word.part_of_speech)}
                </span>
              </div>
            </div>

            {/* 本地隐藏按钮 - 移到顶部 */}
            <button
              onClick={handleToggleLocal}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0 self-start"
              title={actualHide ? "显示中文" : "隐藏中文"}
            >
              {actualHide ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </button>
          </div>

          {/* 可滚动内容区域 */}
          <div className="flex-1 overflow-y-auto">
            {/* 释义 - 中文可切换显示，英文始终显示 */}
            <div className="mb-3">
              <p className={`text-sm mb-1 transition-colors duration-300 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{word.definition_en}</p>
              {shouldShowChinese ? (
                <p className={`text-xs transition-colors duration-300 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {word.definition}
                </p>
              ) : (
                <p className="text-xs text-gray-400">
                  ______________________
                </p>
              )}
            </div>

            {/* 搭配 - 固定高度，超出折叠 */}
            {word.collocation_en && (
              <div className="mb-3 relative">
                <div
                  ref={collocationRef}
                  className={`p-3 rounded-xl border transition-all duration-200 ${
                    !isExpanded && collocationOverflow ? 'max-h-24 overflow-hidden' : ''
                  } ${
                    isDark
                      ? 'bg-blue-500/10 border-blue-500/20'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-semibold transition-colors duration-300 ${isDark ? 'text-blue-200' : 'text-blue-900'}`}>
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
                      📝 例句: {stripHtmlTags(word.example_sentence_en)}
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
                    <p className="text-xs text-gray-600 mt-1">{stripHtmlTags(word.example_sentence)}</p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">______________________</p>
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
                className={buttonClass}
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
          </div>
        </div>
      </div>
    </div>
  )
}
