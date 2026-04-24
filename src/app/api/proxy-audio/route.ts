import { NextRequest, NextResponse } from 'next/server'

/**
 * 代理下载音频文件，绕过浏览器 CORS 限制
 * 用于 iOS blob seek 方案：客户端通过此 API 下载音频到本地 Blob URL
 */

const ALLOWED_HOSTS = [
  'aliyuncs.com',
  'supabase.co',
]

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 })
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }

  if (!ALLOWED_HOSTS.some(host => parsedUrl.hostname.endsWith(host))) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 })
  }

  const response = await fetch(url)
  if (!response.ok) {
    return NextResponse.json({ error: 'Upstream failed' }, { status: 502 })
  }

  const contentType = response.headers.get('Content-Type') || 'audio/mpeg'

  return new NextResponse(response.body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
