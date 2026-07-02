/**
 * 演说家模块 - 听写提交判分 API
 *
 * 路由：POST /api/speaker/dictation/submit
 * 功能：提交听写答案并判分
 *
 * 严格按照三个文档实现：
 * - shangwenjie.md 第 2.4-F 节（结果提交与反馈）
 * - TECHNICAL_MODIFICATION_PLAN.md（技术方案）
 * - AI_DEVELOPMENT_GUIDE.md（开发指南）
 */

import { NextResponse } from 'next/server'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { getBatchDictEntries } from '@/lib/dict-service'
import { lookupBatch, type DictionaryLanguage } from '@/lib/dictionary'
import { parseSentenceTokens, validateWordInput } from '@/lib/speaker-utils'
import { dedupeGhostWordInserts, getGhostWordLookupWords } from '@/lib/speaker-ghost-words'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * 提交数据结构
 */
interface DictationSubmission {
  articleId: string
  answers: Array<{
    sentenceIndex: number
    userWords: Array<string | null>  // null = skipped
  }>
  timeSpentSeconds: number
}

interface SpeakerArticleSentence {
  text?: string
  text_en?: string
  start_time?: number | null
}

interface SpeakerDictEntryForCache {
  word: string
  phonetic?: string
  us_phonetic?: string
  uk_phonetic?: string
  definition?: string
  example_sentence?: string
  example_sentence_en?: string
}

/**
 * POST 处理器：提交听写并判分
 */
export async function POST(request: Request) {
  console.log('[Speaker Dictation Submit API] 收到提交请求')

  try {
    const body: DictationSubmission = await request.json()
    const { articleId, answers, timeSpentSeconds } = body
    const user = await getCurrentUser()

    // 验证必填字段
    if (!user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: '请先登录' },
        { status: 401 }
      )
    }

    if (!articleId || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'MISSING_FIELDS', message: '缺少必填字段或答案格式错误' },
        { status: 400 }
      )
    }

    const supabase = await createClient() as SupabaseClient

    const { data: article, error: articleError } = await supabase
      .from('speaker_articles')
      .select('id, json_data, language')
      .eq('id', articleId)
      .single()

    if (articleError || !article) {
      console.error('[Speaker Dictation Submit API] 获取文章数据失败:', articleError)
      return NextResponse.json(
        { error: 'ARTICLE_NOT_FOUND', message: '文章不存在或无权访问' },
        { status: 404 }
      )
    }

    const sentences = (article.json_data?.sentences || []) as SpeakerArticleSentence[]
    if (sentences.length === 0) {
      return NextResponse.json(
        { error: 'INVALID_ARTICLE', message: '文章缺少句子数据' },
        { status: 400 }
      )
    }

    const answerMap = new Map<number, Array<string | null>>()
    answers.forEach(answer => {
      if (Number.isInteger(answer.sentenceIndex) && Array.isArray(answer.userWords)) {
        answerMap.set(answer.sentenceIndex, answer.userWords)
      }
    })

    // ========================================
    // 1. 判分逻辑：正确答案只能来自服务端文章数据
    // ========================================

    const totalSentences = sentences.length
    let totalWords = 0
    let correctCount = 0
    let wrongCount = 0
    let skippedCount = 0
    const gradedAnswers: Array<{
      sentenceIndex: number
      userWords: Array<string | null>
      correctWords: string[]
    }> = []

    const wrongWords: Array<{
      sentenceIndex: number
      wordIndex: number
      userInput: string | null
      correctWord: string
      errorType: 'wrong' | 'skipped'
    }> = []

    sentences.forEach((sentence, sentenceIndex) => {
      const sentenceText = sentence.text_en || sentence.text || ''
      const correctWords = parseSentenceTokens(sentenceText)
        .filter(token => token.type === 'word' && !token.skipInput)
        .map(token => token.text)
      const userWords = answerMap.get(sentenceIndex) || []

      gradedAnswers.push({
        sentenceIndex,
        userWords,
        correctWords
      })

      totalWords += correctWords.length

      correctWords.forEach((correctWord, wordIndex) => {
        const userInput = userWords[wordIndex] ?? null

        if (userInput === null) {
          // 用户右键放弃
          skippedCount++
          wrongWords.push({
            sentenceIndex,
            wordIndex,
            userInput: null,
            correctWord,
            errorType: 'skipped'
          })
        } else {
          if (validateWordInput(userInput, correctWord)) {
            correctCount++
          } else {
            wrongCount++
            wrongWords.push({
              sentenceIndex,
              wordIndex,
              userInput,
              correctWord,
              errorType: 'wrong'
            })
          }
        }
      })
    })

    const accuracyRate = totalWords > 0
      ? Math.round((correctCount / totalWords) * 100)
      : 0

    console.log('[Speaker Dictation Submit API] 判分完成:', {
      totalWords,
      correctCount,
      wrongCount,
      skippedCount,
      accuracyRate
    })

    // ========================================
    // 2. 保存到 speaker_dictation_submissions 表
    // ========================================

    const { data: submission, error: submitError } = await supabase
      .from('speaker_dictation_submissions')
      .insert({
        user_id: user.id,
        article_id: articleId,
        answers: gradedAnswers,
        total_sentences: totalSentences,
        total_words: totalWords,
        correct_count: correctCount,
        wrong_count: wrongCount,
        skipped_count: skippedCount,
        accuracy_rate: accuracyRate / 100,  // 存储为 0-1 的小数
        time_spent_seconds: timeSpentSeconds,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (submitError) {
      console.error('[Speaker Dictation Submit API] ❌ 保存提交记录失败:', submitError)
      throw submitError
    }

    console.log('[Speaker Dictation Submit API] ✅ 提交记录已保存')

    // ========================================
    // 3. 生成魔鬼生词本（shangwenjie.md 第 2.4-F 节）
    // 注意：答错和放弃的单词都进入生词本
    // ========================================

    let ghostWordsToReviewCount = 0

    if (wrongWords.length > 0) {
      console.log(`[Speaker Dictation Submit API] 开始生成 ${wrongWords.length} 个生词`)

      // 生成生词本记录
      const ghostWordsInserts = wrongWords.map((wrongWord) => {
        const sentence = sentences[wrongWord.sentenceIndex]

        return {
          user_id: user.id,
          word: wrongWord.correctWord,
          article_id: articleId,
          sentence_id: wrongWord.sentenceIndex,
          sentence_text: sentence?.text || sentence?.text_en || `Sentence ${wrongWord.sentenceIndex + 1}`,
          start_time: sentence?.start_time || null,
          error_type: wrongWord.errorType,
          is_mastered: false,
          created_at: new Date().toISOString()
        }
      })

      console.log('[Speaker Dictation Submit API] 准备插入生词本:', {
        count: ghostWordsInserts.length
      })

      // 🔧 修复：先删除该用户在这篇文章的旧生词记录，再插入新的
      console.log('[Speaker Dictation Submit API] 删除旧生词记录...')
      const { error: deleteError } = await supabase
        .from('speaker_ghost_words')
        .delete()
        .eq('user_id', user.id)
        .eq('article_id', articleId)

      if (deleteError) {
        console.error('[Speaker Dictation Submit API] ❌ 删除旧生词失败:', deleteError)
      } else {
        console.log('[Speaker Dictation Submit API] ✅ 旧生词删除成功')
      }

      const deduplicatedInserts = dedupeGhostWordInserts(ghostWordsInserts)
      ghostWordsToReviewCount = deduplicatedInserts.length

      console.log('[Speaker Dictation Submit API] 去重结果:', {
        原始数量: ghostWordsInserts.length,
        去重后数量: deduplicatedInserts.length,
        去除重复: ghostWordsInserts.length - deduplicatedInserts.length
      })

      if (deduplicatedInserts.length > 0) {
        // 然后直接插入去重后的数据（不需要 upsert，因为已经删除了）
        const { error: ghostError, data: insertedData } = await supabase
          .from('speaker_ghost_words')
          .insert(deduplicatedInserts)
          .select()

        if (ghostError) {
          console.error('[Speaker Dictation Submit API] ❌ 生成生词本失败:', {
            code: ghostError.code,
            message: ghostError.message,
            details: ghostError.details,
            hint: ghostError.hint
          })
        } else {
          console.log('[Speaker Dictation Submit API] ✅ 生词本生成成功，插入数量:', insertedData?.length || 0)
        }
      }

      // 后台异步填充词典数据（不阻塞响应）
      const uniqueWords = getGhostWordLookupWords(deduplicatedInserts)

      if (uniqueWords.length > 0) {
        // 使用 setImmediate 确保在响应发送后再执行
        setImmediate(async () => {
          try {
            console.log(`[Dict Async Fill] 开始填充 ${uniqueWords.length} 个单词的词典数据`)

            // 分批处理，避免有道API限流
            const BATCH_SIZE = 5
            const BATCH_DELAY = 500

            for (let i = 0; i < uniqueWords.length; i += BATCH_SIZE) {
              const batch = uniqueWords.slice(i, i + BATCH_SIZE)

              // 先批量查询缓存表（优化：减少数据库查询次数）
              const { data: cachedWords } = await supabase
                .from('speaker_word_cache')
                .select('*')
                .in('word', batch)

              const cacheMap = new Map(cachedWords?.map(w => [w.word, w]) || [])

              // 找出需要调用有道API的单词
              const wordsNeedApi = batch.filter(w => !cacheMap.has(w))

              // 调用有道API获取缺失的单词
              if (wordsNeedApi.length > 0) {
                console.log(`[Dict Async Fill] 批次 ${Math.floor(i / BATCH_SIZE) + 1}: 缓存未命中 ${wordsNeedApi.length} 个单词`)

                const articleLanguage = article.language === 'fr' ? 'fr' : 'en'
                const dictEntries: SpeakerDictEntryForCache[] = articleLanguage === 'fr'
                  ? await lookupBatch(wordsNeedApi, articleLanguage as DictionaryLanguage, {
                      skipCache: true,
                      skipFallback: false
                    })
                  : await getBatchDictEntries(wordsNeedApi)

                // 存入缓存表
                for (const entry of dictEntries) {
                  if (!entry.definition) {
                    continue
                  }

                  // P1修复：使用 onConflict + ignore 避免并发插入冲突
                  const { error: insertError } = await supabase
                    .from('speaker_word_cache')
                    .upsert({
                      word: entry.word,
                      phonetic: entry.phonetic || entry.us_phonetic || entry.uk_phonetic,
                      definition: entry.definition,
                      example_sentence: entry.example_sentence_en || entry.example_sentence
                    }, {
                      onConflict: 'word',
                      ignoreDuplicates: true
                    })

                  // 如果插入失败（可能是并发冲突），重新查询缓存
                  if (insertError) {
                    const { data: existing } = await supabase
                      .from('speaker_word_cache')
                      .select('*')
                      .eq('word', entry.word)
                      .single()

                    if (existing) {
                      cacheMap.set(entry.word, existing)
                    }
                  } else {
                    cacheMap.set(entry.word, entry)
                    console.log(`[Dict Async Fill] ✅ 已缓存: ${entry.word}`)
                  }
                }
              } else {
                console.log(`[Dict Async Fill] 批次 ${Math.floor(i / BATCH_SIZE) + 1}: 全部缓存命中 ✅`)
              }

              // 更新生词本表（使用合并后的缓存数据）
              for (const word of batch) {
                const dictEntry = cacheMap.get(word)
                if (dictEntry) {
                  await supabase
                    .from('speaker_ghost_words')
                    .update({
                      phonetic: dictEntry.phonetic || dictEntry.us_phonetic || dictEntry.uk_phonetic,
                      definition: dictEntry.definition,
                      example_sentence: dictEntry.example_sentence_en || dictEntry.example_sentence
                    })
                    .eq('word', word)
                    .eq('user_id', user.id)
                }
              }

              // 批次间延迟，避免有道API限流
              if (i + BATCH_SIZE < uniqueWords.length) {
                await new Promise(resolve => setTimeout(resolve, BATCH_DELAY))
              }
            }

            console.log(`[Dict Async Fill] ✅ 全部完成`)
          } catch (error) {
            console.error('[Dict Async Fill] ❌ 异步填充失败:', error)
          }
        })
      }
    }

    // ========================================
    // 4. 更新 speaker_progress 状态（同时清除草稿）
    // ========================================

    const { error: progressError } = await supabase
      .from('speaker_progress')
      .upsert({
        user_id: user.id,
        article_id: articleId,
        step2_completed: true,
        step2_last_sentence_index: totalSentences - 1,
        step2_draft: null,  // 🔧 关键修复：提交成功后清除草稿，避免下次进入时重复提示
        step3_words_completed: ghostWordsToReviewCount === 0,
        status: 'in_progress',  // 还需要完成后续步骤
        updated_at: new Date().toISOString()
      },
      {
        onConflict: 'user_id,article_id'
      })

    if (progressError) {
      console.error('[Speaker Dictation Submit API] ❌ 更新进度失败:', progressError)
      // 不阻断主流程
    } else {
      console.log('[Speaker Dictation Submit API] ✅ 进度更新成功，草稿已清除')
    }

    // ========================================
    // 5. 返回判分结果
    // ========================================

    return NextResponse.json({
      success: true,
      result: {
        totalSentences,
        totalWords,
        correctCount,
        wrongCount,
        skippedCount,
        accuracyRate,
        wrongWords
      },
      submissionId: submission.id
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Speaker Dictation Submit API] ❌ 提交判分失败:', { error: errorMessage })

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '服务器内部错误' },
      { status: 500 }
    )
  }
}
