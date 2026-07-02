import { NextRequest, NextResponse } from 'next/server'

/**
 * 代理下载音频文件，绕过浏览器 CORS 限制
 * 用于 iOS blob seek 方案：客户端通过此 API 下载音频到本地 Blob URL
 */

const ALLOWED_HOSTS = [
  'aliyuncs.com',
  'supabase.co',
  'archive.org',
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

  const range = request.headers.get('range') || undefined
  const response = await fetch(url, {
    cache: 'no-store',
    headers: range ? { range } : undefined,
  })

  if (!response.ok && response.status !== 206) {
    return NextResponse.json({ error: 'Upstream failed' }, { status: 502 })
  }

  const headers = new Headers()
  const contentType = response.headers.get('Content-Type') || 'audio/mpeg'
  headers.set('Content-Type', contentType)
  headers.set('Accept-Ranges', response.headers.get('Accept-Ranges') || 'bytes')
  headers.set('Cache-Control', 'public, max-age=86400')

  const contentLength = response.headers.get('Content-Length')
  const contentRange = response.headers.get('Content-Range')
  if (contentLength) headers.set('Content-Length', contentLength)
  if (contentRange) headers.set('Content-Range', contentRange)

  return new NextResponse(response.body, {
    status: response.status,
    headers,
  })
}
