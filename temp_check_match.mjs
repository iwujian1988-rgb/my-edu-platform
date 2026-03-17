import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ngbcfcqlgjbcfcjppp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nYmNmY3FsZ2piY2ZjanBwcCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM2NzY1NzQ4LCJleHAiOjMzNzgxODIxNDh9.XlWWu_3wV97f-Fw6gQn4Cg0c2-kD1Zq_LcBgOVn5nM0'
)

const BOOK_ID = '003b4ce0-c3f9-407a-a7d6-5e80ada4eae5'
const USER_ID = '7078b0aa-d06a-4209-b669-1a0d4985c8ea'

async function main() {
  // 1. 查询单词总数
  const { count: totalWords } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .eq('book_id', BOOK_ID)
  
  console.log('📚 书中单词总数:', totalWords)

  // 2. 查询用户进度分布
  const { data: progress } = await supabase
    .from('word_progress')
    .select('status')
    .eq('user_id', USER_ID)
    .eq('book_id', BOOK_ID)
  
  const statusCount = {
    known: 0,
    unknown: 0,
    fuzzy: 0,
    new: 0
  }
  
  progress?.forEach(p => {
    statusCount[p.status] = (statusCount[p.status] || 0) + 1
  })
  
  console.log('\n📊 用户进度分布:')
  console.log('  - known (认识):', statusCount.known)
  console.log('  - unknown (不认识):', statusCount.unknown)
  console.log('  - fuzzy (模糊):', statusCount.fuzzy)
  console.log('  - new (未标注):', statusCount.new)
  console.log('  - 总计有进度:', progress?.length || 0)
  
  // 3. 计算未标记为known的数量
  const notKnown = totalWords - statusCount.known
  console.log('\n🎮 连连看可用单词 (非known):', notKnown)
  
  // 4. 检查是否有重复单词
  const { data: words } = await supabase
    .from('words')
    .select('word')
    .eq('book_id', BOOK_ID)
    .limit(100)
  
  const uniqueWords = new Set(words?.map(w => w.word))
  console.log('\n🔍 前100条记录中唯一单词数:', uniqueWords.size, '/ 100')
}

main().catch(console.error)
