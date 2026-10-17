import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextRequest } from 'next/server'
import { findInternalPreviewLesson, findLesson } from '@/lib/work-english/constants'
import { getWorkEnglishSession } from '@/lib/work-english/server'
import { parseMediaRange } from '@/lib/work-english/range'
import { logger } from '@/lib/logger'
import { getOSSClient } from '@/lib/oss'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
const LEGACY_MEDIA_FILES = new Set(['illustration.png','original.mp3','dialogue.mp3','s1.mp3','s2.mp3','s3.mp3','d1.mp3','d2.mp3',
  'word_courteous.mp3','word_respectful.mp3','word_contentious.mp3','word_review.mp3','word_benefit.mp3','word_complexity.mp3','word_locate.mp3','word_clarify.mp3'])
const SAFE_MEDIA_NAME = /^[a-z][a-z0-9_-]*\.(mp3|png)$/
export async function GET(request: NextRequest, {params}: {params: Promise<{id:string; file:string}>}) {
  const {id, file} = await params
  if (!SAFE_MEDIA_NAME.test(file) || (id === '001' && !LEGACY_MEDIA_FILES.has(file))) return new Response(null, {status:404})
  try {
    const session = await getWorkEnglishSession()
    if (!session.user || !session.hasAccess) return new Response(null, {status:session.user ? 403 : 401, headers:{'Cache-Control':'no-store'}})
    if (!findLesson(id) && !findInternalPreviewLesson(id)) return new Response(null, {status:404})
    const headers: Record<string,string> = {'Content-Type':file.endsWith('.mp3')?'audio/mpeg':'image/png',
      'Cache-Control':'private, no-store', 'Accept-Ranges':'bytes', 'X-Content-Type-Options':'nosniff'}
    const rangeHeader = request.headers.get('range')
    if (file.endsWith('.mp3')) {
      const objectKey = `work-english/${id}/media/${file}`
      const client = getOSSClient()
      if (rangeHeader) {
        const metadata = await client.head(objectKey)
        const size = Number(metadata.res.headers['content-length']) || 0
        const range = parseMediaRange(rangeHeader, size)
        if (!range) return new Response(null, {status:416, headers:{...headers,'Content-Range':`bytes */${size}`}})
        const result = await client.get(objectKey, { headers: { Range: `bytes=${range.start}-${range.end}` } })
        headers['Content-Range'] = result.res.headers['content-range'] || `bytes ${range.start}-${range.end}/${size}`
        headers['Content-Length'] = String(result.content.length)
        return new Response(new Uint8Array(result.content), {status:206, headers})
      }
      const result = await client.get(objectKey)
      const bytes = result.content
      return new Response(new Uint8Array(bytes), {headers:{...headers,'Content-Length':String(bytes.length)}})
    }
    const bytes = await readFile(path.join(process.cwd(), 'src/content/work-english', id, 'media', file))
    if (rangeHeader) {
      const range = parseMediaRange(rangeHeader, bytes.length)
      if (!range) return new Response(null, {status:416, headers:{...headers,'Content-Range':`bytes */${bytes.length}`}})
      headers['Content-Range'] = `bytes ${range.start}-${range.end}/${bytes.length}`
      headers['Content-Length'] = String(range.end - range.start + 1)
      return new Response(new Uint8Array(bytes.subarray(range.start, range.end + 1)), {status:206, headers})
    }
    return new Response(new Uint8Array(bytes), {headers:{...headers,'Content-Length':String(bytes.length)}})
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return new Response(null, {status:404, headers:{'Cache-Control':'no-store'}})
    if (error instanceof Error && 'code' in error && error.code === 'NoSuchKey') return new Response(null, {status:404, headers:{'Cache-Control':'no-store'}})
    logger.error('[work-english] media unavailable', error)
    return new Response(null, {status:503, headers:{'Cache-Control':'no-store'}})
  }
}
