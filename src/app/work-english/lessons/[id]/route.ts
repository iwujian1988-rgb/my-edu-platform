import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getWorkEnglishSession, getLessonProgress } from '@/lib/work-english/server'
import { findInternalPreviewLesson, findLesson } from '@/lib/work-english/constants'
import { authEntryPath } from '@/lib/auth-return-path'
import { logger } from '@/lib/logger'
import { requestOrigin } from '@/lib/request-origin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest, {params}: {params: Promise<{id: string}>}) {
  try {
    const session = await getWorkEnglishSession()
    if (!session.user) return NextResponse.redirect(new URL(authEntryPath('login', request.nextUrl.pathname), requestOrigin(request)))
    if (!session.hasAccess) return NextResponse.redirect(new URL('/work-english?access=required', requestOrigin(request)))
    const id = (await params).id
    const lesson = findLesson(id) ?? findInternalPreviewLesson(id)
    if (!lesson) return new Response('课程不存在', {status:404})
    const progress = await getLessonProgress(session, lesson.id, lesson.version)
    const contentRoot = path.join(process.cwd(), 'src/content/work-english')
    const [template, cloud, app] = await Promise.all([
      readFile(path.join(contentRoot, lesson.id, 'lesson.html'), 'utf8'),
      readFile(path.join(contentRoot, 'cloud-sync.js'), 'utf8'),
      readFile(path.join(contentRoot, lesson.id, 'lesson.js'), 'utf8'),
    ])
    const nonce = randomBytes(18).toString('base64')
    // User drafts are data, never markup or executable script.
    const context = JSON.stringify({...progress, lessonId: lesson.id, version: lesson.version}).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
    const runtimeHtml = `<script id="workEnglishContext" type="application/json">${context}</script><script>${cloud}</script><script>${app}</script>`
    const html = template.replace('{{WORK_ENGLISH_RUNTIME}}', runtimeHtml).replace(/<script(?=[\s>])/g, `<script nonce="${nonce}"`)
    return new Response(html, {headers: {
      'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'private, no-store, max-age=0',
      'X-Content-Type-Options':'nosniff', 'X-Frame-Options':'DENY', 'Referrer-Policy':'strict-origin-when-cross-origin',
      'Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; img-src 'self' data:; media-src 'self'; connect-src 'self'; font-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`,
    }})
  } catch (error) {
    logger.error('[work-english] lesson unavailable', error)
    return new Response('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>课程暂时无法载入</title><body><h1>课程暂时无法载入</h1><p>学习记录未作改动，请稍后刷新重试。</p><a href="/work-english">返回学习库</a></body></html>', {status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})
  }
}
