/**
 * 检查特定视频的单词数据
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkVideo() {
  const videoId = '88876bf7-fa9e-42d3-af90-0d7d683a3f98'

  console.log('🔍 检查视频:', videoId)
  console.log('========================================\n')

  // 1. 获取视频信息
  const { data: video } = await supabase
    .from('videos')
    .select('id, title, created_at')
    .eq('id', videoId)
    .single()

  console.log('📹 视频信息:')
  console.log(`   标题: ${video?.title}`)
  console.log(`   创建时间: ${video?.created_at ? new Date(video.created_at).toLocaleString('zh-CN') : 'N/A'}`)

  // 2. 获取学习材料
  const { data: materials } = await supabase
    .from('video_learning_materials')
    .select('material_json')
    .eq('video_id', videoId)
    .single()

  console.log('\n📚 学习材料:')
  if (materials) {
    const vocabCount = materials.material_json?.language_analysis?.vocabulary?.length || 0
    console.log(`   ✅ 有学习材料`)
    console.log(`   单词列表数量: ${vocabCount}`)

    if (vocabCount > 0) {
      console.log('\n   前5个原始单词:')
      const vocab = materials.material_json?.language_analysis?.vocabulary || []
      for (let i = 0; i < Math.min(5, vocab.length); i++) {
        const v = vocab[i]
        console.log(`      ${i + 1}. ${v.french} - ${v.chinese || '无释义'}`)
      }
    }
  } else {
    console.log('   ❌ 无学习材料')
  }

  // 3. 获取单词数据
  const { count, data: words } = await supabase
    .from('video_words')
    .select('*', { count: 'exact' })
    .eq('video_id', videoId)

  console.log('\n📊 video_words表:')
  console.log(`   单词数量: ${count || 0}`)

  if (words && words.length > 0) {
    console.log('\n   前5个单词:')
    for (let i = 0; i < Math.min(5, words.length); i++) {
      const w = words[i]
      const hasDef = w.chinese_definition && w.chinese_definition.trim() !== ''
      console.log(`      ${i + 1}. ${w.word} - ${hasDef ? '✅' : '❌'} ${w.chinese_definition || '无释义'}`)
    }
  }

  console.log('\n========================================')
}

checkVideo().catch(console.error)