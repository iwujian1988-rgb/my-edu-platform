/**
 * Ultimate Dictionary API Provider（多语言）
 *
 * API: http://116.202.96.240:8080/translation/{from}/{to}/{word}
 * 数据源: Wiktionary
 * 特点: 支持 6000+ 语言对，免费无需 API Key
 * 限制: 第三方服务，可能不稳定
 */

import type {
  IDictionaryProvider,
  UnifiedDictEntry,
  DictExample,
  UltimateDictResponse,
  DictionaryLanguage
} from '../types'

const ULTIMATE_API_BASE = 'http://116.202.96.240:8080'

// ============================================
// Ultimate Dictionary Provider
// ============================================

export const ultimateProvider: IDictionaryProvider = {
  name: 'ultimate',
  supportedLanguages: ['en', 'fr', 'es', 'ja', 'de', 'it', 'ru'] as DictionaryLanguage[],

  async lookup(
    word: string,
    fromLang: DictionaryLanguage = 'en',
    toLang: string = 'zh'
  ): Promise<UnifiedDictEntry> {
    const normalizedWord = word.trim()

    if (!normalizedWord) {
      return createEmptyEntry(word, fromLang, 'Empty word')
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      const url = `${ULTIMATE_API_BASE}/translation/${fromLang}/${toLang}/${encodeURIComponent(normalizedWord)}`

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        return createEmptyEntry(word, fromLang, `HTTP ${response.status}`)
      }

      const data: UltimateDictResponse = await response.json()
      return parseUltimateResponse(data, word, fromLang)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[Ultimate] 查询失败 "${word}" (${fromLang}):`, errorMessage)
      return createEmptyEntry(word, fromLang, errorMessage)
    }
  },

  async lookupBatch(
    words: string[],
    fromLang: DictionaryLanguage,
    toLang: string = 'zh'
  ): Promise<UnifiedDictEntry[]> {
    const MAX_CONCURRENT = 5
    const BATCH_DELAY_MS = 300
    const results: UnifiedDictEntry[] = []

    for (let i = 0; i < words.length; i += MAX_CONCURRENT) {
      const batch = words.slice(i, i + MAX_CONCURRENT)

      const batchResults = await Promise.all(
        batch.map(word => ultimateProvider.lookup(word, fromLang, toLang))
      )

      results.push(...batchResults)

      if (i + MAX_CONCURRENT < words.length) {
        await sleep(BATCH_DELAY_MS)
      }
    }

    return results
  }
}

// ============================================
// 解析函数
// ============================================

function parseUltimateResponse(
  data: UltimateDictResponse,
  word: string,
  language: DictionaryLanguage
): UnifiedDictEntry {
  try {
    const entries = data.entries || []
    const translations = data.translations || []
    const posTranslations = data.posTranslations || []

    if (entries.length === 0 && translations.length === 0) {
      return createEmptyEntry(word, language, 'No results')
    }

    // 取第一个词条
    const mainEntry = entries[0]

    // 音标
    const ipas = mainEntry?.ipas || []
    const phonetic = ipas[0]?.replace(/\//g, '').trim() || ''

    // 词性
    const part_of_speech = mainEntry?.pos || ''

    // 释义
    const definitions: string[] = []
    const senses = mainEntry?.senses || []

    for (const sense of senses.slice(0, 5)) {
      const glosses = sense.glosses || []
      if (glosses.length > 0) {
        definitions.push(glosses.join('; '))
      }
    }

    const definition = definitions.join('；')

    // 例句
    const examples: DictExample[] = []
    for (const sense of senses.slice(0, 3)) {
      const senseExamples = sense.examples || []
      for (const ex of senseExamples.slice(0, 2)) {
        // Ultimate API 返回的例句可能没有翻译
        examples.push({
          en: ex,
          zh: '' // 需要单独翻译
        })
      }
    }

    // 翻译列表
    const translationList = translations.slice(0, 5).join('；')

    // 词源
    const etymology = mainEntry?.etymology || ''

    return {
      word: word.trim(),
      language,
      source: 'ultimate',
      success: !!definition || translations.length > 0,

      // 基础字段（与 words 表一致）
      phonetic,
      definition: definition || translationList,
      part_of_speech,

      // 例句（与系统词库字段一致）
      example_sentence_en: examples.map(e => e.en).join('\n'),
      examples,

      // 词源
      etymology,

      // 扩展数据
      definitions: definitions.length > 0 ? definitions : undefined,

      // 元数据
      _fetched_at: Date.now(),
      _raw_response: data
    }

  } catch (error) {
    console.error('[Ultimate] 解析失败:', error)
    return createEmptyEntry(word, language, error instanceof Error ? error.message : 'Parse error')
  }
}

// ============================================
// 工具函数
// ============================================

function createEmptyEntry(
  word: string,
  language: DictionaryLanguage,
  error?: string
): UnifiedDictEntry {
  return {
    word: word.trim(),
    language,
    source: 'ultimate',
    success: false,
    _fetched_at: Date.now(),
    _raw_response: { error }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default ultimateProvider
