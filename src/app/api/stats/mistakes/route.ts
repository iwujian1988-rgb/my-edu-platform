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

    // 统计错题数量
    const { count, error } = await supabase
      .from('word_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['unknown', 'fuzzy'])

    if (error) {
      console.error('[API Stats] Error counting mistakes:', error)
      return NextResponse.json({ error: 'Failed to count mistakes' }, { status: 500 })
    }

    return NextResponse.json({ count: count || 0 })
  } catch (error) {
    console.error('[API Stats] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
