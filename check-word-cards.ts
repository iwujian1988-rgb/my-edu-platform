/**
 * 检查video_word_cards表的数据
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkWordCards() {
  const videoId = '612ad55a-99e1-4722-a2b9-75a26730a693'

  console.log('🔍 检查 video_word_cards 表...')

  // 检查video_word_cards表
  const { data: wordCards, error: cardsError } = await supabase
    .from('video_word_cards')
    .select('*')
    .eq('video_id', videoId)

  if (cardsError) {
    console.log('❌ 查询失败:', cardsError.message)
  } else {
    console.log(`✅ 找到 ${wordCards?.length || 0} 条记录`)
    if (wordCards && wordCards.length > 0) {
      console.log('前3条:', wordCards.slice(0, 3))
    }
  }

  // 同时检查video_words表
  console.log('\n🔍 检查 video_words 表...')
  const { data: words, error: wordsError } = await supabase
    .from('video_words')
    .select('*')
    .eq('video_id', videoId)

  if (wordsError) {
    console.log('❌ 查询失败:', wordsError.message)
  } else {
    console.log(`✅ 找到 ${words?.length || 0} 条记录`)
    if (words && words.length > 0) {
      console.log('前3条:', words.slice(0, 3))
    }
  }
}

checkWordCards().catch(console.error)