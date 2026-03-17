import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ngbcfcqlgjbcfcjppp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nYmNmY3FsZ2piY2ZjanBwcCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM2NzY1NzQ4LCJleHAiOjMzNzgxODIxNDh9.XlWWu_3wV97f-Fw6gQn4Cg0c2-kD1Zq_LcBgOVn5nM0'
)

const BOOK_ID = '003b4ce0-c3f9-407a-a7d6-5e80ada4eae5'
const USER_ID = '7078b0aa-d06a-4209-b669-1a0d4985c8ea'

async function main() {
  // 直接查 words 表，不用 filter
  const { data: words, error, count } = await supabase
    .from('words')
    .select('id, word, book_id', { count: 'exact' })
    .eq('book_id', BOOK_ID)
    .limit(5)
  
  console.log('words 查询结果:', { error, count, sampleSize: words?.length })
  if (words) {
    console.log('前5个单词:', words.map(w => w.word))
  }
  
  // 查 word_progress 表
  const { data: progress, error: pErr, count: pCount } = await supabase
    .from('word_progress')
    .select('id, word_id, user_id, book_id, status', { count: 'exact' })
    .eq('user_id', USER_ID)
    .eq('book_id', BOOK_ID)
    .limit(5)
  
  console.log('\nword_progress 查询结果:', { error: pErr, count: pCount, sampleSize: progress?.length })
  if (progress) {
    console.log('前5条进度:', progress.map(p => ({ word_id: p.word_id?.slice(0,8), status: p.status })))
  }
  
  // 看看这本书的 info
  const { data: book } = await supabase
    .from('books')
    .select('id, title, total_words')
    .eq('id', BOOK_ID)
    .single()
  
  console.log('\n书本信息:', book)
}

main().catch(console.error)
