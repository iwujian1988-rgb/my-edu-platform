/**
 * 合并格式 JSON 转换模块
 *
 * 处理新格式的合并 JSON（单文件包含多 unit），
 * 将其转换为现有的 SubtitleJsonInput + LearningMaterialJsonInput 格式，
 * 并提取旧格式不支持的额外数据（liaison, intonation, sentence_patterns, scenario）。
 *
 * @module lib/batch-upload/merged-format
 */

import type {
  MergedBatchUploadJson,
  MergedUnitInput,
  MergedSubtitleInput,
  MergedVocabularyInput,
  MergedGrammarPointInput,
  MergedPronunciationInput,
  SubtitleJsonInput,
  LearningMaterialJsonInput,
} from '@/types/video'
import type { MergedFormatExtras } from './video-processor'

// ============================================
// 类型定义
// ============================================

/** practice.exercises 中的练习项（选择、翻译、语法） */
export interface SimpleFormatExercise {
  type: string           // '选择' | '翻译' | '语法'
  question: string       // 题目
  answer: string         // 答案
  explanation?: string   // 解析
  source_ids?: number[]  // 来源字幕ID
  difficulty?: string    // 难度
  options?: Record<string, string>  // 选择题选项 {A: "...", B: "..."}
}

// ============================================
// 格式检测与校验
// ============================================

/** 检测 JSON 是否为合并格式（有 materials key） */
export function isMergedFormat(json: unknown): json is MergedBatchUploadJson {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return false
  const obj = json as Record<string, unknown>
  return !!obj.materials && typeof obj.materials === 'object' && !Array.isArray(obj.materials)
}

/** 校验合并 JSON 结构完整性 */
export function validateMergedJson(json: MergedBatchUploadJson): string[] {
  const errors: string[] = []

  if (!json.materials || typeof json.materials !== 'object') {
    errors.push('缺少 "materials" 对象')
    return errors
  }

  const unitKeys = Object.keys(json.materials)
  if (unitKeys.length === 0) {
    errors.push('"materials" 为空，至少需要一个 unit')
  }

  for (const key of unitKeys) {
    const unit = json.materials[key]
    if (!unit) {
      errors.push(`materials.${key}: 数据为空`)
      continue
    }
    if (!unit.unit_info) {
      errors.push(`materials.${key}: 缺少 unit_info`)
    } else if (!unit.unit_info.theme) {
      errors.push(`materials.${key}: 缺少 unit_info.theme`)
    }
  }

  return errors
}

/** 提取排序后的 unit keys (unit_1, unit_2, ...) */
export function getSortedUnitKeys(materials: Record<string, MergedUnitInput>): string[] {
  return Object.keys(materials).sort((a, b) => {
    const numA = parseInt(a.replace('unit_', ''), 10) || 0
    const numB = parseInt(b.replace('unit_', ''), 10) || 0
    return numA - numB
  })
}

// ============================================
// 格式转换
// ============================================

/** 将合并格式字幕的 `id` 字段映射为现有格式的 `index` */
function normalizeSubtitles(
  subs: MergedSubtitleInput[] | undefined
): SubtitleJsonInput['subtitles'] {
  if (!subs || !Array.isArray(subs)) return []
  return subs.map(sub => ({
    index: sub.id ?? 0,
    start_time: sub.start_time,
    end_time: sub.end_time,
    french: sub.french,
    chinese: sub.chinese,
  }))
}

/** 词汇：保留 source_ids 和 examples 数组，完整保留原始数据 */
function normalizeVocabulary(
  vocab: MergedVocabularyInput[] | undefined
): LearningMaterialJsonInput['language_analysis']['vocabulary'] {
  if (!vocab || !Array.isArray(vocab)) return []
  return vocab.map(v => ({
    french: v.french,
    part_of_speech: v.part_of_speech,
    ipa: v.ipa,
    chinese: v.chinese,
    first_appearance: v.first_appearance || '',
    occurrence_count: v.occurrence_count || 0,
    cefr_level: v.cefr_level,
    source_ids: v.source_ids || [],
    examples: v.examples || [],
    // 新增：保留原始的 example_sentence，确保词典缺失时数据不丢失
    example_sentence: v.example_sentence || undefined,
  }))
}

/** 语法点：explanation/usage_note 已由现有 fallback 兼容，保持原样 */
function normalizeGrammarPoints(
  gps: MergedGrammarPointInput[] | undefined
): LearningMaterialJsonInput['deep_learning']['grammar_points'] {
  if (!gps || !Array.isArray(gps)) return []
  return gps.map(gp => ({
    name: gp.name,
    structure: gp.structure || '',
    example: gp.example
      ? { french: gp.example.french, chinese: gp.example.chinese, ipa: gp.example.ipa || '' }
      : { french: '', chinese: '', ipa: '' },
    purpose: gp.purpose || gp.explanation || '',
    note: gp.note || gp.usage_note || '',
  }))
}

/** 发音：提取 key_sounds + 额外的 liaison/intonation */
function normalizePronunciation(
  pron: MergedPronunciationInput | undefined
): {
  key_sounds: LearningMaterialJsonInput['deep_learning']['pronunciation']['key_sounds']
  liaison: string[] | null
  intonation: string | null
} {
  if (!pron) {
    return { key_sounds: [], liaison: null, intonation: null }
  }

  const key_sounds = (pron.key_sounds || []).map(ks => ({
    sound: ks.sound,
    example_words: ks.example_words || ks.examples || [],
    instruction: ks.instruction || ks.description || '',
    practice_tip: ks.practice_tip || '',
  }))

  return {
    key_sounds,
    liaison: pron.liaison?.length ? pron.liaison : null,
    intonation: pron.intonation || null,
  }
}

/**
 * 将合并格式的单个 unit 转换为现有格式的字幕 + 学习材料对
 *
 * 返回三部分：
 * - subtitleJson: 供 processSingleVideo 消费
 * - learningJson: 供 processSingleVideo 消费
 * - extras: 合并格式独有的额外数据（需 processSingleVideoWithExtras 处理）
 */
export function normalizeMergedUnit(unit: MergedUnitInput, channel?: string): {
  subtitleJson: SubtitleJsonInput
  learningJson: LearningMaterialJsonInput
  extras: MergedFormatExtras
  simpleExercises: SimpleFormatExercise[]  // 新增：返回其他类型的练习
} {
  const subs = normalizeSubtitles(unit.subtitles)
  const vocabulary = normalizeVocabulary(unit.language_analysis?.vocabulary)
  const grammarPoints = normalizeGrammarPoints(unit.deep_learning?.grammar_points)
  const pronResult = normalizePronunciation(unit.deep_learning?.pronunciation)
  const vocabNetwork = unit.deep_learning?.vocabulary_network

  // 提取 practice.exercises 中的非填空练习（选择、翻译、语法）
  const simpleExercises: SimpleFormatExercise[] = []
  if (unit.practice?.exercises && Array.isArray(unit.practice.exercises)) {
    unit.practice.exercises.forEach(ex => {
      if (ex.type !== '填空') {
        simpleExercises.push({
          type: ex.type,
          question: ex.question,
          answer: ex.answer,
          explanation: ex.explanation,
          source_ids: ex.source_ids || [],
          difficulty: ex.difficulty,
          options: ex.options,  // 选择题的选项
        })
      }
    })
  }

  // 合并格式的 channel 作为 creator（优先级高于 unit 内的 creator）
  const effectiveCreator = channel || unit.unit_info.creator

  const subtitleJson: SubtitleJsonInput = {
    unit_info: {
      unit_num: unit.unit_info.unit_num,
      theme: unit.unit_info.theme,
      start_time: unit.unit_info.start_time,
      end_time: unit.unit_info.end_time,
      subtitle_count: unit.unit_info.subtitle_count || subs.length,
      creator: effectiveCreator,
      creator_id: unit.unit_info.creator_id,  // 传递 creator_id
      video_title_cn: unit.unit_info.video_title_cn,
      unit_name_cn: unit.unit_info.unit_name_cn,
      source_video_name: unit.unit_info.source_video_name,
      cover_url: unit.unit_info.cover_url,
      tags: unit.unit_info.tags,
    },
    subtitles: subs,
  }

  const learningJson: LearningMaterialJsonInput = {
    unit_info: {
      unit_num: unit.unit_info.unit_num,
      theme: unit.unit_info.theme,
      start_time: unit.unit_info.start_time,
      end_time: unit.unit_info.end_time,
      duration_minutes: unit.unit_info.duration_minutes || 0,
      cefr_level: unit.unit_info.cefr_level || 'A2',
    },
    language_analysis: {
      vocabulary,
      key_expressions: (unit.language_analysis?.key_expressions || []).map(ke => ({
        expression: ke.expression,
        ipa: ke.ipa || '',
        chinese: ke.chinese || '',
        cefr_level: ke.cefr_level || 'A2',
        grammar_usage: ke.grammar_usage || ke.usage_note || '',
        example: ke.example || { french: '', chinese: '' },
      })),
    },
    deep_learning: {
      grammar_points: grammarPoints,
      pronunciation: { key_sounds: pronResult.key_sounds },
      vocabulary_network: vocabNetwork ? {
        theme: vocabNetwork.theme || '',
        structure: vocabNetwork.structure || '',
        related_words: vocabNetwork.related_words,
        collocations: vocabNetwork.collocations,
        related_groups: vocabNetwork.related_groups,
      } : { theme: '', structure: '' },
    },
    practice: unit.practice ? {
      vocabulary_exercises: (() => {
        // 兼容两种格式：
        // 1. practice.vocabulary_exercises (旧格式)
        // 2. practice.exercises (新格式，需要过滤 type="填空")
        if (unit.practice.vocabulary_exercises) {
          return unit.practice.vocabulary_exercises.map(ve => ({
            word: ve.word || '',
            sentence: ve.sentence || ve.question || '',
            answer: ve.answer,
            hint: ve.hint || '',
          }))
        }

        // 从 practice.exercises 中提取填空练习
        if (unit.practice.exercises && Array.isArray(unit.practice.exercises)) {
          return unit.practice.exercises
            .filter(ex => ex.type === '填空')
            .map(ex => ({
              word: '',
              sentence: ex.question || '',
              answer: ex.answer || '',
              hint: '',
            }))
        }

        return []
      })(),
    } : undefined,
  }

  return {
    subtitleJson,
    learningJson,
    extras: {
      liaison: pronResult.liaison,
      intonation: pronResult.intonation,
      coreWord: vocabNetwork?.core_word || null,
      sentencePatterns: unit.practice?.sentence_patterns || [],
      scenario: unit.practice?.scenario || null,
    },
    simpleExercises,
  }
}
