/**
 * 学习进度卡片类型定义
 * 用于首页"继续学习"区域展示最近学习记录
 */

import { Layers, List, Keyboard, Zap, Gamepad2 } from 'lucide-react'

/**
 * 学习模式类型
 */
export type LearningMode = 'word-list' | 'flashcards' | 'dictation' | 'match-game' | 'typing'

/**
 * 学习范围类型
 */
export type ScopeType = 'all' | 'unknown' | 'fuzzy' | 'known' | 'new'

/**
 * 进度卡片数据结构
 */
export interface ProgressCard {
  /** 词书ID */
  bookId: string
  /** 词书标题 */
  bookTitle: string
  /** 学习模式 */
  mode: LearningMode
  /** 进度百分比 (0-100) */
  progress: number
  /** 范围类型 */
  scopeType: ScopeType
  /** 当前索引 (0-based) */
  currentIndex: number
  /** 总单词数 */
  totalWords: number
  /** 已学习词数 (认识+模糊) */
  learnedCount?: number
  /** 最后学习时间戳 */
  lastStudyTime: number
  /** 继续学习的完整URL */
  continueURL: string
}

/**
 * 进度卡片组件Props
 */
export interface ProgressCardProps extends ProgressCard {
  /** 点击卡片时的跳转处理（可选） */
  onClick?: () => void
}

/**
 * 学习模式配置
 * 工业风 Neo-Brutalism 设计
 */
export const MODE_CONFIG = {
  'word-list': {
    icon: List,
    label: '单词表',
    color: 'bg-blue-500',
    light: 'bg-blue-50',
    dark: 'dark:bg-blue-900/30',
    textColor: 'text-blue-700'
  },
  'flashcards': {
    icon: Layers,
    label: '卡片',
    color: 'bg-purple-500',
    light: 'bg-purple-50',
    dark: 'dark:bg-purple-900/30',
    textColor: 'text-purple-700'
  },
  'dictation': {
    icon: Keyboard,
    label: '默写',
    color: 'bg-green-500',
    light: 'bg-green-50',
    dark: 'dark:bg-green-900/30',
    textColor: 'text-green-700'
  },
  'match-game': {
    icon: Gamepad2,
    label: '消消乐',
    color: 'bg-pink-500',
    light: 'bg-pink-50',
    dark: 'dark:bg-pink-900/30',
    textColor: 'text-pink-700'
  },
  'typing': {
    icon: Zap,
    label: '打字练习',
    color: 'bg-[#ccff00]', // 荧光绿
    light: 'bg-[#f7ffcc]',
    dark: 'dark:bg-lime-900/30',
    textColor: 'text-lime-700'
  }
} as const

/**
 * 范围类型配置
 * 用于显示中文标签
 */
export const SCOPE_LABELS: Record<ScopeType, string> = {
  'all': '全部单词',
  'unknown': '不认识的',
  'fuzzy': '模糊的',
  'known': '认识',
  'new': '未标注'
}
