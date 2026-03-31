/**
 * 统一词典服务入口
 *
 * 路由规则:
 * - 英语: 有道词典 (无兜底)
 * - 法语: 本地词库 → Ultimate Dictionary (兜底)
 * - 其他语言: Ultimate Dictionary
 *
 * 使用示例:
 * ```ts
 * import { lookupWord } from '@/lib/dictionary'
 *
 * // 英语
 * const enResult = await lookupWord('hello', 'en')
 *
 * // 法语
 * const frResult = await lookupWord('bonjour', 'fr')
 *
 * // 批量查询
 * const batchResult = await lookupBatch(['hello', 'world'], 'en')
 * ```
 */

import type {
  DictionaryLanguage,
  UnifiedDictEntry,
  DictionaryConfig,
  IDictionaryProvider
} from './types'
import { DEFAULT_DICTIONARY_CONFIG } from './types'
import { youdaoProvider } from './providers/youdao'
import { ultimateProvider } from './providers/ultimate'
import { localFrenchProvider } from './providers/local-french'

// ============================================
// 缓存层
// ============================================

const CACHE_PREFIX = 'dict_cache_'
const CACHE_VERSION = 'v1'

interface CacheEntry {
  version: string
  data: UnifiedDictEntry
  timestamp: number
}

function getCacheKey(word: string, lang: DictionaryLanguage): string {
  return `${CACHE_PREFIX}${CACHE_VERSION}_${lang}_${word.toLowerCase()}`
}

export function getFromCache(word: string, lang: DictionaryLanguage, expiryDays: number = 30): UnifiedDictEntry | null {
  if (typeof window === 'undefined') return null

  try {
    const key = getCacheKey(word, lang)
    const cached = localStorage.getItem(key)

    if (!cached) return null

    const entry: CacheEntry = JSON.parse(cached)

    // 版本检查
    if (entry.version !== CACHE_VERSION) {
      localStorage.removeItem(key)
      return null
    }

    // 过期检查
    const daysSinceCached = (Date.now() - entry.timestamp) / (1000 * 60 * 60 * 24)
    if (daysSinceCached > expiryDays) {
      localStorage.removeItem(key)
      return null
    }

    console.log(`[Dictionary] ✅ 缓存命中: ${word} (${lang})`)
    return entry.data

  } catch {
    return null
  }
}

function setToCache(word: string, lang: DictionaryLanguage, data: UnifiedDictEntry): void {
  if (typeof window === 'undefined') return

  try {
    const key = getCacheKey(word, lang)
    const entry: CacheEntry = {
      version: CACHE_VERSION,
      data,
      timestamp: Date.now()
    }
    localStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // 缓存写入失败，忽略
  }
}

// ============================================
// Provider 路由
// ============================================

/**
 * 获取指定语言的 Provider 列表（按优先级排序）
 */
function getProviders(lang: DictionaryLanguage): IDictionaryProvider[] {
  switch (lang) {
    case 'en':
      // 英语：仅用有道，无兜底
      return [youdaoProvider]

    case 'fr':
      // 法语：仅用本地词库（14,236词，足够）
      return [localFrenchProvider]

    default:
      // 其他语言：暂不支持
      console.warn(`[Dictionary] 语言 "${lang}" 暂不支持`)
      return []
  }
}

// ============================================
// 核心查询函数
// ============================================

let config: DictionaryConfig = { ...DEFAULT_DICTIONARY_CONFIG }

/**
 * 配置词典服务
 */
export function configure(options: Partial<DictionaryConfig>): void {
  config = { ...config, ...options }
}

/**
 * 查询单词
 *
 * @param word - 要查询的单词
 * @param lang - 源语言
 * @param options - 可选配置
 */
export async function lookupWord(
  word: string,
  lang: DictionaryLanguage,
  options?: {
    skipCache?: boolean
    targetLang?: string
  }
): Promise<UnifiedDictEntry> {
  const normalizedWord = word.trim()

  if (!normalizedWord) {
    return {
      word: '',
      language: lang,
      source: 'ultimate',
      success: false
    }
  }

  // 检查缓存
  if (config.enableCache && !options?.skipCache) {
    const cached = getFromCache(normalizedWord, lang, config.cacheExpiryDays)
    if (cached) {
      return cached
    }
  }

  // 获取 Provider 列表
  const providers = getProviders(lang)

  // 依次尝试
  for (const provider of providers) {
    try {
      console.log(`[Dictionary] 尝试 ${provider.name} 查询 "${normalizedWord}" (${lang})`)

      const result = await provider.lookup(normalizedWord, lang, options?.targetLang || 'zh')

      // 成功则返回
      if (result.success) {
        console.log(`[Dictionary] ✅ ${provider.name} 成功: "${normalizedWord}"`)

        // 写入缓存
        if (config.enableCache) {
          setToCache(normalizedWord, lang, result)
        }

        return result
      }

      console.log(`[Dictionary] ⚠️ ${provider.name} 无结果，尝试下一个`)

    } catch (error) {
      console.error(`[Dictionary] ❌ ${provider.name} 出错:`, error)
      // 继续尝试下一个 Provider
    }
  }

  // 所有 Provider 都失败
  console.log(`[Dictionary] ❌ 所有 Provider 都失败: "${normalizedWord}"`)

  const failedEntry: UnifiedDictEntry = {
    word: normalizedWord,
    language: lang,
    source: 'ultimate',
    success: false,
    _fetched_at: Date.now()
  }

  // 也缓存失败结果，避免重复查询
  if (config.enableCache) {
    setToCache(normalizedWord, lang, failedEntry)
  }

  return failedEntry
}

/**
 * 批量查询
 */
export async function lookupBatch(
  words: string[],
  lang: DictionaryLanguage,
  options?: {
    skipCache?: boolean
    targetLang?: string
    skipFallback?: boolean
  }
): Promise<UnifiedDictEntry[]> {
  if (!words || words.length === 0) {
    return []
  }

  console.log(`[Dictionary] 批量查询 ${words.length} 词 (${lang})`)

  const results: UnifiedDictEntry[] = []
  const uncachedWords: string[] = []
  const uncachedIndices: number[] = []

  // 先检查缓存
  if (config.enableCache && !options?.skipCache) {
    for (let i = 0; i < words.length; i++) {
      const word = words[i].trim()
      const cached = getFromCache(word, lang, config.cacheExpiryDays)

      if (cached) {
        results[i] = cached
      } else {
        uncachedWords.push(word)
        uncachedIndices.push(i)
      }
    }
  } else {
    uncachedWords.push(...words.map(w => w.trim()))
    uncachedIndices.push(...words.map((_, i) => i))
  }

  // 查询未缓存的词
  if (uncachedWords.length > 0) {
    const providers = getProviders(lang)

    // 尝试第一个 Provider 的批量查询
    const primaryProvider = providers[0]

    if (primaryProvider.lookupBatch) {
      const batchResults = await primaryProvider.lookupBatch(
        uncachedWords,
        lang,
        options?.targetLang || 'zh'
      )

      // 填充结果
      for (let i = 0; i < uncachedIndices.length; i++) {
        const result = batchResults[i]
        results[uncachedIndices[i]] = result

        // 写入缓存
        if (config.enableCache && result) {
          setToCache(uncachedWords[i], lang, result)
        }
      }

    } else {
      // 逐个查询
      for (let i = 0; i < uncachedWords.length; i++) {
        const result = await lookupWord(uncachedWords[i], lang, options)
        results[uncachedIndices[i]] = result
      }
    }
  }

  // 检查失败的词，尝试兜底 Provider
  const failedIndices = uncachedIndices.filter(i => !results[i]?.success)

  if (failedIndices.length > 0 && !options?.skipFallback && lang === 'fr') {
    console.log(`[Dictionary] ${failedIndices.length} 词需要兜底查询`)

    for (const idx of failedIndices) {
      const word = words[idx].trim()
      const result = await ultimateProvider.lookup(word, lang, options?.targetLang || 'zh')

      if (result.success) {
        results[idx] = result
        if (config.enableCache) {
          setToCache(word, lang, result)
        }
      }
    }
  }

  const successCount = results.filter(r => r?.success).length
  console.log(`[Dictionary] ✅ 批量查询完成: ${successCount}/${words.length}`)

  return results
}

// ============================================
// 工具函数
// ============================================

/**
 * 清除所有缓存
 */
export function clearAllCache(): void {
  if (typeof window === 'undefined') return

  const keysToRemove: string[] = []

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(CACHE_PREFIX)) {
      keysToRemove.push(key)
    }
  }

  keysToRemove.forEach(key => localStorage.removeItem(key))
  console.log(`[Dictionary] 清除 ${keysToRemove.length} 个缓存`)
}

/**
 * 清除指定语言的缓存
 */
export function clearLangCache(lang: DictionaryLanguage): void {
  if (typeof window === 'undefined') return

  const prefix = `${CACHE_PREFIX}${CACHE_VERSION}_${lang}_`
  const keysToRemove: string[] = []

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(prefix)) {
      keysToRemove.push(key)
    }
  }

  keysToRemove.forEach(key => localStorage.removeItem(key))
  console.log(`[Dictionary] 清除 ${lang} 缓存 ${keysToRemove.length} 个`)
}

// ============================================
// 导出
// ============================================

export * from './types'
export { youdaoProvider } from './providers/youdao'
export { ultimateProvider } from './providers/ultimate'
export { localFrenchProvider } from './providers/local-french'
