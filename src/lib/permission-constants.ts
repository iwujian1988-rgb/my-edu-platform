/**
 * Permission Constants
 *
 * Shared constants for permission types (can be imported in both client and server code)
 */

export const FEATURE_PERMISSIONS = {
  MATCH_GAME: 'match_game', // 连连看游戏
  FLASHCARDS: 'flashcard', // 单词卡片（注意：与数据库保持一致，用单数）
  DICTATION: 'dictation', // 听写练习
  SPELLING_CHECK: 'spelling_check', // 拼写检查
  AI_FEATURES: 'ai_features', // AI功能
  CUSTOM_BOOKS: 'custom_book', // 自定义词库（注意：与数据库保持一致，用单数）
  EXPORT_DATA: 'export_data', // 数据导出
  STUDY_STATS: 'study_stats', // 学习统计
  MISTAKE_BOOK: 'mistake_book', // 错题本
  STUDY_CALENDAR: 'study_calendar', // 学习日历
} as const

export type FeaturePermission = (typeof FEATURE_PERMISSIONS)[keyof typeof FEATURE_PERMISSIONS]
