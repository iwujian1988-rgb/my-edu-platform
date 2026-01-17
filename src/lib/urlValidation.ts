/**
 * URL参数验证工具
 * 用于安全处理URL参数，防止注入和无效值
 */

import { ScopeType } from '@/types/progress'

/**
 * 有效的范围类型列表
 */
const VALID_SCOPES: ScopeType[] = ['all', 'unknown', 'fuzzy', 'known', 'new']

/**
 * 验证范围类型参数
 * @param scope - URL参数中的scope值
 * @returns 有效的ScopeType，无效时返回'unknown'作为默认值
 *
 * @example
 * validateScope('all') // 'all'
 * validateScope('invalid') // 'unknown'
 * validateScope('') // 'unknown'
 * validateScope(undefined) // 'unknown'
 */
export function validateScope(scope: string | null | undefined): ScopeType {
  // 防御性编程：处理undefined/null/空字符串
  if (!scope || typeof scope !== 'string') {
    return 'unknown' // 默认值
  }

  // 严格验证：必须是预定义的5个值之一
  if (VALID_SCOPES.includes(scope as ScopeType)) {
    return scope as ScopeType
  }

  // 无效值返回默认值
  return 'unknown'
}

/**
 * 验证hash索引参数
 * @param hash - URL hash值（如 '#word-10'）
 * @returns 有效的单词索引（0-based），无效时返回undefined
 *
 * @example
 * validateHashIndex('#word-10') // 10
 * validateHashIndex('word-5') // 5
 * validateHashIndex('#word-abc') // undefined
 * validateHashIndex('') // undefined
 * validateHashIndex(undefined) // undefined
 */
export function validateHashIndex(hash: string | null | undefined): number | undefined {
  // 防御性编程：处理undefined/null/空字符串
  if (!hash || typeof hash !== 'string') {
    return undefined
  }

  // 提取数字部分：支持 '#word-10' 和 'word-5' 两种格式
  const match = hash.match(/word-(\d+)/)
  if (!match) {
    return undefined
  }

  // 转换为数字
  const index = parseInt(match[1], 10)

  // 验证有效性：必须是非负整数
  if (isNaN(index) || index < 0) {
    return undefined
  }

  return index
}

/**
 * 安全地获取URL参数中的整数值
 * @param value - URL参数值（字符串）
 * @param defaultValue - 默认值（当转换失败时返回）
 * @param min - 最小值（可选）
 * @param max - 最大值（可选）
 * @returns 转换后的整数，或默认值
 *
 * @example
 * safeGetInt('10', 0) // 10
 * safeGetInt('abc', 0) // 0
 * safeGetInt('5', 0, 1, 100) // 5
 * safeGetInt('0', 0, 1, 100) // 1 (小于min，返回min)
 * safeGetInt('150', 0, 1, 100) // 100 (大于max，返回max)
 */
export function safeGetInt(
  value: string | null | undefined,
  defaultValue: number,
  min?: number,
  max?: number
): number {
  // 防御性编程：处理undefined/null
  if (value === null || value === undefined) {
    return defaultValue
  }

  // 转换为整数
  const num = parseInt(value, 10)

  // 验证有效性
  if (isNaN(num)) {
    return defaultValue
  }

  // 应用边界限制
  let result = num
  if (min !== undefined && result < min) {
    result = min
  }
  if (max !== undefined && result > max) {
    result = max
  }

  return result
}
