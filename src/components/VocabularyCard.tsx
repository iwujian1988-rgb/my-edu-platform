'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Volume2, EyeOff, Lightbulb, FileText, Check, HelpCircle, X, ChevronDown } from 'lucide-react'
import { useTTS } from '@/hooks/use-tts'
import { useScreenOrientation } from '@/hooks/useScreenOrientation'  // 🆕 用于检测竖屏模式
import { useTheme } from '@/contexts/ThemeContext'
import { getWordLanguage, type LanguageData, type FrenchWordData, type JapaneseWordData } from '@/types/word'

/**
 * 词库卡片中的单词类型
 */
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
  audio_url?: string | null
  // 多语言支持（旧字段，保留兼容）
  kana?: string
  romaji?: string
  // 多语言支持（新字段，使用统一定义）
  language_data?: LanguageData
}

interface VocabularyCardProps {
  word: Word
  index: number
  onStatusChange: (wordId: string, status: 'known' | 'fuzzy' | 'unknown') => void
  isSaving?: boolean
  globalHideChinese?: boolean
  bookLanguage?: string  // 🌍 书籍语言，用于 TTS 后备
}

const VocabularyCard = ({ word, index, onStatusChange, isSaving = false, globalHideChinese = false, bookLanguage = 'en' }: VocabularyCardProps) => {
  // 🆕 检测屏幕方向
  const { isPortrait } = useScreenOrientation()

  // 🌙 检测主题
  const { theme } = useTheme()

  // 使用 TTS Hook
  const { play, isPlaying, isLoading } = useTTS({ type: '2' })

  // 兼容数据中的 'fuzzy' 或 'unsure'
  const initialStatus = word.status === 'fuzzy' ? 'unsure' : (word.status === 'known' ? 'known' : (word.status === 'unknown' ? 'unknown' : 'unknown'))
  const [status, setStatus] = useState(initialStatus)
  const [showDefinition, setShowDefinition] = useState(!globalHideChinese)
  const [isExpanded, setIsExpanded] = useState(false) // 展开/收起状态
  const [needsExpansion, setNeedsExpansion] = useState(false) // 是否需要展开按钮
  const contentRef = useRef<HTMLDivElement>(null) // 内容区域ref

  // 🆕 例句弹窗状态
  const [showSentenceModal, setShowSentenceModal] = useState(false)
  const [sentenceOverflow, setSentenceOverflow] = useState(false) // 例句是否溢出
  const sentenceRef = useRef<HTMLSpanElement>(null) // 例句ref

  // 🆕 搭配弹窗状态
  const [showCollocationModal, setShowCollocationModal] = useState(false)
  const [collocationOverflow, setCollocationOverflow] = useState(false) // 搭配是否溢出
  const collocationRef = useRef<HTMLSpanElement>(null) // 搭配ref

  // 🆕 音标弹窗状态（当英/美音标都有且过长时）
  const [showPhoneticModal, setShowPhoneticModal] = useState(false)
  const [phoneticOverflow, setPhoneticOverflow] = useState(false) // 音标是否溢出
  const phoneticRef = useRef<HTMLSpanElement>(null) // 音标ref

  // 🆕 根据屏幕方向设置卡片高度
  const cardHeight = isPortrait ? '380px' : '380px'  // 竖屏与横屏一致高度

  // 同步状态变化
  useEffect(() => {
    const mappedStatus = word.status === 'fuzzy' ? 'unsure' : word.status
    setStatus(mappedStatus as any)
  }, [word.status])

  // 同步全局隐藏中文设置
  useEffect(() => {
    setShowDefinition(!globalHideChinese)
  }, [globalHideChinese])

  // 检测内容是否溢出，决定是否显示"查看更多"按钮
  useEffect(() => {
    const checkOverflow = () => {
      if (!contentRef.current) return
      const element = contentRef.current
      // 如果scrollHeight > clientHeight，说明内容被截断了
      const isOverflowing = element.scrollHeight > element.clientHeight
      setNeedsExpansion(isOverflowing)
    }

    // 初始检测
    checkOverflow()

    // 监听窗口大小变化、内容变化等
    const resizeObserver = new ResizeObserver(checkOverflow)
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current)
    }

    // 当切换展开/收起状态时重新检测
    const timeoutId = setTimeout(checkOverflow, 100)

    return () => {
      resizeObserver.disconnect()
      clearTimeout(timeoutId)
    }
  }, [isExpanded, showDefinition, word.definition, word.definition_en, word.collocation, word.example_sentence, word.example_sentence_en])

  // 播放单词发音 - 使用 TTS Hook
  const handleSpeak = async () => {
    try {
      // 使用统一的 getWordLanguage 函数判断语言
      const language = getWordLanguage(word, bookLanguage)

      await play(word.word, word.audio_url, language)
    } catch (error) {
      console.error('❌ VocabularyCard: 播放失败', error)
    }
  }

  // 处理状态变化
  const handleStatusChangeInternal = (newStatus: 'known' | 'unsure' | 'unknown') => {
    setStatus(newStatus)
    // 映射回 'fuzzy' 给父组件
    const statusForParent = newStatus === 'unsure' ? 'fuzzy' : newStatus
    onStatusChange(word.id, statusForParent as 'known' | 'fuzzy' | 'unknown')
  }

  // 🎨 颜色常量
  const COLORS = {
    known: '#B4F416',   // 酸性绿
    unsure: '#FACC15',  // 亮黄
    unknown: '#FF6B6B', // 珊瑚红
    black: '#000000'
  };

  // 🔒 样式生成器：强制分离边框和阴影
  const getCardStyle = () => {
    // 动态样式：只改变阴影颜色 (boxShadow)
    switch (status) {
      case 'known':
        return {
          boxShadow: `6px 6px 0px 0px ${COLORS.known}`, // 🟢 只有阴影变绿
          transform: 'translate(-2px, -2px)'
        };
      case 'unsure':
      case 'fuzzy':
        return {
          boxShadow: `6px 6px 0px 0px ${COLORS.unsure}`, // 🟡 只有阴影变黄
          transform: 'translate(-2px, -2px)'
        };
      case 'unknown':
        return {
          boxShadow: `6px 6px 0px 0px ${COLORS.unknown}`, // 🔴 只有阴影变红
          transform: 'translate(-2px, -2px)'
        };
      default:
        return {
          boxShadow: '4px 4px 0px 0px #000000', // ⚫ 默认黑影
        };
    }
  };

  // 获取卡片容器类名
  const getCardClassName = () => {
    return 'w-full p-5 flex flex-col border-[3px] border-black rounded transition-all duration-200 relative dark:bg-gray-800 bg-white';
  };

  // 词性映射：保持纯英文缩写格式
  const getPartOfSpeechLabel = (pos: string): string => {
    const posMap: Record<string, string> = {
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
      'n': 'n',
      'v': 'v',
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
      'vt': 'vt',
      'vi': 'vi',
    }
    return posMap[pos] || pos
  }

  // 构造卡片数据
  // 发音显示逻辑：日语优先（假名+罗马音），其次英语（英/美音标），最后通用音标
  const getPhoneticDisplay = () => {
    const ja = word.language_data?.ja
    const fr = word.language_data?.fr

    // 日语：优先从 language_data 读取，回退到旧字段
    const kana = ja?.kana || word.kana
    const romaji = ja?.romaji || word.romaji
    if (kana) {
      return `${kana}${romaji ? ` / ${romaji}` : ''}`
    }

    // 英语：显示英/美音标
    if (word.uk_phonetic || word.us_phonetic) {
      const parts: string[] = []
      if (word.uk_phonetic) parts.push(`英${word.uk_phonetic}`)
      if (word.us_phonetic) parts.push(`美${word.us_phonetic}`)
      return parts.join(' | ')
    }

    // 法语/其他语言：直接显示音标
    return word.phonetic
  }

  // 获取词性显示（法语包含阴阳性）
  const getPosDisplay = () => {
    const pos = getPartOfSpeechLabel(word.part_of_speech)
    const fr = word.language_data?.fr

    // 法语：显示词性 + 阴阳性
    if (fr?.gender) {
      return `${pos} (${fr.gender})`
    }

    return pos
  }

  const data = {
    word: word.word,
    phonetic: getPhoneticDisplay(),
    pos: getPosDisplay(),
    definition: showDefinition ? word.definition : word.definition_en,
    // 搭配优先显示英文（collocation_en），没有再显示 collocation
    collocation: word.collocation_en || word.collocation,
    // 例句始终显示英文（中文例句字段为空），点击隐藏中文不影响例句
    sentence: word.example_sentence_en || word.example_sentence,
  }

  // 🆕 检测例句是否溢出2行
  useEffect(() => {
    const checkSentenceOverflow = () => {
      if (!sentenceRef.current || !data.sentence) return

      // 创建一个隐藏的测量元素，不使用 line-clamp
      const measureEl = document.createElement('span')
      measureEl.style.cssText = `
        position: absolute;
        visibility: hidden;
        white-space: normal;
        font-size: 12px;
        line-height: 1.25;
        font-weight: 500;
        width: ${sentenceRef.current.clientWidth}px;
      `
      measureEl.textContent = data.sentence
      document.body.appendChild(measureEl)

      // 2行的高度约为: 12px * 1.25 * 2 = 30px
      const twoLineHeight = 32
      const actualHeight = measureEl.scrollHeight

      document.body.removeChild(measureEl)

      setSentenceOverflow(actualHeight > twoLineHeight)
    }

    const timeoutId = setTimeout(checkSentenceOverflow, 100)
    return () => clearTimeout(timeoutId)
  }, [data.sentence])

  // 🆕 检测搭配是否溢出1行
  useEffect(() => {
    const checkCollocationOverflow = () => {
      if (!collocationRef.current || !data.collocation) return

      // 创建一个隐藏的测量元素，不使用 line-clamp
      const measureEl = document.createElement('span')
      measureEl.style.cssText = `
        position: absolute;
        visibility: hidden;
        white-space: normal;
        font-size: 12px;
        line-height: 1.25;
        font-weight: 500;
        width: ${collocationRef.current.clientWidth}px;
      `
      measureEl.textContent = data.collocation
      document.body.appendChild(measureEl)

      // 1行的高度约为: 12px * 1.25 = 15px
      const oneLineHeight = 18
      const actualHeight = measureEl.scrollHeight

      document.body.removeChild(measureEl)

      setCollocationOverflow(actualHeight > oneLineHeight)
    }

    const timeoutId = setTimeout(checkCollocationOverflow, 100)
    return () => clearTimeout(timeoutId)
  }, [data.collocation])

  // 🆕 检测音标是否溢出
  useEffect(() => {
    const checkPhoneticOverflow = () => {
      if (!phoneticRef.current || !data.phonetic) return

      // 使用 scrollWidth > clientWidth 检测文本溢出
      const isOverflowing = phoneticRef.current.scrollWidth > phoneticRef.current.clientWidth
      setPhoneticOverflow(isOverflowing)
    }

    const timeoutId = setTimeout(checkPhoneticOverflow, 100)
    return () => clearTimeout(timeoutId)
  }, [data.phonetic])

  return (
    // ⚠️ 注意：这里移除了大部分 Tailwind 类名，全靠 style 属性控制，防止冲突
    <div
      data-testid="word-card"
      data-word-id={word.id}
      className={getCardClassName()}
      style={{
        ...getCardStyle(),
        height: isExpanded ? 'auto' : cardHeight,
        minHeight: isExpanded ? cardHeight : undefined,
        display: 'flex',
        flexDirection: 'column',
      }}
    >

      {/* 顶部区域 */}
      <div className={`flex justify-between items-start mb-4 border-b-2 border-dashed pb-3 transition-colors duration-300 dark:border-gray-700 border-gray-200`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight transition-colors duration-300 dark:text-white text-black truncate max-w-[180px] md:max-w-none" title={data.word}>{data.word}</h2>
            <button
              onClick={handleSpeak}
              disabled={isLoading}
              className={`w-5 h-5 md:w-8 md:h-8 flex items-center justify-center rounded-full border-2 border-black transition-all shrink-0 ${
                isPlaying ? 'bg-[#B4F416]' : 'hover:bg-[#B4F416]'
              }`}
            >
              <Volume2 size={12} className="md:hidden" strokeWidth={2.5} />
              <Volume2 size={16} className="hidden md:block" strokeWidth={2.5} />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1 min-w-0">
            <span
              ref={phoneticRef}
              className={`font-serif font-bold transition-colors duration-300 dark:text-slate-400 text-gray-600 truncate ${phoneticOverflow ? 'cursor-pointer' : ''}`}
              title={!phoneticOverflow ? data.phonetic : undefined}
              onClick={() => phoneticOverflow && setShowPhoneticModal(true)}
            >
              {data.phonetic}
              {phoneticOverflow && <span className="ml-1 text-gray-400">...</span>}
            </span>
            {data.pos && (
              <span className="text-xs font-black border px-1.5 py-0.5 rounded transition-colors duration-300 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 bg-gray-100 border-black text-black">
                {data.pos}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowDefinition(!showDefinition)}
          className="transition-colors duration-300 dark:text-gray-500 dark:hover:text-gray-300 text-gray-300 hover:text-black"
        >
          <EyeOff size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* 中间释义 - 可展开/收起 */}
      <div
        ref={contentRef}
        className={`flex-1 space-y-2 mb-3 relative ${!isExpanded ? 'overflow-hidden' : ''}`}
      >
        {/* 释义 - 根据展开状态显示不同行数 */}
        <p className={`text-sm font-bold leading-snug transition-colors duration-300 ${isExpanded ? '' : 'line-clamp-2'} dark:text-slate-200 text-gray-700`}>
          {data.definition}
        </p>

        <div className="space-y-1.5">
          {data.collocation && (
            <div className="border-2 border-black rounded p-1.5 flex gap-1.5 items-start transition-colors duration-300 dark:bg-blue-900/30 bg-blue-50">
              <Lightbulb
                size={14}
                className="shrink-0 mt-0.5 transition-colors duration-300 dark:text-blue-400 text-blue-700"
                strokeWidth={2.5}
              />
              <div className="text-xs leading-snug flex-1">
                <span className="font-black block mb-0.5 text-[10px] transition-colors duration-300 dark:text-blue-400 text-blue-700">搭配</span>
                <span
                  ref={collocationRef}
                  className={`font-medium line-clamp-1 transition-colors duration-300 dark:text-slate-200 text-gray-900 ${collocationOverflow ? 'cursor-pointer' : ''}`}
                  onClick={() => collocationOverflow && setShowCollocationModal(true)}
                >
                  {data.collocation}
                  {collocationOverflow && (
                    <span className="ml-1 text-blue-600 dark:text-blue-400 font-bold hover:underline">...【more】</span>
                  )}
                </span>
              </div>
            </div>
          )}

          {data.sentence && (
            <div className="border-2 border-black rounded p-1.5 flex gap-1.5 items-start transition-colors duration-300 dark:bg-green-900/30 bg-green-50">
              <FileText
                size={14}
                className="shrink-0 mt-0.5 transition-colors duration-300 dark:text-green-400 text-green-700"
                strokeWidth={2.5}
              />
              <div className="text-xs leading-snug flex-1">
                <span className="font-black block mb-0.5 text-[10px] transition-colors duration-300 dark:text-green-400 text-green-700">例句</span>
                <span
                  ref={sentenceRef}
                  className={`font-medium line-clamp-2 transition-colors duration-300 dark:text-slate-200 text-gray-900 ${sentenceOverflow ? 'cursor-pointer' : ''}`}
                  onClick={() => sentenceOverflow && setShowSentenceModal(true)}
                >
                  {data.sentence}
                  {sentenceOverflow && (
                    <span className="ml-1 text-green-600 dark:text-green-400 font-bold hover:underline">...【more】</span>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 渐变遮罩 - 只在收起状态且内容需要展开时显示 */}
        {!isExpanded && needsExpansion && (
          <div className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none transition-colors duration-300 dark:bg-gradient-to-b dark:from-transparent dark:to-gray-900/95 bg-gradient-to-b from-transparent to-white/90" />
        )}
      </div>

      {/* 展开/收起按钮 - 只在内容需要展开时显示 */}
      {needsExpansion && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-center gap-1 py-1.5 text-xs font-black transition-colors border-t dark:text-gray-400 dark:hover:text-gray-200 dark:border-gray-700 text-gray-600 hover:text-black border-gray-100"
        >
          <span>{isExpanded ? '收起内容' : '查看更多'}</span>
          <ChevronDown size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} strokeWidth={2.5} />
        </button>
      )}

      {/* 底部按钮组 */}
      <div className={`grid grid-cols-3 gap-2 pt-2 border-t-2 transition-colors duration-300 dark:border-gray-700 border-gray-100`}>
        <StatusButton
          active={status === 'known'}
          onClick={() => handleStatusChangeInternal('known')}
          activeColor={COLORS.known}
          icon={Check}
          label="认识"
        />
        <StatusButton
          active={status === 'unsure' || status === 'fuzzy'}
          onClick={() => handleStatusChangeInternal('unsure')}
          activeColor={COLORS.unsure}
          icon={HelpCircle}
          label="模糊"
        />
        <StatusButton
          active={status === 'unknown'}
          onClick={() => handleStatusChangeInternal('unknown')}
          activeColor={COLORS.unknown}
          icon={X}
          label="不认识"
        />
      </div>

      {/* 🆕 例句弹窗 */}
      {showSentenceModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowSentenceModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg border-3 border-black p-4 max-w-md w-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-black text-lg dark:text-white">例句</h3>
              <button
                onClick={() => setShowSentenceModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X size={18} className="dark:text-gray-400" />
              </button>
            </div>
            <p className="text-sm leading-relaxed dark:text-slate-200 text-gray-700">
              {data.sentence}
            </p>
          </div>
        </div>
      )}

      {/* 🆕 搭配弹窗 */}
      {showCollocationModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowCollocationModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg border-3 border-black p-4 max-w-md w-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-black text-lg dark:text-white">搭配</h3>
              <button
                onClick={() => setShowCollocationModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X size={18} className="dark:text-gray-400" />
              </button>
            </div>
            <p className="text-sm leading-relaxed dark:text-blue-400 dark:bg-blue-900/30 text-blue-700">
              {data.collocation}
            </p>
          </div>
        </div>
      )}

      {/* 🆕 音标弹窗 */}
      {showPhoneticModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowPhoneticModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg border-3 border-black p-4 max-w-md w-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-black text-lg dark:text-white">音标</h3>
              <button
                onClick={() => setShowPhoneticModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X size={18} className="dark:text-gray-400" />
              </button>
            </div>
            <p className="text-base font-serif leading-relaxed dark:text-slate-200 text-gray-700">
              {data.phonetic}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// 按钮组件：同样强制样式
const StatusButton = ({ active, onClick, activeColor, icon: Icon, label }: {
  active: boolean
  onClick: () => void
  activeColor: string
  icon: any
  label: string
}) => {
  const style = active ? {
    backgroundColor: activeColor,
    borderColor: '#000000', // 🔥 按钮被选中时，边框也是黑的！
    color: '#000000',
    boxShadow: 'none',
    transform: 'translate(2px, 2px)'
  } : {};

  return (
    <button
      onClick={onClick}
      style={style}
      className="flex flex-col items-center justify-center py-2 rounded border-2 transition-all duration-150 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 bg-white border-gray-200 text-gray-400 hover:border-black hover:text-black hover:bg-gray-50"
    >
      <Icon size={18} strokeWidth={3} />
      <span className="text-[10px] font-black mt-0.5">{label}</span>
    </button>
  );
};

export { VocabularyCard }
