/**
 * 批量上传工具函数
 *
 * 对应 PRD: VIDEO_BATCH_UPLOAD_PRD.md v1.2
 * 对应 Tech: VIDEO_BATCH_UPLOAD_TECH.md v1.0
 *
 * 提供时间转换、难度映射、例句匹配等功能
 */

import type { VideoDifficulty } from '@/types/video'

// ============================================
// 常量定义
// ============================================

/** 时间格式正则：HH:MM:SS.mmm */
const TIME_REGEX = /^(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/

/** CEFR 等级到系统难度的映射 */
const CEFR_TO_DIFFICULTY_MAP: Record<string, VideoDifficulty> = {
  A1: 'beginner',
  A2: 'beginner',
  B1: 'intermediate',
  B2: 'intermediate',
  C1: 'advanced',
  C2: 'advanced',
}

/** CEFR 等级到数字的映射 (1-6) */
const CEFR_TO_NUMBER_MAP: Record<string, number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 6,
}

// ============================================
// 时间转换函数
// ============================================

/**
 * 时间字符串转秒数
 *
 * @param timeStr - 时间字符串，格式 "HH:MM:SS.mmm"
 * @returns 秒数（浮点数）
 *
 * @example
 * timeStringToSeconds("00:00:00.320") // → 0.32
 * timeStringToSeconds("00:05:58.950") // → 358.95
 */
export function timeStringToSeconds(timeStr: string): number {
  // 边界处理：空值或非字符串
  if (!timeStr || typeof timeStr !== 'string') {
    return 0
  }

  const match = timeStr.trim().match(TIME_REGEX)
  if (!match) {
    return 0
  }

  const hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  const seconds = parseInt(match[3], 10)
  const milliseconds = parseInt(match[4], 10)

  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000
}

/**
 * 秒数转时间字符串
 *
 * @param seconds - 秒数
 * @returns 时间字符串，格式 "HH:MM:SS.mmm"
 *
 * @example
 * secondsToTimeString(0.32) // → "00:00:00.320"
 * secondsToTimeString(358.95) // → "00:05:58.950"
 */
export function secondsToTimeString(seconds: number): string {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
    return '00:00:00.000'
  }

  const totalMs = Math.round(seconds * 1000)
  const ms = totalMs % 1000
  const totalSec = Math.floor(totalMs / 1000)
  const sec = totalSec % 60
  const totalMin = Math.floor(totalSec / 60)
  const min = totalMin % 60
  const hr = Math.floor(totalMin / 60)

  return [
    hr.toString().padStart(2, '0'),
    min.toString().padStart(2, '0'),
    sec.toString().padStart(2, '0'),
  ].join(':') + '.' + ms.toString().padStart(3, '0')
}

// ============================================
// 难度转换函数
// ============================================

/**
 * CEFR 等级转系统难度
 *
 * @param cefr - CEFR 等级字符串 (A1-C2)
 * @returns 系统难度
 *
 * @example
 * cefrToDifficulty('A1') // → 'beginner'
 * cefrToDifficulty('B2') // → 'intermediate'
 * cefrToDifficulty('C1') // → 'advanced'
 */
export function cefrToDifficulty(cefr: string): VideoDifficulty {
  if (!cefr || typeof cefr !== 'string') {
    return 'beginner'
  }

  const upperCefr = cefr.toUpperCase().trim()
  return CEFR_TO_DIFFICULTY_MAP[upperCefr] || 'beginner'
}

/**
 * CEFR 等级转数字 (1-6)
 *
 * @param cefr - CEFR 等级字符串 (A1-C2)
 * @returns 数字等级 (1-6)
 *
 * @example
 * cefrToNumber('A1') // → 1
 * cefrToNumber('C2') // → 6
 */
export function cefrToNumber(cefr: string): number {
  if (!cefr || typeof cefr !== 'string') {
    return 1
  }

  const upperCefr = cefr.toUpperCase().trim()
  return CEFR_TO_NUMBER_MAP[upperCefr] || 1
}

// ============================================
// 例句匹配函数
// ============================================

/**
 * 从字幕中查找包含指定单词的例句
 *
 * 使用单词边界匹配，不区分大小写
 *
 * 对应 PRD: VIDEO_BATCH_UPLOAD_PRD.md Section 5.9
 * - 点击 [📍] 跳转到字幕中该单词首次出现的位置
 *
 * @param word - 要查找的单词
 * @param subtitles - 字幕数组
 * @returns 匹配的例句（包含字幕时间），如果未找到则返回 null
 */
export function findWordInSubtitles(
  word: string,
  subtitles: Array<{ original_text: string; chinese_text: string | null; start_time?: number }>
): { original: string; translation: string | null; startTime: number } | null {
  // 边界处理
  if (!word || typeof word !== 'string') {
    return null
  }
  if (!subtitles || !Array.isArray(subtitles) || subtitles.length === 0) {
    return null
  }

  const wordLower = word.toLowerCase().trim()
  if (!wordLower) {
    return null
  }

  // 转义正则特殊字符
  const escapedWord = escapeRegex(wordLower)
  // 使用单词边界匹配
  const regex = new RegExp(`\\b${escapedWord}\\b`, 'i')

  for (const subtitle of subtitles) {
    if (!subtitle.original_text) {
      continue
    }

    if (regex.test(subtitle.original_text)) {
      return {
        original: subtitle.original_text,
        translation: subtitle.chinese_text,
        startTime: subtitle.start_time ?? 0,
      }
    }
  }

  return null
}

/**
 * 从字幕中查找包含指定表达式的例句
 *
 * 表达式可能包含省略号，需要特殊处理
 *
 * 对应 PRD: VIDEO_BATCH_UPLOAD_PRD.md Section 5.9
 * - 点击 [▶ 播放这段] 视频跳转到该例句位置并播放
 *
 * @param expression - 要查找的表达式（可能包含 "..."）
 * @param subtitles - 字幕数组
 * @returns 匹配的例句（包含字幕时间），如果未找到则返回 null
 */
export function findExpressionInSubtitles(
  expression: string,
  subtitles: Array<{ original_text: string; chinese_text: string | null; start_time?: number }>
): { original: string; translation: string | null; startTime: number } | null {
  // 边界处理
  if (!expression || typeof expression !== 'string') {
    return null
  }
  if (!subtitles || !Array.isArray(subtitles) || subtitles.length === 0) {
    return null
  }

  const exprTrimmed = expression.trim()
  if (!exprTrimmed) {
    return null
  }

  // 处理包含省略号的表达式：提取关键词
  // 例如 "Ça fait ... que" → 查找包含 "Ça fait" 和 "que" 的句子
  const parts = exprTrimmed.split(/\s*\.\.\.\s*/)
  const searchParts = parts.filter(p => p.trim().length > 0)

  if (searchParts.length === 0) {
    return null
  }

  for (const subtitle of subtitles) {
    if (!subtitle.original_text) {
      continue
    }

    // 检查所有部分是否都在句子中
    const textLower = subtitle.original_text.toLowerCase()
    const allPartsFound = searchParts.every(part =>
      textLower.includes(part.toLowerCase().trim())
    )

    if (allPartsFound) {
      return {
        original: subtitle.original_text,
        translation: subtitle.chinese_text,
        startTime: subtitle.start_time ?? 0,
      }
    }
  }

  return null
}

// ============================================
// 数组工具函数
// ============================================

/**
 * 根据指定字段对数组去重
 *
 * @param arr - 输入数组
 * @param key - 用于去重的字段名
 * @returns 去重后的数组
 */
export function uniqueArray<T>(arr: T[], key: keyof T): T[] {
  if (!arr || !Array.isArray(arr)) {
    return []
  }

  const seen = new Set<unknown>()
  return arr.filter(item => {
    if (!item) {
      return false
    }
    const keyValue = item[key]
    if (seen.has(keyValue)) {
      return false
    }
    seen.add(keyValue)
    return true
  })
}

/**
 * 根据指定字段对数组去重（使用自定义提取函数）
 *
 * @param arr - 输入数组
 * @param keyExtractor - 提取 key 的函数
 * @returns 去重后的数组
 */
export function uniqueBy<T, K>(arr: T[], keyExtractor: (item: T) => K): T[] {
  if (!arr || !Array.isArray(arr)) {
    return []
  }

  const seen = new Set<K>()
  return arr.filter(item => {
    if (!item) {
      return false
    }
    const key = keyExtractor(item)
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

// ============================================
// 字符串工具函数
// ============================================

/**
 * 转义正则表达式特殊字符
 *
 * @param str - 输入字符串
 * @returns 转义后的字符串
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 清理单词（去除标点符号、空格）
 *
 * @param word - 输入单词
 * @returns 清理后的单词
 */
export function cleanWord(word: string): string {
  if (!word || typeof word !== 'string') {
    return ''
  }
  // 去除首尾标点和空格
  return word.trim().replace(/^[^\wÀ-ÿ]+|[^\wÀ-ÿ]+$/g, '')
}

// ============================================
// 验证函数
// ============================================

/**
 * 验证时间字符串格式
 *
 * @param timeStr - 时间字符串
 * @returns 是否有效
 */
export function isValidTimeString(timeStr: string): boolean {
  if (!timeStr || typeof timeStr !== 'string') {
    return false
  }
  return TIME_REGEX.test(timeStr.trim())
}

/**
 * 验证 CEFR 等级
 *
 * @param cefr - CEFR 等级字符串
 * @returns 是否有效
 */
export function isValidCefr(cefr: string): boolean {
  if (!cefr || typeof cefr !== 'string') {
    return false
  }
  const upperCefr = cefr.toUpperCase().trim()
  return CEFR_TO_NUMBER_MAP.hasOwnProperty(upperCefr)
}

/**
 * 验证 URL 格式
 *
 * @param url - URL 字符串
 * @returns 是否有效
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false
  }
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// ============================================
// JSON 解析验证函数
// ============================================

/** 字幕 JSON 验证结果 */
export interface ParsedSubtitleData {
  unit_info: {
    unit_num: number
    theme: string
    start_time: string
    end_time: string
    subtitle_count: number
  }
  subtitles: Array<{
    index: number
    start_time: string
    end_time: string
    french: string
    chinese: string
  }>
}

/** 学习材料 JSON 验证结果 */
export interface ParsedLearningData {
  unit_info: {
    unit_num: number
    theme: string
    start_time: string
    end_time: string
    duration_minutes: number
    cefr_level: string
  }
  language_analysis: {
    vocabulary: Array<{
      french: string
      part_of_speech: string
      ipa: string
      chinese: string
      first_appearance: string
      occurrence_count: number
      cefr_level: string
    }>
    key_expressions: Array<{
      expression: string
      ipa: string
      chinese: string
      cefr_level: string
      grammar_usage: string
      example: {
        french: string
        chinese: string
      }
    }>
  }
  deep_learning: {
    grammar_points: Array<{
      name: string
      structure: string
      example: {
        french: string
        chinese: string
        ipa: string
      }
      purpose: string
      note: string
    }>
    pronunciation: {
      key_sounds: Array<{
        sound: string
        example_words: string[]
        instruction: string
        practice_tip: string
      }>
    }
    vocabulary_network: {
      theme: string
      structure: string
    }
  }
}

/** 验证错误 */
export interface ValidationError {
  field: string
  message: string
}

/**
 * 解析并验证字幕 JSON
 *
 * @param json - 原始 JSON 数据
 * @returns 解析结果或验证错误
 */
export function parseSubtitleJson(json: unknown): { success: true; data: ParsedSubtitleData } | { success: false; errors: ValidationError[] } {
  const errors: ValidationError[] = []

  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    return { success: false, errors: [{ field: 'root', message: '必须是一个有效的 JSON 对象' }] }
  }

  const data = json as Record<string, unknown>

  // 验证 unit_info
  if (!data.unit_info || typeof data.unit_info !== 'object') {
    errors.push({ field: 'unit_info', message: '缺少 unit_info 字段' })
  } else {
    const unitInfo = data.unit_info as Record<string, unknown>
    if (!unitInfo.theme || typeof unitInfo.theme !== 'string') {
      errors.push({ field: 'unit_info.theme', message: '缺少主题(theme)字段' })
    }
    if (!unitInfo.unit_num || typeof unitInfo.unit_num !== 'number') {
      errors.push({ field: 'unit_info.unit_num', message: '缺少单元编号(unit_num)字段' })
    }
  }

  // 验证 subtitles
  if (!Array.isArray(data.subtitles)) {
    errors.push({ field: 'subtitles', message: 'subtitles 必须是数组' })
  } else if (data.subtitles.length === 0) {
    errors.push({ field: 'subtitles', message: 'subtitles 数组不能为空' })
  } else {
    for (let i = 0; i < data.subtitles.length; i++) {
      const sub = data.subtitles[i] as Record<string, unknown>
      if (!sub.french || typeof sub.french !== 'string') {
        errors.push({ field: `subtitles[${i}].french`, message: '缺少法语原文' })
      }
      if (!sub.chinese || typeof sub.chinese !== 'string') {
        errors.push({ field: `subtitles[${i}].chinese`, message: '缺少中文翻译' })
      }
      if (!sub.start_time || !isValidTimeString(sub.start_time as string)) {
        errors.push({ field: `subtitles[${i}].start_time`, message: '开始时间格式无效' })
      }
      if (!sub.end_time || !isValidTimeString(sub.end_time as string)) {
        errors.push({ field: `subtitles[${i}].end_time`, message: '结束时间格式无效' })
      }
    }
  }

  if (errors.length > 0) {
    return { success: false, errors }
  }

  return { success: true, data: data as unknown as ParsedSubtitleData }
}

/**
 * 解析并验证学习材料 JSON
 *
 * @param json - 原始 JSON 数据
 * @returns 解析结果或验证错误
 */
export function parseLearningMaterialJson(json: unknown): { success: true; data: ParsedLearningData } | { success: false; errors: ValidationError[] } {
  const errors: ValidationError[] = []

  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    return { success: false, errors: [{ field: 'root', message: '必须是一个有效的 JSON 对象' }] }
  }

  const data = json as Record<string, unknown>

  // 验证 unit_info
  if (!data.unit_info || typeof data.unit_info !== 'object') {
    errors.push({ field: 'unit_info', message: '缺少 unit_info 字段' })
  } else {
    const unitInfo = data.unit_info as Record<string, unknown>
    if (!unitInfo.cefr_level || typeof unitInfo.cefr_level !== 'string') {
      errors.push({ field: 'unit_info.cefr_level', message: '缺少 CEFR 等级字段' })
    } else if (!isValidCefr(unitInfo.cefr_level as string)) {
      errors.push({ field: 'unit_info.cefr_level', message: 'CEFR 等级无效，必须是 A1-C2' })
    }
  }

  // 验证 language_analysis
  if (!data.language_analysis || typeof data.language_analysis !== 'object') {
    errors.push({ field: 'language_analysis', message: '缺少 language_analysis 字段' })
  } else {
    const langAnalysis = data.language_analysis as Record<string, unknown>

    // 验证 vocabulary 数组
    if (!Array.isArray(langAnalysis.vocabulary)) {
      errors.push({ field: 'language_analysis.vocabulary', message: 'vocabulary 必须是数组' })
    } else {
      for (let i = 0; i < langAnalysis.vocabulary.length; i++) {
        const vocab = langAnalysis.vocabulary[i] as Record<string, unknown>
        if (!vocab.french || typeof vocab.french !== 'string') {
          errors.push({ field: `language_analysis.vocabulary[${i}].french`, message: '缺少法语单词' })
        }
        if (!vocab.chinese || typeof vocab.chinese !== 'string') {
          errors.push({ field: `language_analysis.vocabulary[${i}].chinese`, message: '缺少中文释义' })
        }
      }
    }
  }

  if (errors.length > 0) {
    return { success: false, errors }
  }

  return { success: true, data: data as unknown as ParsedLearningData }
}
