/**
 * TTS (Text-to-Speech) API 路由
 *
 * 功能：
 * 1. 查询数据库中是否已有音频 URL
 * 2. 如果有，返回 307 重定向
 * 3. 如果没有，从有道 API 获取音频
 * 4. 上传到 OSS 并更新数据库
 * 5. 返回音频流
 *
 * @route GET /api/tts?text={word}&type={1|2}
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getOSSClient, generateSafeFileName, uploadAudioAsync } from '@/lib/oss'

/**
 * 浏览器 User-Agent（用于伪装，避免被有道拦截）
 */
const BROWSER_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/**
 * 有道语音 API 配置
 */
const YOUDAO_TTS_BASE_URL = 'https://dict.youdao.com/dictvoice'

/**
 * 主处理函数
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 解析查询参数
    const searchParams = request.nextUrl.searchParams
    const text = searchParams.get('text')
    const type = searchParams.get('type') || '2' // 默认美音

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

    console.log(`🎯 [TTS API] 请求: text="${text}", type=${type}`)

    // 3. 查询数据库（精确匹配单词）
    const supabase = await createAdminClient()

    // 不使用 .single()，改为查询所有匹配的记录
    const { data: words, error: dbError } = await supabase
      .from('words')
      .select('id, word, audio_url')
      .eq('word', text.toLowerCase())
      .limit(1)

    console.log(`📊 [TTS API] 数据库查询结果:`, {
      found: words?.length || 0,
      firstRecord: words?.[0] ? {
        id: words[0].id,
        word: words[0].word,
        hasAudioUrl: !!words[0].audio_url,
        audioUrl: words[0].audio_url
      } : null,
      error: dbError
    })

    if (dbError) {
      console.error('❌ [TTS API] 数据库查询错误:', dbError)
    }

    // 4. 如果找到记录且有音频 URL，直接从 OSS 返回音频流
    const wordData = words?.[0]
    if (wordData?.audio_url) {
      // 🔍 检测并过滤掉错误的有道 API URL
      if (wordData.audio_url.includes('dict.youdao.com')) {
        console.warn(`⚠️  [TTS API] 检测到错误的有道API URL，将重新获取: ${wordData.audio_url}`)
        // 继续执行下面的有道 API 逻辑，不上传到OSS（避免死循环）
      } else {
        // 确保使用 HTTPS
        const httpsUrl = wordData.audio_url.replace(/^http:/, 'https:')
        console.log(`✅ [TTS API] 数据库命中，从 OSS 获取: ${httpsUrl}`)

        try {
          // 从 OSS 获取音频
          const ossResponse = await fetch(httpsUrl)
          if (!ossResponse.ok) {
            throw new Error(`OSS request failed: ${ossResponse.status}`)
          }

          const audioBuffer = Buffer.from(await ossResponse.arrayBuffer())
          console.log(`🔊 [TTS API] 返回 OSS 音频: ${audioBuffer.length} bytes`)

          // 返回音频流（带缓存头）
          return new NextResponse(audioBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'audio/mpeg',
              'Content-Length': audioBuffer.length.toString(),
              'Cache-Control': 'public, max-age=86400', // 缓存 24 小时
            },
          })
        } catch (error) {
          console.error(`❌ [TTS API] OSS 获取失败，回退到有道 API:`, error)
          // 继续执行下面的有道 API 逻辑
        }
      }
    }

    console.log(`⚠️  [TTS API] 数据库未命中或无音频 URL，将从有道 API 获取...`)

    // 5. Cache Miss - 从有道 API 获取音频
    const audioBuffer = await fetchAudioFromYoudao(text, type)

    if (!audioBuffer) {
      return NextResponse.json(
        { error: '无法从有道 API 获取音频' },
        { status: 500 }
      )
    }

    // 6. 优先返回音频流（让用户尽快听到声音）
    console.log(`🔊 [TTS API] 返回音频流: ${audioBuffer.length} bytes`)

    const response = new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000', // 缓存 1 年
      },
    })

    // 7. 异步处理：上传 OSS + 更新数据库（不阻塞响应）
    console.log(`🔄 [TTS API] 触发异步处理: 上传 OSS + 更新数据库`)
    processAudioAsync(text, type, audioBuffer).catch(error => {
      console.error('❌ [TTS API] 异步处理失败:', error)
    })

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
 * @returns 音频 Buffer 或 null
 */
async function fetchAudioFromYoudao(
  text: string,
  type: string
): Promise<Buffer | null> {
  try {
    const url = `${YOUDAO_TTS_BASE_URL}?audio=${encodeURIComponent(text)}&type=${type}`

    console.log(`📡 [有道 API] 请求: ${url}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 秒超时

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
 * 异步处理：上传 OSS + 更新数据库
 * 不阻塞主响应流程
 */
async function processAudioAsync(
  text: string,
  type: string,
  audioBuffer: Buffer
): Promise<void> {
  try {
    console.log(`🔄 [异步处理] 开始处理单词: "${text}" (type=${type}, ${audioBuffer.length} bytes)`)

    // 1. 生成安全的文件名
    const fileName = generateSafeFileName(text, type)

    console.log(`🔄 [异步处理] 生成文件名: ${fileName}`)

    // 2. 上传到 OSS
    const ossUrl = await uploadAudioAsync(audioBuffer, fileName)

    console.log(`✅ [异步处理] OSS 上传成功: ${ossUrl}`)

    // 3. 更新数据库（查找所有匹配的单词记录）
    const supabase = await createAdminClient()

    console.log(`🔍 [异步处理] 查找数据库记录: word="${text.toLowerCase()}"`)

    // 查找所有匹配该单词的记录（可能在不同书中）
    const { data: matchingWords, error: findError } = await supabase
      .from('words')
      .select('id, word')
      .eq('word', text.toLowerCase())

    if (findError) {
      console.error('❌ [异步处理] 查找单词失败:', findError)
      return
    }

    if (!matchingWords || matchingWords.length === 0) {
      console.log(`⚠️  [异步处理] 数据库中未找到单词: "${text}"`)
      return
    }

    console.log(`📊 [异步处理] 找到 ${matchingWords.length} 条匹配记录`)

    // 4. 批量更新所有匹配的记录
    console.log(`💾 [异步处理] 开始更新数据库...`)

    const { error: updateError } = await supabase
      .from('words')
      .update({ audio_url: ossUrl })
      .eq('word', text.toLowerCase())

    if (updateError) {
      console.error('❌ [异步处理] 数据库更新失败:', updateError)
    } else {
      console.log(`✅ [异步处理] 数据库更新成功: ${matchingWords.length} 条记录 -> ${ossUrl}`)
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
