/**
 * 打字练习背单词 - 数据加载模块
 *
 * 这个文件负责加载和管理词库数据
 * 当前实现：从本地 JSON 文件加载（测试环境）
 * 未来迁移：从主项目 API 加载（生产环境）
 */

import { Dict, Word, APIWord, convertAPIWordToWord } from './types'

// ==================== 测试数据配置 ====================

/**
 * 数据源配置
 * @todo 未来迁移时，将此值改为 'api' 以使用主项目API
 */
export const DATA_SOURCE: 'local' | 'api' = 'api'

// ==================== 本地数据加载 ====================

/**
 * 直接导入本地 JSON 数据（已禁用）
 * Next.js 15+ 支持直接导入 JSON 文件
 *
 * 注意：当前使用 API 模式，本地数据导入已禁用
 */
// import wordsData from '../data/words.json'  // 已禁用

/**
 * 从本地导入的数据加载词库（已禁用）
 *
 * @returns Promise<Dict> 加载的词库数据
 */
export async function loadLocalDict(): Promise<Dict> {
  throw new Error('Local data loading is disabled. Please use API mode.')
}

// ==================== API 数据加载（未来迁移用）====================

/**
 * 从主项目 API 加载词库数据
 *
 * @param bookId 单词书ID
 * @param startIndex 可选的起始索引，用于加载特定位置的单词
 * @returns Promise<Dict> 加载的词库数据
 *
 * @example
 * // 未来迁移时的用法：
 * const dict = await loadAPIDict('demo-book-1')
 */
export async function loadAPIDict(bookId: string, scope?: string, startIndex?: number): Promise<Dict> {
  try {
    // 获取单词书信息
    const bookRes = await fetch(`/api/books/${bookId}`)
    if (!bookRes.ok) throw new Error('Failed to fetch book')
    const bookData = await bookRes.json()

    // 根据startIndex决定初始加载的单词数量
    // 如果从中间开始学习，需要加载该位置附近的单词
    const initialSize = 500
    const offset = startIndex && startIndex > 250 ? Math.max(0, startIndex - 250) : 0
    const pageSize = startIndex && startIndex > 250 ? 500 : initialSize

    // 获取单词列表 - 根据不同范围加载
    let wordsRes
    if (scope === 'mistakes') {
      // 获取拼写错题
      const { data: { user } } = await (await fetch('/api/auth/user')).json()
      if (user) {
        const mistakesRes = await fetch(`/api/mistakes?bookId=${bookId}`)
        if (!mistakesRes.ok) throw new Error('Failed to fetch mistakes')
        const mistakesData = await mistakesRes.json()
        const wordIds = mistakesData.data?.map((m: any) => m.word_id) || []
        wordsRes = await fetch(`/api/words?bookId=${bookId}&wordIds=${wordIds.join(',')}`)
      } else {
        throw new Error('User not authenticated')
      }
    } else if (scope === 'new' || scope === 'known' || scope === 'fuzzy' || scope === 'unknown') {
      // 根据学习状态筛选
      wordsRes = await fetch(`/api/books/${bookId}/words?scope=${scope}&pageSize=${pageSize}&offset=${offset}`)
    } else {
      // 全部单词 - 优化：根据起始位置加载单词
      wordsRes = await fetch(`/api/books/${bookId}/words?pageSize=${pageSize}&offset=${offset}`)
    }

    if (!wordsRes.ok) throw new Error('Failed to fetch words')
    const wordsData: any = await wordsRes.json()

    // 转换为打字练习所需的格式
    const words: Word[] = (wordsData.data || wordsData).map(convertAPIWordToWord)

    return {
      id: bookId,
      name: bookData.title,
      description: bookData.description || '切换词库',
      words: words,
    }
  } catch (error) {
    console.error('Error loading API dict:', error)
    throw error
  }
}

// ==================== 统一数据加载接口 ====================

/**
 * 统一的数据加载接口
 * 根据 DATA_SOURCE 配置自动选择数据源
 *
 * @param bookId 当使用API数据源时，需要提供bookId
 * @param scope 学习范围
 * @param startIndex 可选的起始索引，用于优化加载
 * @returns Promise<Dict> 加载的词库数据
 */
export async function loadDict(bookId?: string, scope?: string, startIndex?: number): Promise<Dict> {
  if (DATA_SOURCE === 'local') {
    return loadLocalDict()
  } else {
    if (!bookId) {
      throw new Error('bookId is required when DATA_SOURCE is "api"')
    }
    return loadAPIDict(bookId, scope, startIndex)
  }
}

/**
 * 获取可用的词库列表
 * 当前实现：返回测试词库
 * 未来迁移：返回用户有权限的所有词库
 *
 * @returns Promise<Dict[]> 词库列表
 */
export async function getAvailableDicts(): Promise<Dict[]> {
  if (DATA_SOURCE === 'local') {
    const dict = await loadLocalDict()
    return [dict]
  } else {
    // 从主项目 API 获取用户有权限的词库列表
    const response = await fetch('/api/books')
    if (!response.ok) throw new Error('Failed to fetch books')
    const data = await response.json()

    // 转换为 Dict 格式
    return data.map((book: any) => ({
      id: book.id,
      name: book.title,
      description: book.description || '',
      words: [], // 这里不加载单词，节省带宽
    }))
  }
}

// ==================== 词库分类工具 ====================

/**
 * 按分类组织单词
 * @param words 单词列表
 * @returns 分类映射表
 */
export function groupWordsByCategory(words: Word[]): Record<string, Word[]> {
  return words.reduce((acc, word) => {
    const category = word.category || 'default'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(word)
    return acc
  }, {} as Record<string, Word[]>)
}

/**
 * 获取所有分类
 * @param words 单词列表
 * @returns 分类列表
 */
export function getCategories(words: Word[]): string[] {
  const categories = new Set(words.map(w => w.category || 'default'))
  return Array.from(categories).sort()
}
