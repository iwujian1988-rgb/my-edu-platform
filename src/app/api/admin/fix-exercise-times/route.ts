/**
 * 修复练习表的 subtitle_start_time / subtitle_end_time
 *
 * 问题：现有练习的 start_time 全是 1（假值），不是真实字幕时间
 * 方案：用 answer_text 匹配字幕原文，覆盖所有练习
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { checkAdminForAPI } from '@/lib/admin-auth'

interface SubtitleRow {
  start_time: number
  end_time: number
  original_text: string
}

export async function GET() {
  return NextResponse.json({ info: 'POST to fix exercise subtitle times' })
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const supabase = await createAdminClient()

    // 1. 查所有练习
    const { data: exercises, error: fetchError } = await supabase
      .from('video_exercises')
      .select('id, video_id, answer_text, subtitle_start_time, subtitle_end_time')

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!exercises || exercises.length === 0) {
      return NextResponse.json({ success: true, message: '无练习数据', updated: 0 })
    }

    // 2. 按 video_id 分组
    const byVideo = new Map<string, typeof exercises[0][]>()
    for (const ex of exercises) {
      const list = byVideo.get(ex.video_id) || []
      list.push(ex)
      byVideo.set(ex.video_id, list)
    }

    let updated = 0
    let failed = 0
    const details: Array<{ id: string; answer: string; oldStart: number | null; newStart: number | null; ok: boolean }> = []

    for (const [videoId, videoExercises] of byVideo) {
      const { data: subtitles } = await supabase
        .from('video_subtitles')
        .select('start_time, end_time, original_text')
        .eq('video_id', videoId)
        .order('start_time')

      if (!subtitles || subtitles.length === 0) {
        for (const ex of videoExercises) {
          failed++
          details.push({ id: ex.id.substring(0, 8), answer: ex.answer_text, oldStart: ex.subtitle_start_time, newStart: null, ok: false })
        }
        continue
      }

      for (const ex of videoExercises) {
        const answerLower = ex.answer_text.toLowerCase()
        let matched: SubtitleRow | null = null

        for (const sub of subtitles) {
          if (sub.original_text && sub.original_text.toLowerCase().includes(answerLower)) {
            matched = sub
            break
          }
        }

        if (matched) {
          const { error: updateError } = await supabase
            .from('video_exercises')
            .update({
              subtitle_start_time: matched.start_time,
              subtitle_end_time: matched.end_time,
            })
            .eq('id', ex.id)

          if (updateError) {
            failed++
            details.push({ id: ex.id.substring(0, 8), answer: ex.answer_text, oldStart: ex.subtitle_start_time, newStart: null, ok: false })
          } else {
            updated++
            details.push({ id: ex.id.substring(0, 8), answer: ex.answer_text, oldStart: ex.subtitle_start_time, newStart: matched.start_time, ok: true })
          }
        } else {
          failed++
          details.push({ id: ex.id.substring(0, 8), answer: ex.answer_text, oldStart: ex.subtitle_start_time, newStart: null, ok: false })
        }
      }
    }

    return NextResponse.json({ success: true, updated, failed, total: exercises.length, details })
  } catch (error) {
    return NextResponse.json(
      { error: '服务器错误', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
