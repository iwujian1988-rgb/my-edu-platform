/**
 * 诊断已上传视频的单词数据
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnoseVideoWords() {
  console.log('🔍 诊断视频单词数据...')
  console.log('========================================\n')

  // 获取最近上传的5个InnerFrench视频
  const { data: videos, error: videosError } = await supabase
    .from('videos')
    .select('id, title, created_at')
    .eq('creator_name', 'InnerFrench 中级法语')
    .order('created_at', { ascending: false })
    .limit(5)

  if (videosError) {
    console.log('❌ 获取视频失败:', videosError.message)
    return
  }

  console.log(`📹 找到 ${videos.length} 个最近上传的视频\n`)

  for (const video of videos) {
    console.log(`📹 ${video.title}`)
    console.log(`   ID: ${video.id}`)
    console.log(`   创建时间: ${new Date(video.created_at).toLocaleString('zh-CN')}`)

    // 1. 检查学习材料
    const { data: materials, error: materialsError } = await supabase
      .from('video_learning_materials')
      .select('material_json')
      .eq('video_id', video.id)
      .single()

    if (materialsError || !materials) {
      console.log(`   ❌ 未找到学习材料`)
    } else {
      const vocabCount = materials.material_json?.language_analysis?.vocabulary?.length || 0
      console.log(`   📚 学习材料中的单词数: ${vocabCount}`)
    }

    // 2. 检查单词数据
    const { count, error: countError } = await supabase
      .from('video_words')
      .select('*', { count: 'exact', head: true })
      .eq('video_id', video.id)

    if (countError) {
      console.log(`   ❌ 获取单词数失败: ${countError.message}`)
    } else {
      console.log(`   📊 video_words表中的单词数: ${count || 0}`)
    }

    // 3. 检查单词卡片
    const { data: wordCard, error: cardError } = await supabase
      .from('video_word_cards')
      .select('words_count')
      .eq('video_id', video.id)
      .single()

    if (cardError || !wordCard) {
      console.log(`   ❌ 未找到单词卡片计数`)
    } else {
      console.log(`   🎴 单词卡片计数: ${wordCard.words_count}`)
    }

    // 4. 检查实际的单词数据
    if (count && count > 0) {
      const { data: words, error: wordsError } = await supabase
        .from('video_words')
        .select('word, chinese_definition, example_sentence, phonetic, part_of_speech')
        .eq('video_id', video.id)
        .limit(5)

      if (wordsError) {
        console.log(`   ❌ 获取单词详情失败: ${wordsError.message}`)
      } else if (words && words.length > 0) {
        console.log(`   📝 前5个单词详情:`)
        for (let i = 0; i < words.length; i++) {
          const word = words[i]
          const hasDef = word.chinese_definition && word.chinese_definition.trim() !== ''
          const hasEx = word.example_sentence && word.example_sentence.trim() !== ''
          const hasPhonetic = word.phonetic && word.phonetic.trim() !== ''
          const hasPos = word.part_of_speech && word.part_of_speech.trim() !== ''

          console.log(`      ${i + 1}. ${word.word}`)
          console.log(`         音标: ${hasPhonetic ? '✅' : '❌'} ${word.phonetic || '无'}`)
          console.log(`         词性: ${hasPos ? '✅' : '❌'} ${word.part_of_speech || '无'}`)
          console.log(`         释义: ${hasDef ? '✅' : '❌'} ${word.chinese_definition || '无'}`)
          console.log(`         例句: ${hasEx ? '✅' : '❌'} ${word.example_sentence || '无'}`)
        }
      }
    }

    console.log('')
  }

  console.log('========================================')
}

diagnoseVideoWords().catch(console.error)