import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // 获取当前用户
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 计算今天0点的时间
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStart = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString()

    // 统计今日新词数量
    const { count, error } = await supabase
      .from('word_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', todayStart)

    if (error) {
      console.error('[API Stats] Error counting today new words:', error)
      return NextResponse.json({ error: 'Failed to count today new words' }, { status: 500 })
    }

    return NextResponse.json({ count: count || 0 })
  } catch (error) {
    console.error('[API Stats] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
