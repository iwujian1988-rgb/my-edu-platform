/**
 * Cards Components - 组件工厂模式
 *
 * 导出所有卡片相关组件和类型
 */

// 基础卡片组件
export {
  BaseCard,
  CardFrontContent,
  CardBackContent,
  CardBadge,
} from './BaseCard'

export type { BaseCardProps } from './BaseCard'

// 具体卡片组件
export { WordCard } from './WordCard'
export type { WordCardProps } from './WordCard'

export { PhraseCard } from './PhraseCard'
export type { PhraseCardProps } from './PhraseCard'

export { SentenceCard } from './SentenceCard'
export type { SentenceCardProps } from './SentenceCard'

// 工厂函数 - 根据 type 返回对应的卡片组件
export { CardFactory } from './CardFactory'
