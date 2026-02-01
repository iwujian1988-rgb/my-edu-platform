/**
 * 学习计划专用 TTS API 路由（极速版本）
 *
 * 优化策略：
 * - 直接调用有道 API（不查询数据库）
 * - 服务器代理音频流（避免 CORS）
 *
 * 预期速度：~100-200ms
 *
 * @route GET /api/learning-plan/tts?text={word}&type={1|2}
 */

import { NextRequest, NextResponse } from 'next/server'

/**
 * 浏览器 User-Agent（用于伪装，避免被有道拦截）
 */
const BROWSER_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/**
 * 有道语音 API 配置
 */
const YOUDAO_TTS_BASE_URL = 'https://dict.youdao.com/dictvoice'

/**
 * GET 请求处理
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

    console.log(`🎯 [学习计划 TTS] 请求: text="${text}", type=${type}`)

    // 3. 直接从有道 API 获取音频（不查询数据库！）
    const url = `${YOUDAO_TTS_BASE_URL}?audio=${encodeURIComponent(text)}&type=${type}`

    console.log(`📡 [学习计划 TTS] 请求有道 API: ${url}`)

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
      console.error(`❌ [学习计划 TTS] 有道 API HTTP ${response.status}`)
      return NextResponse.json(
        { error: '有道 API 请求失败' },
        { status: 500 }
      )
    }

    // 4. 获取音频数据
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log(`✅ [学习计划 TTS] 获取成功: ${buffer.length} bytes`)

    // 5. 返回音频流
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=86400', // 缓存 24 小时
      },
    })

  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.error('❌ [学习计划 TTS] 请求超时')
      return NextResponse.json(
        { error: '请求超时' },
        { status: 504 }
      )
    }

    console.error('❌ [学习计划 TTS] 服务器错误:', error)
    return NextResponse.json(
      { error: '服务器内部错误', details: (error as Error).message },
      { status: 500 }
    )
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

