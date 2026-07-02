/**
 * 法语本地词库 Provider
 *
 * 数据源: data/french/french_words_all.json（合并版，含 A1-C2 全等级）
 * 词库量: 14,236 词
 *   - A1: 1,247 | A2: 679 | B1: 1,753
 *   - B2: 5,088 | C1: 3,155 | C2: 2,314
 * 特点: 本地数据，无网络延迟，数据权威（MDX+官方词库）
 */

import type {
  IDictionaryProvider,
  UnifiedDictEntry,
  DictExample,
  DictionaryLanguage
} from '../types'
import type { FrenchWordData } from '@/types/word'

// 法语词库缓存
let frenchWordsCache: Map<string, FrenchLocalWord> | null = null

// ============================================
// 法语本地词库结构
// ============================================

interface FrenchLocalWord {
  id: string
  word: string
  phonetic: string
  cefrLevel: string
  pos: string
  posDetail: string
  definition: string | null
  definitions: string[]
  examples: {
    fr: string
    zh: string
  }[]
  gender: 'm' | 'f' | null
}

interface FrenchWordsData {
  version: string
  created_at: string
  source: {
    cefr: string
    definition: string
    citation: string
  }
  statistics: {
    total_words: number
    mdx_found: number
    mdx_not_found: number
    mdx_coverage: string
  }
  words: FrenchLocalWord[]
}

// ============================================
// 法语本地词库 Provider
// ============================================

export const localFrenchProvider: IDictionaryProvider = {
  name: 'local',
  supportedLanguages: ['fr'] as DictionaryLanguage[],

  async lookup(word: string, _fromLang: DictionaryLanguage = 'fr', _toLang?: string): Promise<UnifiedDictEntry> {
    const normalizedWord = word.trim().toLowerCase()

    if (!normalizedWord) {
      return createEmptyEntry(word, 'Empty word')
    }

    try {
      // 确保词库已加载
      const wordMap = await loadFrenchWords()
      const found = resolveWord(wordMap, normalizedWord)

      if (!found) {
        return createEmptyEntry(word, 'Not found in local dictionary')
      }

      return convertToUnifiedEntry(found)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[LocalFrench] 查询失败 "${word}":`, errorMessage)
      return createEmptyEntry(word, errorMessage)
    }
  },

  async lookupBatch(words: string[], _fromLang: DictionaryLanguage): Promise<UnifiedDictEntry[]> {
    const wordMap = await loadFrenchWords()

    return words.map(word => {
      const normalizedWord = word.trim().toLowerCase()
      const found = resolveWord(wordMap, normalizedWord)

      if (!found) {
        return createEmptyEntry(word, 'Not found')
      }

      return convertToUnifiedEntry(found)
    })
  }
}

// ============================================
// 加载法语词库
// ============================================

async function loadFrenchWords(): Promise<Map<string, FrenchLocalWord>> {
  if (frenchWordsCache) {
    return frenchWordsCache
  }

  try {
    // 从 public/ 目录 fetch JSON（Turbopack 不支持 src 外的动态 import）
    const data = await loadFrenchWordsData()

    frenchWordsCache = new Map()

    for (const word of data.words) {
      // 使用小写作为 key
      const key = word.word.toLowerCase()
      if (!frenchWordsCache.has(key)) {
        frenchWordsCache.set(key, word)
      }
    }

    console.log(`[LocalFrench] 词库加载完成: ${frenchWordsCache.size} 词`)
    return frenchWordsCache

  } catch (error) {
    console.error('[LocalFrench] 词库加载失败:', error)
    throw new Error('Failed to load French dictionary')
  }
}

async function loadFrenchWordsData(): Promise<FrenchWordsData> {
  if (typeof window !== 'undefined') {
    const response = await fetch('/data/french/french_words_all.json')
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return response.json() as Promise<FrenchWordsData>
  }

  const [{ readFile }, path] = await Promise.all([
    import('node:fs/promises'),
    import('node:path'),
  ])
  const dictionaryPath = path.join(process.cwd(), 'public', 'data', 'french', 'french_words_all.json')
  const raw = await readFile(dictionaryPath, 'utf8')
  return JSON.parse(raw) as FrenchWordsData
}

// ============================================
// 转换为统一格式
// ============================================

function convertToUnifiedEntry(data: FrenchLocalWord): UnifiedDictEntry {
  // 例句转换
  const examples: DictExample[] = (data.examples || []).map(ex => ({
    fr: ex.fr,
    zh: ex.zh
  }))

  // 释义
  const definition = data.definitions?.join('\n') || data.definition || ''

  // 词性详情
  const posDetail = data.posDetail || ''

  // 构建 language_data.fr（与系统类型一致）
  const languageDataFr: FrenchWordData = {
    gender: data.gender || undefined,
    plural: undefined, // 本地词库暂无复数数据
    conjugation: undefined, // 本地词库暂无变位数据
    feminine_form: undefined
  }

  return {
    word: data.word,
    language: 'fr',
    source: 'local',
    success: true,

    // 基础字段（与 words 表一致）
    phonetic: data.phonetic || '',
    definition,
    part_of_speech: posDetail,

    // 例句（与系统词库字段一致）
    example_sentence: examples.map(e => e.zh).join('\n'),
    example_sentence_en: examples.map(e => e.fr).join('\n'),
    examples,

    // 法语扩展字段（与法语 JSON 一致）
    cefrLevel: data.cefrLevel,
    pos: data.pos,
    posDetail: data.posDetail,
    definitions: data.definitions,

    // 法语特有字段（与 language_data.fr 一致）
    gender: data.gender || undefined,

    // 完整的 language_data
    language_data: {
      fr: languageDataFr
    },

    // 元数据
    _fetched_at: Date.now()
  }
}

// ============================================
// 词汇解析：处理冠词、缩写、括号注解等变体
// ============================================

/** 法语定冠词和不定冠词（用于从 "le logement" 中提取 "logement"） */
const FRENCH_ARTICLES = [
  "l'", "le ", "la ", "les ", "un ", "une ", "des ", "du ", "de la ", "de l'", "d'", "au ", "aux ",
]

/**
 * 从词库 Map 中查找词，支持多种变体：
 * 1. 原始查询（如 "le logement"）
 * 2. 去冠词（"le logement" → "logement"）
 * 3. 去括号注解（"le/la colocataire (coloc)" → "colocataire"）
 * 4. 取斜杠后的备选形式（"pro (professionnel)" → "professionnel"）
 */
function resolveWord(wordMap: Map<string, FrenchLocalWord>, query: string): FrenchLocalWord | null {
  // 1. 直接查
  const direct = wordMap.get(query)
  if (direct) return direct

  // 2. 去括号及内容，再去冠词
  //    "le/la colocataire (coloc)" → "le/la colocataire" → strip articles → ...
  const noParens = query.replace(/\s*\(.*?\)\s*/g, '').trim()
  if (noParens !== query) {
    const found = resolveWord(wordMap, noParens)
    if (found) return found
  }

  // 3. 括号里的内容可能就是词本身
  //    "pro (professionnel)" → "professionnel"
  const parenContent = query.match(/\(([^)]+)\)/)
  if (parenContent) {
    const inner = parenContent[1].trim().toLowerCase()
    const found = wordMap.get(inner)
    if (found) return found
  }

  // 4. 去冠词前缀
  for (const article of FRENCH_ARTICLES) {
    if (query.startsWith(article)) {
      const stripped = query.slice(article.length).trim()
      if (!stripped) continue

      // 直接查去冠词后的词
      const found = wordMap.get(stripped)
      if (found) return found

      // 去冠词后可能还有括号
      return resolveWord(wordMap, stripped)
    }
  }

  // 5. 处理 "word1/word2" 格式，取第一个和第二个分别试
  if (query.includes('/')) {
    const parts = query.split('/').map(p => p.trim())
    for (const part of parts) {
      const found = resolveWord(wordMap, part)
      if (found) return found
    }
  }

  return null
}

// ============================================
// 工具函数
// ============================================

function createEmptyEntry(word: string, error?: string): UnifiedDictEntry {
  return {
    word: word.trim(),
    language: 'fr',
    source: 'local',
    success: false,
    _fetched_at: Date.now(),
    _raw_response: { error }
  }
}

/**
 * 清除词库缓存（用于热更新）
 */
export function clearFrenchCache(): void {
  frenchWordsCache = null
}

/**
 * 获取词库统计信息
 */
export async function getFrenchStats(): Promise<{
  totalWords: number
  loadedWords: number
}> {
  const wordMap = await loadFrenchWords()
  return {
    totalWords: 14236,
    loadedWords: wordMap.size
  }
}

export default localFrenchProvider
