/**
 * 检查生产环境中的测试数据
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTestData() {
  console.log('🔍 检查生产环境中的测试数据')
  console.log('========================================\n')

  // 检查是否有测试视频
  const { data: videos, error } = await supabase
    .from('videos')
    .select('id, title, created_at')
    .eq('creator_name', 'InnerFrench 中级法语')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.log('❌ 查询失败:', error.message)
    return
  }

  if (!videos || videos.length === 0) {
    console.log('✅ 没有测试数据')
    return
  }

  console.log(`📹 找到 ${videos.length} 个视频:\n`)

  for (const video of videos) {
    const { count: wordCardsCount } = await supabase
      .from('video_word_cards')
      .select('*', { count: 'exact', head: true })
      .eq('video_id', video.id)

    console.log(`📹 ${video.title}`)
    console.log(`   创建时间: ${new Date(video.created_at).toLocaleString('zh-CN')}`)
    console.log(`   word_cards: ${wordCardsCount || 0} 条 ${wordCardsCount > 0 ? '✅' : '❌'}`)
    console.log('')
  }

  console.log('========================================')
}

checkTestData().catch(console.error)