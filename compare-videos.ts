/**
 * 比较有单词和没单词的视频
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function compareVideos() {
  console.log('🔍 比较有单词和没单词的视频...')
  console.log('========================================\n')

  // 获取所有InnerFrench视频
  const { data: videos, error: videosError } = await supabase
    .from('videos')
    .select('id, title, created_at')
    .eq('creator_name', 'InnerFrench 中级法语')
    .order('created_at', { ascending: false })
    .limit(10)

  if (videosError) {
    console.log('❌ 获取视频失败:', videosError.message)
    return
  }

  console.log(`📹 找到 ${videos.length} 个视频\n`)

  for (const video of videos) {
    // 检查学习材料
    const { data: materials } = await supabase
      .from('video_learning_materials')
      .select('material_json')
      .eq('video_id', video.id)
      .maybeSingle()

    // 检查单词数量
    const { count } = await supabase
      .from('video_words')
      .select('*', { count: 'exact', head: true })
      .eq('video_id', video.id)

    const hasMaterials = !!materials
    const hasWords = (count || 0) > 0

    console.log(`📹 ${video.title}`)
    console.log(`   创建时间: ${new Date(video.created_at).toLocaleString('zh-CN')}`)
    console.log(`   学习材料: ${hasMaterials ? '✅ 有' : '❌ 无'}`)
    console.log(`   单词数据: ${hasWords ? `✅ 有 (${count}个)` : '❌ 无'}`)
    console.log('')
  }

  console.log('========================================')
}

compareVideos().catch(console.error)