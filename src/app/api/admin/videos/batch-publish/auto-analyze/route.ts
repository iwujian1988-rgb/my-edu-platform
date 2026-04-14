/**
 * 视频自动分析 API
 *
 * POST /api/admin/videos/batch-publish/auto-analyze
 *
 * 功能：
 * 1. 基于公式计算难度（词汇难度 + 语速 + 信息密度）
 * 2. 调用 GLM AI 生成视频描述（30字内中文）
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { checkAdminForAPI } from '@/lib/admin-auth'

// ============================================
// 类型定义
// ============================================

interface AnalyzeRequest {
  video_id: string
}

interface SubtitleSentence {
  original_text: string
  start_time: number
  end_time: number
}

interface WordCard {
  id: string
  word: string
  difficulty_hint?: string
}

interface AnalyzeResult {
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  difficulty_score: number
  difficulty_breakdown: {
    vocabulary: number
    speech_rate: number
    info_density: number
  }
  description: string
  speech_rate_wpm: number
  total_words: number
  unique_words: number
}

// ============================================
// 难度计算常量
// ============================================

// 语速基准（词/分钟）
const SPEECH_RATE_BASE = {
  beginner: { min: 0, max: 120 },
  intermediate: { min: 120, max: 160 },
  advanced: { min: 160, max: 300 },
}

// GLM AI 提示词
const DESCRIPTION_PROMPT = `你是一个语言学习视频的内容编辑助手。请根据以下字幕内容，生成一个吸引人的中文描述。

要求：
1. 描述这个视频教什么语言知识（词汇、语法、表达等)
2. 字数要求：不少于 40 字，不超过 80 字
3. 使用生动有趣的语言
4. 不要使用引号、书名号等符号
5. 直接输出描述文本
6. 如果字幕太短无法判断，输出"语言学习视频"

字幕内容：
{SUBTITLES}

请输出描述：`

// ============================================
// 辅助函数
// ============================================

/**
 * 计算语速得分 (0-100)
 * WPM < 100: 0-20 分
 * WPM 100-140: 20-40 分
 * WPM 140-180: 40-70 分
 * WPM > 180: 70-100 分
 */
function calculateSpeechRateScore(wpm: number): number {
  if (wpm < 100) return Math.min(20, wpm / 5)
  if (wpm < 140) return 20 + (wpm - 100) * 0.5
  if (wpm < 180) return 40 + (wpm - 140) * 0.75
  return Math.min(100, 70 + (wpm - 180) * 0.5)
}

/**
 * 计算词汇难度得分 (0-100)
 * 基于已生成的单词卡片的 difficulty_hint
 */
function calculateVocabularyScore(
  wordCards: WordCard[],
  totalWords: number
): number {
  if (wordCards.length === 0 || totalWords === 0) return 30 // 默认中等

  // 统计各难度词汇数量
  let advancedCount = 0
  let intermediateCount = 0

  for (const card of wordCards) {
    const hint = card.difficulty_hint?.toLowerCase() || ''
    if (hint.includes('advanced') || hint.includes('hard') || hint.includes('difficult')) {
      advancedCount++
    } else if (hint.includes('intermediate') || hint.includes('medium')) {
      intermediateCount++
    }
  }

  // 计算得分
  const advancedRatio = advancedCount / totalWords
  const intermediateRatio = intermediateCount / totalWords

  // 高级词权重更高
  const score = advancedRatio * 200 + intermediateRatio * 50
  return Math.min(100, Math.max(0, score))
}

/**
 * 计算信息密度得分 (0-100)
 * 基于：生词率、句均词数、词汇多样性
 */
function calculateInfoDensityScore(
  uniqueWords: number,
  totalWords: number,
  sentenceCount: number
): number {
  if (totalWords === 0) return 30

  // 词汇多样性 (0-50 分)
  const diversity = uniqueWords / totalWords
  const diversityScore = diversity * 50

  // 句均词数 (0-50 分)
  // 短句 (< 8 词) = 简单, 长句 (> 15 词) = 难
  const avgWordsPerSentence = sentenceCount > 0 ? totalWords / sentenceCount : 10
  const sentenceScore = Math.min(50, Math.max(0, (avgWordsPerSentence - 5) * 5))

  return Math.min(100, diversityScore + sentenceScore)
}

/**
 * 综合难度判断
 */
function determineDifficulty(
  vocabScore: number,
  speechScore: number,
  densityScore: number
): { difficulty: 'beginner' | 'intermediate' | 'advanced'; totalScore: number } {
  // 权重：词汇 40%, 语速 30%, 信息密度 30%
  const totalScore = vocabScore * 0.4 + speechScore * 0.3 + densityScore * 0.3

  let difficulty: 'beginner' | 'intermediate' | 'advanced'
  if (totalScore < 35) {
    difficulty = 'beginner'
  } else if (totalScore < 60) {
    difficulty = 'intermediate'
  } else {
    difficulty = 'advanced'
  }

  return { difficulty, totalScore }
}

/**
 * 调用 GLM AI 生成描述
 */
async function generateDescription(subtitles: SubtitleSentence[]): Promise<string> {
  const apiKey = process.env.GLM_API_KEY
  if (!apiKey) {
    return '暂无描述'
  }

  // 提取字幕文本（取前 20 条）
  const texts = subtitles
    .slice(0, 20)
    .map(s => s.original_text || '')
    .join(' ')

  // 至少需要 5 条字幕才能生成有意义的描述
  if (subtitles.length < 5) {
    return '语言学习视频'
  }

  // 截断过长文本
  const truncatedText = texts.length > 2000 ? texts.substring(0, 2000) + '...' : texts

  const prompt = DESCRIPTION_PROMPT.replace('{SUBTITLES}', truncatedText)

  try {
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'glm-4-plus',
        max_tokens: 150,
        temperature: 0.7,
        messages: [
          { role: 'user', content: prompt },
        ],
      }),
    })

    if (!response.ok) {
      console.error('[auto-analyze] GLM API error:', response.status)
      return '暂无描述'
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim() || ''

    // 确保不超过 80 字
    if (content.length > 80) {
      return content.substring(0, 80)
    }

    return content || '暂无描述'
  } catch (error) {
    console.error('[auto-analyze] GLM API call failed:', error)
    return '暂无描述'
  }
}

// ============================================
// POST: 自动分析视频
// ============================================

export async function POST(request: NextRequest) {
  try {
    // 1. 验证管理员权限
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error || '未授权', code: adminCheck.code },
        { status: adminCheck.status || 401 }
      )
    }

    // 2. 解析请求
    const body: AnalyzeRequest = await request.json().catch(() => ({}))
    const { video_id } = body

    if (!video_id) {
      return NextResponse.json(
        { error: '缺少 video_id', code: 'MISSING_VIDEO_ID' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    // 3. 获取视频信息（时长）
    const videoResult = await supabase
      .from('videos')
      .select('id, title, duration')
      .eq('id', video_id)
      .single()

    const video = videoResult.data as { id: string; title: string; duration: number } | null
    const videoError = videoResult.error

    if (videoError || !video) {
      return NextResponse.json(
        { error: '视频不存在', code: 'VIDEO_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 4. 并行获取：字幕、单词卡片
    const [subtitlesResult, wordsResult] = await Promise.all([
      supabase
        .from('video_subtitles')
        .select('original_text, start_time, end_time')
        .eq('video_id', video_id)
        .order('start_time') as unknown as Promise<{
          data: SubtitleSentence[] | null
          error: any
        }>,
      supabase
        .from('video_word_cards')
        .select('id, word, difficulty_hint')
        .eq('video_id', video_id) as unknown as Promise<{
          data: WordCard[] | null
          error: any
        }>,
    ])

    const subtitles = subtitlesResult.data || []
    const wordCards = wordsResult.data || []

    if (subtitles.length === 0) {
      return NextResponse.json(
        { error: '视频没有字幕数据', code: 'NO_SUBTITLES' },
        { status: 400 }
      )
    }

    // 5. 计算各项指标
    // 5.1 统计总词数和独立词数
    const allWords: string[] = []
    subtitles.forEach(s => {
      const words = (s.original_text || '').toLowerCase().split(/\s+/).filter(w => w.length > 0)
      allWords.push(...words)
    })

    const totalWords = allWords.length
    const uniqueWords = new Set(allWords).size
    const sentenceCount = subtitles.length

    // 5.2 计算语速 (WPM)
    const durationMinutes = (video.duration || 60) / 60
    const speechRateWpm = Math.round(totalWords / durationMinutes)

    // 5.3 计算各项得分
    const vocabScore = calculateVocabularyScore(wordCards, totalWords)
    const speechScore = calculateSpeechRateScore(speechRateWpm)
    const densityScore = calculateInfoDensityScore(uniqueWords, totalWords, sentenceCount)

    // 5.4 综合判断难度
    const { difficulty, totalScore } = determineDifficulty(vocabScore, speechScore, densityScore)

    // 6. 生成描述（调用 GLM AI）
    const description = await generateDescription(subtitles)

    // 7. 返回结果
    const result: AnalyzeResult = {
      difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced',
      difficulty_score: Math.round(totalScore),
      difficulty_breakdown: {
        vocabulary: Math.round(vocabScore),
        speech_rate: Math.round(speechScore),
        info_density: Math.round(densityScore),
      },
      description,
      speech_rate_wpm: speechRateWpm,
      total_words: totalWords,
      unique_words: uniqueWords,
    }

    console.log(`[auto-analyze] 视频 ${video.title} 分析完成:`, result)

    return NextResponse.json({
      success: true,
      data: result,
    })

  } catch (error) {
    console.error('[auto-analyze] 服务器错误:', error)
    return NextResponse.json(
      {
        error: '服务器错误',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
