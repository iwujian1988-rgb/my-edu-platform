/**
 * 批量重新计算文章难度等级
 *
 * GET: 预览模式 - 只输出对比结果，不更新数据库
 * POST: 执行模式 - 更新数据库中的难度等级
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { autoDetectLevel, LEVEL_SHORT_NAMES } from '@/lib/speaker-auto-analysis'

interface ArticleWithSentences {
  id: string
  title: string
  level: number
  duration_seconds: number | null
  word_count: number | null
  total_sentences: number
  json_data: {
    sentences: Array<{ text: string }>
    meta?: any
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  try {
    // 支持 limit 参数，用于测试
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

    // 1. 获取所有文章
    let query = supabase
      .from('speaker_articles')
      .select('id, title, level, duration_seconds, word_count, total_sentences, json_data')
      .order('created_at', { ascending: false })

    if (limit) {
      query = query.limit(limit)
    }

    const { data: articles, error } = await query

    if (error) {
      return NextResponse.json({ error: '获取文章失败', details: error.message }, { status: 500 })
    }

    if (!articles || articles.length === 0) {
      return NextResponse.json({ message: '没有找到文章' })
    }

    // 2. 重新计算每篇文章的难度
    const results = (articles as ArticleWithSentences[]).map(article => {
      const sentences = article.json_data?.sentences || []

      if (sentences.length === 0) {
        return {
          id: article.id,
          title: article.title,
          oldLevel: article.level,
          newLevel: null,
          error: '无句子数据'
        }
      }

      try {
        const result = autoDetectLevel(sentences, article.duration_seconds)

        return {
          id: article.id,
          title: article.title.substring(0, 50) + (article.title.length > 50 ? '...' : ''),
          oldLevel: article.level,
          newLevel: result.level,
          confidence: Number((result.confidence * 100).toFixed(0)),
          metrics: {
            sentences: result.metrics.totalSentences,
            words: result.metrics.totalWords,
            wpm: result.metrics.speakingSpeedWpm || '-',
            cefr: result.details.cefrDetails?.level || '-'
          },
          scores: {
            sentence: result.details.sentenceScore,
            length: result.details.lengthScore,
            cefr: Number(result.details.cefrVocabScore.toFixed(1)),
            speed: result.details.speakingSpeedScore,
            duration: result.details.durationScore,
            weighted: result.details.weightedScore
          },
          changed: article.level !== result.level
        }
      } catch (err: any) {
        return {
          id: article.id,
          title: article.title,
          oldLevel: article.level,
          newLevel: null,
          error: err.message
        }
      }
    })

    // 3. 统计
    const validResults = results.filter(r => r.newLevel !== null)
    const changedResults = validResults.filter(r => r.changed)
    const errorResults = results.filter(r => r.error)

    // 按等级分布统计
    const oldDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    const newDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

    validResults.forEach(r => {
      oldDistribution[r.oldLevel] = (oldDistribution[r.oldLevel] || 0) + 1
      newDistribution[r.newLevel as number] = (newDistribution[r.newLevel as number] || 0) + 1
    })

    return NextResponse.json({
      summary: {
        total: articles.length,
        valid: validResults.length,
        changed: changedResults.length,
        errors: errorResults.length
      },
      distribution: {
        old: oldDistribution,
        new: newDistribution
      },
      changedArticles: changedResults,
      allResults: results,
      errorArticles: errorResults
    })

  } catch (error: any) {
    console.error('[重新计算难度] 异常:', error)
    return NextResponse.json({ error: '服务器错误', details: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    // 1. 权限检查
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    // 2. 获取所有文章
    const { data: articles, error } = await supabase
      .from('speaker_articles')
      .select('id, title, level, duration_seconds, json_data')

    if (error) {
      return NextResponse.json({ error: '获取文章失败', details: error.message }, { status: 500 })
    }

    if (!articles || articles.length === 0) {
      return NextResponse.json({ message: '没有找到文章' })
    }

    // 3. 逐个更新
    const updates: Array<{ id: string; title: string; oldLevel: number; newLevel: number }> = []
    const errors: Array<{ id: string; error: string }> = []

    for (const article of articles as ArticleWithSentences[]) {
      const sentences = article.json_data?.sentences || []

      if (sentences.length === 0) continue

      try {
        const result = autoDetectLevel(sentences, article.duration_seconds)

        // 只有等级变化时才更新
        if (article.level !== result.level) {
          const { error: updateError } = await supabase
            .from('speaker_articles')
            .update({ level: result.level })
            .eq('id', article.id)

          if (updateError) {
            errors.push({ id: article.id, error: updateError.message })
          } else {
            updates.push({
              id: article.id,
              title: article.title.substring(0, 50),
              oldLevel: article.level,
              newLevel: result.level
            })
          }
        }
      } catch (err: any) {
        errors.push({ id: article.id, error: err.message })
      }
    }

    return NextResponse.json({
      success: true,
      message: `已更新 ${updates.length} 篇文章的难度等级`,
      updates,
      errors,
      unchanged: articles.length - updates.length - errors.length
    })

  } catch (error: any) {
    console.error('[更新难度] 异常:', error)
    return NextResponse.json({ error: '服务器错误', details: error.message }, { status: 500 })
  }
}
