/**
 * 快速检查脚本 - 找出需要修复的视频
 *
 * 对比原始 material_json 中的单词数 vs 数据库中的单词数
 * 如果不一致，说明有单词被过滤掉了
 */

import { createAdminClient } from './src/lib/supabase/server.js'
import { cleanWord } from './src/lib/batch-upload/utils.js'

async function main() {
  console.log('🔍 检查哪些视频需要修复单词数据')
  console.log('='.repeat(80))

  const supabase = await createAdminClient()

  // 获取所有法语视频
  const { data: videos, error } = await supabase
    .from('videos')
    .select('id, title')
    .eq('language', 'fr')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('获取视频失败:', error)
    process.exit(1)
  }

  console.log(`找到 ${videos.length} 个法语视频\n`)

  const affectedVideos = []

  for (const video of videos) {
    // 获取原始学习材料
    const { data: material } = await supabase
      .from('video_learning_materials')
      .select('material_json')
      .eq('video_id', video.id)
      .maybeSingle()

    if (!material) {
      continue
    }

    const learningJson = material.material_json
    const vocabulary = learningJson.language_analysis?.vocabulary || []

    // 使用修复后的 cleanWord 重新计算
    const cleanedWords = vocabulary
      .map(v => cleanWord(v.french))
      .filter(w => w)

    // 获取数据库中的单词数
    const { data: wordCards } = await supabase
      .from('video_word_cards')
      .select('word')
      .eq('video_id', video.id)

    const dbWordCount = wordCards?.length || 0
    const expectedCount = cleanedWords.length

    if (expectedCount !== dbWordCount) {
      affectedVideos.push({
        id: video.id,
        title: video.title,
        expected: expectedCount,
        actual: dbWordCount,
        missing: expectedCount - dbWordCount,
      })
    }
  }

  if (affectedVideos.length === 0) {
    console.log('✅ 所有视频的单词数据完整，无需修复')
  } else {
    console.log(`⚠️  发现 ${affectedVideos.length} 个视频需要修复:\n`)

    // 按缺失单词数排序
    affectedVideos.sort((a, b) => b.missing - a.missing)

    // 表格输出
    console.log('序号 | 视频标题                                  | 应有 | 实际 | 缺失')
    console.log('-'.repeat(80))

    affectedVideos.forEach((video, index) => {
      const title = video.title.substring(0, 40).padEnd(40)
      console.log(
        `${String(index + 1).padStart(4)} | ${title} | ${String(video.expected).padStart(4)} | ${String(video.actual).padStart(4)} | ${String(video.missing).padStart(4)}`
      )
    })

    console.log('\n' + '='.repeat(80))
    console.log(`总计缺失单词: ${affectedVideos.reduce((sum, v) => sum + v.missing, 0)} 个`)
    console.log('='.repeat(80))

    console.log('\n📝 下一步操作:')
    console.log('1. 运行完整修复脚本: node fix-historical-words.mjs')
    console.log('2. 或修复单个视频: node fix-historical-words.mjs --video-id=' + affectedVideos[0].id)
  }

  process.exit(0)
}

main()
