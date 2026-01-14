'use client'

import React, { useState, useEffect } from 'react'
import { Volume2, EyeOff, Lightbulb, FileText, Check, HelpCircle, X, ChevronDown } from 'lucide-react'
import { speak, initializeTTS, stopSpeaking } from '@/lib/speech'
import { useScreenOrientation } from '@/hooks/useScreenOrientation'  // 🆕 用于检测竖屏模式

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

interface VocabularyCardProps {
  word: Word
  index: number
  onStatusChange: (wordId: string, status: 'known' | 'fuzzy' | 'unknown') => void
  isSaving?: boolean
  globalHideChinese?: boolean
}

const VocabularyCard = ({ word, index, onStatusChange, isSaving = false, globalHideChinese = false }: VocabularyCardProps) => {
  // 🆕 检测屏幕方向
  const { isPortrait } = useScreenOrientation()

  // 兼容数据中的 'fuzzy' 或 'unsure'
  const initialStatus = word.status === 'fuzzy' ? 'unsure' : (word.status === 'known' ? 'known' : (word.status === 'unknown' ? 'unknown' : 'unknown'))
  const [status, setStatus] = useState(initialStatus)
  const [showDefinition, setShowDefinition] = useState(!globalHideChinese)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false) // 展开/收起状态

  // 🆕 根据屏幕方向设置卡片高度
  const cardHeight = isPortrait ? '300px' : '380px'  // 竖屏降低约20%

  // 同步状态变化
  useEffect(() => {
    const mappedStatus = word.status === 'fuzzy' ? 'unsure' : word.status
    setStatus(mappedStatus as any)
  }, [word.status])

  // 同步全局隐藏中文设置
  useEffect(() => {
    setShowDefinition(!globalHideChinese)
  }, [globalHideChinese])

  // 初始化 TTS
  useEffect(() => {
    initializeTTS()
  }, [])

  // 播放单词发音
  const handleSpeak = async () => {
    if (isPlaying) {
      stopSpeaking()
      setIsPlaying(false)
      return
    }

    setIsPlaying(true)
    try {
      await speak(word.word)
    } catch (error) {
      console.error('TTS error:', error)
    } finally {
      setIsPlaying(false)
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
    // 基础样式：所有卡片通用的部分
    // 🔥 核心：这里写死了 border 是黑色，绝对不会变！
    const base = {
      border: '3px solid #000000',
      borderRadius: '0.75rem',     // rounded-xl
      backgroundColor: '#ffffff',
      transition: 'all 0.2s ease',
      position: 'relative',
      height: isExpanded ? 'auto' : cardHeight,  // 🆕 使用动态高度
      minHeight: isExpanded ? cardHeight : undefined,  // 🆕 使用动态高度
      display: 'flex',
      flexDirection: 'column',
    };

    // 动态样式：只改变阴影颜色 (boxShadow)
    switch (status) {
      case 'known':
        return {
          ...base,
          boxShadow: `6px 6px 0px 0px ${COLORS.known}`, // 🟢 只有阴影变绿
          transform: 'translate(-2px, -2px)'
        };
      case 'unsure':
      case 'fuzzy':
        return {
          ...base,
          boxShadow: `6px 6px 0px 0px ${COLORS.unsure}`, // 🟡 只有阴影变黄
          transform: 'translate(-2px, -2px)'
        };
      case 'unknown':
        return {
          ...base,
          boxShadow: `6px 6px 0px 0px ${COLORS.unknown}`, // 🔴 只有阴影变红
          transform: 'translate(-2px, -2px)'
        };
      default:
        return {
          ...base,
          boxShadow: '4px 4px 0px 0px #000000', // ⚫ 默认黑影
        };
    }
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
  const data = {
    word: word.word,
    phonetic: word.us_phonetic || word.uk_phonetic || word.phonetic,
    pos: getPartOfSpeechLabel(word.part_of_speech),
    definition: showDefinition ? word.definition : word.definition_en,
    // 搭配始终显示中文（因为数据库中只有中文搭配），不受隐藏中文按钮影响
    collocation: word.collocation,
    // 例句始终显示英文（中文例句字段为空），点击隐藏中文不影响例句
    sentence: word.example_sentence_en || word.example_sentence,
  }

  // 检测内容是否需要展开（简单判断文本长度）
  const needsExpansion = () => {
    const defLength = data.definition.length
    const colLength = data.collocation?.length || 0
    const sentLength = data.sentence?.length || 0
    // 降低阈值：释义超过30字符，或搭配/例句较长时显示展开按钮
    // 因为line-clamp-2大约能显示30-40个中文字符
    return defLength > 30 || colLength > 25 || sentLength > 30
  }

  return (
    // ⚠️ 注意：这里移除了大部分 Tailwind 类名，全靠 style 属性控制，防止冲突
    <div
      data-testid="word-card"
      data-word-id={word.id}
      className="w-full p-5 flex flex-col"
      style={getCardStyle()}
    >

      {/* 顶部区域 */}
      <div className="flex justify-between items-start mb-4 border-b-2 border-dashed border-gray-200 pb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-3xl font-black text-black tracking-tight">{data.word}</h2>
            <button
              onClick={handleSpeak}
              className="w-8 h-8 flex items-center justify-center rounded-full border-2 border-black hover:bg-[#B4F416] transition-colors shrink-0"
            >
              <Volume2 size={16} strokeWidth={2.5} />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-serif text-gray-500 font-bold">{data.phonetic}</span>
            {data.pos && (
              <span className="text-xs font-black bg-gray-100 border border-black px-1.5 py-0.5 rounded text-black">
                {data.pos}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowDefinition(!showDefinition)}
          className="text-gray-300 hover:text-black transition-colors"
        >
          <EyeOff size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* 中间释义 - 可展开/收起 */}
      <div className={`flex-1 space-y-2 mb-3 relative ${!isExpanded ? 'overflow-hidden' : ''}`}>
        {/* 释义 - 根据展开状态显示不同行数 */}
        <p className={`text-sm font-bold text-gray-700 leading-snug ${isExpanded ? '' : 'line-clamp-2'}`}>
          {data.definition}
        </p>

        <div className="space-y-1.5">
          {data.collocation && (
            <div className="bg-[#EFF6FF] border-2 border-black rounded-lg p-1.5 flex gap-1.5 items-start">
              <Lightbulb size={14} className="text-[#1D4ED8] shrink-0 mt-0.5" strokeWidth={2.5} />
              <div className="text-xs leading-snug flex-1">
                <span className="font-black text-[#1D4ED8] block mb-0.5 text-[10px]">搭配</span>
                <span className={`font-medium text-gray-900 ${isExpanded ? '' : 'line-clamp-1'}`}>{data.collocation}</span>
              </div>
            </div>
          )}

          {data.sentence && (
            <div className="bg-[#F0FDF4] border-2 border-black rounded-lg p-1.5 flex gap-1.5 items-start">
              <FileText size={14} className="text-[#15803D] shrink-0 mt-0.5" strokeWidth={2.5} />
              <div className="text-xs leading-snug flex-1">
                <span className="font-black text-[#15803D] block mb-0.5 text-[10px]">例句</span>
                <span className={`font-medium text-gray-900 ${isExpanded ? '' : 'line-clamp-2'}`}>{data.sentence}</span>
              </div>
            </div>
          )}
        </div>

        {/* 渐变遮罩 - 只在收起状态且内容需要展开时显示 */}
        {!isExpanded && needsExpansion() && (
          <div
            className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
            style={{
              background: 'linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.9))',
            }}
          />
        )}
      </div>

      {/* 展开/收起按钮 - 只在内容需要展开时显示 */}
      {needsExpansion() && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-center gap-1 py-1.5 text-xs font-black text-gray-600 hover:text-black transition-colors border-t border-gray-100"
        >
          <span>{isExpanded ? '收起内容' : '查看更多'}</span>
          <ChevronDown size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} strokeWidth={2.5} />
        </button>
      )}

      {/* 底部按钮组 */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t-2 border-gray-100">
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
      className={`
        flex flex-col items-center justify-center py-2 rounded-lg border-2 transition-all duration-150
        ${!active ? 'bg-white border-gray-200 text-gray-400 hover:border-black hover:text-black hover:bg-gray-50' : ''}
      `}
    >
      <Icon size={18} strokeWidth={3} />
      <span className="text-[10px] font-black mt-0.5">{label}</span>
    </button>
  );
};

export { VocabularyCard }
