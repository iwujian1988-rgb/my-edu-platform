/**
 * 字幕上传 + AI 分析 API
 *
 * POST /api/admin/videos/analyze-subtitles
 *
 * 工作流 Step 1: 上传字幕并 AI 分析
 * - 检测语言
 * - 计算时长
 * - 生成建议标题
 * - 提取关键词（匹配预设 + AI 新增）
 * - 分析难度（用词、语速、句子复杂度）
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkAdminForAPI } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/server'
import type { VideoLanguage, VideoDifficulty } from '@/types/video'

// ============================================
// 类型定义
// ============================================

interface SubtitleSentence {
  id: number
  text: string
  start_time: number
  end_time: number
}

interface AnalyzeRequest {
  sentences: SubtitleSentence[]
}

interface AnalyzeResult {
  language: VideoLanguage
  duration: number
  suggested_title: string
  keywords: Array<{
    keyword: string
    category: string
    is_preset: boolean
  }>
  difficulty: VideoDifficulty
  difficulty_analysis: {
    vocabulary_score: number
    speech_rate: number
    sentence_complexity: number
    reason: string
  }
  total_words: number
  total_sentences: number
}

// ============================================
// 语言检测提示词
// ============================================

const LANGUAGE_ANALYSIS_PROMPT = `Analyze the following subtitle text and extract learning-related information.

IMPORTANT: You must return ONLY valid JSON, no other text.

Return a JSON object with this structure:
{
  "language": "en" | "fr" | "de" | "es" | "ja" | "it" | "ru",
  "suggested_title": "A short, catchy title for this video (max 50 chars)",
  "keywords": ["keyword1", "keyword2", ...],
  "difficulty": "beginner" | "intermediate" | "advanced",
  "vocabulary_score": 1-10,
  "sentence_complexity": 1-10,
  "reason": "Brief explanation of the difficulty assessment"
}

Language detection rules:
- English: en
- French: fr
- German: de
- Spanish: es
- Japanese: ja
- Italian: it
- Russian: ru

Difficulty assessment criteria:
- beginner: Simple vocabulary, short sentences, slow pace
- intermediate: Moderate vocabulary, mixed sentence lengths, normal pace
- advanced: Complex vocabulary, long sentences, fast pace or idioms

--- SUBTITLES ---
{SUBTITLES}

--- END ---`

// ============================================
// 语言检测映射
// ============================================

const LANGUAGE_HINTS: Record<string, VideoLanguage> = {
  // 英语特征词
  'the': 'en', 'is': 'en', 'are': 'en', 'you': 'en', 'we': 'en', 'have': 'en',
  // 法语特征词
  'le': 'fr', 'la': 'fr', 'les': 'fr', 'est': 'fr', 'sont': 'fr', 'vous': 'fr',
  'je': 'fr', 'nous': 'fr', 'avoir': 'fr', 'être': 'fr',
  // 德语特征词
  'der': 'de', 'die': 'de', 'das': 'de', 'ist': 'de', 'sind': 'de', 'ich': 'de',
  'wir': 'de', 'haben': 'de', 'sein': 'de',
  // 西班牙语特征词
  'el': 'es', 'los': 'es', 'las': 'es', 'es': 'es', 'son': 'es', 'tú': 'es',
  'yo': 'es', 'nosotros': 'es', 'tener': 'es', 'ser': 'es',
  // 日语特征（平假名/片假名）
  'です': 'ja', 'ます': 'ja', 'した': 'ja', 'して': 'ja', 'こと': 'ja',
  // 意大利语特征词（避免与西班牙语重复）
  'il': 'it', 'è': 'it', 'sono': 'it', 'io': 'it', 'noi': 'it', 'avere': 'it', 'essere': 'it',
  // 俄语特征词（西里尔字母）
  'это': 'ru', 'как': 'ru', 'что': 'ru', 'он': 'ru', 'она': 'ru',
}

// ============================================
// 快速语言检测（基于特征词）
// ============================================

function detectLanguageQuick(text: string): VideoLanguage {
  const lowerText = text.toLowerCase()
  const words = lowerText.split(/\s+/)

  // 检查日语假名
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) {
    return 'ja'
  }

  // 检查俄语西里尔字母
  if (/[\u0400-\u04FF]/.test(text)) {
    return 'ru'
  }

  // 统计各语言特征词出现次数
  const scores: Record<VideoLanguage, number> = {
    en: 0, fr: 0, de: 0, es: 0, ja: 0, it: 0, ru: 0
  }

  for (const word of words) {
    const lang = LANGUAGE_HINTS[word]
    if (lang) {
      scores[lang]++
    }
  }

  // 找出得分最高的语言
  let maxScore = 0
  let detectedLang: VideoLanguage = 'en'

  for (const [lang, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score
      detectedLang = lang as VideoLanguage
    }
  }

  return detectedLang
}

// ============================================
// 计算时长
// ============================================

function calculateDuration(sentences: SubtitleSentence[]): number {
  if (sentences.length === 0) return 0

  const maxEndTime = Math.max(...sentences.map(s => s.end_time))
  return Math.ceil(maxEndTime)
}

// ============================================
// 计算语速（词/分钟）
// ============================================

function calculateSpeechRate(sentences: SubtitleSentence[]): number {
  if (sentences.length === 0) return 0

  const totalWords = sentences.reduce((sum, s) => sum + s.text.split(/\s+/).length, 0)
  const durationMinutes = calculateDuration(sentences) / 60

  if (durationMinutes === 0) return 0
  return Math.round(totalWords / durationMinutes)
}

// ============================================
// 主处理函数
// ============================================

export async function POST(request: NextRequest) {
  try {
    // 1. 检查管理员权限
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json(
        { success: false, error: adminCheck.error, code: adminCheck.code },
        { status: adminCheck.status }
      )
    }

    // 2. 解析请求
    const body: AnalyzeRequest = await request.json()

    if (!body.sentences || !Array.isArray(body.sentences) || body.sentences.length === 0) {
      return NextResponse.json(
        { success: false, error: '缺少字幕数据', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const { sentences } = body

    // 3. 获取预设关键词
    const supabase = await createAdminClient()
    const { data: presetKeywords } = await supabase
      .from('video_preset_keywords')
      .select('keyword, category')

    const presetKeywordMap = new Map<string, string>()
    for (const pk of (presetKeywords || []) as Array<{ keyword: string; category: string }>) {
      presetKeywordMap.set(pk.keyword.toLowerCase(), pk.category)
    }

    // 4. 准备字幕文本
    const fullText = sentences.map(s => s.text).join(' ')
    const totalWords = fullText.split(/\s+/).length
    const totalSentences = sentences.length

    // 5. 快速语言检测
    const quickLanguage = detectLanguageQuick(fullText)

    // 6. 计算时长和语速
    const duration = calculateDuration(sentences)
    const speechRate = calculateSpeechRate(sentences)

    // 7. 调用 GLM AI 进行深度分析
    const apiKey = process.env.GLM_API_KEY
    let aiAnalysis: {
      language: VideoLanguage
      suggested_title: string
      keywords: string[]
      difficulty: VideoDifficulty
      vocabulary_score: number
      sentence_complexity: number
      reason: string
    }

    if (apiKey) {
      // 截取字幕文本（避免太长）
      const truncatedText = fullText.length > 3000
        ? fullText.substring(0, 3000) + '...'
        : fullText

      const prompt = LANGUAGE_ANALYSIS_PROMPT.replace('{SUBTITLES}', truncatedText)

      const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'glm-4-plus',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      })

      if (response.ok) {
        const aiResponse = await response.json()
        const content = aiResponse.choices?.[0]?.message?.content || ''

        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            aiAnalysis = JSON.parse(jsonMatch[0])
          } else {
            throw new Error('无法解析 AI 响应')
          }
        } catch {
          // AI 解析失败，使用默认值
          aiAnalysis = {
            language: quickLanguage,
            suggested_title: '新视频',
            keywords: [],
            difficulty: 'intermediate',
            vocabulary_score: 5,
            sentence_complexity: 5,
            reason: 'AI 分析失败，使用默认值',
          }
        }
      } else {
        // AI 调用失败，使用快速检测结果
        aiAnalysis = {
          language: quickLanguage,
          suggested_title: '新视频',
          keywords: [],
          difficulty: speechRate > 150 ? 'advanced' : speechRate > 100 ? 'intermediate' : 'beginner',
          vocabulary_score: 5,
          sentence_complexity: 5,
          reason: `基于语速(${speechRate}词/分钟)自动评估`,
        }
      }
    } else {
      // 无 API Key，使用快速检测
      aiAnalysis = {
        language: quickLanguage,
        suggested_title: '新视频',
        keywords: [],
        difficulty: speechRate > 150 ? 'advanced' : speechRate > 100 ? 'intermediate' : 'beginner',
        vocabulary_score: 5,
        sentence_complexity: 5,
        reason: `基于语速(${speechRate}词/分钟)自动评估`,
      }
    }

    // 8. 处理关键词（匹配预设 + 新增）
    const processedKeywords: Array<{ keyword: string; category: string; is_preset: boolean }> = []

    for (const keyword of aiAnalysis.keywords || []) {
      const lowerKeyword = keyword.toLowerCase()
      const presetCategory = presetKeywordMap.get(lowerKeyword)

      if (presetCategory) {
        // 匹配到预设关键词
        processedKeywords.push({
          keyword,
          category: presetCategory,
          is_preset: true,
        })
      } else {
        // 新关键词，默认为 topic 类别
        processedKeywords.push({
          keyword,
          category: 'topic',
          is_preset: false,
        })
      }
    }

    // 9. 构建结果
    const result: AnalyzeResult = {
      language: aiAnalysis.language,
      duration,
      suggested_title: aiAnalysis.suggested_title,
      keywords: processedKeywords,
      difficulty: aiAnalysis.difficulty,
      difficulty_analysis: {
        vocabulary_score: aiAnalysis.vocabulary_score,
        speech_rate: speechRate,
        sentence_complexity: aiAnalysis.sentence_complexity,
        reason: aiAnalysis.reason,
      },
      total_words: totalWords,
      total_sentences: totalSentences,
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('[api/admin/videos/analyze-subtitles] Error:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
