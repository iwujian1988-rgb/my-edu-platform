/**
 * 知识点统计 API
 *
 * 返回用户所有视频的知识点（按视频分组）
 */

import { NextResponse } from 'next/server'
import { getCurrentUser, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createAdminClient()

    // 获取所有发布视频
    const { data: allVideos } = await supabase
      .from('videos')
      .select('id, title, thumbnail_url, language')
      .eq('status', 'published')

    if (!allVideos || allVideos.length === 0) {
      return NextResponse.json({
        success: true,
        data: { videos: [], totals: { words: 0, phrases: 0, expressions: 0 } }
      })
    }

    const videoIds = allVideos.map(v => v.id)

    // 并行查询三种卡片（获取更多字段）
    const [wordsResult, phrasesResult, expressionsResult] = await Promise.all([
      supabase
        .from('video_word_cards')
        .select('id, video_id, word, chinese_definition, part_of_speech, example_sentence, example_sentence_cn')
        .in('video_id', videoIds),
      supabase
        .from('video_phrase_cards')
        .select('id, video_id, phrase, chinese_definition, context, context_translation')
        .in('video_id', videoIds),
      supabase
        .from('video_expression_cards')
        .select('id, video_id, expression, meaning, context, context_translation')
        .in('video_id', videoIds)
    ])

    // 按视频分组
    const videoData: Record<string, {
      video_id: string
      video_title: string
      thumbnail_url: string | null
      language: string
      words: Array<{
        id: string
        text: string
        translation: string
        partOfSpeech?: string
        example?: string
        exampleCn?: string
      }>
      phrases: Array<{
        id: string
        text: string
        translation: string
        example?: string
        exampleCn?: string
      }>
      expressions: Array<{
        id: string
        text: string
        translation: string
        example?: string
        exampleCn?: string
      }>
    }> = {}

    for (const v of allVideos) {
      videoData[v.id] = {
        video_id: v.id,
        video_title: v.title,
        thumbnail_url: v.thumbnail_url,
        language: v.language,
        words: [],
        phrases: [],
        expressions: []
      }
    }

    // 填充词汇
    if (wordsResult.data) {
      for (const card of wordsResult.data) {
        if (videoData[card.video_id]) {
          videoData[card.video_id].words.push({
            id: card.id,
            text: card.word,
            translation: card.chinese_definition || '',
            partOfSpeech: card.part_of_speech,
            example: card.example_sentence,
            exampleCn: card.example_sentence_cn
          })
        }
      }
    }

    // 填充短语
    if (phrasesResult.data) {
      for (const card of phrasesResult.data) {
        if (videoData[card.video_id]) {
          videoData[card.video_id].phrases.push({
            id: card.id,
            text: card.phrase,
            translation: card.chinese_definition || '',
            example: card.context,
            exampleCn: card.context_translation
          })
        }
      }
    }

    // 填充地道表达
    if (expressionsResult.data) {
      for (const card of expressionsResult.data) {
        if (videoData[card.video_id]) {
          videoData[card.video_id].expressions.push({
            id: card.id,
            text: card.expression,
            translation: card.meaning || '',
            example: card.context,
            exampleCn: card.context_translation
          })
        }
      }
    }

    // 转为数组并排序（按总知识点数降序），只保留有卡片的视频
    const videos = Object.values(videoData)
      .filter(v => v.words.length > 0 || v.phrases.length > 0 || v.expressions.length > 0)
      .sort((a, b) => {
        const totalA = a.words.length + a.phrases.length + a.expressions.length
        const totalB = b.words.length + b.phrases.length + b.expressions.length
        return totalB - totalA
      })

    // 统计总数
    const totals = {
      words: videos.reduce((sum, v) => sum + v.words.length, 0),
      phrases: videos.reduce((sum, v) => sum + v.phrases.length, 0),
      expressions: videos.reduce((sum, v) => sum + v.expressions.length, 0)
    }

    return NextResponse.json({ success: true, data: { videos, totals } })
  } catch (error) {
    console.error('[api/user/knowledge-stats] Error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
