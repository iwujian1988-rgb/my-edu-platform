/**
 * 检查出错视频的基本信息
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkVideo() {
  const videoId = '612ad55a-99e1-4722-a2b9-75a26730a693'

  console.log('🔍 检查视频:', videoId)

  // 1. 检查视频基本信息
  const { data: video, error: videoError } = await supabase
    .from('videos')
    .select('*')
    .eq('id', videoId)
    .single()

  if (videoError) {
    console.log('❌ 视频不存在:', videoError.message)
    return
  }

  console.log('📹 视频信息:')
  console.log(`   标题: ${video.title}`)
  console.log(`   创建时间: ${video.created_at}`)
  console.log(`   状态: ${video.status}`)

  // 2. 检查相关数据表
  const tables = [
    'video_subtitles',
    'video_learning_materials',
    'video_words',
    'video_expressions',
    'video_grammar_points',
    'video_pronunciation_tips',
    'video_vocabulary_networks',
    'video_exercises',
    'video_word_cards'
  ]

  console.log('\n📊 数据表统计:')
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('video_id', videoId)

    if (error) {
      console.log(`   ❌ ${table}: 查询失败 - ${error.message}`)
    } else {
      console.log(`   ${table}: ${count || 0} 条`)
    }
  }

  // 3. 检查学习材料内容
  const { data: materials } = await supabase
    .from('video_learning_materials')
    .select('material_json')
    .eq('video_id', videoId)
    .maybeSingle()

  if (materials) {
    console.log('\n📚 学习材料:')
    const vocab = materials.material_json?.language_analysis?.vocabulary || []
    console.log(`   单词数量: ${vocab.length}`)
  } else {
    console.log('\n❌ 没有学习材料')
  }
}

checkVideo().catch(console.error)