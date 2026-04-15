/**
 * 检查视频单词数据问题
 */

import { createAdminClient } from './src/lib/supabase/server.js'

async function checkVideoWords() {
  const supabase = await createAdminClient()
  const videoId = '0563f9d6-1ef7-4393-8e6f-54e42f9d366b'

  console.log('🔍 检查视频单词数据...')
  console.log('========================================')

  // 1. 获取视频基本信息
  const { data: video, error: videoError } = await supabase
    .from('videos')
    .select('id, title, created_at')
    .eq('id', videoId)
    .single()

  if (videoError) {
    console.log('❌ 获取视频信息失败:', videoError.message)
    return
  }

  console.log('📹 视频信息:')
  console.log(`  ID: ${video.id}`)
  console.log(`  标题: ${video.title}`)
  console.log(`  创建时间: ${video.created_at}`)

  // 2. 检查单词数量
  const { data: words, error: wordsError } = await supabase
    .from('video_words')
    .select('id, word, word french, pronunciation, part_of_speech, definition_cn, definition_fr, example_fr, example_cn, level, frequency_rank, is_core_word')
    .eq('video_id', videoId)
    .limit(10)

  if (wordsError) {
    console.log('❌ 获取单词数据失败:', wordsError.message)
    return
  }

  console.log(`\n📊 单词统计:`)
  console.log(`  总单词数: ${words.length} (显示前10个)`)

  if (words.length === 0) {
    console.log('  ❌ 该视频没有任何单词数据！')
    return
  }

  console.log(`\n📝 单词数据详情 (前10个):`)

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    console.log(`\n  ${i + 1}. ${word.word || 'EMPTY'}`)
    console.log(`     法语: ${word.word_french || 'EMPTY'}`)
    console.log(`     音标: ${word.pronunciation || 'EMPTY'}`)
    console.log(`     词性: ${word.part_of_speech || 'EMPTY'}`)
    console.log(`     中文释义: ${word.definition_cn || 'EMPTY'}`)
    console.log(`     法语释义: ${word.definition_fr || 'EMPTY'}`)
    console.log(`     法语例句: ${word.example_fr || 'EMPTY'}`)
    console.log(`     中文例句: ${word.example_cn || 'EMPTY'}`)
    console.log(`     等级: ${word.level || 'EMPTY'}`)
    console.log(`     频率排名: ${word.frequency_rank || 'EMPTY'}`)
    console.log(`     是否核心词: ${word.is_core_word || false}`)
  }

  // 3. 检查空字段统计
  const emptyFields = {
    word: 0,
    word_french: 0,
    pronunciation: 0,
    definition_cn: 0,
    definition_fr: 0,
    example_fr: 0,
    example_cn: 0,
    level: 0,
    frequency_rank: 0
  }

  for (const word of words) {
    if (!word.word || word.word.trim() === '') emptyFields.word++
    if (!word.word_french || word.word_french.trim() === '') emptyFields.word_french++
    if (!word.pronunciation || word.pronunciation.trim() === '') emptyFields.pronunciation++
    if (!word.definition_cn || word.definition_cn.trim() === '') emptyFields.definition_cn++
    if (!word.definition_fr || word.definition_fr.trim() === '') emptyFields.definition_fr++
    if (!word.example_fr || word.example_fr.trim() === '') emptyFields.example_fr++
    if (!word.example_cn || word.example_cn.trim() === '') emptyFields.example_cn++
    if (!word.level || word.level.trim() === '') emptyFields.level++
    if (!word.frequency_rank) emptyFields.frequency_rank++
  }

  console.log(`\n🔍 空字段统计 (前10个单词):`)
  console.log(`  word 为空: ${emptyFields.word}/${words.length}`)
  console.log(`  word_french 为空: ${emptyFields.word_french}/${words.length}`)
  console.log(`  pronunciation 为空: ${emptyFields.pronunciation}/${words.length}`)
  console.log(`  definition_cn 为空: ${emptyFields.definition_cn}/${words.length}`)
  console.log(`  definition_fr 为空: ${emptyFields.definition_fr}/${words.length}`)
  console.log(`  example_fr 为空: ${emptyFields.example_fr}/${words.length}`)
  console.log(`  example_cn 为空: ${emptyFields.example_cn}/${words.length}`)
  console.log(`  level 为空: ${emptyFields.level}/${words.length}`)
  console.log(`  frequency_rank 为空: ${emptyFields.frequency_rank}/${words.length}`)

  // 4. 获取总单词数
  const { count } = await supabase
    .from('video_words')
    .select('*', { count: 'exact', head: true })
    .eq('video_id', videoId)

  console.log(`\n📊 实际总单词数: ${count}`)
}

checkVideoWords().catch(console.error)