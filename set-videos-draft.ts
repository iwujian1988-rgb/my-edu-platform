/**
 * 将所有InnerFrench视频改为草稿状态
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function setVideosToDraft() {
  console.log('📝 将所有InnerFrench视频改为草稿状态...')

  const { data: videos, error: fetchError } = await supabase
    .from('videos')
    .select('id, title, status')
    .eq('creator_name', 'InnerFrench 中级法语')

  if (fetchError) {
    console.log('❌ 查询失败:', fetchError.message)
    return
  }

  console.log(`\n找到 ${videos.length} 个视频:\n`)

  for (const video of videos) {
    console.log(`📹 ${video.title}`)
    console.log(`   当前状态: ${video.status}`)

    if (video.status !== 'draft') {
      const { error: updateError } = await supabase
        .from('videos')
        .update({ status: 'draft' })
        .eq('id', video.id)

      if (updateError) {
        console.log(`   ❌ 更新失败: ${updateError.message}`)
      } else {
        console.log(`   ✅ 已改为草稿状态`)
      }
    } else {
      console.log(`   ✅ 已经是草稿状态`)
    }
    console.log('')
  }

  console.log('========================================')
  console.log('✅ 状态更新完成')
}

setVideosToDraft().catch(console.error)
