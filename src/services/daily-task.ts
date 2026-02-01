/**
 * 每日任务相关服务
 *
 * 处理每日任务的单词数据获取和转换
 */

import { getTodayTask } from '@/services/learning-plan'
import type { TodayTaskResponse } from '@/types/learning-plan'

/**
 * Flashcards 页面期望的 Word 类型
 */
export interface FlashcardWord {
  id: string
  word: string
  phonetic: string
  uk_phonetic?: string
  us_phonetic?: string
  definition: string
  definition_en: string
  collocation: string
  collocation_en: string
  example_sentence: string
  example_sentence_en: string
  part_of_speech: string
  audio_url?: string | null
  // ✅ 添加：区分新学/复习的字段
  type?: 'new' | 'review'
  tags?: string[]  // 可选：显示用标签（中文）
}

/**
 * 获取今日任务的单词列表（转换为 Flashcards 格式）
 *
 * @param bookId 单词书 ID
 * @returns Flashcards 格式的单词列表
 */
export async function getTodayTaskWords(bookId: string): Promise<{
  words: FlashcardWord[]
  taskId: string
  planId: string
}> {
  try {
    // 调用后端 API 获取今日任务（包含完整单词详情）
    const response = await getTodayTask(bookId)

    if (!response.success || !response.data) {
      throw new Error(response.error || '获取今日任务失败')
    }

    const task = response.data

    // 合并新词和复习词
    const allWords = [...task.new_words, ...task.review_words]

    // 转换为 Flashcards 期望的格式
    const flashcardWords: FlashcardWord[] = allWords.map(wordWithStatus => ({
      id: wordWithStatus.id,
      word: wordWithStatus.word,
      phonetic: wordWithStatus.phonetic || '',
      uk_phonetic: wordWithStatus.uk_phonetic || '',
      us_phonetic: wordWithStatus.us_phonetic || '',
      // 字段映射：meaning -> definition
      definition: wordWithStatus.meaning || wordWithStatus.definition || '',
      definition_en: wordWithStatus.definition_en || '',
      collocation: wordWithStatus.collocation || '',
      collocation_en: wordWithStatus.collocation_en || '',
      // 字段映射：example -> example_sentence
      example_sentence: wordWithStatus.example || wordWithStatus.example_sentence || '',
      example_sentence_en: wordWithStatus.example_sentence_en || '',
      part_of_speech: wordWithStatus.part_of_speech || 'n.',
      audio_url: wordWithStatus.audio_url || null,
      // ✅ 保留：type 字段（new/review）
      type: wordWithStatus.type,
      // ✅ 添加：中文标签（便于 UI 显示）
      tags: [wordWithStatus.type === 'new' ? '新学' : '复习']
    }))

    return {
      words: flashcardWords,
      taskId: task.id,
      planId: task.plan_id
    }
  } catch (error: any) {
    console.error('Failed to get today task words:', error)
    throw error
  }
}

/**
 * 将 WordWithStatus 转换为 FlashcardWord
 *
 * @param wordWithStatus 学习计划中的单词对象
 * @returns Flashcards 期望的单词格式
 */
export function convertToFlashcardWord(wordWithStatus: any): FlashcardWord {
  return {
    id: wordWithStatus.id,
    word: wordWithStatus.word,
    phonetic: wordWithStatus.phonetic || '',
    uk_phonetic: wordWithStatus.uk_phonetic || '',
    us_phonetic: wordWithStatus.us_phonetic || '',
    // 字段映射
    definition: wordWithStatus.meaning || wordWithStatus.definition || '',
    definition_en: wordWithStatus.definition_en || '',
    collocation: wordWithStatus.collocation || '',
    collocation_en: wordWithStatus.collocation_en || '',
    example_sentence: wordWithStatus.example || wordWithStatus.example_sentence || '',
    example_sentence_en: wordWithStatus.example_sentence_en || '',
    part_of_speech: wordWithStatus.part_of_speech || 'n.',
    audio_url: wordWithStatus.audio_url || null
  }
}
