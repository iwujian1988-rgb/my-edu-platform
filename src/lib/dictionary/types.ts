/**
 * 统一词典服务类型定义
 *
 * 字段命名与系统词库（words 表 + 法语 JSON）完全一致
 * 便于未来做数据映射
 */

import type {
  FrenchWordData,
  GermanWordData,
  JapaneseWordData,
  SpanishWordData,
  ItalianWordData,
  RussianWordData,
  LanguageData
} from '@/types/word'

// ============================================
// 支持的语言
// ============================================

export type DictionaryLanguage = 'en' | 'fr' | 'es' | 'ja' | 'de' | 'it' | 'ru'

export const DICTIONARY_LANGUAGES: readonly DictionaryLanguage[] = [
  'en', 'fr', 'es', 'ja', 'de', 'it', 'ru'
] as const

export const LANGUAGE_NAMES: Record<DictionaryLanguage, string> = {
  en: '英语',
  fr: '法语',
  es: '西班牙语',
  ja: '日语',
  de: '德语',
  it: '意大利语',
  ru: '俄语'
}

// ============================================
// API Provider 类型
// ============================================

export type DictionaryProvider = 'youdao' | 'ultimate' | 'local' | 'llm'

// ============================================
// 统一词典条目结构（与系统词库字段一致）
// ============================================

/**
 * 例句结构（与法语词库 examples 字段一致）
 */
export interface DictExample {
  fr?: string    // 原文（对于法语）
  en?: string    // 原文（对于英语等）
  zh: string     // 中文翻译
}

/**
 * 统一词典条目
 *
 * 字段命名规则：
 * 1. 基础字段与 words 表完全一致
 * 2. 法语扩展字段与法语 JSON 词库一致
 * 3. 多语言字段与 language_data 一致
 */
export interface UnifiedDictEntry {
  // ========================================
  // 基础字段（与 words 表一致）
  // ========================================

  /** 单词 */
  word: string

  /** 音标（默认） */
  phonetic?: string

  /** 英式音标 */
  uk_phonetic?: string

  /** 美式音标 */
  us_phonetic?: string

  /** 中文释义 */
  definition?: string

  /** 英文释义 */
  definition_en?: string

  /** 中文搭配 */
  collocation?: string

  /** 英文搭配 */
  collocation_en?: string

  /** 中文例句 */
  example_sentence?: string

  /** 英文例句（原文） */
  example_sentence_en?: string

  /** 词性 */
  part_of_speech?: string

  /** 音频链接 */
  audio_url?: string

  // ========================================
  // 扩展字段
  // ========================================

  /** 词源 */
  etymology?: string

  /** 同义词 */
  synonyms?: string

  /** 词形变化 */
  forms?: string

  // ========================================
  // 法语词库扩展字段（与法语 JSON 一致）
  // ========================================

  /** CEFR 等级 (A1/A2/B1/B2/C1/C2) */
  cefrLevel?: string

  /** 词性代码 (NOM/VER/ADJ/ADV/...) */
  pos?: string

  /** 词性详情 (n.m./n.f./v.t./v.i./adv./...) */
  posDetail?: string

  /** 释义数组（多条释义） */
  definitions?: string[]

  /** 例句数组 */
  examples?: DictExample[]

  // ========================================
  // 多语言预留字段（与 language_data 一致）
  // ========================================

  /** 法语特有数据 */
  gender?: 'm' | 'f' | 'm/f' | 'n'

  /** 复数形式 */
  plural?: string

  /** 动词变位 */
  conjugation?: FrenchWordData['conjugation']

  /** 阴性形式 */
  feminine_form?: string

  /** 日语假名 */
  kana?: string

  /** 日语罗马音 */
  romaji?: string

  /** 日语音调 */
  pitch_accent?: string

  /** 格变化（德语/俄语） */
  cases?: Record<string, string>

  // ========================================
  // 完整的 language_data（用于直接存入数据库）
  // ========================================

  /** 多语言数据（与数据库 language_data 字段一致） */
  language_data?: LanguageData

  // ========================================
  // 元数据
  // ========================================

  /** 源语言 */
  language: DictionaryLanguage

  /** 数据来源 (youdao/ultimate/local) */
  source: DictionaryProvider

  /** 是否查询成功 */
  success: boolean

  /** 查询时间戳 */
  _fetched_at?: number

  /** 原始响应（调试用） */
  _raw_response?: unknown
}

// ============================================
// API 响应类型
// ============================================

/**
 * Ultimate Dictionary API 响应
 * https://github.com/Vuizur/ultimate-dictionary-api
 */
export interface UltimateDictResponse {
  entries: UltimateDictEntry[]
  posTranslations?: UltimatePosTranslation[]
  translations?: string[]
}

export interface UltimateDictEntry {
  word: string
  ipas?: string[]
  etymology?: string
  pos?: string
  senses?: UltimateSense[]
}

export interface UltimateSense {
  glosses?: string[]
  examples?: string[]
  tags?: string[]
}

export interface UltimatePosTranslation {
  pos?: string
  ipa?: string
  translations_count?: number
}

/**
 * 有道词典 API 响应
 * https://dict.youdao.com/jsonapi
 */
export interface YoudaoApiResponse {
  simple?: {
    word?: Array<{
      ukphone?: string
      usphone?: string
      ukspeech?: string
      usspeech?: string
      phone?: string
      wfs?: Array<{
        wf?: {
          name?: string
          value?: {
            l?: {
              i?: string
            }
          }
        }
      }>
    }>
  }
  ec?: {
    word?: Array<{
      trs?: Array<{
        pos?: string
        tr?: Array<{
          l?: {
            i?: Array<{ d?: string }> | string
          }
        }>
      }>
    }>
  }
  ee?: {
    word?: Array<{
      trs?: Array<{
        tr?: Array<{
          l?: { i?: string }
        }>
      }>
    }>
  }
  blng_sents_part?: {
    'sentence-pair'?: Array<{
      sentence?: string
      'sentence-eng'?: string
      'sentence-translation'?: string
    }>
  }
  phrs?: {
    phrs?: Array<{
      phr?: {
        headword?: { l?: { i?: string } }
        trs?: Array<{
          tr?: Array<{
            l?: { i?: string }
          }>
        }>
      }
    }>
  }
  syno?: {
    synos?: Array<{
      pos?: string
      syno?: Array<{ w?: { d?: string } }> | string
    }>
  }
}

// ============================================
// Provider 接口
// ============================================

export interface IDictionaryProvider {
  /** Provider 名称 */
  name: DictionaryProvider

  /** 支持的语言 */
  supportedLanguages: DictionaryLanguage[]

  /** 查询单词 */
  lookup(word: string, fromLang: DictionaryLanguage, toLang?: string): Promise<UnifiedDictEntry>

  /** 批量查询 */
  lookupBatch?(words: string[], fromLang: DictionaryLanguage, toLang?: string): Promise<UnifiedDictEntry[]>
}

// ============================================
// 配置类型
// ============================================

/**
 * 词典服务配置
 */
export interface DictionaryConfig {
  /** 默认源语言 */
  defaultFromLang: DictionaryLanguage

  /** 默认目标语言 */
  defaultToLang: string

  /** 缓存过期时间（天） */
  cacheExpiryDays: number

  /** 请求超时（毫秒） */
  requestTimeout: number

  /** 最大并发数 */
  maxConcurrent: number

  /** 批次间延迟（毫秒） */
  batchDelayMs: number

  /** 是否启用缓存 */
  enableCache: boolean
}

/**
 * 默认配置
 */
export const DEFAULT_DICTIONARY_CONFIG: DictionaryConfig = {
  defaultFromLang: 'en',
  defaultToLang: 'zh',
  cacheExpiryDays: 30,
  requestTimeout: 5000,
  maxConcurrent: 5,
  batchDelayMs: 500,
  enableCache: true
}

// ============================================
// Hook 类型
// ============================================

/**
 * useDictionary Hook 返回类型
 */
export interface UseDictionaryReturn {
  /** 当前查询结果 */
  entry: UnifiedDictEntry | null

  /** 是否正在加载 */
  loading: boolean

  /** 错误信息 */
  error: string | null

  /** 查询单词 */
  lookup: (word: string, language?: DictionaryLanguage) => Promise<void>

  /** 批量查询 */
  lookupBatch: (words: string[], language?: DictionaryLanguage) => Promise<UnifiedDictEntry[]>

  /** 清除结果 */
  clear: () => void

  /** 从缓存获取 */
  getCached: (word: string, language?: DictionaryLanguage) => UnifiedDictEntry | null
}
