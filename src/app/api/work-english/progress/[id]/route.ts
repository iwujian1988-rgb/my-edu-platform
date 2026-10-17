import { NextRequest, NextResponse } from 'next/server'
import { getWorkEnglishSession, getLessonProgress } from '@/lib/work-english/server'
import { findInternalPreviewLesson, findLesson, PROGRESS_MAX_BYTES } from '@/lib/work-english/constants'
import { progressRequestSchema } from '@/lib/work-english/schema'
import { logger } from '@/lib/logger'
import { isSameOriginRequest } from '@/lib/request-origin'

export const dynamic = 'force-dynamic'
const reply = (body: unknown, status = 200) => NextResponse.json(body, {status, headers: {'Cache-Control': 'private, no-store'}})
type Context = {params: Promise<{id: string}>}

export async function GET(_request: NextRequest, context: Context) {
  try {
    const session = await getWorkEnglishSession()
    if (!session.user) return reply({error: '请重新登录'}, 401)
    if (!session.hasAccess) return reply({error: '需要名企职场英语套餐'}, 403)
    const id = (await context.params).id
    const lesson = findLesson(id) ?? findInternalPreviewLesson(id)
    if (!lesson) return reply({error: '课程不存在'}, 404)
    return reply(await getLessonProgress(session, lesson.id, lesson.version))
  } catch (error) {
    logger.error('[work-english] progress read failed', error)
    return reply({error: '暂时无法读取学习记录，请重试'}, 503)
  }
}

export async function PUT(request: NextRequest, context: Context) {
  if (!isSameOriginRequest(request)) return reply({error: '请求来源无效'}, 403)
  try {
    const session = await getWorkEnglishSession()
    if (!session.user) return reply({error: '请重新登录'}, 401)
    if (!session.hasAccess) return reply({error: '套餐不可用，请检查权限'}, 403)
    const id = (await context.params).id
    const lesson = findLesson(id) ?? findInternalPreviewLesson(id)
    if (!lesson) return reply({error: '课程不存在'}, 404)
    const body = await request.text()
    if (Buffer.byteLength(body) > PROGRESS_MAX_BYTES) return reply({error: '学习记录超过大小限制'}, 413)
    let parsed: unknown
    try { parsed = JSON.parse(body) } catch { return reply({error: '请求格式无效'}, 400) }
    const result = progressRequestSchema.safeParse(parsed)
    if (!result.success) return reply({error: '学习记录格式无效'}, 400)
    const {revision, state} = result.data
    const row = {user_id: session.user.id, lesson_id: lesson.id, lesson_version: lesson.version,
      state, revision: revision + 1, updated_at: new Date().toISOString()}
    // A compare-and-swap prevents an older tab from silently overwriting newer work.
    const write = revision === 0
      ? await session.progress.from('work_english_progress').insert(row).select('revision').maybeSingle()
      : await session.progress.from('work_english_progress').update(row).eq('user_id', session.user.id)
        .eq('lesson_id', lesson.id).eq('lesson_version', lesson.version).eq('revision', revision).select('revision').maybeSingle()
    if (write.error?.code === '23505' || (!write.error && !write.data)) return reply({error: '另一页面有更新，请导出本页记录后刷新'}, 409)
    if (write.error) throw new Error(write.error.code)
    return reply({revision: write.data.revision})
  } catch (error) {
    logger.error('[work-english] progress write failed', error)
    return reply({error: '保存失败，请保持页面打开并重试'}, 503)
  }
}
