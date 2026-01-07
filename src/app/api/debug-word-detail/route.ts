import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const supabase = await createClient()

  // 查询那两个"不认识"的单词的完整信息
  const wordIds = [
    '47be1353-ec06-476f-90a1-aa7e9cd7f472',
    'f1b1b221-18d6-4266-a464-34b125339840'
  ]

  // 1. 查询 word_progress 表
  const { data: progressData, error: progressError } = await supabase
    .from('word_progress')
    .select('*')
    .in('word_id', wordIds)
    .eq('user_id', user.id)

  // 2. 查询 words 表，获取单词的详细信息
  const { data: wordsData, error: wordsError } = await supabase
    .from('words')
    .select('*')
    .in('id', wordIds)

  // 3. 对比：查询一个正常单词作为参考
  const { data: referenceWord, error: refError } = await supabase
    .from('words')
    .select('*')
    .eq('id', '978fc887-5cbb-4a6b-9c95-640eccfbe1da')
    .single()

  return NextResponse.json({
    progress: {
      data: progressData,
      error: progressError?.message
    },
    words: {
      data: wordsData,
      error: wordsError?.message
    },
    reference: {
      data: referenceWord,
      error: refError?.message
    }
  })
}
