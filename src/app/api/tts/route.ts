/**
 * TTS (Text-to-Speech) API 路由
 *
 * 功能：
 * 1. 查询数据库中是否已有音频 URL
 * 2. 如果有，返回音频流
 * 3. 如果没有，从有道 API 获取音频
 * 4. 有道失败时，用百度 API 兜底
 * 5. 返回音频流
 *
 * 多语言支持：
 * - 有道 TTS: en, fr, de, es, ja, it, ru
 * - 百度 TTS: en, fr, de, es, jp, it, ru (兜底)
 *
 * @route GET /api/tts?text={word}&type={1|2}&language={en|fr|de|es|ja|it|ru}
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getOSSClient, generateSafeFileName, uploadAudioAsync } from '@/lib/oss'

/** 支持的语言 */
type SupportedLanguage = 'en' | 'fr' | 'de' | 'es' | 'ja' | 'it' | 'ru'

/**
 * 浏览器 User-Agent（用于伪装，避免被拦截）
 */
const BROWSER_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/**
 * 有道语音 API 配置
 */
const YOUDAO_TTS_BASE_URL = 'https://dict.youdao.com/dictvoice'

/**
 * 百度翻译 TTS API 配置（兜底）
 */
const BAIDU_TTS_BASE_URL = 'https://fanyi.baidu.com/gettts'

/**
 * 有道语言参数映射
 */
const YOUDAO_LANG_MAP: Record<SupportedLanguage, string> = {
  'en': 'en',
  'fr': 'fr',
  'de': 'de',
  'es': 'es',
  'ja': 'ja',
  'it': 'it',
  'ru': 'ru'
}

/**
 * 百度语言参数映射
 */
const BAIDU_LANG_MAP: Record<SupportedLanguage, string> = {
  'en': 'en',
  'fr': 'fr',
  'de': 'de',
  'es': 'spa',
  'ja': 'jp',
  'it': 'it',
  'ru': 'ru'
}

/**
 * 主处理函数
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 解析查询参数
    const searchParams = request.nextUrl.searchParams
    const text = searchParams.get('text')
    const type = searchParams.get('type') || '2' // 默认美音
    const language = (searchParams.get('language') || 'en') as SupportedLanguage

    // 2. 参数验证
    if (!text) {
      return NextResponse.json(
        { error: '缺少必需参数: text' },
        { status: 400 }
      )
    }

    if (text.length > 200) {
      return NextResponse.json(
        { error: '文本长度不能超过 200 个字符' },
        { status: 400 }
      )
    }

    if (type !== '1' && type !== '2') {
      return NextResponse.json(
        { error: 'type 参数只能是 1（英音）或 2（美音）' },
        { status: 400 }
      )
    }

    console.log(`🎯 [TTS API] 请求: text="${text}", type=${type}, language=${language}`)

    // 3. 法语特殊处理
    // 有道 TTS 不支持单引号前缀（s', j', l' 等），需要去掉
    let ttsText = text
    if (language === 'fr') {
      const frenchPrefixPattern = /^(s|c|d|l|n|qu|j|t|m|jusqu|puisqu|lorsqu)'(.+)$/i
      const match = text.match(frenchPrefixPattern)
      if (match) {
        ttsText = match[2]
        console.log(`🔧 [TTS API] 法语去前缀: "${text}" → "${ttsText}"`)
      }
    }

    // 4. 英语：查询数据库缓存（仅英语有缓存）
    if (language === 'en') {
      const supabase = await createAdminClient()

      const { data: words, error: dbError } = await supabase
        .from('words')
        .select('id, word, audio_url')
        .eq('word', text.toLowerCase())
        .limit(1)

      console.log(`📊 [TTS API] 数据库查询结果:`, {
        found: words?.length || 0,
        hasAudioUrl: !!words?.[0]?.audio_url,
        error: dbError
      })

      if (dbError) {
        console.error('❌ [TTS API] 数据库查询错误:', dbError)
      }

      // 如果找到记录且有音频 URL，直接从 OSS 返回音频流
      const wordData = words?.[0]
      if (wordData?.audio_url && !wordData.audio_url.includes('dict.youdao.com')) {
        const httpsUrl = wordData.audio_url.replace(/^http:/, 'https:')
        console.log(`✅ [TTS API] 数据库命中，从 OSS 获取: ${httpsUrl}`)

        try {
          const ossResponse = await fetch(httpsUrl)
          if (ossResponse.ok) {
            const audioBuffer = Buffer.from(await ossResponse.arrayBuffer())
            console.log(`🔊 [TTS API] 返回 OSS 音频: ${audioBuffer.length} bytes`)

            return new NextResponse(audioBuffer, {
              status: 200,
              headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': audioBuffer.length.toString(),
                'Cache-Control': 'public, max-age=86400',
              },
            })
          }
        } catch (error) {
          console.error(`❌ [TTS API] OSS 获取失败:`, error)
        }
      }
    }

    // 4. 先请求有道（快速失败），失败后再请求百度
    // 有道通常更快，所以优先串行请求而非并行（避免浪费带宽）
    const youdaoLang = YOUDAO_LANG_MAP[language] || 'en'
    let audioBuffer = await fetchAudioFromYoudao(ttsText, type, youdaoLang, 5000) // 5秒超时

    // 5. 有道失败，尝试百度兜底
    if (!audioBuffer) {
      console.log(`⚠️ [TTS API] 有道失败，尝试百度兜底...`)
      const baiduLang = BAIDU_LANG_MAP[language] || 'en'
      audioBuffer = await fetchAudioFromBaidu(ttsText, baiduLang)
    }

    // 6. 都失败了
    if (!audioBuffer) {
      return NextResponse.json(
        { error: '无法从 TTS 服务获取音频', fallback: 'webspeech', language },
        { status: 404 }
      )
    }

    // 7. 返回音频流
    console.log(`🔊 [TTS API] 返回音频流: ${audioBuffer.length} bytes`)

    const response = new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000', // 缓存 1 年
      },
    })

    // 8. 英语：异步处理上传 OSS + 更新数据库
    if (language === 'en') {
      processAudioAsync(text, type, audioBuffer).catch(error => {
        console.error('❌ [TTS API] 异步处理失败:', error)
      })
    }

    return response

  } catch (error) {
    console.error('❌ [TTS API] 服务器错误:', error)
    return NextResponse.json(
      { error: '服务器内部错误', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * 从有道 API 获取音频
 * @param text - 单词或句子
 * @param type - 1=英音, 2=美音
 * @param lang - 语言代码 (en, fr, de, es, ja, it, ru)
 * @returns 音频 Buffer 或 null
 */
async function fetchAudioFromYoudao(
  text: string,
  type: string,
  lang: string,
  timeout = 10000
): Promise<Buffer | null> {
  try {
    // 有道 TTS: le 参数指定语言
    const url = `${YOUDAO_TTS_BASE_URL}?audio=${encodeURIComponent(text)}&le=${lang}&type=${type}`

    console.log(`📡 [有道 API] 请求: ${url}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`❌ [有道 API] HTTP ${response.status}`)
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 检查是否是有效音频（至少 100 bytes，有道有时返回很小的有效音频）
    if (buffer.length < 100) {
      console.error(`❌ [有道 API] 音频太小: ${buffer.length} bytes`)
      return null
    }

    console.log(`✅ [有道 API] 获取成功: ${buffer.length} bytes`)
    return buffer

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('❌ [有道 API] 请求超时')
    } else {
      console.error('❌ [有道 API] 请求失败:', error)
    }
    return null
  }
}

/**
 * 从百度翻译 API 获取音频（兜底）
 * @param text - 单词或句子
 * @param lang - 语言代码 (en, fr, de, spa, jp, it, ru)
 * @returns 音频 Buffer 或 null
 */
async function fetchAudioFromBaidu(
  text: string,
  lang: string
): Promise<Buffer | null> {
  try {
    // 百度 TTS: lan 参数指定语言，spd 语速
    const url = `${BAIDU_TTS_BASE_URL}?lan=${lang}&text=${encodeURIComponent(text)}&spd=3&source=web`

    console.log(`📡 [百度 API] 请求: ${url}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 秒超时

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
        'Referer': 'https://fanyi.baidu.com/',
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`❌ [百度 API] HTTP ${response.status}`)
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 检查是否是有效音频（至少 100 bytes）
    if (buffer.length < 100) {
      console.error(`❌ [百度 API] 音频太小: ${buffer.length} bytes`)
      return null
    }

    console.log(`✅ [百度 API] 获取成功: ${buffer.length} bytes`)
    return buffer

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('❌ [百度 API] 请求超时')
    } else {
      console.error('❌ [百度 API] 请求失败:', error)
    }
    return null
  }
}

/**
 * 异步处理：上传 OSS + 更新数据库（仅英语）
 * 不阻塞主响应流程
 */
async function processAudioAsync(
  text: string,
  type: string,
  audioBuffer: Buffer
): Promise<void> {
  try {
    console.log(`🔄 [异步处理] 开始处理单词: "${text}" (${audioBuffer.length} bytes)`)

    // 1. 生成安全的文件名
    const fileName = generateSafeFileName(text, type)

    // 2. 上传到 OSS
    const ossUrl = await uploadAudioAsync(audioBuffer, fileName)
    console.log(`✅ [异步处理] OSS 上传成功: ${ossUrl}`)

    // 3. 更新数据库
    const supabase = await createAdminClient()

    const { error: updateError } = await supabase
      .from('words')
      .update({ audio_url: ossUrl })
      .eq('word', text.toLowerCase())

    if (updateError) {
      console.error('❌ [异步处理] 数据库更新失败:', updateError)
    } else {
      console.log(`✅ [异步处理] 数据库更新成功`)
    }

  } catch (error) {
    console.error('❌ [异步处理] 处理失败:', error)
  }
}

/**
 * OPTIONS 处理（CORS 预检）
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
