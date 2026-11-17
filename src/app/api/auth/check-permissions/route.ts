import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { hasWorkEnglishAccess } from '@/lib/work-english/access-policy'
import { WORK_ENGLISH_PERMISSION } from '@/lib/work-english/constants'
import { buildProductEntries, hasMaxnoteAccess, type ProductPermissions } from '@/lib/product-entries'
import { logger } from '@/lib/logger'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { Video } from '@/types/video'

interface PermissionProfile {
  feature_permissions: string[] | null
  package_ids: string[] | null
  permission_expires_at: string | null
  book_permissions: string[] | null
  is_banned: boolean | null
}

// 共享数据库类型尚未包含视频表；这里只声明导航查询需要的只读字段。
type ProductEntryDatabase = Database & {
  public: {
    Tables: {
      videos: {
        Row: Pick<Video, 'id' | 'package_ids' | 'status'>
        Insert: never
        Update: never
        Relationships: []
      }
    }
  }
}

const EMPTY_PERMISSIONS: ProductPermissions = {
  has_video: false, has_books: false, has_maxnote: false, has_work_english: false, has_french_atlas: false, entries: [],
}
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: getUserError } = await supabase.auth.getUser()

    if (getUserError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 查询用户的 package_ids、feature_permissions 和 book_permissions
    const { data: userData, error: profileError } = await supabase
      .from('users')
      .select('feature_permissions, package_ids, permission_expires_at, book_permissions, is_banned')
      .eq('id', user.id)
      .single<PermissionProfile>()

    if (profileError || !userData) {
      logger.error('[check-permissions] 查询失败:', profileError)
      return NextResponse.json(EMPTY_PERMISSIONS, { status: 503 })
    }

    const featurePermissions = userData.feature_permissions || []
    const permissionExpiresAt = userData.permission_expires_at
    const userPackageIds = userData.package_ids || []
    const bookPermissions = userData.book_permissions || []

    const isExpired = permissionExpiresAt !== null && Date.parse(permissionExpiresAt) <= Date.now()
    if (isExpired || userData.is_banned) return NextResponse.json(EMPTY_PERMISSIONS)

    // 判定：用户是否有视频权限（满足任一即可）
    // 1. feature_permissions 包含 'video' 且未过期
    // 2. 用户的任一 package_ids 关联了至少一个视频
    const hasVideoPermission = featurePermissions?.includes('video') && !isExpired

    let hasPackageVideo = false
    if (!hasVideoPermission && !isExpired && userPackageIds.length > 0) {
      const videoClient = supabase as SupabaseClient<ProductEntryDatabase>
      const { data: linkedVideos, error: videoError } = await videoClient
        .from('videos')
        .select('id')
        .overlaps('package_ids', userPackageIds)
        .eq('status', 'published')
        .limit(1)
      if (videoError) throw videoError
      hasPackageVideo = (linkedVideos?.length ?? 0) > 0
    }

    const hasVideo = hasVideoPermission || hasPackageVideo

    const packageClient = await createAdminClient()
    // 小说按真实套餐绑定逐本返回，不能用 novel 功能标记推断所有小说权限。
    // 旧小说套餐也可能把小说 ID 写进 book_permissions，不能据此误判为单词书。
    const bookIds = bookPermissions.filter(id => UUID_PATTERN.test(id))
    const [workPackageResult, novelResult, legacyNovelResult] = await Promise.all([
      packageClient.from('invitation_packages').select('id').eq('is_active', true).contains('feature_permissions', [WORK_ENGLISH_PERMISSION]),
      userPackageIds.length > 0
        ? packageClient.from('books').select('id, title, cover_url').eq('is_novel', true).eq('is_published', true).overlaps('package_ids', userPackageIds).order('created_at', { ascending: true }).order('id', { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      bookIds.length > 0
        ? packageClient.from('books').select('id').eq('is_novel', true).in('id', bookIds)
        : Promise.resolve({ data: [], error: null }),
    ])
    if (workPackageResult.error || novelResult.error || legacyNovelResult.error) {
      throw workPackageResult.error || novelResult.error || legacyNovelResult.error
    }
    const legacyNovelIds = new Set((legacyNovelResult.data ?? []).map(book => book.id))
    const wordBookPermissions = bookPermissions.filter(id => !legacyNovelIds.has(id))
    const hasBooks = wordBookPermissions.length > 0
    const hasMaxnote = hasMaxnoteAccess(featurePermissions, wordBookPermissions)
    logger.debug('[check-permissions] 结果:', { hasVideo, hasBooks, hasMaxnote })
    const workPackages = workPackageResult.data
    const hasWorkEnglish = hasWorkEnglishAccess({package_ids: userPackageIds, permission_expires_at: permissionExpiresAt ?? null, is_banned: userData.is_banned}, (workPackages ?? []).map(row => row.id))
    const hasFrenchAtlas = featurePermissions.includes('french_atlas')
    const permissions = { has_video: hasVideo, has_books: hasBooks, has_maxnote: hasMaxnote, has_work_english: hasWorkEnglish, has_french_atlas: hasFrenchAtlas }
    return NextResponse.json({ ...permissions, entries: buildProductEntries({ ...permissions, novels: novelResult.data ?? [] }) })
  } catch (error) {
    logger.error('[check-permissions] 异常:', error)
    return NextResponse.json(EMPTY_PERMISSIONS, { status: 503 })
  }
}
