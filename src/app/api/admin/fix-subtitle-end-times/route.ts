/**
 * 修复卡片表中缺失的 subtitle_end_time
 *
 * 问题：批量上传时没有保存 subtitle_end_time
 * 解决：从字幕表中查找对应记录，更新 end_time
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { checkAdminForAPI } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error || '未授权' },
        { status: adminCheck.status || 401 }
      )
    }

    const supabase = await createAdminClient()
    const results = {
      expressions: { total: 0, updated: 0, failed: 0 },
      words: { total: 0, updated: 0, failed: 0 },
    }

    // 1. 修复表达卡片
    console.log('[fix-subtitle-end-times] 开始修复表达卡片...')
    const { data: expressions, error: exprError } = await supabase
      .from('video_expression_cards')
      .select('id, video_id, subtitle_start_time, subtitle_end_time')
      .or('subtitle_end_time.is.null,subtitle_end_time.eq.0')
      .gt('subtitle_start_time', 0)

    if (exprError) {
      console.error('[fix-subtitle-end-times] 查询表达卡片失败:', exprError)
    } else if (expressions && expressions.length > 0) {
      results.expressions.total = expressions.length
      console.log(`[fix-subtitle-end-times] 找到 ${expressions.length} 条需要修复的表达卡片`)

      for (const expr of expressions) {
        // 查找对应的字幕记录
        const { data: subtitle, error: subError } = await supabase
          .from('video_subtitles')
          .select('end_time')
          .eq('video_id', expr.video_id)
          .eq('start_time', expr.subtitle_start_time)
          .maybeSingle()

        if (subError || !subtitle || !subtitle.end_time) {
          results.expressions.failed++
          continue
        }

        // 更新 end_time
        const { error: updateError } = await supabase
          .from('video_expression_cards')
          .update({ subtitle_end_time: subtitle.end_time })
          .eq('id', expr.id)

        if (updateError) {
          results.expressions.failed++
        } else {
          results.expressions.updated++
        }
      }
    }

    // 2. 修复单词卡片
    console.log('[fix-subtitle-end-times] 开始修复单词卡片...')
    const { data: words, error: wordsError } = await supabase
      .from('video_word_cards')
      .select('id, video_id, subtitle_start_time, subtitle_end_time')
      .or('subtitle_end_time.is.null,subtitle_end_time.eq.0')
      .gt('subtitle_start_time', 0)

    if (wordsError) {
      console.error('[fix-subtitle-end-times] 查询单词卡片失败:', wordsError)
    } else if (words && words.length > 0) {
      results.words.total = words.length
      console.log(`[fix-subtitle-end-times] 找到 ${words.length} 条需要修复的单词卡片`)

      for (const word of words) {
        // 查找对应的字幕记录
        const { data: subtitle, error: subError } = await supabase
          .from('video_subtitles')
          .select('end_time')
          .eq('video_id', word.video_id)
          .eq('start_time', word.subtitle_start_time)
          .maybeSingle()

        if (subError || !subtitle || !subtitle.end_time) {
          results.words.failed++
          continue
        }

        // 更新 end_time
        const { error: updateError } = await supabase
          .from('video_word_cards')
          .update({ subtitle_end_time: subtitle.end_time })
          .eq('id', word.id)

        if (updateError) {
          results.words.failed++
        } else {
          results.words.updated++
        }
      }
    }

    console.log('[fix-subtitle-end-times] 修复完成:', results)

    return NextResponse.json({
      success: true,
      message: '修复完成',
      results,
    })
  } catch (error) {
    console.error('[fix-subtitle-end-times] 错误:', error)
    return NextResponse.json(
      { error: '服务器错误', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
