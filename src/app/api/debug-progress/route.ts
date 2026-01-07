import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const user = await getCurrentUser()
  const supabase = await createClient()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // 查询当前用户的word_progress记录
  const { data: allProgress, error } = await supabase
    .from('word_progress')
    .select('*')
    .eq('user_id', user.id)
    .limit(20)

  // 统计各状态的单词数量
  const { data: statusStats } = await supabase
    .from('word_progress')
    .select('status')
    .eq('user_id', user.id)

  const statusCount = {
    new: 0,
    known: 0,
    fuzzy: 0,
    unknown: 0
  }

  statusStats?.forEach((record: any) => {
    if (record.status in statusCount) {
      statusCount[record.status as keyof typeof statusCount]++
    }
  })

  return NextResponse.json({
    currentUser: user.email,
    userId: user.id,
    totalRecords: statusStats?.length || 0,
    statusCount,
    sampleRecords: allProgress?.slice(0, 5),
    error
  })
}
