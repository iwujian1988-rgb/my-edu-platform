/**
 * Speaker 模块统一常量
 *
 * 用途：消除硬编码，确保数据一致性
 * 修改说明：添加新语言或分类时，只需修改此文件
 */

// ========================================
// 有效语言列表
// ========================================
export const VALID_LANGUAGES = ['en', 'pl', 'es', 'fr', 'de', 'ja'] as const

export type ValidLanguage = typeof VALID_LANGUAGES[number]

// ========================================
// 有效分类列表
// ========================================
export const VALID_CATEGORIES = ['健康', '心理', '成长', '学习', '社交', '生活'] as const

export type ValidCategory = typeof VALID_CATEGORIES[number]

// ========================================
// 默认状态值
// ========================================
export const DEFAULT_STATUS = 'ready' as const

// ========================================
// 有效难度等级
// ========================================
export const VALID_LEVELS = [1, 2, 3, 4, 5] as const

export type ValidLevel = typeof VALID_LEVELS[number]

// ========================================
// 默认难度等级（当无法解析时使用）
// ========================================
export const DEFAULT_LEVEL = 3 as const

// ========================================
// 字段名常量（防止拼写错误）
// ========================================
export const FIELD_NAMES = {
  HAS_PREROLL_AD: 'has_preroll_ad',  // 前置广告
  LEVEL: 'level',
  LANGUAGE: 'language',
  CATEGORY: 'category',
  STATUS: 'status',
  TITLE: 'title',
  AUDIO_URL: 'audio_url',
  IMAGE_URL: 'image_url',
  SOURCE_URL: 'source_url',
  JSON_DATA: 'json_data',
  WORD_COUNT: 'word_count',
  TOTAL_SENTENCES: 'total_sentences',
  DURATION_SECONDS: 'duration_seconds'
} as const
