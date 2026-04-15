/**
 * 修复已上传视频的单词数据
 */

import { createAdminClient } from './src/lib/supabase/server.js'
import { lookupBatch } from './src/lib/dict/lookup.mjs'
import { cleanWord } from './src/lib/batch-upload/video-processor.mjs'

async function fixVideoWords() {
  const supabase = await createAdminClient()

  // 这5个视频ID（从刚才的上传结果中获取）
  const videoIds = [
    '0563f9d6-1ef7-4393-8e6f-54e42f9d366b', // E174
    // 其他4个视频ID需要从上传结果中获取
  ]

  console.log('🔧 修复视频单词数据...')
  console.log('========================================')

  // 首先获取最近上传的5个InnerFrench视频
  const { data: videos, error: videosError } = await supabase
    .from('videos')
    .select('id, title')
    .eq('creator_name', 'InnerFrench 中级法语')
    .order('created_at', { ascending: false })
    .limit(5)

  if (videosError) {
    console.log('❌ 获取视频列表失败:', videosError.message)
    return
  }

  console.log(`📹 找到 ${videos.length} 个最近上传的视频\n`)

  for (let i = 0; i < videos.length; i++) {
    const video = videos[i]
    console.log(`[${i + 1}/${videos.length}] 处理: ${video.title}`)

    // 1. 获取原始 learning_material_json
    const { data: materials, error: materialsError } = await supabase
      .from('video_learning_materials')
      .select('material_json')
      .eq('video_id', video.id)
      .single()

    if (materialsError || !materials) {
      console.log(`  ❌ 未找到学习材料数据`)
      continue
    }

    const learningJson = materials.material_json
    const vocabulary = learningJson.language_analysis?.vocabulary || []

    if (vocabulary.length === 0) {
      console.log(`  ⚠️  学习材料中没有单词数据`)
      continue
    }

    console.log(`  📚 找到 ${vocabulary.length} 个单词`)

    // 2. 删除现有的空单词数据
    const { error: deleteError } = await supabase
      .from('video_words')
      .delete()
      .eq('video_id', video.id)

    if (deleteError) {
      console.log(`  ⚠️  删除旧单词数据失败: ${deleteError.message}`)
    } else {
      console.log(`  🗑️  已删除旧的单词数据`)
    }

    // 3. 获取字幕数据用于查找例句
    const { data: subtitles, error: subtitlesError } = await supabase
      .from('video_subtitles')
      .select('original_text, start_time, end_time')
      .eq('video_id', video.id)
      .order('display_order')

    if (subtitlesError || !subtitles) {
      console.log(`  ⚠️  未找到字幕数据`)
    } else {
      console.log(`  📝 找到 ${subtitles.length} 条字幕`)
    }

    // 4. 处理单词并重新插入
    const uniqueWords = []
    const seenWords = new Set()

    for (const v of vocabulary) {
      const word = cleanWord(v.french)
      if (word && !seenWords.has(word)) {
        seenWords.add(word)
        uniqueWords.push({
          word,
          original: v
        })
      }
    }

    console.log(`  ✨ 去重后: ${uniqueWords.length} 个唯一单词`)

    if (uniqueWords.length === 0) {
      console.log(`  ⚠️  没有有效单词可处理`)
      continue
    }

    // 5. 词典查询
    const words = uniqueWords.map(v => v.word)
    console.log(`  🔍 查询词典...`)
    const dictResults = await lookupBatch(words, 'fr', { skipFallback: false })

    // 6. 创建单词卡片
    const wordCards = []

    for (let idx = 0; idx < uniqueWords.length; idx++) {
      const v = uniqueWords[idx]
      const original = v.original
      const dictResult = dictResults[idx]

      // 查找例句
      let example = null
      if (subtitles && subtitles.length > 0) {
        for (const sub of subtitles) {
          if (sub.original_text && sub.original_text.toLowerCase().includes(v.word.toLowerCase())) {
            example = {
              original: sub.original_text,
              translation: sub.translation || null,
              startTime: sub.start_time,
              endTime: sub.end_time
            }
            break
          }
        }
      }

      // 判断词典数据是否完整
      const hasCompleteDictData = dictResult && dictResult.definition && dictResult.definition.trim() !== ''

      const dictExamples = dictResult?.examples || []
      const firstDictExample = dictExamples[0]
      const jsonExample = original.example_sentence
      const mainExampleFr = firstDictExample?.fr || jsonExample?.french || null
      const mainExampleCn = firstDictExample?.zh || jsonExample?.chinese || null

      const definitions = dictResult?.definitions || []

      // CEFR等级转换
      function cefrToNumber(level) {
        const map = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 }
        return map[level] || 3
      }

      const wordCard = {
        video_id: video.id,
        word: v.word,
        phonetic: hasCompleteDictData ? dictResult.phonetic : (original.ipa || null),
        part_of_speech: hasCompleteDictData ? dictResult.posDetail : (dictResult?.pos || original.part_of_speech || null),
        chinese_definition: hasCompleteDictData ? dictResult.definition : (original.chinese || ''),
        example_sentence: mainExampleFr,
        example_sentence_cn: mainExampleCn,
        example_from_video: example?.original || null,
        example_translation: example?.translation || null,
        subtitle_start_time: example?.startTime || 0,
        subtitle_end_time: example?.endTime || 0,
        gender: dictResult?.gender || null,
        cefr_level: dictResult?.cefrLevel || original.cefr_level || null,
        definitions: definitions.length > 0 ? definitions : null,
        examples: dictExamples.length > 0 ? dictExamples : null,
        difficulty_level: cefrToNumber(original.cefr_level),
        display_order: idx,
        is_reviewed: true,
        occurrence_count: original.occurrence_count || 1,
        source_ids: original.source_ids || [],
      }

      wordCards.push(wordCard)
    }

    // 7. 插入单词数据
    const { error: insertError } = await supabase
      .from('video_words')
      .insert(wordCards)

    if (insertError) {
      console.log(`  ❌ 插入单词数据失败: ${insertError.message}`)
    } else {
      console.log(`  ✅ 成功插入 ${wordCards.length} 个单词`)
    }

    // 更新 video_word_cards 计数
    const { data: existingCard } = await supabase
      .from('video_word_cards')
      .select('id')
      .eq('video_id', video.id)
      .maybeSingle()

    if (existingCard) {
      await supabase
        .from('video_word_cards')
        .update({ words_count: wordCards.length })
        .eq('id', existingCard.id)
      console.log(`  🔄 更新单词卡片计数: ${wordCards.length}`)
    } else {
      await supabase
        .from('video_word_cards')
        .insert({
          video_id: video.id,
          words_count: wordCards.length
        })
      console.log(`  🆕 创建单词卡片计数: ${wordCards.length}`)
    }

    console.log('')
  }

  console.log('========================================')
  console.log('✅ 修复完成！')
}

fixVideoWords().catch(console.error)