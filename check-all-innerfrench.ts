/**
 * 检查所有InnerFrench视频
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRsZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAllInnerFrench() {
  console.log('🔍 检查所有InnerFrench视频')
  console.log('========================================\n')

  const { data: videos } = await supabase
    .from('videos')
    .select('id, title, created_at')
    .eq('creator_name', 'InnerFrench 中级法语')
    .order('created_at', { ascending: false })

  if (!videos || videos.length === 0) {
    console.log('❌ 没有找到任何InnerFrench视频')
    return
  }

  console.log(`📹 总共 ${videos.length} 个InnerFrench视频\n`)

  for (const video of videos) {
    const { count: wordCardsCount } = await supabase
      .from('video_word_cards')
      .select('*', { count: 'exact', head: true })
      .eq('video_id', video.id)

    const hasWordCards = (wordCardsCount || 0) > 0

    console.log(`${video.title}`)
    console.log(`   创建时间: ${new Date(video.created_at).toLocaleString('zh-CN')}`)
    console.log(`   word_cards: ${wordCardsCount || 0} 条 ${hasWordCards ? '✅' : '❌'}`)
    console.log('')
  }

  // 统计有word_cards的视频
  const withCards = videos.filter(async (v) => {
    const { count } = await supabase
      .from('video_word_cards')
      .select('*', { count: 'exact', head: true })
      .eq('video_id', v.id)
    return (count || 0) > 0
  })

  console.log('========================================')
  console.log(`📊 统计: ${videos.length} 个视频中，有word_cards的: ? 个`)
}

checkAllInnerFrench().catch(console.error)