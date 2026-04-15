/**
 * 手动创建视频并测试word_cards生成
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function manualCreateVideo() {
  console.log('🧪 手动创建视频并测试word_cards生成')
  console.log('========================================\n')

  // 1. 创建视频和字幕
  const { data: video, error: videoError } = await supabase
    .from('videos')
    .insert({
      title: 'E174 测试',
      creator_name: 'InnerFrench 中级法语',
      video_url: 'https://test.com/test.mp3',
      status: 'published',
      language: 'fr'
    })
    .select()
    .single()

  if (videoError) {
    console.log('❌ 创建视频失败:', videoError.message)
    return
  }

  console.log('✅ 创建视频成功:', video.id)

  // 2. 创建字幕
  const subtitlesData = [
    {
      video_id: video.id,
      original_text: 'Test sentence with immersion.',
      chinese_text: '包含immersion的测试句子。',
      start_time: 0,
      end_time: 3,
      display_order: 0
    }
  ]

  const { error: subtitlesError } = await supabase
    .from('video_subtitles')
    .insert(subtitlesData)

  if (subtitlesError) {
    console.log('❌ 创建字幕失败:', subtitlesError.message)
    return
  }

  console.log('✅ 创建字幕成功')

  // 3. 读取E176的vocabulary数据
  const jsonData = JSON.parse(fs.readFileSync('./linshi/InnerFrench 中级法语_processed/E176 À la découverte des côtes normandes et bretonnes_materials.json', 'utf-8'))
  const vocab = jsonData.materials.unit_1.language_analysis.vocabulary

  console.log(`📚 读取到 ${vocab.length} 个单词`)

  // 4. 模拟video-processor的单词处理逻辑
  const { cleanWord } = await import('./src/lib/batch-upload/utils.ts')
  const { uniqueArray } = await import('./src/lib/batch-upload/utils.ts')

  const uniqueWords = uniqueArray(
    vocab.map((v) => ({
      word: cleanWord(v.french),
      original: v,
    })).filter((v) => v.word),
    'word'
  )

  console.log(`🔍 cleanWord后: ${uniqueWords.length} 个单词`)

  if (uniqueWords.length > 0) {
    // 创建word_cards
    const wordCards = uniqueWords.slice(0, 3).map((v, idx) => ({
      video_id: video.id,
      word: v.word,
      chinese_definition: v.original.chinese || '',
      phonetic: v.original.ipa || null,
      part_of_speech: v.original.part_of_speech || null,
      example_sentence: v.original.example_sentence?.french || null,
      example_sentence_cn: v.original.example_sentence?.chinese || null,
      display_order: idx,
      is_reviewed: true
    }))

    console.log('📝 准备插入word_cards:', wordCards.length)

    // 插入word_cards
    const { error: wordsError } = await supabase
      .from('video_word_cards')
      .insert(wordCards)

    if (wordsError) {
      console.log('❌ 插入word_cards失败:', wordsError.message)
    } else {
      console.log('✅ 插入word_cards成功')

      // 验证
      const { count } = await supabase
        .from('video_word_cards')
        .select('*', { count: 'exact', head: true })
        .eq('video_id', video.id)

      console.log(`📊 验证: ${count} 个word_cards`)
    }
  }

  console.log('\n========================================')
  console.log('✅ 测试完成')
}

manualCreateVideo().catch(console.error)