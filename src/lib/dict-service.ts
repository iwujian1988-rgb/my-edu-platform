/**
 * 词典服务 - 使用有道API获取单词详细信息
 *
 * 说明：
 * 1. 使用有道词典API（https://dict.youdao.com/jsonapi）
 * 2. 支持获取美音标、英音标、中文释义、英文释义、搭配、例句
 * 3. 使用 localStorage 缓存，提升查询速度
 */

import { parseYoudaoResponse } from '@/lib/utils/retry'

// localStorage 缓存键前缀
const CACHE_PREFIX = 'dict_cache_'
const CACHE_EXPIRY_DAYS = 30 // 缓存30天

export interface DictEntry {
  word: string
  phonetic?: string       // 音标（默认美音）
  uk_phonetic?: string    // 英式音标
  us_phonetic?: string    // 美式音标
  definition?: string     // 中文释义（所有词性）
  definition_en?: string  // 英文释义
  collocation?: string    // 搭配（中文）
  collocation_en?: string // 搭配（英文）
  example_sentence?: string       // 例句（中文）
  example_sentence_en?: string    // 例句（英文）
  part_of_speech?: string // 词性
  synonyms?: string      // 同义词
  forms?: string          // 词形变化
  _raw_exampleSentences?: { en: string; zh: string }[]  // 原始例句数据
  _raw_collocations?: { en: string; zh: string }[]     // 原始搭配数据
  success?: boolean       // 是否成功获取
}

interface CacheEntry {
  data: DictEntry
  timestamp: number
}

/**
 * 从 localStorage 获取缓存的词典数据
 */
function getCachedDictEntry(word: string): DictEntry | null {
  if (typeof window === 'undefined') return null

  try {
    const cacheKey = CACHE_PREFIX + word.toLowerCase()
    const cached = localStorage.getItem(cacheKey)

    if (!cached) return null

    const cacheEntry: CacheEntry = JSON.parse(cached)

    // 检查缓存是否过期
    const daysSinceCached = (Date.now() - cacheEntry.timestamp) / (1000 * 60 * 60 * 24)
    if (daysSinceCached > CACHE_EXPIRY_DAYS) {
      localStorage.removeItem(cacheKey)
      return null
    }

    console.log(`[Dict Service] ✅ 从缓存读取: ${word}`)
    return cacheEntry.data
  } catch (error) {
    console.error('[Dict Service] 读取缓存失败:', error)
    return null
  }
}

/**
 * 将词典数据缓存到 localStorage
 */
function setCachedDictEntry(word: string, data: DictEntry): void {
  if (typeof window === 'undefined') return

  try {
    const cacheKey = CACHE_PREFIX + word.toLowerCase()
    const cacheEntry: CacheEntry = {
      data,
      timestamp: Date.now()
    }

    localStorage.setItem(cacheKey, JSON.stringify(cacheEntry))
    console.log(`[Dict Service] ✅ 已缓存: ${word}`)
  } catch (error) {
    console.error('[Dict Service] 写入缓存失败:', error)
  }
}

/**
 * 获取单个单词的词典数据（带缓存）
 */
export async function getDictEntry(word: string): Promise<DictEntry> {
  if (!word || word.trim().length === 0) {
    return { word: '', success: false }
  }

  const normalizedWord = word.trim()

  // 先尝试从缓存读取
  const cached = getCachedDictEntry(normalizedWord)
  if (cached) {
    return cached
  }

  // 缓存未命中，调用 API
  try {
    console.log(`[Dict Service] 调用 API: ${normalizedWord}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 1000) // 1秒超时

    try {
      const response = await fetch(
        `https://dict.youdao.com/jsonapi?q=${encodeURIComponent(normalizedWord)}`,
        {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; EducationalApp/1.0)'
          }
        }
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`有道API返回${response.status}`)
      }

      const data = await response.json()

      // 解析有道API响应
      const parsed = parseYoudaoResponse(data, normalizedWord)

      // 存入缓存（即使查询失败也缓存，避免重复查询失败的单词）
      setCachedDictEntry(normalizedWord, parsed)

      console.log(`[Dict Service] ✅ API 成功: ${normalizedWord}`)
      return parsed

    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      throw fetchError
    }

  } catch (error: any) {
    console.error(`[Dict Service] ❌ API 失败 (${normalizedWord}):`, error.message)

    // 失败时返回基础数据（标记为未成功）
    const failedEntry: DictEntry = {
      word: normalizedWord,
      success: false
    }

    // 也缓存失败结果，避免重复尝试
    setCachedDictEntry(normalizedWord, failedEntry)

    return failedEntry
  }
}

/**
 * 批量获取单词的词典数据（用于生词本）
 *
 * 使用Promise.allSettled并发调用，提高性能
 * 添加批次间延迟，避免有道API断连
 */
export async function getBatchDictEntries(words: string[]): Promise<DictEntry[]> {
  if (!words || words.length === 0) {
    return []
  }

  console.log(`[Dict Service] 批量获取 ${words.length} 个单词的词典数据`)

  const MAX_CONCURRENT = 10 // 降低并发数，从20改为10，更保守
  const BATCH_DELAY_MS = 1000 // 每批次之间延迟1秒，避免有道API断连
  const results: DictEntry[] = []

  // 分批处理，避免并发过多
  for (let i = 0; i < words.length; i += MAX_CONCURRENT) {
    const batch = words.slice(i, i + MAX_CONCURRENT)
    const currentBatch = Math.floor(i / MAX_CONCURRENT) + 1
    const totalBatches = Math.ceil(words.length / MAX_CONCURRENT)

    console.log(`[Dict Service] 进度: ${currentBatch}/${totalBatches} 批次`)

    const batchResults = await Promise.allSettled(
      batch.map(word => getDictEntry(word))
    )

    // 处理批次结果
    batchResults.forEach(result => {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        console.error('[Dict Service] Promise rejected:', result.reason)
      }
    })

    // 在批次之间添加延迟（除了最后一批）
    if (i + MAX_CONCURRENT < words.length) {
      console.log(`[Dict Service] 等待 ${BATCH_DELAY_MS}ms 后处理下一批次...`)
      await sleep(BATCH_DELAY_MS)
    }
  }

  const successCount = results.filter(r => r.success).length
  console.log(`[Dict Service] ✅ 批量获取完成: ${successCount}/${words.length} 成功`)

  return results
}

/**
 * 延迟函数（用于限流）
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
