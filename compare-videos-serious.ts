/**
 * 认真分析：对比有单词和没单词的视频
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function seriousAnalysis() {
  console.log('🔍 认真分析：对比有单词和没单词的视频')
  console.log('========================================\n')

  // 1. 找出有单词的视频
  const { data: videosWithWords, error: wordsError } = await supabase
    .from('video_word_cards')
    .select('video_id')
    .limit(1)

  if (wordsError || !videosWithWords || videosWithWords.length === 0) {
    console.log('❌ 没有找到有单词的视频')
    return
  }

  const videoWithWordsId = videosWithWords[0].video_id

  // 2. 获取有单词视频的详细信息
  const { data: videoWithWords } = await supabase
    .from('videos')
    .select('*')
    .eq('id', videoWithWordsId)
    .single()

  console.log('✅ 有单词的视频:')
  console.log(`   ID: ${videoWithWords.id}`)
  console.log(`   标题: ${videoWithWords.title}`)
  console.log(`   创建时间: ${videoWithWords.created_at}`)

  // 3. 检查这个视频的所有数据
  const tables = ['video_learning_materials', 'video_word_cards', 'video_words']
  console.log('\n📊 有单词视频的数据:')

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('video_id', videoWithWordsId)

    if (error) {
      console.log(`   ${table}: ❌ ${error.message}`)
    } else {
      console.log(`   ${table}: ${count || 0} 条`)
    }
  }

  // 4. 对比没有单词的视频（我刚上传的）
  const videoWithoutWordsId = '612ad55a-99e1-4722-a2b9-75a26730a693'

  const { data: videoWithoutWords } = await supabase
    .from('videos')
    .select('*')
    .eq('id', videoWithoutWordsId)
    .single()

  console.log('\n❌ 没有单词的视频:')
  console.log(`   ID: ${videoWithoutWords.id}`)
  console.log(`   标题: ${videoWithoutWords.title}`)
  console.log(`   创建时间: ${videoWithoutWords.created_at}`)

  console.log('\n📊 没有单词视频的数据:')
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('video_id', videoWithoutWordsId)

    if (error) {
      console.log(`   ${table}: ❌ ${error.message}`)
    } else {
      console.log(`   ${table}: ${count || 0} 条`)
    }
  }

  // 5. 关键对比
  console.log('\n🔑 关键发现:')

  // 检查有单词视频是否有learning_materials
  const { data: materialsWithWords } = await supabase
    .from('video_learning_materials')
    .select('material_json')
    .eq('video_id', videoWithWordsId)
    .maybeSingle()

  console.log(`有单词视频有learning_materials: ${!!materialsWithWords}`)

  // 检查没有单词视频是否有learning_materials
  const { data: materialsWithoutWords } = await supabase
    .from('video_learning_materials')
    .select('material_json')
    .eq('video_id', videoWithoutWordsId)
    .maybeSingle()

  console.log(`没有单词视频有learning_materials: ${!!materialsWithoutWords}`)

  // 6. 如果有单词视频有learning_materials，检查其内容
  if (materialsWithWords) {
    const vocab = materialsWithWords.material_json?.language_analysis?.vocabulary || []
    console.log(`\n有单词视频的learning_materials中单词数: ${vocab.length}`)
  }
}

seriousAnalysis().catch(console.error)