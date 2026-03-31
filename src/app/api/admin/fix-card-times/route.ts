/**
 * 修复卡片表中缺失的 subtitle_start_time / subtitle_end_time
 *
 * 两类问题：
 * 1. start_time = 0 且 end_time = null → 用 context 匹配字幕原文回填 start_time + end_time
 * 2. start_time > 0 但 end_time = 0/null → 只需补 end_time（按 start_time 精确匹配字幕）
 *
 * 匹配策略：case-insensitive substring match
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { checkAdminForAPI } from '@/lib/admin-auth'

interface SubtitleRow {
  start_time: number
  end_time: number
  original_text: string
}

interface CardRow {
  id: string
  video_id: string
  subtitle_start_time: number | null
  subtitle_end_time: number | null
  /** 表达卡片的语境（字幕原文片段） */
  context?: string | null
  /** 单词卡片 */
  word?: string | null
}

/**
 * 用文本内容在字幕列表中找到匹配的字幕
 * 策略：case-insensitive substring match，取第一个匹配
 */
function findSubtitleByText(text: string, subtitles: SubtitleRow[]): { start_time: number; end_time: number } | null {
  if (!text || !text.trim()) return null

  const textLower = text.toLowerCase().trim()

  // 精确匹配：字幕原文包含 context 文本
  for (const sub of subtitles) {
    if (sub.original_text && sub.original_text.toLowerCase().includes(textLower)) {
      return { start_time: sub.start_time, end_time: sub.end_time }
    }
  }

  // 宽松匹配：处理带省略号的表达式
  // 例如 context = "Je trouve que c'est beaucoup plus agréable à vivre."
  // 但字幕可能是 "Je trouve que c'est beaucoup plus agréable à vivre."
  // 差异可能是标点符号
  const normalizedText = textLower.replace(/[.,!?;:'"]/g, '').replace(/\s+/g, ' ').trim()

  for (const sub of subtitles) {
    if (!sub.original_text) continue
    const normalizedSub = sub.original_text.toLowerCase().replace(/[.,!?;:'"]/g, '').replace(/\s+/g, ' ').trim()
    if (normalizedSub.includes(normalizedText) || normalizedText.includes(normalizedSub)) {
      return { start_time: sub.start_time, end_time: sub.end_time }
    }
  }

  return null
}

/**
 * 用单词在字幕列表中找到匹配的字幕
 * 策略：word boundary match
 */
function findSubtitleByWord(word: string, subtitles: SubtitleRow[]): { start_time: number; end_time: number } | null {
  if (!word || !word.trim()) return null

  const wordLower = word.toLowerCase().trim()
  // 去掉词尾的介词/冠词等，取核心词
  const coreWord = wordLower.replace(/^(l'|d'|s'|n'|qu'|j'|m'|t'|c')/i, '')

  for (const sub of subtitles) {
    if (!sub.original_text) continue
    const textLower = sub.original_text.toLowerCase()
    // 词边界匹配
    const regex = new RegExp(`\\b${coreWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (regex.test(textLower)) {
      return { start_time: sub.start_time, end_time: sub.end_time }
    }
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error || '未授权' },
        { status: adminCheck.status || 401 }
      )
    }

    const supabase = await createAdminClient()

    const results = {
      expressions: { total: 0, start_time_fixed: 0, end_time_fixed: 0, failed: 0 },
      words: { total: 0, start_time_fixed: 0, end_time_fixed: 0, failed: 0 },
    }

    // ============================================
    // 1. 修复表达卡片
    // ============================================
    console.log('[fix-card-times] === 开始修复表达卡片 ===')

    // 查所有需要修复的表达卡片（start_time 无效 或 end_time 无效）
    const { data: expressions, error: exprError } = await supabase
      .from('video_expression_cards')
      .select('id, video_id, subtitle_start_time, subtitle_end_time, context')
      .or('subtitle_start_time.is.null,subtitle_start_time.eq.0,subtitle_end_time.is.null,subtitle_end_time.eq.0')

    if (exprError) {
      console.error('[fix-card-times] 查询表达卡片失败:', exprError)
    } else if (expressions && expressions.length > 0) {
      results.expressions.total = expressions.length
      console.log(`[fix-card-times] 找到 ${expressions.length} 条需要修复的表达卡片`)

      // 按 video_id 分组，减少字幕查询次数
      const byVideo = new Map<string, CardRow[]>()
      for (const expr of expressions) {
        const list = byVideo.get(expr.video_id) || []
        list.push(expr)
        byVideo.set(expr.video_id, list)
      }

      for (const [videoId, cards] of byVideo) {
        // 一次查出该视频所有字幕
        const { data: subtitles } = await supabase
          .from('video_subtitles')
          .select('start_time, end_time, original_text')
          .eq('video_id', videoId)
          .order('start_time')

        if (!subtitles || subtitles.length === 0) {
          results.expressions.failed += cards.length
          continue
        }

        for (const card of cards) {
          const needsStart = !card.subtitle_start_time || card.subtitle_start_time === 0
          const needsEnd = !card.subtitle_end_time || card.subtitle_end_time === 0

          if (needsStart && card.context) {
            // start_time 也没 → 用 context 匹配字幕
            const match = findSubtitleByText(card.context, subtitles)
            if (match) {
              const { error } = await supabase
                .from('video_expression_cards')
                .update({ subtitle_start_time: match.start_time, subtitle_end_time: match.end_time })
                .eq('id', card.id)
              if (error) {
                results.expressions.failed++
              } else {
                results.expressions.start_time_fixed++
                results.expressions.end_time_fixed++
              }
            } else {
              results.expressions.failed++
            }
          } else if (needsEnd && card.subtitle_start_time && card.subtitle_start_time > 0) {
            // 只缺 end_time → 按 start_time 精确匹配
            const { data: sub } = await supabase
              .from('video_subtitles')
              .select('end_time')
              .eq('video_id', videoId)
              .eq('start_time', card.subtitle_start_time)
              .maybeSingle()

            if (sub?.end_time) {
              const { error } = await supabase
                .from('video_expression_cards')
                .update({ subtitle_end_time: sub.end_time })
                .eq('id', card.id)
              if (error) {
                results.expressions.failed++
              } else {
                results.expressions.end_time_fixed++
              }
            } else {
              results.expressions.failed++
            }
          }
        }
      }
    }

    // ============================================
    // 2. 修复单词卡片
    // ============================================
    console.log('[fix-card-times] === 开始修复单词卡片 ===')

    const { data: words, error: wordsError } = await supabase
      .from('video_word_cards')
      .select('id, video_id, subtitle_start_time, subtitle_end_time, word, example_from_video')
      .or('subtitle_start_time.is.null,subtitle_start_time.eq.0,subtitle_end_time.is.null,subtitle_end_time.eq.0')

    if (wordsError) {
      console.error('[fix-card-times] 查询单词卡片失败:', wordsError)
    } else if (words && words.length > 0) {
      results.words.total = words.length
      console.log(`[fix-card-times] 找到 ${words.length} 条需要修复的单词卡片`)

      // 按 video_id 分组
      const byVideo = new Map<string, CardRow[]>()
      for (const w of words) {
        const list = byVideo.get(w.video_id) || []
        list.push(w)
        byVideo.set(w.video_id, list)
      }

      for (const [videoId, cards] of byVideo) {
        const { data: subtitles } = await supabase
          .from('video_subtitles')
          .select('start_time, end_time, original_text')
          .eq('video_id', videoId)
          .order('start_time')

        if (!subtitles || subtitles.length === 0) {
          results.words.failed += cards.length
          continue
        }

        for (const card of cards) {
          const needsStart = !card.subtitle_start_time || card.subtitle_start_time === 0
          const needsEnd = !card.subtitle_end_time || card.subtitle_end_time === 0

          if (needsStart && (card as any).word) {
            // start_time 缺失 → 用单词匹配字幕
            const match = findSubtitleByWord((card as any).word, subtitles)
            if (match) {
              const { error } = await supabase
                .from('video_word_cards')
                .update({ subtitle_start_time: match.start_time, subtitle_end_time: match.end_time })
                .eq('id', card.id)
              if (error) {
                results.words.failed++
              } else {
                results.words.start_time_fixed++
                results.words.end_time_fixed++
              }
            } else {
              results.words.failed++
            }
          } else if (needsEnd && card.subtitle_start_time && card.subtitle_start_time > 0) {
            // 只缺 end_time
            const { data: sub } = await supabase
              .from('video_subtitles')
              .select('end_time')
              .eq('video_id', videoId)
              .eq('start_time', card.subtitle_start_time)
              .maybeSingle()

            if (sub?.end_time) {
              const { error } = await supabase
                .from('video_word_cards')
                .update({ subtitle_end_time: sub.end_time })
                .eq('id', card.id)
              if (error) {
                results.words.failed++
              } else {
                results.words.end_time_fixed++
              }
            } else {
              results.words.failed++
            }
          }
        }
      }
    }

    console.log('[fix-card-times] === 修复完成 ===')
    console.log('[fix-card-times] 结果:', JSON.stringify(results, null, 2))

    return NextResponse.json({
      success: true,
      message: '修复完成',
      results,
    })
  } catch (error) {
    console.error('[fix-card-times] 错误:', error)
    return NextResponse.json(
      { error: '服务器错误', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
