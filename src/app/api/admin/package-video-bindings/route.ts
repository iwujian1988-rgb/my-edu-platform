import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { requirePermission, logAdminAction } from '@/lib/admin-auth'
import { invalidatePattern } from '@/lib/cache/api-cache'
import { logger } from '@/lib/logger'
import { applyVideoPackageBinding, MAX_VIDEO_BINDING_CHANGES, VIDEO_BINDING_BULK_PAGE_SIZE, VIDEO_BINDING_PAGE_SIZE, type VideoBindingResult } from '@/lib/package-video-bindings'
import { VIDEO_LANGUAGE_LABELS, type Video, type VideoLanguage } from '@/types/video'
import type { Database } from '@/types/database'

type BindingDatabase = Database & { public: { Tables: { videos: {
  Row: Video & Record<string, unknown>
  Insert: never
  Update: Pick<Video, 'package_ids' | 'updated_at'>
  Relationships: []
} } } }
const MAX_WRITE_ATTEMPTS = 3
const WRITE_CONCURRENCY = 5
const MAX_SEARCH_LENGTH = 120
const requestSchema = z.object({
  packageId: z.string().uuid(),
  changes: z.array(z.object({ videoId: z.string().uuid(), enabled: z.boolean() })).min(1).max(MAX_VIDEO_BINDING_CHANGES),
})

function handleError(error: unknown) {
  if (error instanceof SyntaxError) return NextResponse.json({ error: '视频关联参数不合法' }, { status: 400 })
  const message = error instanceof Error ? error.message : ''
  if (message === 'UNAUTHORIZED') return NextResponse.json({ error: '请先登录管理员账号' }, { status: 401 })
  if (message === 'INSUFFICIENT_PERMISSIONS') return NextResponse.json({ error: '没有套餐管理权限' }, { status: 403 })
  logger.error('[package-video-bindings] 操作失败:', error)
  return NextResponse.json({ error: '视频关联操作失败，请重试' }, { status: 500 })
}

export async function GET(request: NextRequest) {
  try {
    await requirePermission('manage_invitation_codes')
    const params = request.nextUrl.searchParams
    const language = params.get('language') || 'fr'
    const search = (params.get('search') || '').trim()
    const page = Number(params.get('page') || 1)
    const pageSize = Number(params.get('page_size') || VIDEO_BINDING_PAGE_SIZE)
    if ((language !== 'all' && !Object.hasOwn(VIDEO_LANGUAGE_LABELS, language)) || search.length > MAX_SEARCH_LENGTH
      || !Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > VIDEO_BINDING_BULK_PAGE_SIZE) {
      return NextResponse.json({ error: '视频筛选参数不合法' }, { status: 400 })
    }
    const db = await createAdminClient() as SupabaseClient<BindingDatabase>
    let query = db.from('videos').select('id, title, language, package_ids', { count: 'exact' })
      .eq('status', 'published').order('created_at', { ascending: false }).order('id', { ascending: true })
    if (language !== 'all') query = query.eq('language', language as VideoLanguage)
    if (search) query = query.ilike('title', `%${search.replace(/[\\%_]/g, '\\$&')}%`)
    const { data, error, count } = await query.range((page - 1) * pageSize, page * pageSize - 1)
    if (error) throw error
    return NextResponse.json({ items: data ?? [], total: count ?? 0 })
  } catch (error: unknown) {
    return handleError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requirePermission('manage_invitation_codes')
    const parsed = requestSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: '视频关联参数不合法' }, { status: 400 })
    const { packageId, changes } = parsed.data
    if (new Set(changes.map(change => change.videoId)).size !== changes.length) {
      return NextResponse.json({ error: '包含重复的视频，请刷新后重试' }, { status: 400 })
    }
    const db = await createAdminClient() as SupabaseClient<BindingDatabase>
    const { data: pkg, error: packageError } = await db.from('invitation_packages').select('id').eq('id', packageId).maybeSingle()
    if (packageError) throw packageError
    if (!pkg) return NextResponse.json({ error: '套餐不存在' }, { status: 404 })
    const result: VideoBindingResult = { succeeded: [], failed: [] }

    async function updateBinding(change: { videoId: string; enabled: boolean }) {
      try {
        for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt++) {
          const { data: video, error } = await db.from('videos').select('id, status, package_ids').eq('id', change.videoId).maybeSingle()
          if (error) throw error
          if (!video || (change.enabled && video.status !== 'published')) throw new Error('视频不存在或尚未发布')
          const existing = video.package_ids ?? []
          if (existing.includes(packageId) === change.enabled) {
            result.succeeded.push(change.videoId)
            return
          }
          // 比较原数组后再写入；其他管理员同时关联套餐时重读重试，避免覆盖其修改。
          let update = db.from('videos').update({ package_ids: applyVideoPackageBinding(video.package_ids, packageId, change.enabled), updated_at: new Date().toISOString() }).eq('id', change.videoId).eq('status', video.status)
          update = video.package_ids === null ? update.is('package_ids', null) : update.filter('package_ids', 'eq', `{${existing.join(',')}}`)
          const updated = await update.select('id')
          if (updated.error) throw updated.error
          if (updated.data?.length) {
            result.succeeded.push(change.videoId)
            return
          }
        }
        throw new Error('视频关联已被其他操作修改，请重试')
      } catch (error: unknown) {
        logger.error('[package-video-bindings] 视频关联失败:', change.videoId, error)
        result.failed.push({ videoId: change.videoId, error: error instanceof Error ? error.message : '关联失败' })
      }
    }
    for (let offset = 0; offset < changes.length; offset += WRITE_CONCURRENCY) {
      await Promise.all(changes.slice(offset, offset + WRITE_CONCURRENCY).map(updateBinding))
    }
    if (result.succeeded.length) {
      await Promise.all([
        invalidatePattern('videos:list:*'), invalidatePattern('videos:available_languages:*'),
        invalidatePattern('creator:info:*'), invalidatePattern('creator:content:*'),
      ])
    }
    await logAdminAction('update_package_video_bindings', 'invitation_package', packageId, { changes, ...result })
    return NextResponse.json(result, { status: result.failed.length ? 207 : 200 })
  } catch (error: unknown) {
    return handleError(error)
  }
}
