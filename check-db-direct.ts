/**
 * 直接检查数据库中的单词数据
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA1MDk2MzcsImV4cCI6MjA0NjA4NTYzN30.Ul_hNXCjCpRQEYckcxWuBHjH0I8C3OrZNVK6E6L3qxA'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDatabase() {
  console.log('🔍 检查数据库中的单词数据...\n')

  // 获取最近上传的5个InnerFrench视频
  const { data: videos, error: videosError } = await supabase
    .from('videos')
    .select('id, title')
    .eq('creator_name', 'InnerFrench 中级法语')
    .order('created_at', { ascending: false })
    .limit(5)

  if (videosError) {
    console.log('❌ 获取视频失败:', videosError.message)
    return
  }

  console.log(`📹 找到 ${videos.length} 个视频\n`)

  for (const video of videos) {
    console.log(`📹 ${video.title}`)
    console.log(`   ID: ${video.id}`)

    // 检查单词数量
    const { count, error: countError } = await supabase
      .from('video_words')
      .select('*', { count: 'exact', head: true })
      .eq('video_id', video.id)

    if (countError) {
      console.log(`   ❌ 获取单词数失败: ${countError.message}`)
    } else {
      console.log(`   📊 单词总数: ${count || 0}`)
    }

    // 检查单词详情
    const { data: words, error: wordsError } = await supabase
      .from('video_words')
      .select('word, chinese_definition, example_sentence')
      .eq('video_id', video.id)
      .limit(3)

    if (wordsError) {
      console.log(`   ❌ 获取单词详情失败: ${wordsError.message}`)
    } else if (words && words.length > 0) {
      console.log(`   📝 前3个单词:`)
      for (let i = 0; i < words.length; i++) {
        const word = words[i]
        const hasDef = word.chinese_definition && word.chinese_definition.trim() !== ''
        const hasEx = word.example_sentence && word.example_sentence.trim() !== ''
        console.log(`      ${i + 1}. ${word.word} - ${hasDef ? '✅' : '❌'}释义 ${hasEx ? '✅' : '❌'}例句`)
        if (hasDef) {
          console.log(`         释义: ${word.chinese_definition}`)
        }
      }
    } else {
      console.log(`   ⚠️  没有单词数据`)
    }

    console.log('')
  }
}

checkDatabase().catch(console.error)