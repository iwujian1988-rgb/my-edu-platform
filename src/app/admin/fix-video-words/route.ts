/**
 * 修复视频单词数据 API
 */

import { createAdminClient } from '@/lib/supabase/server'
import { checkAdminForAPI } from '@/lib/admin-auth'
import { NextResponse } from 'next/server'

// 这个文件暂时禁用，因为引用了不存在的模块
// export const maxDuration = 120

interface FixWordRequest {
  video_id?: string
  fix_recent?: number
}

export async function POST(request: Request) {
  try {
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error || '未授权', code: adminCheck.code },
        { status: adminCheck.status || 401 }
      )
    }

    const body: FixWordRequest = await request.json().catch(() => ({}))
    const { video_id, fix_recent = 5 } = body

    const supabase = await createAdminClient()

    // 确定要修复的视频
    let videos = []

    if (video_id) {
      // 修复指定视频
      const { data: video, error } = await supabase
        .from('videos')
        .select('id, title')
        .eq('id', video_id)
        .single()

      if (error || !video) {
        return NextResponse.json({ error: '视频不存在' }, { status: 404 })
      }
      videos = [video]
    } else {
      // 修复最近上传的几个视频
      const { data, error } = await supabase
        .from('videos')
        .select('id, title')
        .eq('creator_name', 'InnerFrench 中级法语')
        .order('created_at', { ascending: false })
        .limit(fix_recent)

      if (error || !data) {
        return NextResponse.json({ error: '获取视频列表失败' }, { status: 500 })
      }
      videos = data
    }

    console.log(`🔧 开始修复 ${videos.length} 个视频的单词数据...`)

    const results = []

    for (const video of videos) {
      console.log(`\n[${results.length + 1}/${videos.length}] 处理: ${video.title}`)

      try {
        // 1. 获取原始学习材料
        const { data: materials, error: materialsError } = await supabase
          .from('video_learning_materials')
          .select('material_json')
          .eq('video_id', video.id)
          .single()

        if (materialsError || !materials) {
          console.log(`  ❌ 未找到学习材料`)
          results.push({ video_id: video.id, title: video.title, success: false, error: '未找到学习材料' })
          continue
        }

        const learningJson = materials.material_json
        const vocabulary = learningJson.language_analysis?.vocabulary || []

        if (vocabulary.length === 0) {
          console.log(`  ⚠️  没有单词数据`)
          results.push({ video_id: video.id, title: video.title, success: false, error: '没有单词数据' })
          continue
        }

        console.log(`  📚 找到 ${vocabulary.length} 个单词`)

        // 2. 删除现有空数据
        await supabase.from('video_words').delete().eq('video_id', video.id)
        console.log(`  🗑️  已删除旧单词数据`)

        // 3. 获取字幕
        const { data: subtitles } = await supabase
          .from('video_subtitles')
          .select('original_text, start_time, end_time')
          .eq('video_id', video.id)
          .order('display_order')

        // 4. 去重单词
        const uniqueWords = []
        const seenWords = new Set()

        for (const v of vocabulary) {
          const word = cleanWord(v.french)
          if (word && !seenWords.has(word)) {
            seenWords.add(word)
            uniqueWords.push({ word, original: v })
          }
        }

        console.log(`  ✨ 去重后: ${uniqueWords.length} 个唯一单词`)

        // 5. 词典查询
        const words = uniqueWords.map(v => v.word)
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

          const hasCompleteDictData = dictResult && dictResult.definition && dictResult.definition.trim() !== ''
          const dictExamples = dictResult?.examples || []
          const firstDictExample = dictExamples[0]
          const jsonExample = original.example_sentence
          const mainExampleFr = firstDictExample?.fr || jsonExample?.french || null
          const mainExampleCn = firstDictExample?.zh || jsonExample?.chinese || null
          const definitions = dictResult?.definitions || []

          wordCards.push({
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
          })
        }

        // 7. 插入单词数据
        const { error: insertError } = await supabase
          .from('video_words')
          .insert(wordCards)

        if (insertError) {
          console.log(`  ❌ 插入失败: ${insertError.message}`)
          results.push({ video_id: video.id, title: video.title, success: false, error: insertError.message })
        } else {
          console.log(`  ✅ 成功插入 ${wordCards.length} 个单词`)

          // 更新单词卡片计数
          const { data: existingCard } = await supabase
            .from('video_word_cards')
            .select('id')
            .eq('video_id', video.id)
            .maybeSingle()

          if (existingCard) {
            await supabase.from('video_word_cards')
              .update({ words_count: wordCards.length })
              .eq('id', existingCard.id)
          } else {
            await supabase.from('video_word_cards')
              .insert({ video_id: video.id, words_count: wordCards.length })
          }

          results.push({
            video_id: video.id,
            title: video.title,
            success: true,
            words_count: wordCards.length
          })
        }

      } catch (error) {
        console.log(`  ❌ 处理失败: ${error.message}`)
        results.push({
          video_id: video.id,
          title: video.title,
          success: false,
          error: error.message
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        total: videos.length,
        fixed: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      }
    })

  } catch (error) {
    console.error('[fix-video-words] 服务器错误:', error)
    return NextResponse.json(
      { error: '服务器错误', details: error.message },
      { status: 500 }
    )
  }
}