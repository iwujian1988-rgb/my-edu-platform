/**
 * 找出有单词数据的视频
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function findWordsVideos() {
  console.log('🔍 查找有单词数据的视频...')
  console.log('========================================\n')

  // 获取所有InnerFrench视频
  const { data: videos, error: videosError } = await supabase
    .from('videos')
    .select('id, title, created_at')
    .eq('creator_name', 'InnerFrench 中级法语')
    .order('created_at', { ascending: false })

  if (videosError) {
    console.log('❌ 获取视频失败:', videosError.message)
    return
  }

  console.log(`📹 总共找到 ${videos.length} 个视频\n`)

  const videosWithWords = []
  const videosWithoutWords = []

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

    if (hasWords) {
      videosWithWords.push({ video, hasMaterials, wordCount: count })
    } else {
      videosWithoutWords.push({ video, hasMaterials })
    }
  }

  console.log(`✅ 有单词数据的视频 (${videosWithWords.length}个):`)
  for (const item of videosWithWords) {
    console.log(`   📹 ${item.video.title}`)
    console.log(`      创建时间: ${new Date(item.video.created_at).toLocaleString('zh-CN')}`)
    console.log(`      学习材料: ${item.hasMaterials ? '✅' : '❌'}`)
    console.log(`      单词数: ${item.wordCount}`)
    console.log('')
  }

  console.log(`\n❌ 没有单词数据的视频 (${videosWithoutWords.length}个):`)
  for (const item of videosWithoutWords.slice(0, 10)) { // 只显示前10个
    console.log(`   📹 ${item.video.title}`)
    console.log(`      创建时间: ${new Date(item.video.created_at).toLocaleString('zh-CN')}`)
    console.log(`      学习材料: ${item.hasMaterials ? '✅' : '❌'}`)
  }
  if (videosWithoutWords.length > 10) {
    console.log(`   ... 还有 ${videosWithoutWords.length - 10} 个`)
  }

  console.log('\n========================================')
}

findWordsVideos().catch(console.error)