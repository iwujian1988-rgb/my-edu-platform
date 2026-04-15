/**
 * 直接查看数据库中的学习材料和单词数据
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDatabaseData() {
  console.log('🔍 查看数据库数据...\n')

  // 查看最近上传的视频
  const { data: videos, error: videosError } = await supabase
    .from('videos')
    .select('id, title, created_at')
    .eq('creator_name', 'InnerFrench 中级法语')
    .order('created_at', { ascending: false })
    .limit(3)

  if (videosError) {
    console.log('❌ 获取视频失败:', videosError.message)
    return
  }

  console.log(`📹 找到 ${videos.length} 个视频\n`)

  for (const video of videos) {
    console.log(`📹 ${video.title}`)
    console.log(`   ID: ${video.id}`)

    // 检查学习材料
    const { data: materials, error: materialsError } = await supabase
      .from('video_learning_materials')
      .select('material_json')
      .eq('video_id', video.id)
      .maybeSingle()

    if (materialsError || !materials) {
      console.log('   ❌ 没有学习材料')
    } else {
      const vocab = materials.material_json?.language_analysis?.vocabulary || []
      console.log(`   ✅ 有学习材料 - 单词数: ${vocab.length}`)

      if (vocab.length > 0) {
        console.log('   前3个单词:')
        for (let i = 0; i < Math.min(3, vocab.length); i++) {
          const v = vocab[i]
          console.log(`      ${i + 1}. ${v.french} - ${v.chinese || '无'}`)
        }
      }
    }

    // 检查单词数据
    const { count, data: words } = await supabase
      .from('video_words')
      .select('word, chinese_definition')
      .eq('video_id', video.id)

    console.log(`   📊 video_words: ${count || 0} 个`)

    if (words && words.length > 0) {
      console.log('   前3个单词:')
      for (let i = 0; i < Math.min(3, words.length); i++) {
        const w = words[i]
        console.log(`      ${i + 1}. ${w.word} - ${w.chinese_definition || '无'}`)
      }
    }

    console.log('')
  }
}

checkDatabaseData().catch(console.error)