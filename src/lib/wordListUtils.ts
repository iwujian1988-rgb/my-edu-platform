/**
 * Word List Constants and Utilities
 *
 * 职责：提供常量和工具函数
 *
 * 内容：
 * 1. 常量定义（每页单词数、学习提示）
 * 2. 工具函数（随机打乱数组）
 * 3. 类型定义
 */

// 常量
export const WORDS_PER_PAGE = 21

export const TIPS = [
  '💡 点击音标可以听发音',
  '💡 长按单词可以查看详情',
  '💡 建议每天学习50个新单词',
  '💡 及时复习有助于记忆',
  '💡 可以使用筛选功能查看特定单词',
  '💡 点击认识/模糊/不认识来标记单词',
  '💡 竖屏模式下可以加载更多单词',
  '💡 横屏模式下使用分页导航'
]

// 类型定义
export type StatusFilter = 'all' | 'new' | 'known' | 'fuzzy' | 'unknown'

export type SortOrder = 'default' | 'random'

// 状态筛选标签
export const STATUS_LABELS: Record<StatusFilter, string> = {
  'all': '全部',
  'new': '未标注',
  'known': '认识',
  'fuzzy': '模糊',
  'unknown': '不认识'
}

// 状态筛选颜色
export const STATUS_COLORS: Record<StatusFilter, string> = {
  'all': 'bg-slate-100 text-slate-700',
  'new': 'bg-blue-100 text-blue-700',
  'known': 'bg-green-100 text-green-700',
  'fuzzy': 'bg-yellow-100 text-yellow-700',
  'unknown': 'bg-red-100 text-red-700'
}

/**
 * 随机打乱数组（Fisher-Yates算法）
 * @param array - 要打乱的数组
 * @returns 打乱后的新数组
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * 获取筛选标签文本
 * @param status - 状态筛选值
 * @returns 对应的标签文本
 */
export function getFilterLabel(status: StatusFilter): string {
  return STATUS_LABELS[status]
}

/**
 * 获取筛选颜色
 * @param status - 状态筛选值
 * @returns 对应的Tailwind CSS类名
 */
export function getFilterColor(status: StatusFilter): string {
  return STATUS_COLORS[status]
}
