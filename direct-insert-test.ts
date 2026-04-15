/**
 * 直接测试插入word_cards数据
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDirectInsert() {
  console.log('🧪 直接测试插入word_cards数据')
  console.log('========================================\n')

  // 1. 创建测试视频
  const { data: video, error: videoError } = await supabase
    .from('videos')
    .insert({
      title: '测试单词卡片生成',
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

  console.log('✅ 创建测试视频成功:', video.id)

  // 2. 读取E176的JSON数据
  const jsonData = JSON.parse(fs.readFileSync('./linshi/InnerFrench 中级法语_processed/E176 À la découverte des côtes normandes et bretonnes_materials.json', 'utf-8'))
  const vocab = jsonData.materials.unit_1.language_analysis.vocabulary

  console.log(`📚 读取到 ${vocab.length} 个单词`)

  // 3. 创建word_cards
  const wordCards = vocab.slice(0, 3).map((v, idx) => ({
    video_id: video.id,
    word: v.french,
    chinese_definition: v.chinese || '',
    phonetic: v.ipa || null,
    part_of_speech: v.part_of_speech || null,
    example_sentence: v.example_sentence?.french || null,
    example_sentence_cn: v.example_sentence?.chinese || null,
    display_order: idx,
    is_reviewed: true
  }))

  console.log('📝 准备插入word_cards:', wordCards.length)

  // 4. 插入word_cards
  const { error: insertError } = await supabase
    .from('video_word_cards')
    .insert(wordCards)

  if (insertError) {
    console.log('❌ 插入word_cards失败:', insertError.message)
    console.log('   详细错误:', insertError)
  } else {
    console.log('✅ 插入word_cards成功')

    // 验证插入结果
    const { count } = await supabase
      .from('video_word_cards')
      .select('*', { count: 'exact', head: true })
      .eq('video_id', video.id)

    console.log(`   验证: ${count} 个word_cards`)
  }

  // 清理测试数据
  await supabase.from('videos').delete().eq('id', video.id)
  console.log('\n🧹 清理测试数据完成')
}

testDirectInsert().catch(console.error)