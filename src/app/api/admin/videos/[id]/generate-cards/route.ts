/**
 * AI 生成知识点 API
 *
 * 对应 PRD: VIDEO_MODULE_PRD.md Section 5.1
 * - "AI 生成知识点（根据语言选择对应提示词）"
 * - 生成内容：单词卡片、短语卡片、地道表达卡片、填空练习
 *
 * 支持按模块单独生成，支持重置
 */

// Next.js API 路由超时配置（Vercel Pro 最大 60 秒，本地开发更长）
export const maxDuration = 60

import { createAdminClient } from '@/lib/supabase/server'
import { checkAdminForAPI } from '@/lib/admin-auth'
import { NextResponse } from 'next/server'
import type { VideoLanguage } from '@/types/video'
import { completeStep } from '@/lib/workflow-helper'

// 生成目标类型
type GenerateType = 'all' | 'word' | 'phrase' | 'expression' | 'exercise'

interface GenerateCardsRequest {
  cardType?: GenerateType
  reset?: boolean
}

// 语言对应的 AI 提示词模板
const LANGUAGE_PROMPTS: Record<VideoLanguage, string> = {
  en: `Analyze the following English sentences from a video and extract learning points.

For each sentence, identify:
1. **Words**: Important vocabulary words (not basic words like "the", "is")
2. **Phrases**: Common phrases (2-4 words)
3. **Expressions**: Idiomatic expressions or slang where literal meaning differs from actual meaning
4. **Exercises**: Create fill-in-the-blank exercises by removing key words from sentences

Return a JSON array with this structure:
[
  {
    "type": "word" | "phrase" | "expression" | "exercise",
    "data": {
      // For words/phrases/expressions:
      "word/phrase/expression": "...",
      "phonetic": "...",
      "chinese_definition": "...",
      "part_of_speech": "noun/verb/adj/...",
      "example_from_video": "...",
      "example_translation": "...",
      // For expressions only:
      "formula": "the formula/pattern",
      "meaning": "the meaning",
      "usage_note": "when/how to use",
      "examples": [{"original": "...", "cn": "..."}],
      // For exercises only:
      "exercise_type": "fill_blank",
      "difficulty": "beginner" | "intermediate" | "advanced",
      "original_text": "the full sentence",
      "blank_positions": [{"start": 0, "end": 5, "word": "Hello", "hint": "H____"}],
      "hint_type": "first_letter" | "none",
      "answer_text": "the removed word(s)"
    },
    "subtitle_id": "..."
  }
]`,

  fr: `Analysez les phrases françaises suivantes d'une vidéo et extrayez les points d'apprentissage.

Pour chaque phrase, identifiez:
1. **Mots**: Vocabulaire important
2. **Phrases**: Phrases courantes (2-4 mots)
3. **Expressions**: Expressions idiomatiques ou argot
4. **Exercices**: Créez des exercices à trous

Retournez un tableau JSON avec cette structure:
[
  {
    "type": "word" | "phrase" | "expression" | "exercise",
    "data": {
      "word/phrase/expression": "...",
      "phonetic": "...",
      "chinese_definition": "...",
      "part_of_speech": "nom/verbe/adj/...",
      "example_from_video": "...",
      "example_translation": "...",
      "exercise_type": "fill_blank",
      "difficulty": "beginner" | "intermediate" | "advanced",
      "original_text": "...",
      "blank_positions": [...],
      "hint_type": "first_letter",
      "answer_text": "..."
    },
    "subtitle_id": "..."
  }
]`,

  de: `Analysiere die folgenden deutschen Sätze aus einem Video und extrahiere Lernpunkte.

Für jeden Satz, identifiziere:
1. **Wörter**: Wichtiger Wortschatz
2. **Phrasen**: Gängige Phrasen (2-4 Wörter)
3. **Ausdrücke**: Idiomatische Ausdrücke
4. **Übungen**: Erstelle Lückentextübungen

Gib ein JSON-Array zurück mit dieser Struktur:
[
  {
    "type": "word" | "phrase" | "expression" | "exercise",
    "data": {
      "word/phrase/expression": "...",
      "phonetic": "...",
      "chinese_definition": "...",
      "part_of_speech": "Substantiv/Verb/Adj/...",
      "example_from_video": "...",
      "example_translation": "...",
      "exercise_type": "fill_blank",
      "difficulty": "beginner" | "intermediate" | "advanced",
      "original_text": "...",
      "blank_positions": [...],
      "hint_type": "first_letter",
      "answer_text": "..."
    },
    "subtitle_id": "..."
  }
]`,

  es: `Analiza las siguientes oraciones en español de un video y extrae puntos de aprendizaje.

Para cada oración, identifica:
1. **Palabras**: Vocabulario importante
2. **Frases**: Frases comunes (2-4 palabras)
3. **Expresiones**: Expresiones idiomáticas
4. **Ejercicios**: Crea ejercicios de completar espacios

Devuelve un array JSON con esta estructura:
[
  {
    "type": "word" | "phrase" | "expression" | "exercise",
    "data": {
      "word/phrase/expression": "...",
      "phonetic": "...",
      "chinese_definition": "...",
      "part_of_speech": "sustantivo/verbo/adj/...",
      "example_from_video": "...",
      "example_translation": "...",
      "exercise_type": "fill_blank",
      "difficulty": "beginner" | "intermediate" | "advanced",
      "original_text": "...",
      "blank_positions": [...],
      "hint_type": "first_letter",
      "answer_text": "..."
    },
    "subtitle_id": "..."
  }
]`,

  ja: `以下の日本語の文章を分析し、学習ポイントを抽出してください。

各文章について:
1. **単語**: 重要な語彙
2. **フレーズ**: 一般的なフレーズ
3. **表現**: 慣用句やスラング
4. **練習問題**: 穴埋め問題を作成

以下の構造でJSON配列を返してください:
[
  {
    "type": "word" | "phrase" | "expression" | "exercise",
    "data": {
      "word/phrase/expression": "...",
      "phonetic": "...",
      "chinese_definition": "...",
      "part_of_speech": "名詞/動詞/形容詞/...",
      "example_from_video": "...",
      "example_translation": "...",
      "exercise_type": "fill_blank",
      "difficulty": "beginner" | "intermediate" | "advanced",
      "original_text": "...",
      "blank_positions": [...],
      "hint_type": "first_letter",
      "answer_text": "..."
    },
    "subtitle_id": "..."
  }
]`,

  it: `Analizza le seguenti frasi italiane da un video ed estrai i punti di apprendimento.

Per ogni frase, identifica:
1. **Parole**: Vocabolario importante
2. **Frasi**: Frasi comuni (2-4 parole)
3. **Espressioni**: Espressioni idiomatiche
4. **Esercizi**: Crea esercizi di riempimento

Restituisci un array JSON con questa struttura:
[
  {
    "type": "word" | "phrase" | "expression" | "exercise",
    "data": {
      "word/phrase/expression": "...",
      "phonetic": "...",
      "chinese_definition": "...",
      "part_of_speech": "sostantivo/verbo/agg/...",
      "example_from_video": "...",
      "example_translation": "...",
      "exercise_type": "fill_blank",
      "difficulty": "beginner" | "intermediate" | "advanced",
      "original_text": "...",
      "blank_positions": [...],
      "hint_type": "first_letter",
      "answer_text": "..."
    },
    "subtitle_id": "..."
  }
]`,

  ru: `Проанализируйте следующие русские предложения из видео и извлеките учебные моменты.

Для каждого предложения определите:
1. **Слова**: Важная лексика
2. **Фразы**: Распространенные фразы (2-4 слова)
3. **Выражения**: Идиоматические выражения
4. **Упражнения**: Создайте упражнения с пропусками

Верните JSON-массив со следующей структурой:
[
  {
    "type": "word" | "phrase" | "expression" | "exercise",
    "data": {
      "word/phrase/expression": "...",
      "phonetic": "...",
      "chinese_definition": "...",
      "part_of_speech": "сущ/глаг/прил/...",
      "example_from_video": "...",
      "example_translation": "...",
      "exercise_type": "fill_blank",
      "difficulty": "beginner" | "intermediate" | "advanced",
      "original_text": "...",
      "blank_positions": [...],
      "hint_type": "first_letter",
      "answer_text": "..."
    },
    "subtitle_id": "..."
  }
]`,
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params
    const body: GenerateCardsRequest = await request.json().catch(() => ({}))
    const cardType = body.cardType || 'all'
    const shouldReset = body.reset !== false

    // 验证管理员权限
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error || '未授权' },
        { status: adminCheck.status || 401 }
      )
    }

    const supabase = await createAdminClient()

    // 获取视频信息
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, title, language')
      .eq('id', videoId)
      .single()

    if (videoError || !video) {
      return NextResponse.json({ error: '视频不存在' }, { status: 404 })
    }

    // ⚠️ 检查是否已有数据（来自批量上传的学习材料）
    // 如果已有数据且不强制重置，直接返回，不做任何操作
    if (!shouldReset) {
      const [existingWords, existingPhrases, existingExpressions] = await Promise.all([
        supabase.from('video_word_cards').select('id').eq('video_id', videoId).limit(1),
        supabase.from('video_phrase_cards').select('id').eq('video_id', videoId).limit(1),
        supabase.from('video_expression_cards').select('id').eq('video_id', videoId).limit(1),
      ])

      const hasData = (cardType === 'all' || cardType === 'word') && existingWords.data?.length > 0
        || (cardType === 'all' || cardType === 'phrase') && existingPhrases.data?.length > 0
        || (cardType === 'all' || cardType === 'expression') && existingExpressions.data?.length > 0

      if (hasData) {
        console.log(`[generate-cards] 视频 ${videoId} 已有学习材料数据，跳过 AI 生成`)
        return NextResponse.json({
          success: true,
          message: '已有学习材料数据，无需 AI 生成',
          skipped: true,
          stats: {
            words: existingWords.data?.length || 0,
            phrases: existingPhrases.data?.length || 0,
            expressions: existingExpressions.data?.length || 0,
          }
        })
      }
    }

    // 如果需要重置，先删除旧卡片
    if (shouldReset) {
      const deletePromises: Promise<void>[] = []

      if (cardType === 'all' || cardType === 'word') {
        deletePromises.push(
          supabase.from('video_word_cards').delete().eq('video_id', videoId).then(() => {})
        )
      }
      if (cardType === 'all' || cardType === 'phrase') {
        deletePromises.push(
          supabase.from('video_phrase_cards').delete().eq('video_id', videoId).then(() => {})
        )
      }
      if (cardType === 'all' || cardType === 'expression') {
        deletePromises.push(
          supabase.from('video_expression_cards').delete().eq('video_id', videoId).then(() => {})
        )
      }
      if (cardType === 'all' || cardType === 'exercise') {
        deletePromises.push(
          supabase.from('video_exercises').delete().eq('video_id', videoId).then(() => {})
        )
      }

      await Promise.all(deletePromises)
    }

    // 获取字幕
    const { data: subtitles, error: subtitlesError } = await supabase
      .from('video_subtitles')
      .select('id, original_text')
      .eq('video_id', videoId)
      .order('display_order', { ascending: true })

    if (subtitlesError || !subtitles || subtitles.length === 0) {
      return NextResponse.json({
        error: '没有可用的字幕数据，请先上传字幕'
      }, { status: 400 })
    }

    // 获取对应语言的提示词
    const basePrompt = LANGUAGE_PROMPTS[video.language as VideoLanguage] || LANGUAGE_PROMPTS.en

    // 根据 cardType 修改提示词
    let typeInstruction = ''
    if (cardType === 'word') {
      typeInstruction = '\n\nIMPORTANT: Only extract WORDS (vocabulary). Do NOT include phrases, expressions, or exercises.'
    } else if (cardType === 'phrase') {
      typeInstruction = '\n\nIMPORTANT: Only extract PHRASES (2-4 word combinations). Do NOT include single words, expressions, or exercises.'
    } else if (cardType === 'expression') {
      typeInstruction = '\n\nIMPORTANT: Only extract IDIOMATIC EXPRESSIONS. Do NOT include single words, common phrases, or exercises.'
    } else if (cardType === 'exercise') {
      typeInstruction = '\n\nIMPORTANT: Only generate FILL-IN-THE-BLANK EXERCISES. Do NOT include words, phrases, or expressions.'
    }

    const promptTemplate = basePrompt + typeInstruction

    // 🔧 分批处理字幕（每批 3 条），并行处理以加快速度
    const BATCH_SIZE = 3
    const allCards: Array<{
      type: string
      data: Record<string, unknown>
      subtitle_id: string
    }> = []

    const apiKey = process.env.GLM_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        error: 'AI API 密钥未配置',
        hint: '请设置 GLM_API_KEY 环境变量'
      }, { status: 500 })
    }

    // 构建所有批次的请求
    const batches: Array<{
      batchNum: number
      subtitles: typeof subtitles
      prompt: string
    }> = []

    const totalBatches = Math.ceil(subtitles.length / BATCH_SIZE)
    for (let i = 0; i < subtitles.length; i += BATCH_SIZE) {
      const batch = subtitles.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1

      const subtitlesText = batch
        .map((s, idx) => `[${i + idx + 1}] ID: ${s.id}\n${s.original_text}`)
        .join('\n\n')

      const fullPrompt = `${promptTemplate}

--- SUBTITLES (Batch ${batchNum}/${totalBatches}) ---
${subtitlesText}

--- END ---

Return ONLY valid JSON array, no other text.`

      batches.push({ batchNum, subtitles: batch, prompt: fullPrompt })
    }

    console.log(`[AI 生成] 共 ${totalBatches} 个批次，开始并行处理...`)

    // 并行处理所有批次
    const batchResults = await Promise.all(
      batches.map(async ({ batchNum, prompt }) => {
        try {
          const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: 'glm-4-flash',
              max_tokens: 4096,
              messages: [{ role: 'user', content: prompt }],
            }),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error(`[AI 生成] 批次 ${batchNum} API 错误:`, errorData)
            return []
          }

          const aiResponse = await response.json()
          let content = aiResponse.choices?.[0]?.message?.content || ''

          // 移除 markdown 代码块标记
          content = content
            .replace(/```json\s*/gi, '')
            .replace(/```\s*/g, '')
            .trim()

          // 解析 AI 返回的 JSON
          const jsonMatch = content.match(/\[[\s\S]*\]/)
          if (!jsonMatch) {
            console.error(`[AI 生成] 批次 ${batchNum} 未找到 JSON 数组`)
            return []
          }

          let jsonStr = jsonMatch[0]
          // 如果 JSON 不完整（不以 ] 结尾），尝试修复
          if (!jsonStr.trim().endsWith(']')) {
            const lastCompleteObj = jsonStr.lastIndexOf('},')
            if (lastCompleteObj > 0) {
              jsonStr = jsonStr.substring(0, lastCompleteObj + 1) + ']'
            }
          }

          const batchCards = JSON.parse(jsonStr)
          console.log(`[AI 生成] 批次 ${batchNum} 成功，获取 ${batchCards.length} 张卡片`)
          return batchCards
        } catch (error) {
          console.error(`[AI 生成] 批次 ${batchNum} 处理失败:`, error)
          return []
        }
      })
    )

    // 合并所有批次结果
    for (const cards of batchResults) {
      allCards.push(...cards)
    }

    console.log(`[AI 生成] 全部完成，共获取 ${allCards.length} 张卡片`)

    // 使用 allCards 替代原来的 cards
    const cards = allCards

    // 保存卡片到数据库
    const savedCards = {
      words: 0,
      phrases: 0,
      expressions: 0,
      exercises: 0,
      duplicates: 0,
    }
    const errors: string[] = []

    for (const card of cards) {
      try {
        if (card.type === 'word' && card.data.word) {
          // 检查是否已存在
          if (!shouldReset) {
            const { data: existingCard } = await supabase
              .from('video_word_cards')
              .select('id')
              .eq('video_id', videoId)
              .eq('word', card.data.word as string)
              .maybeSingle()

            if (existingCard) {
              savedCards.duplicates++
              continue // 跳过重复
            }
          }

          const { error } = await supabase
            .from('video_word_cards')
            .insert({
              video_id: videoId,
              word: card.data.word as string,
              phonetic: (card.data.phonetic as string) || null,
              part_of_speech: (card.data.part_of_speech as string) || null,
              chinese_definition: (card.data.chinese_definition as string) || '',
              english_definition: (card.data.english_definition as string) || null,
              example_from_video: (card.data.example_from_video as string) || null,
              example_translation: (card.data.example_translation as string) || null,
              difficulty_level: 1,
            })

          if (!error) savedCards.words++
          else errors.push(`word: ${error.message}`)
        } else if (card.type === 'phrase' && card.data.phrase) {
          // 检查是否已存在
          if (!shouldReset) {
            const { data: existingCard } = await supabase
              .from('video_phrase_cards')
              .select('id')
              .eq('video_id', videoId)
              .eq('phrase', card.data.phrase as string)
              .maybeSingle()

            if (existingCard) {
              savedCards.duplicates++
              continue
            }
          }

          const { error } = await supabase
            .from('video_phrase_cards')
            .insert({
              video_id: videoId,
              phrase: card.data.phrase as string,
              phonetic: (card.data.phonetic as string) || null,
              chinese_definition: (card.data.chinese_definition as string) || '',
              context: (card.data.example_from_video as string) || null,
              context_translation: (card.data.example_translation as string) || null,
              difficulty_level: 1,
            })

          if (!error) savedCards.phrases++
          else errors.push(`phrase: ${error.message}`)
        } else if (card.type === 'expression' && card.data.expression) {
          // 检查是否已存在
          if (!shouldReset) {
            const { data: existingCard } = await supabase
              .from('video_expression_cards')
              .select('id')
              .eq('video_id', videoId)
              .eq('expression', card.data.expression as string)
              .maybeSingle()

            if (existingCard) {
              savedCards.duplicates++
              continue
            }
          }

          const { error } = await supabase
            .from('video_expression_cards')
            .insert({
              video_id: videoId,
              expression: card.data.expression as string,
              context: (card.data.example_from_video as string) || '',
              context_translation: (card.data.example_translation as string) || null,
              formula: (card.data.formula as string) || null,
              meaning: (card.data.meaning as string) || (card.data.chinese_definition as string),
              usage_note: (card.data.usage_note as string) || null,
              examples: (card.data.examples as Array<{ original: string; cn: string }>) || null,
              difficulty_level: 1,
            })

          if (!error) savedCards.expressions++
          else errors.push(`expression: ${error.message}`)
        } else if (card.type === 'exercise' && card.data.original_text) {
          // 检查是否已存在（基于 subtitle_id 和 original_text 组合）
          if (!shouldReset && card.subtitle_id) {
            const { data: existingExercise } = await supabase
              .from('video_exercises')
              .select('id')
              .eq('video_id', videoId)
              .eq('subtitle_id', card.subtitle_id)
              .eq('original_text', card.data.original_text as string)
              .maybeSingle()

            if (existingExercise) {
              savedCards.duplicates++
              continue
            }
          }

          const { error } = await supabase
            .from('video_exercises')
            .insert({
              video_id: videoId,
              subtitle_id: card.subtitle_id,
              exercise_type: (card.data.exercise_type as string) || 'fill_blank',
              difficulty: (card.data.difficulty as string) || 'intermediate',
              original_text: card.data.original_text as string,
              blank_positions: (card.data.blank_positions as Array<{ start: number; end: number; word: string; hint?: string }>) || [],
              hint_type: (card.data.hint_type as string) || 'first_letter',
              answer_text: (card.data.answer_text as string) || '',
              display_order: savedCards.exercises,
            })

          if (!error) savedCards.exercises++
          else errors.push(`exercise: ${error.message}`)
        }
      } catch (err) {
        errors.push(`card processing: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    // 记录错误日志
    if (errors.length > 0) {
      console.error('[AI 生成] 部分卡片保存失败:', errors)
    }

    const totalGenerated = savedCards.words + savedCards.phrases + savedCards.expressions + savedCards.exercises
    const duplicateMsg = savedCards.duplicates > 0 ? `，跳过 ${savedCards.duplicates} 张重复卡片` : ''

    // 更新工作流进度：卡片生成完成
    if (totalGenerated > 0) {
      await completeStep(supabase, videoId, 'cards')
    }

    return NextResponse.json({
      success: true,
      message: `成功生成 ${totalGenerated} 张卡片${duplicateMsg}`,
      data: {
        video_id: videoId,
        video_title: video.title,
        language: video.language,
        cards: savedCards,
        total_subtitles_processed: subtitles.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    })
  } catch (error) {
    console.error('[AI 生成] 错误:', error)
    return NextResponse.json(
      { error: '服务器错误', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
