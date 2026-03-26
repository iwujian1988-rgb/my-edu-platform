/**
 * 待复习卡片数量 API（轻量版）
 *
 * 只返回 learning_cards 数量，用于首页角标显示
 * 比 video-stats API 快得多
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 只查询 learning 状态的卡片数量
    const { count, error } = await supabase
      .from('user_card_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'learning')

    if (error) {
      console.error('[review-count] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: {
        learning_cards: count || 0,
      },
    })
  } catch (error) {
    console.error('[review-count] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
