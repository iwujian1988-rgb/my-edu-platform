/**
 * 合并格式批量上传 API
 *
 * 处理新格式的合并 JSON（单文件包含多 unit），
 * 每个 unit 创建一个独立的视频记录。
 *
 * 同时支持新格式学习资料（topic/vocabulary/grammar_points/exercises）
 *
 * @module api/admin/videos/merged-batch-upload
 */

export const maxDuration = 60

// ============================================
// 新格式到合并格式的自动转换
// ============================================

interface NewFormatLearning {
  topic?: string
  difficulty?: string
  summary?: string
  corrected_transcript?: string
  zh_translation?: string
  vocabulary?: Array<{
    word: string
    pos?: string
    meaning: string
    example: string
    example_translation: string
  }>
  grammar_points?: Array<{
    point: string
    explanation: string
    example_from_text: string
    example_translation: string
  }>
  exercises?: Array<{
    type: string
    question: string
    answer: string
    explanation?: string
    options?: Record<string, string>
    blanks?: Array<{
      start: number
      end: number
      word: string
    }>
    difficulty?: string
  }>
  _meta?: {
    video_id?: string
    duration_seconds?: number
    channel_name?: string
  }
}

/**
 * 自动检测并转换新格式为merged格式
 */
function convertNewFormatToMerged(newFormat: NewFormatLearning): any {
  const meta = newFormat._meta || {}

  // 转换词汇
  const adaptedVocabulary = (newFormat.vocabulary || []).map(vocab => ({
    french: vocab.word,
    part_of_speech: vocab.pos || 'n.',
    ipa: '', // 新格式没有音标，后续可以从词典获取
    chinese: vocab.meaning,
    example_sentence: {
      french: vocab.example,
      chinese: vocab.example_translation
    },
    cefr_level: newFormat.difficulty || 'B1',
    source_ids: [],
    occurrence_count: 1
  }))

  // 转换语法点
  const adaptedGrammarPoints = (newFormat.grammar_points || []).map(gp => ({
    name: gp.point,
    structure: '',
    example: {
      french: gp.example_from_text,
      chinese: gp.example_translation,
      ipa: ''
    },
    purpose: '',
    note: gp.explanation
  }))

  // 转换练习
  const adaptedExercises = []
  for (const ex of (newFormat.exercises || [])) {
    if (ex.type === '填空') {
      adaptedExercises.push({
        type: '填空',
        question: ex.question,
        answer: ex.answer,
        explanation: ex.explanation,
        blanks: ex.blanks || [],
        difficulty: ex.difficulty || newFormat.difficulty || 'B1'
      })
    } else if (ex.type === '选择') {
      adaptedExercises.push({
        type: '选择',
        question: ex.question,
        answer: ex.answer,
        explanation: ex.explanation,
        options: ex.options || {},
        difficulty: ex.difficulty || newFormat.difficulty || 'B1'
      })
    } else {
      adaptedExercises.push(ex)
    }
  }

  // 转换字幕（简单分段）
  const subtitles = convertTranscriptToSubtitles(
    newFormat.corrected_transcript || '',
    newFormat.zh_translation || '',
    meta.duration_seconds || 0
  )

  // 构建merged格式
  return {
    channel: meta.channel_name || 'Unknown Channel',
    video_name: newFormat.topic || meta.video_id || 'Unknown Video',
    materials: {
      unit_1: {
        unit_info: {
          unit_num: 1,
          theme: newFormat.topic || '',
          video_title_cn: newFormat.topic || '',
          unit_name_cn: newFormat.topic || '',
          start_time: '00:00:00',
          end_time: formatTime(meta.duration_seconds || 0),
          duration_minutes: Math.floor((meta.duration_seconds || 0) / 60),
          cefr_level: newFormat.difficulty || 'B1',
          creator: meta.channel_name || 'Unknown',
          cover_url: null,
          tags: []
        },
        subtitles: subtitles,
        language_analysis: {
          vocabulary: adaptedVocabulary,
          key_expressions: []
        },
        deep_learning: {
          grammar_points: adaptedGrammarPoints,
          pronunciation: { key_sounds: [] }
        },
        practice: {
          exercises: adaptedExercises
        }
      }
    }
  }
}

/**
 * 转换文本为字幕格式
 */
function convertTranscriptToSubtitles(transcript: string, translation: string, duration: number) {
  if (!transcript) return []

  const sentences = transcript.match(/[^.!?]+[.!?]+/g) || []
  const translations = translation.match(/[^.!?]+[.!?]+/g) || []

  const subtitles = []
  let currentTime = 0
  const avgTimePerSentence = duration / Math.max(sentences.length, 1)

  sentences.forEach((sentence, index) => {
    const endTime = Math.min(currentTime + avgTimePerSentence, duration)

    subtitles.push({
      id: index + 1,
      start_time: formatTime(currentTime),
      end_time: formatTime(endTime),
      french: sentence.trim(),
      chinese: (translations[index] || '').trim()
    })

    currentTime = endTime + 0.5
  })

  return subtitles
}

/**
 * 格式化时间为 HH:MM:SS
 */
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

import { createAdminClient } from '@/lib/supabase/server'
import { checkAdminForAPI } from '@/lib/admin-auth'
import { NextResponse } from 'next/server'
import {
  validateMergedJson,
  getSortedUnitKeys,
  normalizeMergedUnit,
} from '@/lib/batch-upload/merged-format'
import { processSingleVideoWithExtras } from '@/lib/batch-upload/video-processor'
import type {
  MergedBatchUploadRequest,
  MergedBatchUploadResponse,
  BatchUploadResult,
} from '@/types/video'

export async function POST(request: Request) {
  try {
    // Step 1: 鉴权（支持apikey）
    const apiKey = request.headers.get('apikey')
    let isAdmin = false

    if (apiKey === process.env.SUPABASE_SERVICE_ROLE_KEY) {
      isAdmin = true
    } else {
      const adminCheck = await checkAdminForAPI()
      if (!adminCheck.success) {
        return NextResponse.json(
          { error: adminCheck.error || '未授权', code: adminCheck.code },
          { status: adminCheck.status || 401 }
        )
      }
    }

    // Step 2: 解析请求
    const body: MergedBatchUploadRequest = await request.json().catch(() => ({}))
    const { merged_json, video_url, video_urls } = body

    if (!merged_json) {
      return NextResponse.json(
        { error: '缺少 merged_json', code: 'INVALID_REQUEST' },
        { status: 400 }
      )
    }

    // Step 2.5: 自动检测并转换新格式
    let processedJson = merged_json
    if (!merged_json.materials && merged_json.vocabulary) {
      // 检测到新格式（有vocabulary但无materials），自动转换
      console.log('[格式检测] 检测到新格式学习资料，自动转换为merged格式')
      processedJson = convertNewFormatToMerged(merged_json)
    }

    // Step 3: 校验结构
    const validationErrors = validateMergedJson(processedJson)
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: validationErrors.join('; '), code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()
    // 类型转换以匹配 processSingleVideo 的参数类型
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typedSupabase = supabase as any
    const unitKeys = getSortedUnitKeys(processedJson.materials)

    // 限制最多 10 个 unit
    const MAX_UNITS = 10
    if (unitKeys.length > MAX_UNITS) {
      return NextResponse.json(
        { error: `单次最多上传 ${MAX_UNITS} 个单元`, code: 'BATCH_SIZE_EXCEEDED' },
        { status: 400 }
      )
    }

    const results: BatchUploadResult[] = []
    const errors: Array<{ unit_key: string; index: number; error: string }> = []

    // Step 4: 并发处理（限 3 并发）
    const CONCURRENCY_LIMIT = 3

    for (let batchStart = 0; batchStart < unitKeys.length; batchStart += CONCURRENCY_LIMIT) {
      const batch = unitKeys.slice(batchStart, batchStart + CONCURRENCY_LIMIT)
      const batchPromises = batch.map((unitKey, j) => {
        const idx = batchStart + j
        const unit = merged_json.materials[unitKey]
        const unitVideoUrl = video_urls?.[unitKey] || video_url || ''

        return (async () => {
          try {
            const { subtitleJson, learningJson, extras, simpleExercises } = normalizeMergedUnit(
              unit,
              processedJson.channel,
              processedJson.video_name  // 传递顶层的 video_name
            )
            const result = await processSingleVideoWithExtras(
              typedSupabase,
              {
                subtitle_json: subtitleJson,
                learning_material_json: learningJson,
                video_url: unitVideoUrl,
                simple_exercises: simpleExercises,  // 传递其他类型的练习
              },
              idx,
              extras
            )
            results.push(result)
            console.log(`[merged-batch] Unit ${unitKey} (${idx + 1}/${unitKeys.length}) OK: ${result.title}`)
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error)
            errors.push({ unit_key: unitKey, index: idx, error: msg })
            console.error(`[merged-batch] Unit ${unitKey} (${idx + 1}/${unitKeys.length}) FAILED:`, msg)
          }
        })()
      })
      await Promise.all(batchPromises)
    }

    // Step 5: 返回结果
    return NextResponse.json({
      success: results.length > 0,
      data: {
        created_count: results.length,
        videos: results,
        errors: errors.length > 0 ? errors : undefined,
      },
    } as MergedBatchUploadResponse)

  } catch (error) {
    console.error('[merged-batch] 服务器错误:', error)
    return NextResponse.json(
      {
        error: '服务器错误',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
