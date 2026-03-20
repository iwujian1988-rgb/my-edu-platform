/**
 * 字幕翻译 API
 *
 * POST /api/admin/videos/[id]/translate-subtitles
 *
 * 工作流 Step 3: 使用 MyMemory 翻译字幕
 * - 支持 en/fr/de/es/ja/it/ru → zh
 * - 免费额度: 10,000 字符/天（无需注册）
 * - 可跳过
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkAdminForAPI } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/server'
import type { VideoLanguage } from '@/types/video'
import { completeStep } from '@/lib/workflow-helper'

// MyMemory 语言代码映射
const MYMEMORY_LANG_MAP: Record<VideoLanguage, string> = {
  en: 'en', fr: 'fr', de: 'de', es: 'es', ja: 'ja', it: 'it', ru: 'ru',
}

// MyMemory 翻译 API 调用（免费，无需注册）
async function callMyMemoryTranslate(
  texts: string[],
  sourceLang: VideoLanguage
): Promise<string[]> {
  const langPair = `${MYMEMORY_LANG_MAP[sourceLang]}|zh-CN`
  const results: string[] = []

  for (const text of texts) {
    // MyMemory 单次请求限制
    const truncatedText = text.length > 500 ? text.substring(0, 500) + '...' : text

    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(truncatedText)}&langpair=${langPair}`

    try {
      const res = await fetch(url)
      const data = await res.json()

      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        results.push(data.responseData.translatedText)
      } else {
        // 翻译失败，保留原文
        results.push(text)
      }

      // 避免请求过快
      await new Promise(resolve => setTimeout(resolve, 200))
    } catch (err) {
      console.error('[MyMemory] Translation error:', err)
      results.push(text)
    }
  }

  return results
}

// DeepL 翻译 API 调用（如果有 API Key）
async function callDeepLTranslate(
  texts: string[],
  sourceLang: VideoLanguage
): Promise<string[]> {
  const key = process.env.DEEPL_API_KEY
  if (!key) {
    throw new Error('DEEPL_API_KEY 未配置')
  }

  const endpoint = process.env.DEEPL_API_ENDPOINT || 'https://api-free.deepl.com/v2/translate'

  // DeepL 语言代码
  const deepLLangMap: Record<VideoLanguage, string> = {
    en: 'EN', fr: 'FR', de: 'DE', es: 'ES', ja: 'JA', it: 'IT', ru: 'RU',
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: texts,
      source_lang: deepLLangMap[sourceLang],
      target_lang: 'ZH',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`DeepL API 错误: ${res.status} - ${err}`)
  }

  const data = await res.json()
  return data.translations?.map((t: { text: string }) => t.text) || []
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. 权限检查
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json(
        { success: false, error: adminCheck.error },
        { status: adminCheck.status }
      )
    }

    const { id: videoId } = await params
    const body = await request.json().catch(() => ({}))
    const force = body.force === true

    const supabase = await createAdminClient()

    // 2. 获取视频信息
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, title, language')
      .eq('id', videoId)
      .single()

    if (videoError || !video) {
      return NextResponse.json({ error: '视频不存在' }, { status: 404 })
    }

    // 3. 获取字幕
    const { data: subtitles, error: subError } = await supabase
      .from('video_subtitles')
      .select('id, original_text, chinese_text')
      .eq('video_id', videoId)
      .order('display_order', { ascending: true })

    if (subError) {
      return NextResponse.json({ error: '获取字幕失败' }, { status: 500 })
    }

    if (!subtitles || subtitles.length === 0) {
      return NextResponse.json({ error: '没有可翻译的字幕' }, { status: 400 })
    }

    // 4. 筛选需要翻译的字幕
    const toTranslate = force
      ? subtitles
      : subtitles.filter(s => !s.chinese_text)

    if (toTranslate.length === 0) {
      return NextResponse.json({
        success: true,
        message: '所有字幕已翻译',
        data: { total: subtitles.length, translated: 0 },
      })
    }

    // 5. 执行翻译（优先使用 DeepL，否则用 MyMemory）
    const texts = toTranslate.map(s => s.original_text)
    const sourceLang = video.language as VideoLanguage
    const hasDeepL = !!process.env.DEEPL_API_KEY

    let translations: string[]
    let service = 'mymemory'

    try {
      if (hasDeepL) {
        service = 'deepl'
        translations = await callDeepLTranslate(texts, sourceLang)
      } else {
        translations = await callMyMemoryTranslate(texts, sourceLang)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '翻译失败'
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    // 6. 更新字幕翻译
    for (let i = 0; i < toTranslate.length; i++) {
      await supabase
        .from('video_subtitles')
        .update({ chinese_text: translations[i] })
        .eq('id', toTranslate[i].id)
    }

    // 7. 更新工作流状态：翻译完成
    await completeStep(supabase, videoId, 'translation')

    // 8. 返回结果
    return NextResponse.json({
      success: true,
      message: `成功翻译 ${toTranslate.length} 条字幕`,
      data: {
        video_id: videoId,
        video_title: video.title,
        total: subtitles.length,
        translated: toTranslate.length,
        service,
      },
    })
  } catch (error) {
    console.error('[translate-subtitles] Error:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
