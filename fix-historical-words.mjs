/**
 * 历史数据修复脚本 - 恢复被 cleanWord 过滤的单词
 *
 * 问题：旧版 cleanWord() 过于严格，导致法语复合词（c'est, vis-à-vis）被过滤
 * 解决：从原始 material_json 中重新提取单词，使用修复后的 cleanWord() 处理
 *
 * 使用方法：
 *   node fix-historical-words.mjs
 */

import { createAdminClient } from './src/lib/supabase/server.js'
import { cleanWord } from './src/lib/batch-upload/utils.js'
import { lookupBatch } from './src/lib/dictionary/index.js'
import { findWordInSubtitles } from './src/lib/batch-upload/utils.js'

// ============================================
// 配置
// ============================================

const DRY_RUN = true // 预览模式，不实际写入数据库
const BATCH_SIZE = 10 // 每次处理视频数量
const VIDEO_IDS = [] // 空数组 = 处理所有视频，或指定 ['uuid1', 'uuid2']

// ============================================
// 工具函数
// ============================================

/**
 * 去重数组（基于指定 key）
 */
function uniqueArray(arr, key) {
  const seen = new Set()
  return arr.filter(item => {
    const k = key ? item[key] : item
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/**
 * CEFR 转数字
 */
function cefrToNumber(level) {
  const map = { 'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C1': 5, 'C2': 6 }
  return map[level] || 0
}

/**
 * 时间字符串转秒数
 */
function timeStringToSeconds(timeStr) {
  if (!timeStr) return 0
  const parts = timeStr.split(':').map(Number)
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  return 0
}

// ============================================
// 核心处理逻辑
// ============================================

/**
 * 处理单个视频的单词数据
 */
async function processVideoWords(supabase, videoId) {
  console.log(`\n处理视频: ${videoId}`)

  // 1. 获取原始学习材料
  const { data: material, error: materialError } = await supabase
    .from('video_learning_materials')
    .select('material_json')
    .eq('video_id', videoId)
    .single()

  if (materialError || !material) {
    console.error(`  ❌ 未找到学习材料: ${materialError?.message}`)
    return { success: false, error: '未找到学习材料' }
  }

  const learningJson = material.material_json
  const vocabulary = learningJson.language_analysis?.vocabulary || []

  console.log(`  原始单词数: ${vocabulary.length}`)

  if (vocabulary.length === 0) {
    console.log(`  ⚠️  无单词数据`)
    return { success: true, processed: 0, added: 0 }
  }

  // 2. 获取现有字幕
  const { data: subtitles } = await supabase
    .from('video_subtitles')
    .select('original_text, chinese_text, start_time, end_time')
    .eq('video_id', videoId)

  // 3. 获取现有单词卡片
  const { data: existingCards } = await supabase
    .from('video_word_cards')
    .select('word')
    .eq('video_id', videoId)

  const existingWords = new Set(existingCards?.map(c => c.word) || [])
  console.log(`  现有单词数: ${existingWords.size}`)

  // 4. 使用修复后的 cleanWord 重新处理单词
  const cleanedWords = vocabulary.map(v => ({
    word: cleanWord(v.french),
    original: v,
  }))

  const uniqueWords = uniqueArray(
    cleanedWords.filter(v => v.word),
    'word'
  )

  console.log(`  清理后单词数: ${uniqueWords.length}`)

  // 5. 找出新增的单词
  const newWords = uniqueWords.filter(v => !existingWords.has(v.word))
  console.log(`  新增单词数: ${newWords.length}`)

  if (newWords.length === 0) {
    console.log(`  ✅ 无需更新`)
    return { success: true, processed: uniqueWords.length, added: 0 }
  }

  // 6. 词典查询
  const words = newWords.map(v => v.word)
  let dictResults = []

  try {
    console.log(`  查询词典: ${words.length} 个单词`)
    dictResults = await lookupBatch(words, 'fr', { skipFallback: false })
  } catch (dictError) {
    console.error(`  ⚠️  词典查询失败，使用原始数据: ${dictError.message}`)
    dictResults = words.map(() => null)
  }

  // 7. 生成单词卡片
  const wordCards = newWords.map((v, idx) => {
    const original = v.original
    const dictResult = dictResults[idx]
    const example = findWordInSubtitles(v.word, subtitles || [])

    const hasCompleteDictData = dictResult && dictResult.definition && dictResult.definition.trim() !== ''
    const dictExamples = dictResult?.examples || []
    const firstDictExample = dictExamples[0]
    const jsonExample = original.example_sentence
    const mainExampleFr = firstDictExample?.fr || jsonExample?.french || null
    const mainExampleCn = firstDictExample?.zh || jsonExample?.chinese || null
    const definitions = dictResult?.definitions || []

    const rawPos = hasCompleteDictData ? dictResult.posDetail : (dictResult?.pos || original.part_of_speech || null)
    const truncatedPos = rawPos ? rawPos.substring(0, 20) : null

    return {
      video_id: videoId,
      word: v.word,
      phonetic: hasCompleteDictData ? dictResult.phonetic : (original.ipa || null),
      part_of_speech: truncatedPos,
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
      display_order: existingWords.size + idx,
      is_reviewed: true,
      occurrence_count: original.occurrence_count || 1,
      source_ids: original.source_ids || [],
    }
  })

  // 8. 插入数据库（如果不是预览模式）
  if (DRY_RUN) {
    console.log(`  🔍 [预览] 将插入 ${wordCards.length} 个单词:`)
    wordCards.slice(0, 5).forEach(card => {
      console.log(`     - ${card.word}: ${card.chinese_definition}`)
    })
    if (wordCards.length > 5) {
      console.log(`     ... 还有 ${wordCards.length - 5} 个`)
    }
  } else {
    const { error: insertError } = await supabase
      .from('video_word_cards')
      .insert(wordCards)

    if (insertError) {
      console.error(`  ❌ 插入失败: ${insertError.message}`)
      return { success: false, error: insertError.message }
    }

    console.log(`  ✅ 成功插入 ${wordCards.length} 个单词`)
  }

  return {
    success: true,
    processed: uniqueWords.length,
    added: wordCards.length,
    words: wordCards.map(c => c.word)
  }
}

/**
 * 获取需要处理的视频列表
 */
async function getVideosToProcess(supabase) {
  let query = supabase
    .from('videos')
    .select('id, title')
    .eq('language', 'fr')
    .order('created_at', { ascending: false })

  if (VIDEO_IDS.length > 0) {
    query = query.in('id', VIDEO_IDS)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`获取视频列表失败: ${error.message}`)
  }

  return data
}

// ============================================
// 主函数
// ============================================

async function main() {
  console.log('🔧 历史数据修复脚本 - 恢复被过滤的单词')
  console.log('='.repeat(80))
  console.log(`模式: ${DRY_RUN ? '预览（不写入）' : '执行（写入数据库）'}`)
  console.log(`批次大小: ${BATCH_SIZE}`)
  console.log(`目标视频: ${VIDEO_IDS.length > 0 ? VIDEO_IDS.join(', ') : '所有法语视频'}`)
  console.log('='.repeat(80))

  try {
    const supabase = await createAdminClient()
    const videos = await getVideosToProcess(supabase)

    console.log(`\n找到 ${videos.length} 个视频需要处理`)

    const results = {
      total: videos.length,
      processed: 0,
      success: 0,
      failed: 0,
      totalWordsAdded: 0,
    }

    for (let i = 0; i < videos.length; i += BATCH_SIZE) {
      const batch = videos.slice(i, i + BATCH_SIZE)
      console.log(`\n📦 批次 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(videos.length / BATCH_SIZE)}`)

      for (const video of batch) {
        const result = await processVideoWords(supabase, video.id)

        results.processed++
        if (result.success) {
          results.success++
          results.totalWordsAdded += result.added || 0
        } else {
          results.failed++
        }
      }
    }

    // 总结报告
    console.log('\n' + '='.repeat(80))
    console.log('📊 处理完成')
    console.log('='.repeat(80))
    console.log(`总视频数: ${results.total}`)
    console.log(`已处理: ${results.processed}`)
    console.log(`成功: ${results.success}`)
    console.log(`失败: ${results.failed}`)
    console.log(`新增单词: ${results.totalWordsAdded}`)
    console.log('='.repeat(80))

    if (DRY_RUN) {
      console.log('\n⚠️  当前为预览模式，未实际写入数据库')
      console.log('如需执行修复，请修改脚本中的 DRY_RUN = false')
    }

  } catch (error) {
    console.error('\n❌ 脚本执行失败:', error)
    process.exit(1)
  }
}

main()
