/**
 * 演说家模块 - 历史听写记录错题迁移工具
 *
 * 用途：将历史听写记录中的错题迁移到魔鬼生词本
 *
 * 问题背景：
 * - speaker_ghost_words 表在 2026-02-06 创建
 * - 此前的听写记录中的错题没有被添加到生词本
 * - 用户查看历史记录时能看到错题，但这些错题不在生词本中
 *
 * 使用方式：
 * POST /api/speaker/migrate-ghost-words?userId={userId}
 * - 如果传 userId，只迁移该用户的数据
 * - 如果不传 userId，迁移所有用户的数据（管理员权限）
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

/**
 * POST 处理器：执行历史错题迁移
 */
export async function POST(request: Request) {
  console.log('[Speaker Migrate Ghost Words] 开始执行迁移')

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const dryRun = searchParams.get('dryRun') === 'true'  // 预演模式，不实际插入数据

    // 使用 service role 权限（需要跳过 RLS）
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseServiceKey) {
      return NextResponse.json(
        { error: 'MISSING_SERVICE_KEY', message: '缺少 Service Role Key' },
        { status: 500 }
      )
    }

    const supabase = createAdminClient(supabaseUrl, supabaseServiceKey)

    // 查询历史听写记录
    let submissionsQuery = supabase
      .from('speaker_dictation_submissions')
      .select('id, user_id, article_id, answers, created_at')
      .gt('wrong_count', 0)  // 只处理有错题的记录

    if (userId) {
      submissionsQuery = submissionsQuery.eq('user_id', userId)
    }

    const { data: submissions, error: submissionsError } = await submissionsQuery

    if (submissionsError) {
      console.error('[Speaker Migrate Ghost Words] ❌ 查询听写记录失败:', submissionsError)
      throw submissionsError
    }

    if (!submissions || submissions.length === 0) {
      console.log('[Speaker Migrate Ghost Words] ℹ️ 没有需要迁移的历史记录')
      return NextResponse.json({
        success: true,
        message: '没有需要迁移的历史记录',
        stats: {
          totalSubmissions: 0,
          wordsAdded: 0,
          duplicatesSkipped: 0
        }
      })
    }

    console.log(`[Speaker Migrate Ghost Words] 找到 ${submissions.length} 条听写记录`)

    let totalWordsAdded = 0
    let duplicatesSkipped = 0
    const errors: Array<{ submissionId: string; error: string }> = []

    // 全局去重：使用 Map 存储 (user_id + word + article_id + sentence_id) -> word data
    const allUniqueWords = new Map<string, any>()

    // 遍历每条听写记录
    for (const submission of submissions) {
      try {
        const answers = submission.answers as any

        if (!answers || typeof answers !== 'object') {
          console.warn(`[Speaker Migrate Ghost Words] ⚠️ 提交记录 ${submission.id} 的 answers 格式无效`)
          continue
        }

        // 获取文章句子数据
        const { data: article } = await supabase
          .from('speaker_articles')
          .select('id, json_data')
          .eq('id', submission.article_id)
          .single()

        const sentences = article?.json_data?.sentences || []

        // 解析答案，提取错题
        const wrongWords: Array<{
          word: string
          sentence_id: number
          sentence_text: string
          start_time: number | null
          error_type: 'wrong' | 'skipped'
        }> = []

        // 遍历每个句子的答案
        for (const [sentenceIndexStr, answerEntry] of Object.entries(answers)) {
          const sentenceIndex = parseInt(sentenceIndexStr)
          const entry = answerEntry as { userWords?: (string | null)[]; correctWords?: string[] }

          if (!entry.correctWords || !Array.isArray(entry.correctWords)) {
            continue
          }

          const userWords = entry.userWords || []
          const sentence = sentences[sentenceIndex]

          // 遍历每个单词
          entry.correctWords.forEach((correctWord, wordIndex) => {
            const userInput = userWords[wordIndex]
            let isWrong = false
            let errorType: 'wrong' | 'skipped' = 'wrong'

            if (userInput === null || userInput === undefined || userInput.trim() === '') {
              // 放弃的单词也进入生词本
              isWrong = true
              errorType = 'skipped'
            } else if (userInput.trim().toLowerCase() !== correctWord.trim().toLowerCase()) {
              // 答错的单词进入生词本
              isWrong = true
              errorType = 'wrong'
            }

            // 添加所有错题（包括放弃和答错）
            if (isWrong) {
              wrongWords.push({
                word: correctWord,
                sentence_id: sentenceIndex,
                sentence_text: sentence?.text_en || sentence?.text || 'Sentence text not available',
                start_time: sentence?.start_time || null,
                error_type: errorType
              })
            }
          })
        }

        // 如果是预演模式，只返回统计信息
        if (dryRun) {
          console.log(`[Speaker Migrate Ghost Words] 📋 提交 ${submission.id}: 发现 ${wrongWords.length} 个错题`)
          totalWordsAdded += wrongWords.length
          continue
        }

        // 将错题添加到全局 Map 中（自动去重）
        wrongWords.forEach(ww => {
          const key = `${submission.user_id}-${ww.word}-${submission.article_id}-${ww.sentence_id}`
          if (!allUniqueWords.has(key)) {
            allUniqueWords.set(key, {
              user_id: submission.user_id,
              word: ww.word,
              article_id: submission.article_id,
              sentence_id: ww.sentence_id,
              sentence_text: ww.sentence_text,
              start_time: ww.start_time,
              error_type: ww.error_type,
              is_mastered: false,
              created_at: submission.created_at
            })
          }
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`[Speaker Migrate Ghost Words] ❌ 处理提交 ${submission.id} 失败:`, errorMessage)
        errors.push({
          submissionId: submission.id,
          error: errorMessage
        })
      }
    }

    // 批量插入所有去重后的错题
    if (!dryRun && allUniqueWords.size > 0) {
      const ghostWordsInserts = Array.from(allUniqueWords.values())

      console.log(`[Speaker Migrate Ghost Words] 准备插入 ${ghostWordsInserts.length} 个唯一错题`)

      const { error: insertError } = await supabase
        .from('speaker_ghost_words')
        .insert(ghostWordsInserts)

      if (insertError) {
        console.error('[Speaker Migrate Ghost Words] ❌ 批量插入失败:', insertError)
        throw insertError
      }

      totalWordsAdded = ghostWordsInserts.length
      console.log(`[Speaker Migrate Ghost Words] ✅ 成功插入 ${totalWordsAdded} 个错题`)
    }

    // 查询实际插入数量（排除重复）
    if (!dryRun && userId) {
      const { count } = await supabase
        .from('speaker_ghost_words')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      totalWordsAdded = count || 0
    }

    console.log('[Speaker Migrate Ghost Words] ✅ 迁移完成:', {
      totalSubmissions: submissions.length,
      wordsAdded: totalWordsAdded,
      errorsCount: errors.length
    })

    return NextResponse.json({
      success: true,
      message: dryRun
        ? '预演模式完成，未实际插入数据'
        : `成功迁移 ${totalWordsAdded} 个错题到生词本`,
      stats: {
        totalSubmissions: submissions.length,
        wordsAdded: totalWordsAdded,
        duplicatesSkipped,
        errorsCount: errors.length
      },
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Speaker Migrate Ghost Words] ❌ 迁移失败:', { error: errorMessage })

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '服务器内部错误', details: errorMessage },
      { status: 500 }
    )
  }
}
