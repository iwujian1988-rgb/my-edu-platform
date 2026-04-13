/**
 * Simple Format 学习资料格式 - 检测与规范化
 *
 * 将新的扁平 JSON 格式（topic/vocabulary/grammar_points/exercises）
 * 转换为现有的 LearningMaterialJsonInput 结构，
 * 保持与旧格式完全兼容，旧格式逻辑不受影响。
 *
 * @module lib/batch-upload/simple-format
 */

import type {
  SimpleFormatJsonInput,
  SimpleFormatExercise,
  LearningMaterialJsonInput,
} from '@/types/video'

// ============================================
// 格式检测
// ============================================

/**
 * 判断 JSON 是否为 simple format
 *
 * 特征：顶层有 topic + vocabulary（数组），且没有 unit_info + language_analysis
 * 与旧格式完全不相交
 */
export function isSimpleFormat(json: unknown): json is SimpleFormatJsonInput {
  if (typeof json !== 'object' || json === null) return false
  const obj = json as Record<string, unknown>
  return (
    typeof obj.topic === 'string' &&
    obj.topic.length > 0 &&
    Array.isArray(obj.vocabulary) &&
    obj.unit_info === undefined &&
    obj.language_analysis === undefined
  )
}

// ============================================
// 格式转换
// ============================================

/** 中文练习类型 → 系统 exercise_type 映射 */
const EXERCISE_TYPE_MAP: Record<string, string> = {
  '填空': 'fill_blank',
  '选择': 'multiple_choice',
  '翻译': 'translation',
  '语法': 'grammar_drill',
}

/** 将 simple format 转换为内部 LearningMaterialJsonInput + 提取新类型练习 */
export function normalizeSimpleFormat(json: SimpleFormatJsonInput): {
  learningJson: LearningMaterialJsonInput
  simpleExercises: SimpleFormatExercise[]
} {
  const fillBlankExercises: SimpleFormatExercise[] = []
  const simpleExercises: SimpleFormatExercise[] = []

  for (const ex of json.exercises || []) {
    const systemType = EXERCISE_TYPE_MAP[ex.type]
    if (systemType === 'fill_blank') {
      fillBlankExercises.push(ex)
    } else if (systemType) {
      // 选择/翻译/语法 → 单独处理
      simpleExercises.push(ex)
    }
  }

  // 从 _meta 时间计算 duration_minutes
  const startSeconds = timeToSeconds(json._meta.start)
  const endSeconds = timeToSeconds(json._meta.end)
  const durationMinutes = Math.max(0, (endSeconds - startSeconds) / 60)

  const learningJson: LearningMaterialJsonInput = {
    unit_info: {
      unit_num: 1,
      theme: json.topic,
      start_time: json._meta.start,
      end_time: json._meta.end,
      duration_minutes: Math.round(durationMinutes * 100) / 100,
      cefr_level: json.difficulty,
    },
    language_analysis: {
      vocabulary: (json.vocabulary || []).map(v => ({
        french: v.word,
        part_of_speech: v.pos,
        ipa: '',
        chinese: v.meaning,
        first_appearance: '',
        occurrence_count: 1,
        cefr_level: json.difficulty,
        example_sentence: v.example
          ? { french: v.example, chinese: v.example_translation || '' }
          : undefined,
      })),
      key_expressions: [],
    },
    deep_learning: {
      grammar_points: (json.grammar_points || []).map(gp => ({
        name: gp.point,
        structure: '',
        example: gp.example_from_text
          ? { french: gp.example_from_text, chinese: gp.example_translation || '', ipa: '' }
          : { french: '', chinese: '', ipa: '' },
        purpose: gp.explanation,
        note: '',
      })),
      pronunciation: { key_sounds: [] },
      vocabulary_network: {
        theme: '',
        structure: '',
      },
    },
    practice: {
      vocabulary_exercises: fillBlankExercises.map(ex => ({
        word: '',
        sentence: ex.question,
        answer: ex.answer,
        hint: '',
      })),
    },
  }

  return { learningJson, simpleExercises }
}

// ============================================
// 工具函数
// ============================================

/** "HH:MM:SS.mmm" → 秒数 */
function timeToSeconds(timeStr: string): number {
  if (!timeStr) return 0
  const parts = timeStr.split(':')
  if (parts.length < 3) return 0
  const hours = Number(parts[0]) || 0
  const minutes = Number(parts[1]) || 0
  const seconds = Number(parts[2]) || 0
  return hours * 3600 + minutes * 60 + seconds
}

/** 获取系统 exercise_type（供 video-processor 使用） */
export function mapExerciseType(chineseType: string): string | null {
  return EXERCISE_TYPE_MAP[chineseType] || null
}
