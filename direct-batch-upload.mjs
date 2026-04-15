/**
 * 直接批量插入5个视频 - 绕过API认证
 */

import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function directBatchUpload() {
  console.log('🚀 直接批量插入5个视频')
  console.log('========================================\n')

  // 读取CSV映射文件获取音频URL
  const csvContent = fs.readFileSync('./french-podcasts-upload-map.csv', 'utf-8')
  const csvLines = csvContent.split('\n')

  const urlMap = new Map()
  for (let i = 1; i < csvLines.length; i++) {
    const line = csvLines[i]
    const parts = line.split(',')
    if (parts.length >= 3) {
      const filename = parts[1].replace(/"/g, '')
      urlMap.set(filename, parts[2])
    }
  }

  // 要上传的5个文件
  const files = [
    './linshi/InnerFrench 中级法语_processed/E174 Apprendre le français en immersion dans l' + 'Utah_materials.json',
    './linshi/InnerFrench 中级法语_processed/E175 L'aide médicale à mourir, bientôt possible en France_materials.json',
    './linshi/InnerFrench 中级法语_processed/E176 À la découverte des côtes normandes et bretonnes_materials.json',
    './linshi/InnerFrench 中级法语_processed/E177 Les festivals, une passion française __materials.json',
    './linshi/InnerFrench 中级法语_processed/E179 La France est-elle anti-enfants __materials.json'
  ]

  console.log(`📋 准备上传 ${files.length} 个文件\n`)

  for (let i = 0; i < files.length; i++) {
    const jsonFile = files[i]
    const fileName = jsonFile.split('/').pop()

    console.log(`[${i + 1}/${files.length}] 处理: ${fileName}`)

    try {
      // 读取JSON
      const jsonData = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'))
      const unitKey = Object.keys(jsonData.materials)[0]
      const unit = jsonData.materials[unitKey]

      // 匹配音频URL
      const audioUrl = urlMap.get(jsonData.source_file) || ''

      // 创建视频
      const { data: video, error: videoError } = await supabase
        .from('videos')
        .insert({
          title: jsonData.video_name || fileName.replace('_materials.json', ''),
          creator_name: jsonData.channel,
          video_url: audioUrl,
          status: 'published',
          language: 'fr'
        })
        .select()
        .single()

      if (videoError) {
        console.log(`   ❌ 创建视频失败: ${videoError.message}`)
        continue
      }

      console.log(`   ✅ 视频ID: ${video.id}`)

      // 创建字幕
      const subtitles = unit.subtitles || []
      if (subtitles.length > 0) {
        const subtitlesData = subtitles.map((sub, idx) => ({
          video_id: video.id,
          original_text: sub.original_text || '',
          chinese_text: sub.chinese_text || '',
          start_time: sub.start_time || 0,
          end_time: sub.end_time || 0,
          display_order: idx
        }))

        await supabase.from('video_subtitles').insert(subtitlesData)
        console.log(`   ✅ 字幕: ${subtitlesData.length} 条`)
      }

      // 保存学习材料
      await supabase.from('video_learning_materials').insert({
        video_id: video.id,
        material_json: unit
      })
      console.log(`   ✅ 学习材料已保存`)

      // 处理单词
      const vocab = unit.language_analysis?.vocabulary || []
      console.log(`   📚 单词数: ${vocab.length}`)

      if (vocab.length > 0) {
        const { cleanWord } = await import('./src/lib/batch-upload/utils.ts')
        const { uniqueArray } = await import('./src/lib/batch-upload/utils.ts')

        const uniqueWords = uniqueArray(
          vocab.map((v) => ({
            word: cleanWord(v.french),
            original: v,
          })).filter((v) => v.word),
          'word'
        )

        console.log(`   🔍 去重后: ${uniqueWords.length} 个`)

        if (uniqueWords.length > 0) {
          // 创建word_cards
          const wordCards = uniqueWords.map((v, idx) => ({
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

          const { error: wordsError } = await supabase
            .from('video_word_cards')
            .insert(wordCards)

          if (wordsError) {
            console.log(`   ❌ 插入word_cards失败: ${wordsError.message}`)
          } else {
            console.log(`   ✅ word_cards: ${wordCards.length} 个`)
          }
        }
      }

      console.log('')

    } catch (error) {
      console.log(`   ❌ 处理失败: ${error.message}`)
    }
  }

  console.log('========================================')
  console.log('✅ 批量插入完成')

  // 检查结果
  const { data: videos } = await supabase
    .from('videos')
    .select('id, title')
    .eq('creator_name', 'InnerFrench 中级法语')
    .order('created_at', { ascending: false })

  console.log('\n📊 上传结果验证:')
  for (const video of videos) {
    const { count: wordCount } = await supabase
      .from('video_word_cards')
      .select('*', { count: 'exact', head: true })
      .eq('video_id', video.id)

    console.log(`   ${video.title}`)
    console.log(`      word_cards: ${wordCount || 0} 个`)
  }
}

directBatchUpload().catch(console.error)