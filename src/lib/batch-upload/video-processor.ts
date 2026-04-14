/**
 * 视频处理共享模块
 *
 * 从 batch-upload route.ts 提取的核心视频处理逻辑。
 * 供原 batch-upload 路由和新的 merged-batch-upload 路由共用。
 *
 * @module lib/batch-upload/video-processor
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { completeStep } from '@/lib/workflow-helper'
import { lookupBatch } from '@/lib/dictionary'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any>

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
  BatchUploadResult,
  BatchUploadVideoItem,
  VideoStatus,
  SubtitleJsonInput,
  LearningMaterialJsonInput,
  MergedSentencePatternInput,
  MergedScenarioInput,
  SimpleFormatExercise,
} from '@/types/video'
import { mapExerciseType } from '@/lib/batch-upload/simple-format'

// ============================================
// 内部类型定义
// ============================================

/** 字幕数据结构 */
interface SubtitleInput {
  index: number
  start_time: string
  end_time: string
  french: string
  chinese: string
}

/** 单词数据结构（兼容 AI 生成格式：example_sentence 为对象） */
interface VocabularyInput {
  french: string
  part_of_speech: string
  ipa: string
  chinese: string
  first_appearance?: string
  occurrence_count?: number
  cefr_level: string
  example_sentence?: {
    french: string
    chinese: string
  }
}

/** 表达数据结构（兼容 AI 生成格式：meaning/usage_note） */
interface ExpressionInput {
  expression: string
  ipa?: string
  chinese?: string
  meaning?: string
  cefr_level?: string
  grammar_usage?: string
  usage_note?: string
  example?: {
    french: string
    chinese: string
  }
}

/** 语法点数据结构（兼容 AI 生成格式：explanation/usage_note） */
interface GrammarPointInput {
  name: string
  structure?: string
  example?: {
    french: string
    chinese: string
    ipa?: string
  }
  purpose?: string
  explanation?: string
  note?: string
  usage_note?: string
}

/** 发音要点数据结构（兼容 AI 生成格式：examples/description） */
interface PronunciationInput {
  sound: string
  example_words?: string[]
  examples?: string[]
  instruction?: string
  description?: string
  practice_tip?: string
}

/** 填空练习数据结构（兼容 AI 生成格式：question 代替 sentence） */
interface VocabularyExerciseInput {
  word?: string
  sentence?: string
  question?: string
  answer: string
  hint?: string
}

/** 合并格式扩展数据（新格式独有的额外信息） */
export interface MergedFormatExtras {
  liaison: string[] | null
  intonation: string | null
  coreWord: string | null
  sentencePatterns: MergedSentencePatternInput[]
  scenario: MergedScenarioInput | null
}

// ============================================
// 回滚函数
// ============================================

/**
 * 回滚视频及其关联数据
 *
 * 利用数据库的 ON DELETE CASCADE 级联删除
 */
export async function rollbackVideo(
  supabase: AnySupabaseClient,
  videoId: string
): Promise<void> {
  try {
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

// ============================================
// 核心处理函数
// ============================================

/**
 * 处理单个视频上传
 *
 * 实现事务语义：关键步骤失败会回滚已创建的数据
 */
export async function processSingleVideo(
  supabase: AnySupabaseClient,
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

  // Step 2: 匹配 UP主（优先使用 creator_id，其次使用 creator 名称匹配）
  let creatorId: string | null = null
  let creatorAvatarUrl: string | null = null
  let creatorName: string | null = null

  // 优先：直接使用 creator_id
  if (unitInfo.creator_id) {
    creatorId = unitInfo.creator_id
    // 获取UP主头像
    const { data: creator } = await supabase
      .from('upstream_creators')
      .select('avatar_url')
      .eq('id', creatorId)
      .maybeSingle()
    if (creator) {
      creatorAvatarUrl = creator.avatar_url || null
      console.log(`[批量上传] 使用 creator_id: ${creatorId}`)
    }
  }
  // 备选：通过 creator 名称模糊匹配
  else if (unitInfo.creator) {
    creatorName = unitInfo.creator.trim()
    const { data: creator } = await supabase
      .from('upstream_creators')
      .select('id, avatar_url')
      .like('name', `%${creatorName}%`)  // 包含匹配，支持部分名称
      .maybeSingle()

    if (creator) {
      creatorId = creator.id
      creatorAvatarUrl = creator.avatar_url || null
      console.log(`[批量上传] 通过名称匹配UP主: ${creatorName} -> ${creatorId}`)
    } else {
      console.log(`[批量上传] 未找到UP主: ${creatorName}，将不关联UP主`)
    }
  }

  // Step 3: 创建视频记录
  const videoUrl = video_url?.trim() || null
  if (videoUrl && !isValidUrl(videoUrl)) {
    throw new Error('视频 URL 格式无效')
  }

  // 检测是否为音频内容：
  // 1) URL 包含音频扩展名 → audio
  // 2) URL 包含视频扩展名 → video
  // 3) 无 URL 时默认 video（更安全的默认值）
  const isAudioContent = videoUrl
    ? /\.(mp3|m4a|wav|ogg|aac|flac|wma)(\?|$)/i.test(videoUrl)
    : false

  // 智能封面设置：
  // 1) 优先使用 unit_info 中的 cover_url
  // 2) 音频内容且无封面时，使用 UP主头像
  // 3. 都没有时，使用默认封面（可以是 null，前端会显示占位符）
  const defaultCoverUrl = unitInfo.cover_url || (isAudioContent && creatorAvatarUrl ? creatorAvatarUrl : null)

  // 设置 thumbnail_url（视频内容主要用这个字段）
  const defaultThumbnailUrl = unitInfo.cover_url || null

  // 计算视频时长（优先使用duration_minutes，否则根据start_time和end_time计算）
  let calculatedDuration = Math.round((learningInfo.duration_minutes || 0) * 60)
  if (calculatedDuration === 0 && unitInfo.start_time && unitInfo.end_time) {
    const startTime = timeStringToSeconds(unitInfo.start_time)
    const endTime = timeStringToSeconds(unitInfo.end_time)
    calculatedDuration = Math.round(endTime - startTime)
    console.log(`[批量上传] 根据字幕时间计算时长: ${calculatedDuration}秒 (${unitInfo.start_time} -> ${unitInfo.end_time})`)
  }

  const { data: video, error: videoError } = await supabase
    .from('videos')
    .insert({
      title: unitInfo.source_video_name || unitInfo.video_title_cn || unitInfo.unit_name_cn || unitInfo.theme,
      original_title: unitInfo.theme,
      album_title: unitInfo.unit_name_cn || null,
      language: 'fr',
      difficulty: cefrToDifficulty(learningInfo.cefr_level),
      duration: calculatedDuration,
      video_url: videoUrl,
      content_type: isAudioContent ? 'audio' : 'video',
      cover_url: defaultCoverUrl,
      thumbnail_url: defaultThumbnailUrl,
      status: 'draft',
      creator_id: creatorId,
      creator_name: creatorName || null,
      learning_objectives: (item as any).learning_objectives || null,
      summary_content: (item as any).summary?.content || null,
      summary_keywords: (item as any).summary?.keywords || null,
      difficulty_note: (item as any).summary?.difficulty_note || null,
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

  // Step 3.5: 处理标签关联
  const tagNames = unitInfo.tags
  if (tagNames && tagNames.length > 0) {
    const { data: matchedTags } = await supabase
      .from('video_tags')
      .select('id, name')
      .in('name', tagNames)

    if (matchedTags && matchedTags.length > 0) {
      const tagRelations = matchedTags.map(t => ({
        video_id: videoId,
        tag_id: t.id,
      }))

      const { error: tagRelError } = await supabase
        .from('video_tag_relations')
        .insert(tagRelations)

      if (tagRelError) {
        console.warn(`[批量上传] 标签关联失败 videoId=${videoId}:`, tagRelError.message)
      } else {
        console.log(`[批量上传] 标签关联成功: ${matchedTags.map(t => t.name).join(', ')}`)
      }
    } else {
      console.log(`[批量上传] 未匹配到标签: ${tagNames.join(', ')}`)
    }
  }

  // Step 4: 存储字幕
  const sortedSubtitles = [...subtitle_json.subtitles].sort(
    (a: SubtitleInput, b: SubtitleInput) => a.index - b.index
  )
  const subtitlesData = sortedSubtitles.map((sub: SubtitleInput, idx: number) => ({
    video_id: videoId,
    start_time: timeStringToSeconds(sub.start_time),
    end_time: timeStringToSeconds(sub.end_time),
    original_text: sub.french,
    chinese_text: sub.chinese,
    word_count: sub.french ? sub.french.split(/\s+/).filter(Boolean).length : 0,
    display_order: idx,
  }))

  const { data: savedSubtitles, error: subtitlesError } = await supabase
    .from('video_subtitles')
    .insert(subtitlesData)
    .select('original_text, chinese_text, start_time, end_time')

  if (subtitlesError) {
    throw new Error(`存储字幕失败: ${subtitlesError.message}`)
  }

  console.log(`[批量上传] 存储字幕成功: ${subtitlesData.length} 条`)

  // Step 5: 处理单词
  const vocabulary = learning_material_json.language_analysis?.vocabulary || []
  let wordsCount = 0

  if (vocabulary.length > 0) {
    const uniqueWords = uniqueArray(
      vocabulary.map((v: VocabularyInput) => ({
        word: cleanWord(v.french),
        original: v,
      })).filter((v: { word: string; original: VocabularyInput }) => v.word),
      'word'
    )

    if (uniqueWords.length > 0) {
      const words = uniqueWords.map((v: { word: string; original: VocabularyInput }) => v.word)
      const dictResults = await lookupBatch(words, 'fr', { skipFallback: false }) // 移除 skipFallback，确保使用原始数据回退

      const wordCards = uniqueWords.map((v: { word: string; original: VocabularyInput }, idx: number) => {
        const original = v.original
        const dictResult = dictResults[idx]
        const example = findWordInSubtitles(v.word, savedSubtitles || [])

        // 判断词典数据是否完整（有definition表示有完整数据）
        const hasCompleteDictData = dictResult && dictResult.definition && dictResult.definition.trim() !== ''

        const dictExamples = dictResult?.examples || []
        const firstDictExample = dictExamples[0]
        const jsonExample = original.example_sentence
        const mainExampleFr = firstDictExample?.fr || jsonExample?.french || null
        const mainExampleCn = firstDictExample?.zh || jsonExample?.chinese || null

        const definitions = dictResult?.definitions || []

        return {
          video_id: videoId,
          word: v.word,
          // 词典有完整数据时优先用，否则用上传数据
          phonetic: hasCompleteDictData ? dictResult.phonetic : (original.ipa || null),
          part_of_speech: hasCompleteDictData ? dictResult.posDetail : (dictResult?.pos || original.part_of_speech || null),
          chinese_definition: hasCompleteDictData ? dictResult.definition : (original.chinese || ''),
          example_sentence: mainExampleFr,
          example_sentence_cn: mainExampleCn,
          example_from_video: example?.original || null,
          example_translation: example?.translation || null,
          subtitle_start_time: example?.startTime || 0,
          subtitle_end_time: example?.endTime || 0,
          gender: dictResult?.gender || null,
          cefr_level: dictResult?.cefrLevel || original.cefr_level || null,
          definitions: definitions.length > 0 ? definitions : null,
          examples: dictExamples.length > 0 ? dictExamples : null,
          difficulty_level: cefrToNumber(original.cefr_level),
          display_order: idx,
          is_reviewed: true,
          occurrence_count: original.occurrence_count || 1,
          source_ids: original.source_ids || [],
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
      const fullExpression = example?.original
        ? extractExpressionFromSubtitle(expr.expression, example.original)
        : expr.expression

      return {
        video_id: videoId,
        expression: fullExpression,
        context: example?.original || expr.example?.french || '',
        context_translation: example?.translation || expr.example?.chinese || null,
        formula: expr.grammar_usage || expr.usage_note || null,
        meaning: expr.chinese || expr.meaning || null,
        examples: expr.example ? [{ original: expr.example.french, cn: expr.example.chinese }] : null,
        difficulty_level: cefrToNumber(expr.cefr_level),
        subtitle_start_time: example?.startTime || 0,
        subtitle_end_time: example?.endTime || 0,
        display_order: idx,
        is_reviewed: true,
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
      purpose: gp.purpose || gp.explanation || null,
      note: gp.note || gp.usage_note || null,
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
      example_words: pt.example_words || pt.examples || [],
      instruction: pt.instruction || pt.description || null,
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
    let structureData = vocabNetwork.structure || null
    let relatedWordsData = vocabNetwork.related_words || null

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
      const originalText = ex.sentence || ex.question || ''

      if (!originalText) {
        console.warn(`[batch-upload] vocabulary_exercise[${idx}] 缺少 sentence/question 字段，跳过:`, ex)
        return null
      }

      const blankPattern = /_+/g
      const blankPositions: Array<{ start: number; end: number; word: string; hint?: string }> = []
      let match

      // 答案解析：兼容 "1. word\n2. word" 格式，提取纯答案词
      const answerLines = ex.answer.split(/\n/).map(line => line.trim()).filter(Boolean)
      const answerParts = answerLines.length > 1 && /^\d+[.．)）、]/.test(answerLines[0])
        ? answerLines.map(line => line.replace(/^\d+[.．)）、]\s*/, '').trim()).filter(Boolean)
        : ex.answer.split(/[\s,]+/).filter(Boolean)

      let blankIdx = 0
      while ((match = blankPattern.exec(originalText)) !== null) {
        blankPositions.push({
          start: match.index,
          end: match.index + match[0].length,
          word: answerParts.length > 1 ? (answerParts[blankIdx] || ex.answer) : ex.answer,
          hint: ex.hint || undefined,
        })
        blankIdx++
      }

      const blankCount = blankPositions.length
      const inferredDifficulty = blankCount <= 1 ? 'beginner' as const
        : blankCount <= 3 ? 'intermediate' as const
        : 'advanced' as const

      const cleanSentence = originalText.replace(/_+/g, ex.answer).toLowerCase().trim()
      const matchedSubtitle = (savedSubtitles as Array<{ original_text: string; start_time: number; end_time: number }> | undefined)
        ?.find(sub => sub.original_text?.toLowerCase().includes(cleanSentence)
          ?? cleanSentence.includes(sub.original_text?.toLowerCase() || ''))

      return {
        video_id: videoId,
        subtitle_id: null,
        exercise_type: 'fill_blank' as const,
        difficulty: inferredDifficulty,
        original_text: originalText,
        blank_positions: blankPositions,
        hint_type: ex.hint ? 'first_letter' : null,
        answer_text: ex.answer,
        display_order: idx,
        subtitle_start_time: matchedSubtitle?.start_time ?? null,
        exercise_summary: (item as any).exercise_summary || null,
      }
    })

    const validExerciseCards = exerciseCards.filter(Boolean)

    if (validExerciseCards.length > 0) {
      const { error: exercisesError } = await supabase
        .from('video_exercises')
        .insert(validExerciseCards)

      if (!exercisesError) {
        exercisesCount = validExerciseCards.length
        console.log(`[批量上传] 存储填空练习成功: ${exercisesCount} 个`)
      } else {
        console.error(`[批量上传] 存储填空练习失败:`, exercisesError)
      }
    }
  }

  // Step 10.5: 处理 simple format 的选择/翻译/语法练习
  const simpleFormatExercises = (item as BatchUploadVideoItem & { simple_exercises?: SimpleFormatExercise[] }).simple_exercises
  if (simpleFormatExercises && simpleFormatExercises.length > 0) {
    const simpleExerciseCards = simpleFormatExercises.map((ex: SimpleFormatExercise, idx: number) => {
      const exerciseType = mapExerciseType(ex.type)
      if (!exerciseType) return null

      return {
        video_id: videoId,
        subtitle_id: null,
        exercise_type: exerciseType,
        difficulty: 'intermediate' as const,
        original_text: ex.question,
        blank_positions: [],
        hint_type: null,
        answer_text: ex.answer,
        exercise_metadata: {
          question: ex.question,
          answer: ex.answer,
          explanation: ex.explanation,
        },
        display_order: exercisesCount + idx,
        subtitle_start_time: null,
      }
    }).filter(Boolean)

    if (simpleExerciseCards.length > 0) {
      const { error: simpleExError } = await supabase
        .from('video_exercises')
        .insert(simpleExerciseCards)

      if (!simpleExError) {
        exercisesCount += simpleExerciseCards.length
        console.log(`[批量上传] 存储 simple format 练习成功: ${simpleExerciseCards.length} 个`)
      } else {
        console.error(`[批量上传] 存储 simple format 练习失败:`, simpleExError)
      }
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
    console.error(`[批量上传] 处理失败，开始回滚 videoId=${videoId}:`, error)
    await rollbackVideo(supabase, videoId)
    throw error
  }
}

// ============================================
// 扩展处理函数（支持合并格式独有数据）
// ============================================

/**
 * 带扩展数据的视频处理
 *
 * 在标准处理完成后，额外处理：
 * 1. liaison/intonation 写入 pronunciation_tips
 * 2. sentence_pattern 写入 video_exercises
 * 3. scenario 写入 video_exercises
 * 4. core_word 写入 video_vocabulary_networks
 */
export async function processSingleVideoWithExtras(
  supabase: AnySupabaseClient,
  item: BatchUploadVideoItem,
  index: number,
  extras: MergedFormatExtras
): Promise<BatchUploadResult> {
  // 1. 运行标准处理流程
  const result = await processSingleVideo(supabase, item, index)
  const videoId = result.id

  // 2. 更新 pronunciation_tips：写入 liaison 和 intonation
  if (extras.liaison || extras.intonation) {
    const { data: existingTips } = await supabase
      .from('video_pronunciation_tips')
      .select('id')
      .eq('video_id', videoId)
      .order('display_order', { ascending: true })
      .limit(1)

    if (existingTips && existingTips.length > 0) {
      // 更新首行
      await supabase
        .from('video_pronunciation_tips')
        .update({
          ...(extras.liaison ? { liaison: extras.liaison } : {}),
          ...(extras.intonation ? { intonation: extras.intonation } : {}),
        })
        .eq('id', existingTips[0].id)
      console.log(`[merged-batch] 已更新 pronunciation liaison/intonation`)
    } else if (extras.liaison || extras.intonation) {
      // 没有发音要点，创建一条只含 liaison/intonation 的记录
      await supabase
        .from('video_pronunciation_tips')
        .insert({
          video_id: videoId,
          sound_symbol: '',
          liaison: extras.liaison || null,
          intonation: extras.intonation || null,
          display_order: 0,
        })
      console.log(`[merged-batch] 已创建 pronunciation 记录 (liaison/intonation only)`)
    }
  }

  // 3. 更新 vocabulary_network：写入 core_word
  if (extras.coreWord) {
    await supabase
      .from('video_vocabulary_networks')
      .update({ core_word: extras.coreWord })
      .eq('video_id', videoId)
    console.log(`[merged-batch] 已更新 vocabulary_network core_word: ${extras.coreWord}`)
  }

  // 4. 插入 sentence_pattern exercises
  if (extras.sentencePatterns.length > 0) {
    const patternExercises = extras.sentencePatterns.map((sp, idx) => ({
      video_id: videoId,
      subtitle_id: null,
      exercise_type: 'sentence_pattern' as const,
      difficulty: 'intermediate' as const,
      original_text: sp.pattern,
      blank_positions: [],
      hint_type: null,
      answer_text: sp.example?.french || '',
      exercise_metadata: {
        pattern: sp.pattern,
        explanation: sp.explanation || null,
        example: sp.example || null,
      },
      display_order: idx,
      subtitle_start_time: null,
    }))

    const { error } = await supabase.from('video_exercises').insert(patternExercises)
    if (!error) {
      console.log(`[merged-batch] 存储句型模式成功: ${patternExercises.length} 个`)
    } else {
      console.error('[merged-batch] 句型模式存储失败:', error)
    }
  }

  // 5. 插入 scenario exercise
  if (extras.scenario) {
    const { error } = await supabase.from('video_exercises').insert({
      video_id: videoId,
      subtitle_id: null,
      exercise_type: 'scenario' as const,
      difficulty: 'advanced' as const,
      original_text: extras.scenario.description,
      blank_positions: [],
      hint_type: null,
      answer_text: extras.scenario.starter || '',
      exercise_metadata: {
        description: extras.scenario.description,
        requirements: extras.scenario.requirements || [],
        starter: extras.scenario.starter || null,
      },
      display_order: 100,  // scenario 放在最后
      subtitle_start_time: null,
    })
    if (!error) {
      console.log('[merged-batch] 情景练习存储成功')
    } else {
      console.error('[merged-batch] 情景练习存储失败:', error)
    }
  }

  return result
}
