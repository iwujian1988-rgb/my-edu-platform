/**
 * 练习答题进度 API
 *
 * GET: 获取某视频下用户的答题记录
 * POST: upsert 答题记录（首次 attempts=1，重试 attempts 递增）
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ExerciseProgressRow {
  exercise_id: string
  is_correct: boolean
  attempts: number
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('video_id')

    if (!videoId) {
      return NextResponse.json({ error: 'Missing video_id' }, { status: 400 })
    }

    // 先获取该视频所有 exercise ID
    const { data: exercises, error: exerciseError } = await supabase
      .from('video_exercises')
      .select('id')
      .eq('video_id', videoId)

    if (exerciseError) {
      return NextResponse.json({ error: exerciseError.message }, { status: 500 })
    }

    const exerciseIds = (exercises || []).map((e: { id: string }) => e.id)

    if (exerciseIds.length === 0) {
      return NextResponse.json({ data: { items: [] } })
    }

    const { data: progress, error } = await supabase
      .from('user_exercise_progress')
      .select('exercise_id, is_correct, attempts')
      .eq('user_id', user.id)
      .in('exercise_id', exerciseIds)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: {
        items: (progress || []) as ExerciseProgressRow[],
      },
    })
  } catch (error) {
    console.error('[exercise-progress GET] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { exerciseId, isCorrect } = body as {
      exerciseId: string
      isCorrect: boolean
    }

    if (!exerciseId || typeof isCorrect !== 'boolean') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // PostgREST upsert 无法在 conflict action 中做 attempts+1，
    // 所以用 read-then-write 保证 attempts 正确递增
    const { data: existing } = await supabase
      .from('user_exercise_progress')
      .select('attempts')
      .eq('user_id', user.id)
      .eq('exercise_id', exerciseId)
      .maybeSingle()

    const now = new Date().toISOString()

    if (existing) {
      const { error: updateError } = await supabase
        .from('user_exercise_progress')
        .update({
          is_correct: isCorrect,
          attempts: existing.attempts + 1,
          answered_at: now,
        })
        .eq('user_id', user.id)
        .eq('exercise_id', exerciseId)

      if (updateError) {
        console.error('[exercise-progress POST] Update error:', updateError)
        return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 })
      }
    } else {
      const { error: insertError } = await supabase
        .from('user_exercise_progress')
        .insert({
          user_id: user.id,
          exercise_id: exerciseId,
          is_correct: isCorrect,
          attempts: 1,
          answered_at: now,
        })

      if (insertError) {
        console.error('[exercise-progress POST] Insert error:', insertError)
        return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[exercise-progress POST] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
