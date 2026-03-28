/**
 * 批量上传视频 API
 *
 * 对应 PRD: VIDEO_BATCH_UPLOAD_PRD.md v1.2 Section 3
 * 对应 Tech: VIDEO_BATCH_UPLOAD_TECH.md v1.0 Phase 4
 *
 * 处理流程:
 * 1. 验证管理员权限
 * 2. 解析字幕 JSON 和学习材料 JSON
 * 3. 创建视频记录
 * 4. 存储字幕数据
 * 5. 调用词典服务处理单词
 * 6. 存储地道表达
 * 7. 存储语法点、发音要点、词汇网络
 * 8. 更新工作流状态
 *
 * @module api/admin/videos/batch-upload
 */

export const maxDuration = 60

import { createAdminClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { checkAdminForAPI } from '@/lib/admin-auth'
import { completeStep } from '@/lib/workflow-helper'
import { lookupBatch } from '@/lib/dictionary'
import { NextResponse } from 'next/server'
import {
  timeStringToSeconds,
  cefrToDifficulty,
  cefrToNumber,
  findWordInSubtitles,
  findExpressionInSubtitles,
  extractExpressionFromSubtitle,
  uniqueArray,
  cleanWord,
  isValidUrl,
} from '@/lib/batch-upload/utils'
import type {
  BatchUploadRequest,
  BatchUploadResponse,
  BatchUploadResult,
  BatchUploadVideoItem,
  VideoStatus,
} from '@/types/video'

// ============================================
// 类型定义
// ============================================

/** 字幕数据结构 */
interface SubtitleInput {
  index: number
  start_time: string
  end_time: string
  french: string
  chinese: string
}

/** 单词数据结构 */
interface VocabularyInput {
  french: string
  part_of_speech: string
  ipa: string
  chinese: string
  first_appearance: string
  occurrence_count: number
  cefr_level: string
}

/** 表达数据结构 */
interface ExpressionInput {
  expression: string
  ipa: string
  chinese: string
  cefr_level: string
  grammar_usage: string
  example: {
    french: string
    chinese: string
  }
}

/** 语法点数据结构 */
interface GrammarPointInput {
  name: string
  structure: string
  example: {
    french: string
    chinese: string
    ipa: string
  }
  purpose: string
  note: string
}

/** 发音要点数据结构 */
interface PronunciationInput {
  sound: string
  example_words: string[]
  instruction: string
  practice_tip: string
}

/** 填空练习数据结构 */
interface VocabularyExerciseInput {
  word: string
  sentence: string
  answer: string
  hint: string
}

// ============================================
// 主处理函数
// ============================================

export async function POST(request: Request) {
  try {
    // Step 1: 验证管理员权限
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error || '未授权', code: adminCheck.code },
        { status: adminCheck.status || 401 }
      )
    }

    // Step 2: 解析请求体
    const body: BatchUploadRequest = await request.json().catch(() => ({ videos: [] }))
    const { videos } = body

    if (!videos || !Array.isArray(videos) || videos.length === 0) {
      return NextResponse.json(
        { error: '请提供至少一个视频', code: 'INVALID_REQUEST' },
        { status: 400 }
      )
    }

    // 限制单次上传数量
    const MAX_BATCH_SIZE = 10
    if (videos.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `单次最多上传 ${MAX_BATCH_SIZE} 个视频`, code: 'BATCH_SIZE_EXCEEDED' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()
    const results: BatchUploadResult[] = []
    const errors: Array<{ index: number; error: string }> = []

    // Step 3: 串行处理每个视频（避免资源竞争）
    for (let i = 0; i < videos.length; i++) {
      try {
        const item = videos[i]
        const result = await processSingleVideo(supabase, item, i)
        results.push(result)
        console.log(`[批量上传] 视频 ${i + 1}/${videos.length} 处理成功: ${result.title}`)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        errors.push({ index: i, error: errorMsg })
        console.error(`[批量上传] 视频 ${i + 1}/${videos.length} 处理失败:`, errorMsg)
      }
    }

    // Step 4: 返回结果
    return NextResponse.json({
      success: results.length > 0,
      data: {
        created_count: results.length,
        videos: results,
        errors: errors.length > 0 ? errors : undefined,
      },
    } as BatchUploadResponse)

  } catch (error) {
    console.error('[批量上传] 服务器错误:', error)
    return NextResponse.json(
      {
        error: '服务器错误',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// ============================================
// 单视频处理函数
// ============================================

/**
 * 回滚视频及其关联数据
 *
 * 当上传过程中发生错误时，删除已创建的视频记录及其所有关联数据
 * 利用数据库的 ON DELETE CASCADE 级联删除
 */
async function rollbackVideo(
  supabase: SupabaseClient<any>,
  videoId: string
): Promise<void> {
  try {
    // 由于数据库设置了 ON DELETE CASCADE，删除视频会自动删除所有关联数据
    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', videoId)

    if (error) {
      console.error(`[批量上传] 回滚失败 videoId=${videoId}:`, error)
    } else {
      console.log(`[批量上传] 回滚成功 videoId=${videoId}`)
    }
  } catch (err) {
    console.error(`[批量上传] 回滚异常 videoId=${videoId}:`, err)
  }
}

/**
 * 处理单个视频上传
 *
 * 实现事务语义：任何步骤失败都会回滚已创建的数据
 */
async function processSingleVideo(
  supabase: SupabaseClient<any>,
  item: BatchUploadVideoItem,
  index: number
): Promise<BatchUploadResult> {
  const { subtitle_json, learning_material_json, video_url } = item

  // Step 1: 验证必要字段
  if (!subtitle_json?.unit_info?.theme) {
    throw new Error('缺少字幕 unit_info.theme')
  }
  if (!subtitle_json?.subtitles?.length) {
    throw new Error('缺少字幕数据')
  }
  if (!learning_material_json?.unit_info) {
    throw new Error('缺少学习材料 unit_info')
  }

  const unitInfo = subtitle_json.unit_info
  const learningInfo = learning_material_json.unit_info

  // Step 2: 匹配 UP主（如果提供了 creator 字段）
  let creatorId: string | null = null
  const creatorName = unitInfo.creator?.trim()
  if (creatorName) {
    const { data: creator } = await supabase
      .from('upstream_creators')
      .select('id')
      .eq('name', creatorName)
      .maybeSingle()

    if (creator) {
      creatorId = creator.id
      console.log(`[批量上传] 匹配到UP主: ${creatorName} -> ${creatorId}`)
    } else {
      console.log(`[批量上传] 未找到UP主: ${creatorName}，将不关联UP主`)
    }
  }

  // Step 3: 创建视频记录
  const videoUrl = video_url?.trim() || null
  if (videoUrl && !isValidUrl(videoUrl)) {
    throw new Error('视频 URL 格式无效')
  }

  const { data: video, error: videoError } = await supabase
    .from('videos')
    .insert({
      title: unitInfo.theme,
      language: 'fr',
      difficulty: cefrToDifficulty(learningInfo.cefr_level),
      duration: Math.round((learningInfo.duration_minutes || 0) * 60),
      video_url: videoUrl,
      status: 'draft',
      creator_id: creatorId,
      creator_name: creatorName || null,
    })
    .select()
    .single()

  if (videoError || !video) {
    throw new Error(`创建视频失败: ${videoError?.message}`)
  }

  const videoId = video.id
  console.log(`[批量上传] 创建视频成功: ${videoId}`)

  // 使用 try-catch 包装后续操作，失败时回滚
  try {

  // Step 4: 存储字幕
  const subtitlesData = subtitle_json.subtitles.map((sub: SubtitleInput, idx: number) => ({
    video_id: videoId,
    start_time: timeStringToSeconds(sub.start_time),
    end_time: timeStringToSeconds(sub.end_time),
    original_text: sub.french,
    chinese_text: sub.chinese,
    word_count: sub.french ? sub.french.split(/\s+/).filter(Boolean).length : 0,
    display_order: idx,
  }))

  const { error: subtitlesError } = await supabase
    .from('video_subtitles')
    .insert(subtitlesData)

  if (subtitlesError) {
    throw new Error(`存储字幕失败: ${subtitlesError.message}`)
  }

  console.log(`[批量上传] 存储字幕成功: ${subtitlesData.length} 条`)

  // 获取字幕用于例句匹配（包含 start_time 用于 [📍] 跳转播放）
  const { data: savedSubtitles } = await supabase
    .from('video_subtitles')
    .select('original_text, chinese_text, start_time, end_time')
    .eq('video_id', videoId)
    .order('display_order')

  // Step 5: 处理单词
  const vocabulary = learning_material_json.language_analysis?.vocabulary || []
  let wordsCount = 0

  if (vocabulary.length > 0) {
    // 去重
    const uniqueWords = uniqueArray(
      vocabulary.map((v: VocabularyInput) => ({
        word: cleanWord(v.french),
        original: v,
      })).filter((v: { word: string; original: VocabularyInput }) => v.word),
      'word'
    )

    if (uniqueWords.length > 0) {
      // 调用词典服务批量查询
      const words = uniqueWords.map((v: { word: string; original: VocabularyInput }) => v.word)
      const dictResults = await lookupBatch(words, 'fr')

      const wordCards = uniqueWords.map((v: { word: string; original: VocabularyInput }, idx: number) => {
        const original = v.original
        const dictResult = dictResults[idx]
        const example = findWordInSubtitles(v.word, savedSubtitles || [])

        // 从词典服务获取例句（优先使用第一个例句作为主例句）
        const dictExamples = dictResult?.examples || []
        const firstExample = dictExamples[0]

        // 从词典服务获取多条释义
        const definitions = dictResult?.definitions || []

        return {
          video_id: videoId,
          word: v.word,
          phonetic: dictResult?.phonetic || original.ipa || null,
          part_of_speech: dictResult?.posDetail || dictResult?.pos || original.part_of_speech || null,
          chinese_definition: dictResult?.definition || original.chinese || '',
          // 词典例句（单词书自带）
          example_sentence: firstExample?.fr || null,
          example_sentence_cn: firstExample?.zh || null,
          // 视频例句（剧中出现）
          example_from_video: example?.original || null,
          example_translation: example?.translation || null,
          subtitle_start_time: example?.startTime || 0,  // 用于 [📍] 跳转播放
          subtitle_end_time: example?.endTime || 0,      // 用于 [📍] 自动暂停
          // 词典扩展字段
          gender: dictResult?.gender || null,
          cefr_level: dictResult?.cefrLevel || original.cefr_level || null,
          definitions: definitions.length > 0 ? definitions : null,
          examples: dictExamples.length > 0 ? dictExamples : null,
          difficulty_level: cefrToNumber(original.cefr_level),
          display_order: idx,
          is_reviewed: true,  // 批量上传的内容默认已审核
        }
      })

      const { error: wordsError } = await supabase
        .from('video_word_cards')
        .insert(wordCards)

      if (!wordsError) {
        wordsCount = wordCards.length
        console.log(`[批量上传] 存储单词卡片成功: ${wordsCount} 个`)
      } else {
        console.error(`[批量上传] 存储单词卡片失败:`, wordsError)
      }
    }
  }

  // Step 6: 处理地道表达
  const expressions = learning_material_json.language_analysis?.key_expressions || []
  let expressionsCount = 0

  if (expressions.length > 0) {
    const expressionCards = expressions.map((expr: ExpressionInput, idx: number) => {
      const example = findExpressionInSubtitles(expr.expression, savedSubtitles || [])

      // ⚠️ 关键修复：从字幕中提取完整的 expression 文本，而不是用带省略号的 JSON 值
      // 用于字幕高亮匹配
      const fullExpression = example?.original
        ? extractExpressionFromSubtitle(expr.expression, example.original)
        : expr.expression

      return {
        video_id: videoId,
        expression: fullExpression,  // 使用完整文本，不带省略号
        context: example?.original || expr.example?.french || '',
        context_translation: example?.translation || expr.example?.chinese || null,
        formula: expr.grammar_usage || null,
        meaning: expr.chinese || null,
        examples: expr.example ? [{ original: expr.example.french, cn: expr.example.chinese }] : null,
        difficulty_level: cefrToNumber(expr.cefr_level),
        subtitle_start_time: example?.startTime || 0,  // 用于 [▶ 播放这段] 跳转播放
        subtitle_end_time: example?.endTime || 0,      // 用于 [▶ 播放这段] 自动暂停
        display_order: idx,
        is_reviewed: true,  // 批量上传的内容默认已审核
      }
    })

    const { error: exprError } = await supabase
      .from('video_expression_cards')
      .insert(expressionCards)

    if (!exprError) {
      expressionsCount = expressionCards.length
      console.log(`[批量上传] 存储表达卡片成功: ${expressionsCount} 个`)
    } else {
      console.error(`[批量上传] 存储表达卡片失败:`, exprError)
    }
  }

  // Step 7: 处理语法点
  const grammarPoints = learning_material_json.deep_learning?.grammar_points || []
  let grammarCount = 0

  if (grammarPoints.length > 0) {
    const grammarCards = grammarPoints.map((gp: GrammarPointInput, idx: number) => ({
      video_id: videoId,
      name: gp.name,
      structure: gp.structure || null,
      example_french: gp.example?.french || null,
      example_chinese: gp.example?.chinese || null,
      example_ipa: gp.example?.ipa || null,
      purpose: gp.purpose || null,
      note: gp.note || null,
      display_order: idx,
    }))

    const { error: grammarError } = await supabase
      .from('video_grammar_points')
      .insert(grammarCards)

    if (!grammarError) {
      grammarCount = grammarCards.length
      console.log(`[批量上传] 存储语法点成功: ${grammarCount} 个`)
    } else {
      console.error(`[批量上传] 存储语法点失败:`, grammarError)
    }
  }

  // Step 8: 处理发音要点
  const pronunciationTips = learning_material_json.deep_learning?.pronunciation?.key_sounds || []
  let pronunciationCount = 0

  if (pronunciationTips.length > 0) {
    const pronunciationCards = pronunciationTips.map((pt: PronunciationInput, idx: number) => ({
      video_id: videoId,
      sound_symbol: pt.sound,
      example_words: pt.example_words || [],
      instruction: pt.instruction || null,
      practice_tip: pt.practice_tip || null,
      display_order: idx,
    }))

    const { error: pronError } = await supabase
      .from('video_pronunciation_tips')
      .insert(pronunciationCards)

    if (!pronError) {
      pronunciationCount = pronunciationCards.length
      console.log(`[批量上传] 存储发音要点成功: ${pronunciationCount} 个`)
    } else {
      console.error(`[批量上传] 存储发音要点失败:`, pronError)
    }
  }

  // Step 9: 处理词汇网络
  const vocabNetwork = learning_material_json.deep_learning?.vocabulary_network
  if (vocabNetwork) {
    // 构建结构数据：支持两种JSON格式
    // 格式1: { theme, structure, related_words, collocations } - 直接使用
    // 格式2: { theme, core_word, related_groups: [{ category, words }] } - 需要转换
    let structureData = vocabNetwork.structure || null
    let relatedWordsData = vocabNetwork.related_words || null

    // 如果是格式2，转换 related_groups 到 structure
    if (vocabNetwork.related_groups && Array.isArray(vocabNetwork.related_groups)) {
      const groupMap: Record<string, string[]> = {}
      const allWords: string[] = []

      for (const group of vocabNetwork.related_groups) {
        if (group.category && group.words) {
          groupMap[group.category] = group.words
          allWords.push(...group.words)
        }
      }

      structureData = JSON.stringify(groupMap)
      relatedWordsData = allWords.length > 0 ? allWords : null
    }

    const { error: networkError } = await supabase
      .from('video_vocabulary_networks')
      .insert({
        video_id: videoId,
        theme: vocabNetwork.theme || null,
        structure: structureData,
        related_words: relatedWordsData,
        collocations: vocabNetwork.collocations || null,
      })

    if (!networkError) {
      console.log(`[批量上传] 存储词汇网络成功`)
    } else {
      console.error(`[批量上传] 存储词汇网络失败:`, networkError)
    }
  }

  // Step 10: 处理填空练习
  const vocabularyExercises = learning_material_json.practice?.vocabulary_exercises || []
  let exercisesCount = 0

  if (vocabularyExercises.length > 0) {
    const exerciseCards = vocabularyExercises.map((ex: VocabularyExerciseInput, idx: number) => {
      // 保留原始句子中的 _____ 作为 original_text
      // 这样 blank_positions 的位置计算才能与 original_text 对应
      const originalText = ex.sentence

      // 计算 blank_positions：找到连续下划线的位置
      const blankPattern = /_+/g
      const blankPositions: Array<{ start: number; end: number; word: string; hint?: string }> = []
      let match

      while ((match = blankPattern.exec(originalText)) !== null) {
        blankPositions.push({
          start: match.index,
          end: match.index + match[0].length,
          word: ex.answer,
          hint: ex.hint || undefined,
        })
      }

      // 匹配字幕：把 _____ 替换成答案，在字幕列表中查找对应行
      const cleanSentence = originalText.replace(/_+/g, ex.answer).toLowerCase().trim()
      const matchedSubtitle = (savedSubtitles as Array<{ original_text: string; start_time: number; end_time: number }> | undefined)
        ?.find(sub => sub.original_text?.toLowerCase().includes(cleanSentence)
          ?? cleanSentence.includes(sub.original_text?.toLowerCase() || ''))

      return {
        video_id: videoId,
        subtitle_id: null, // 不关联特定字幕
        exercise_type: 'fill_blank' as const,
        difficulty: 'beginner' as const, // 单个填空默认为 beginner
        original_text: originalText, // 保留 _____ 的原始句子
        blank_positions: blankPositions,
        hint_type: ex.hint ? 'first_letter' : null,
        answer_text: ex.answer,
        display_order: idx,
        subtitle_start_time: matchedSubtitle?.start_time ?? null,
        subtitle_end_time: matchedSubtitle?.end_time ?? null,
      }
    })

    const { error: exercisesError } = await supabase
      .from('video_exercises')
      .insert(exerciseCards)

    if (!exercisesError) {
      exercisesCount = exerciseCards.length
      console.log(`[批量上传] 存储填空练习成功: ${exercisesCount} 个`)
    } else {
      console.error(`[批量上传] 存储填空练习失败:`, exercisesError)
    }
  }

  // Step 11: 更新工作流状态
  await completeStep(supabase, videoId, 'subtitles')
  await completeStep(supabase, videoId, 'cards')

  return {
    id: videoId,
    title: video.title,
    subtitles_count: subtitlesData.length,
    words_count: wordsCount,
    expressions_count: expressionsCount,
    grammar_points_count: grammarCount,
    pronunciation_tips_count: pronunciationCount,
    exercises_count: exercisesCount,
    status: video.status as VideoStatus,
  }

  } catch (error) {
    // 发生错误时回滚
    console.error(`[批量上传] 处理失败，开始回滚 videoId=${videoId}:`, error)
    await rollbackVideo(supabase, videoId)
    throw error
  }
}
