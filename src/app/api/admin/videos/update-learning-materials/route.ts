/**
 * 补充学习资料 API
 *
 * 为已存在的视频补充词汇、练习、语法等学习资料
 *
 * @module api/admin/videos/update-learning-materials
 */

import { createAdminClient } from '@/lib/supabase/server'
import { checkAdminForAPI } from '@/lib/admin-auth'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // 鉴权
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

    const body = await request.json().catch(() => ({}))
    const { video_id, learning_materials } = body

    if (!video_id) {
      return NextResponse.json(
        { error: '缺少 video_id', code: 'INVALID_REQUEST' },
        { status: 400 }
      )
    }

    if (!learning_materials) {
      return NextResponse.json(
        { error: '缺少 learning_materials', code: 'INVALID_REQUEST' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    // 验证视频是否存在
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, title')
      .eq('id', video_id)
      .single()

    if (videoError || !video) {
      return NextResponse.json(
        { error: '视频不存在', code: 'VIDEO_NOT_FOUND' },
        { status: 404 }
      )
    }

    console.log(`[补充学习资料] 视频: ${video.title} (${video_id})`)

    let vocabularyCount = 0
    let exercisesCount = 0
    let grammarCount = 0

    // 1. 处理词汇 -> video_word_cards
    const vocabulary = learning_materials.language_analysis?.vocabulary || []
    if (vocabulary.length > 0) {
      // 获取字幕用于查找例句
      const { data: savedSubtitles } = await supabase
        .from('video_subtitles')
        .select('id, original_text, chinese_text, start_time, end_time')
        .eq('video_id', video_id)

      // 简化处理
      const wordCards = vocabulary.map((vocab: any, idx: number) => ({
        video_id: video_id,
        word: vocab.french,
        phonetic: vocab.ipa || null,
        part_of_speech: vocab.part_of_speech?.substring(0, 20) || null,
        chinese_definition: vocab.chinese || null,
        example_from_video: vocab.example_sentence?.french || null,
        example_translation: vocab.example_sentence?.chinese || null,
        difficulty_level: 1,
        display_order: idx,
        is_reviewed: true,
        source_ids: vocab.source_ids || [],
        occurrence_count: vocab.occurrence_count || 1,
      }))

      const { error: wordsError } = await supabase
        .from('video_word_cards')
        .insert(wordCards)

      if (!wordsError) {
        vocabularyCount = wordCards.length
        console.log(`[补充学习资料] 存储词汇成功: ${vocabularyCount} 个`)
      } else {
        console.error(`[补充学习资料] 存储词汇失败:`, wordsError)
      }
    }

    // 2. 处理练习 -> video_exercises
    const practice = learning_materials.practice
    if (practice?.exercises && practice.exercises.length > 0) {
      const exercisesData = practice.exercises
        .filter((ex: any) => ex.type === '填空')
        .map((ex: any, idx: number) => ({
          video_id: video_id,
          exercise_type: 'fill_blank',
          difficulty: ex.difficulty || 'intermediate',
          original_text: ex.question || '',
          blank_positions: ex.blanks || [],
          answer_text: ex.answer || '',
          hint_type: ex.hint_type || null,
          display_order: idx,
        }))

      if (exercisesData.length > 0) {
        const { error: exError } = await supabase
          .from('video_exercises')
          .insert(exercisesData)

        if (!exError) {
          exercisesCount = exercisesData.length
          console.log(`[补充学习资料] 存储练习成功: ${exercisesCount} 个`)
        } else {
          console.error(`[补充学习资料] 存储练习失败:`, exError)
        }
      }
    }

    // 3. 处理语法点 -> video_grammar_points
    const grammarPoints = learning_materials.deep_learning?.grammar_points || []
    if (grammarPoints.length > 0) {
      const grammarData = grammarPoints.map((gp: any, idx: number) => ({
        video_id: video_id,
        name: gp.name || '',
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
        .insert(grammarData)

      if (!grammarError) {
        grammarCount = grammarData.length
        console.log(`[补充学习资料] 存储语法点成功: ${grammarCount} 个`)
      } else {
        console.error(`[补充学习资料] 存储语法点失败:`, grammarError)
      }
    }

    return NextResponse.json({
      success: true,
      message: '学习资料补充成功',
      data: {
        video_id,
        vocabulary_count: vocabularyCount,
        exercises_count: exercisesCount,
        grammar_count: grammarCount
      }
    })

  } catch (error) {
    console.error('[补充学习资料] 异常:', error)
    return NextResponse.json(
      { error: '服务器错误', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
