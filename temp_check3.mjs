import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ngbcfcqlgjbcfcjppp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nYmNmY3FsZ2piY2ZjanBwcCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM2NzY1NzQ4LCJleHAiOjMzNzgxODIxNDh9.XlWWu_3wV97f-Fw6gQn4Cg0c2-kD1Zq_LcBgOVn5nM0'
)

const BOOK_ID = '003b4ce0-c3f9-407a-a7d6-5e80ada4eae5'
const USER_ID = '7078b0aa-d06a-4209-b669-1a0d4985c8ea'

async function main() {
  console.log('开始查询...')
  
  // 1. 查询单词总数
  const { count: totalWords, error: wErr } = await supabase
    .from('words')
    .select('id', { count: 'exact', head: true })
    .eq('book_id', BOOK_ID)
  
  if (wErr) {
    console.log('查询单词出错:', wErr)
    return
  }
  console.log('📚 书中单词总数:', totalWords)

  // 2. 查询用户进度
  const { data: progress, error: pErr } = await supabase
    .from('word_progress')
    .select('status')
    .eq('user_id', USER_ID)
    .eq('book_id', BOOK_ID)
  
  if (pErr) {
    console.log('查询进度出错:', pErr)
    return
  }
  
  const stats = { known: 0, unknown: 0, fuzzy: 0, new: 0 }
  progress?.forEach(p => {
    if (p.status && stats.hasOwnProperty(p.status)) stats[p.status]++
  })
  
  console.log('\n📊 用户进度分布:')
  console.log('  known (认识):', stats.known)
  console.log('  unknown (不认识):', stats.unknown)
  console.log('  fuzzy (模糊):', stats.fuzzy)
  console.log('  new (未标注):', stats.new)
  console.log('  有进度记录:', progress?.length || 0)
  
  // 3. 计算连连看可用
  const available = (totalWords || 0) - stats.known
  console.log('\n🎮 连连看可用单词:', available)
}

main().catch(e => console.log('错误:', e.message))
