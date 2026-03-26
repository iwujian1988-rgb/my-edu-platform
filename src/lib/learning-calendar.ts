/**
 * 学习日历辅助函数
 *
 * 用于更新用户每日学习统计数据
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { CardType } from '@/types/video'

/**
 * 更新学习日历
 *
 * @param supabase - Supabase 客户端
 * @param userId - 用户 ID
 * @param updates - 更新内容
 */
export async function updateLearningCalendar(
  supabase: SupabaseClient,
  userId: string,
  updates: {
    videoId?: string
    cardType?: CardType
    durationMinutes?: number
  }
): Promise<{ success: boolean; error?: string }> {
  const today = new Date().toISOString().split('T')[0]

  try {
    // 获取现有记录
    const { data: existing, error: fetchError } = await supabase
      .from('video_learning_calendar')
      .select('*')
      .eq('user_id', userId)
      .eq('learning_date', today)
      .maybeSingle()

    if (fetchError) {
      console.error('[updateLearningCalendar] Fetch error:', fetchError)
      return { success: false, error: fetchError.message }
    }

    // 构建更新数据
    const updateData: Record<string, unknown> = {}

    if (updates.videoId) {
      const currentVideoIds = existing?.video_ids || []
      if (!currentVideoIds.includes(updates.videoId)) {
        updateData.video_ids = [...currentVideoIds, updates.videoId]
        updateData.video_count = (existing?.video_count || 0) + 1
      }
    }

    if (updates.cardType) {
      switch (updates.cardType) {
        case 'word':
          updateData.words_marked = (existing?.words_marked || 0) + 1
          break
        case 'phrase':
          updateData.phrases_marked = (existing?.phrases_marked || 0) + 1
          break
        case 'expression':
          updateData.expressions_marked = (existing?.expressions_marked || 0) + 1
          break
      }
      // 兼容旧字段
      updateData.cards_reviewed = (existing?.cards_reviewed || 0) + 1
    }

    if (updates.durationMinutes && updates.durationMinutes > 0) {
      updateData.total_minutes = (existing?.total_minutes || 0) + updates.durationMinutes
    }

    // 如果没有需要更新的字段，直接返回成功
    if (Object.keys(updateData).length === 0) {
      return { success: true }
    }

    let error
    if (existing) {
      // 更新现有记录
      const result = await supabase
        .from('video_learning_calendar')
        .update(updateData)
        .eq('id', existing.id)
      error = result.error
    } else {
      // 创建新记录
      const result = await supabase
        .from('video_learning_calendar')
        .insert({
          user_id: userId,
          learning_date: today,
          video_count: updateData.video_count || 0,
          video_ids: updateData.video_ids || [],
          words_marked: updateData.words_marked || 0,
          phrases_marked: updateData.phrases_marked || 0,
          expressions_marked: updateData.expressions_marked || 0,
          cards_reviewed: updateData.cards_reviewed || 0,
          total_minutes: updateData.total_minutes || 0,
        })
      error = result.error
    }

    if (error) {
      console.error('[updateLearningCalendar] Update error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('[updateLearningCalendar] Error:', error)
    return { success: false, error: String(error) }
  }
}
