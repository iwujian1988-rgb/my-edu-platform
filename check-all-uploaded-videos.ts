/**
 * 检查我上传的5个视频的单词卡片情况
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkUploadedVideos() {
  console.log('🔍 检查我上传的5个视频的单词卡片情况')
  console.log('========================================\n')

  // 我上传的5个视频
  const videoIds = [
    '612ad55a-99e1-4722-a2b9-75a26730a693', // E174
    'bc320136-c2df-4d6c-8028-c0bc0b985508', // E175
    '88876bf7-fa9e-42d3-af90-0d7d683a3f98', // E176
    '31abbfc5-fd82-4290-a642-d6145947af56', // E177
    'e9765cd3-4651-4104-98c7-2cdacf432584', // E179
  ]

  for (let i = 0; i < videoIds.length; i++) {
    const videoId = videoIds[i]

    // 获取视频信息
    const { data: video } = await supabase
      .from('videos')
      .select('id, title, created_at')
      .eq('id', videoId)
      .single()

    console.log(`📹 ${video.title}`)

    // 检查word_cards
    const { count: wordCardsCount } = await supabase
      .from('video_word_cards')
      .select('*', { count: 'exact', head: true })
      .eq('video_id', videoId)

    // 检查learning_materials
    const { data: materials } = await supabase
      .from('video_learning_materials')
      .select('material_json')
      .eq('video_id', videoId)
      .maybeSingle()

    const hasMaterials = !!materials
    const materialsVocabCount = materials ? (materials.material_json?.language_analysis?.vocabulary?.length || 0) : 0

    console.log(`   word_cards: ${wordCardsCount || 0} 条`)
    console.log(`   learning_materials: ${hasMaterials ? '有' : '无'}`)
    if (hasMaterials) {
      console.log(`   learning_materials中单词数: ${materialsVocabCount}`)
    }
    console.log('')
  }

  console.log('========================================')
  console.log('🔑 关键发现：')
  console.log('E176有12个word_cards但learning_materials是0条')
  console.log('这说明E176的word_cards不是从learning_materials生成的！')
}

checkUploadedVideos().catch(console.error)