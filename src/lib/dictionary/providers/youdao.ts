/**
 * 有道词典 Provider（英语专用）
 *
 * API: https://dict.youdao.com/jsonapi?q={word}
 * 特点: 无需 API Key，中文释义质量高
 * 限制: 仅支持英语查询
 */

import type {
  IDictionaryProvider,
  UnifiedDictEntry,
  DictExample,
  YoudaoApiResponse,
  DictionaryLanguage
} from '../types'

const YOUDAO_API_URL = 'https://dict.youdao.com/jsonapi'

// ============================================
// 有道词典 Provider
// ============================================

export const youdaoProvider: IDictionaryProvider = {
  name: 'youdao',
  supportedLanguages: ['en'] as DictionaryLanguage[],

  async lookup(word: string, _fromLang: DictionaryLanguage = 'en', _toLang?: string): Promise<UnifiedDictEntry> {
    const normalizedWord = word.trim().toLowerCase()

    if (!normalizedWord) {
      return createEmptyEntry(word, 'Empty word')
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(
        `${YOUDAO_API_URL}?q=${encodeURIComponent(normalizedWord)}`,
        {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; EducationalApp/1.0)'
          }
        }
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        return createEmptyEntry(word, `HTTP ${response.status}`)
      }

      const data: YoudaoApiResponse = await response.json()
      return parseYoudaoResponse(data, word)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[Youdao] 查询失败 "${word}":`, errorMessage)
      return createEmptyEntry(word, errorMessage)
    }
  },

  async lookupBatch(words: string[]): Promise<UnifiedDictEntry[]> {
    const MAX_CONCURRENT = 10
    const BATCH_DELAY_MS = 500
    const results: UnifiedDictEntry[] = []

    for (let i = 0; i < words.length; i += MAX_CONCURRENT) {
      const batch = words.slice(i, i + MAX_CONCURRENT)

      const batchResults = await Promise.all(
        batch.map(word => youdaoProvider.lookup(word, 'en'))
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

function parseYoudaoResponse(data: YoudaoApiResponse, word: string): UnifiedDictEntry {
  try {
    const simple = data.simple?.word?.[0]
    const ec = data.ec?.word?.[0]
    const ee = data.ee?.word?.[0]
    const blng = data.blng_sents_part?.['sentence-pair']
    const phrs = data.phrs?.phrs
    const syno = data.syno?.synos

    // 音标
    const uk_phonetic = cleanPhonetic(simple?.ukphone || simple?.phone || '')
    const us_phonetic = cleanPhonetic(simple?.usphone || simple?.phone || '')
    const phonetic = us_phonetic || uk_phonetic

    // 中文释义（可能有多个词性）
    const definitions: string[] = []
    if (ec?.trs) {
      for (const tr of ec.trs) {
        const pos = tr.pos || ''
        const text = extractText(tr.tr?.[0]?.l?.i)
        if (text) {
          definitions.push(pos ? `${pos} ${text}` : text)
        }
      }
    }
    const definition = definitions.join('；')

    // 英文释义
    const definitionsEn: string[] = []
    if (ee?.trs) {
      for (const tr of ee.trs) {
        const text = tr.tr?.[0]?.l?.i
        if (text) {
          definitionsEn.push(text)
        }
      }
    }
    const definition_en = definitionsEn.join('；')

    // 词性
    const part_of_speech = ec?.trs?.[0]?.pos || syno?.[0]?.pos || ''

    // 例句（与系统词库字段一致）
    const examples: DictExample[] = []
    if (blng && Array.isArray(blng)) {
      for (const pair of blng.slice(0, 5)) {
        const en = pair.sentence || pair['sentence-eng'] || ''
        const zh = pair['sentence-translation'] || ''
        if (en || zh) {
          examples.push({ en, zh })
        }
      }
    }

    // 搭配（与系统词库字段一致）
    const collocationsEn: string[] = []
    const collocationsZh: string[] = []
    if (phrs && Array.isArray(phrs)) {
      for (const phr of phrs.slice(0, 5)) {
        const en = phr.phr?.headword?.l?.i || ''
        const zh = phr.phr?.trs?.[0]?.tr?.[0]?.l?.i || ''
        if (en) collocationsEn.push(en)
        if (zh) collocationsZh.push(zh)
      }
    }

    // 同义词
    const synonyms: string[] = []
    if (syno && Array.isArray(syno)) {
      for (const synoItem of syno.slice(0, 3)) {
        const pos = synoItem.pos || ''
        const synoArray = synoItem.syno
        const words = Array.isArray(synoArray)
          ? synoArray.map((s: { w?: { d?: string } }) => s.w?.d).filter(Boolean).join(', ')
          : ''
        if (words) {
          synonyms.push(pos ? `${pos} ${words}` : words)
        }
      }
    }

    // 词形变化
    const forms: string[] = []
    if (simple?.wfs && Array.isArray(simple.wfs)) {
      for (const wf of simple.wfs) {
        const form = wf.wf?.name || ''
        const value = wf.wf?.value?.l?.i || ''
        if (form && value) {
          forms.push(`${form}: ${value}`)
        }
      }
    }

    // 音频链接
    const audio_url = simple?.usspeech || simple?.ukspeech || ''

    return {
      word: word.trim(),
      language: 'en',
      source: 'youdao',
      success: !!definition || !!definition_en,

      // 基础字段（与 words 表一致）
      phonetic,
      uk_phonetic,
      us_phonetic,
      definition,
      definition_en,
      part_of_speech,
      audio_url,

      // 例句（与系统词库字段一致）
      example_sentence: examples.map(e => e.zh).join('\n'),
      example_sentence_en: examples.map(e => e.en).join('\n'),
      examples,

      // 搭配（与系统词库字段一致）
      collocation: collocationsZh.join('；'),
      collocation_en: collocationsEn.join('；'),

      // 扩展数据
      definitions: definitions.length > 0 ? definitions : undefined,

      // 元数据
      _fetched_at: Date.now()
    }

  } catch (error) {
    console.error('[Youdao] 解析失败:', error)
    return createEmptyEntry(word, error instanceof Error ? error.message : 'Parse error')
  }
}

// ============================================
// 工具函数
// ============================================

function extractText(i: unknown): string {
  if (!i) return ''
  if (typeof i === 'string') return i
  if (Array.isArray(i)) {
    return i.map(item => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object' && 'd' in item) return item.d
      return ''
    }).filter(Boolean).join('')
  }
  return ''
}

function cleanPhonetic(phonetic: string): string {
  return phonetic.replace(/\//g, '').trim()
}

function createEmptyEntry(word: string, error?: string): UnifiedDictEntry {
  return {
    word: word.trim(),
    language: 'en',
    source: 'youdao',
    success: false,
    _fetched_at: Date.now(),
    _raw_response: { error }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default youdaoProvider
