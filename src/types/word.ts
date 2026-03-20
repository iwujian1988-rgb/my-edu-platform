/**
 * 单词管理相关类型定义
 */

// ============================================
// 多语言支持类型定义
// ============================================

/** 法语单词数据 */
export interface FrenchWordData {
  gender?: 'm' | 'f' | 'm/f' | 'n'
  plural?: string
  conjugation?: Conjugation
  feminine_form?: string
}

/** 德语单词数据 */
export interface GermanWordData {
  gender?: 'm' | 'f' | 'n'
  plural?: string
  cases?: Record<string, string>
}

/** 日语单词数据 */
export interface JapaneseWordData {
  kana?: string
  romaji?: string
  pitch_accent?: string
}

/** 西班牙语单词数据 */
export interface SpanishWordData {
  gender?: 'm' | 'f'
  plural?: string
}

/** 意大利语单词数据 */
export interface ItalianWordData {
  gender?: 'm' | 'f'
  plural?: string
}

/** 俄语单词数据 */
export interface RussianWordData {
  gender?: 'm' | 'f' | 'n'
  cases?: Record<string, string>
}

/** 统一的语种数据结构 */
export interface LanguageData {
  fr?: FrenchWordData
  de?: GermanWordData
  ja?: JapaneseWordData
  es?: SpanishWordData
  it?: ItalianWordData
  ru?: RussianWordData
}

/** 法语动词变位 */
export interface Conjugation {
  infinitif?: string
  participe_passe?: string
  participe_present?: string
  indicatif_present?: FrenchPersons
  indicatif_imparfait?: FrenchPersons
  indicatif_passe_simple?: FrenchPersons
  indicatif_futur_simple?: FrenchPersons
  indicatif_passe_compose?: FrenchPersons
  conditionnel_present?: FrenchPersons
  subjonctif_present?: FrenchPersons
  subjonctif_imparfait?: FrenchPersons
  imperatif_present?: {
    tu?: string
    nous?: string
    vous?: string
  }
}

/** 法语人称变位 */
export interface FrenchPersons {
  je?: string
  tu?: string
  il?: string
  elle?: string
  on?: string
  nous?: string
  vous?: string
  ils?: string
  elles?: string
}

// ============================================
// 单词基本信息
// ============================================

/**
 * 单词基本信息
 */
export interface Word {
  id: string
  chapter_id: string | null
  book_id: string
  word: string
  phonetic?: string
  part_of_speech?: string
  definition: string
  definition_en?: string
  collocation?: string
  collocation_en?: string
  example_sentence?: string
  example_sentence_en?: string
  order_index: number
  created_at: string
  updated_at: string
  // 多语言支持
  language_data?: LanguageData
}

/**
 * 创建单词请求
 */
export interface CreateWordRequest {
  chapter_id?: string | null
  book_id: string
  word: string
  phonetic?: string
  part_of_speech?: string
  definition: string
  definition_en?: string
  collocation?: string
  collocation_en?: string
  example_sentence?: string
  example_sentence_en?: string
  order_index?: number
}

/**
 * 更新单词请求
 */
export interface UpdateWordRequest {
  word?: string
  phonetic?: string
  part_of_speech?: string
  definition?: string
  definition_en?: string
  collocation?: string
  collocation_en?: string
  example_sentence?: string
  example_sentence_en?: string
  order_index?: number
  chapter_id?: string | null
}

/**
 * 单词列表查询参数
 */
export interface WordListQuery {
  page?: number
  pageSize?: number
  chapterId?: string
  search?: string
  sortBy?: 'word' | 'order_index' | 'created_at'
  sortOrder?: 'asc' | 'desc'
}

/**
 * 单词列表响应
 */
export interface WordListResponse {
  data: Word[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Excel导入行数据
 */
export interface ExcelImportRow {
  chapter?: string
  word: string
  phonetic?: string
  part_of_speech?: string
  definition: string
  definition_en?: string
  collocation?: string
  collocation_en?: string
  example_sentence?: string
  example_sentence_en?: string
}

/**
 * Excel导入错误行
 */
export interface ExcelImportError {
  rowIndex: number
  chapter: string
  word: string
  error: string
}

/**
 * Excel导入结果
 */
export interface ExcelImportResult {
  total: number
  imported: number
  skipped: number
  chaptersCreated?: number
  errors: ExcelImportError[]
}

// ============================================
// 多语言支持类型定义
// ============================================

/**
 * 法语单词数据
 */
export interface FrenchWordData {
  gender?: 'm' | 'f' | 'm/f' | 'n'  // 性别（阳性/阴性）
  plural?: string                    // 复数形式
  conjugation?: Conjugation          // 动词变位
  feminine_form?: string             // 形容词阴性形式
}

/**
 * 德语单词数据
 */
export interface GermanWordData {
  gender?: 'm' | 'f' | 'n'
  plural?: string
  cases?: Record<string, string>     // 格变化
}

/**
 * 日语单词数据
 */
export interface JapaneseWordData {
  kana?: string           // 假名
  romaji?: string         // 罗马音
  pitch_accent?: string   // 音调
}

/**
 * 西班牙语单词数据
 */
export interface SpanishWordData {
  gender?: 'm' | 'f' | 'n'
  plural?: string
}

/**
 * 意大利语单词数据
 */
export interface ItalianWordData {
  gender?: 'm' | 'f' | 'n'
  plural?: string
}

/**
 * 俄语单词数据
 */
export interface RussianWordData {
  gender?: 'm' | 'f' | 'n'
  cases?: Record<string, string>     // 格变化
}

/**
 * 统一的语种数据结构
 */
export interface LanguageData {
  fr?: FrenchWordData
  de?: GermanWordData
  ja?: JapaneseWordData
  es?: SpanishWordData
  it?: ItalianWordData
  ru?: RussianWordData
}

/**
 * 法语动词变位
 */
export interface Conjugation {
  // 不定式和分词
  infinitif?: string
  participe_passe?: string    // 过去分词
  participe_present?: string  // 现在分词

  // 直陈式 (Indicatif)
  indicatif_present?: FrenchPersons
  indicatif_imparfait?: FrenchPersons
  indicatif_passe_simple?: FrenchPersons
  indicatif_futur_simple?: FrenchPersons
  indicatif_passe_compose?: FrenchPersons

  // 条件式 (Conditionnel)
  conditionnel_present?: FrenchPersons

  // 虚拟式 (Subjonctif)
  subjonctif_present?: FrenchPersons
  subjonctif_imparfait?: FrenchPersons

  // 命令式 (Impératif)
  imperatif_present?: {
    tu?: string
    nous?: string
    vous?: string
  }
}

/**
 * 法语人称变位
 */
export interface FrenchPersons {
  je?: string      // 第一人称单数
  tu?: string      // 第二人称单数
  il?: string      // 第三人称单数阳性
  elle?: string    // 第三人称单数阴性
  on?: string      // 泛指人称
  nous?: string    // 第一人称复数
  vous?: string    // 第二人称复数/敬称
  ils?: string     // 第三人称复数阳性
  elles?: string   // 第三人称复数阴性
}

/**
 * 多语言显示辅助函数类型
 */
export interface LanguageDisplayHelpers {
  /** 获取发音显示（回退模式） */
  getPhoneticDisplay: (word: { phonetic?: string; uk_phonetic?: string; us_phonetic?: string; language_data?: LanguageData }) => string
  /** 获取法语词性显示（含阴阳性） */
  getFrenchPosDisplay: (word: { part_of_speech?: string; language_data?: LanguageData }) => string
  /** 获取法语单词完整显示 */
  getFrenchWordDisplay: (word: { word: string; language_data?: LanguageData }) => string
}

// ============================================
// TTS 多语言支持
// ============================================

/**
 * 支持的语言类型（用于 TTS 和显示）
 */
export type SupportedLanguage = 'en' | 'fr' | 'ja' | 'de' | 'es' | 'it' | 'ru'

/**
 * 支持的语言列表（用于验证）
 */
export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = [
  'en', 'fr', 'ja', 'de', 'es', 'it', 'ru'
] as const

/**
 * 判断字符串是否为有效的支持语言
 */
export function isValidLanguage(lang: unknown): lang is SupportedLanguage {
  return typeof lang === 'string' && SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)
}

/**
 * 从单词的 language_data 判断语言，回退到书籍语言
 *
 * @description 优先从单词的 language_data 判断语言，如果没有则使用书籍语言作为后备
 * @param word - 单词对象，需包含 language_data 字段
 * @param bookLanguage - 书籍语言（可选），作为后备
 * @returns 检测到的语言代码
 *
 * @example
 * // 单词有法语数据
 * getWordLanguage({ language_data: { fr: { gender: 'm' } } }, 'en') // 返回 'fr'
 *
 * @example
 * // 单词无语言数据，使用书籍语言
 * getWordLanguage({ language_data: null }, 'fr') // 返回 'fr'
 *
 * @example
 * // 单词无语言数据，书籍语言也无效，默认英语
 * getWordLanguage({ language_data: null }, undefined) // 返回 'en'
 */
export function getWordLanguage(
  word: { language_data?: LanguageData | null },
  bookLanguage?: string | null
): SupportedLanguage {
  // 优先从单词的 language_data 判断
  if (word.language_data?.fr) return 'fr'
  if (word.language_data?.ja) return 'ja'
  if (word.language_data?.de) return 'de'
  if (word.language_data?.es) return 'es'
  if (word.language_data?.it) return 'it'
  if (word.language_data?.ru) return 'ru'

  // 回退到书籍语言（需验证是否有效）
  if (isValidLanguage(bookLanguage)) {
    return bookLanguage
  }

  // 默认英语
  return 'en'
}

/**
 * 语言代码映射（用于 Web Speech API）
 */
export const LANGUAGE_CODE_MAP: Record<SupportedLanguage, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  ja: 'ja-JP',
  de: 'de-DE',
  es: 'es-ES',
  it: 'it-IT',
  ru: 'ru-RU',
} as const

/**
 * 获取 Web Speech API 语言代码
 *
 * @param language - 支持的语言
 * @param type - 发音类型（仅对英语有效）：'1'=英音, '2'=美音
 */
export function getSpeechLanguageCode(
  language: SupportedLanguage,
  type?: '1' | '2'
): string {
  if (language === 'en') {
    return type === '1' ? 'en-GB' : 'en-US'
  }
  return LANGUAGE_CODE_MAP[language]
}
