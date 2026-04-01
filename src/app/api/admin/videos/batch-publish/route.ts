/**
 * 批量发布视频 API
 *
 * GET  /api/admin/videos/batch-publish - 获取草稿视频、套餐、标签、UP主列表
 * POST /api/admin/videos/batch-publish - 批量发布视频
 * PATCH /api/admin/videos/batch-publish - 更新单个视频信息
 *
 * 功能：
 * 1. 批量更新视频状态为 published
 * 2. 批量关联套餐
 * 3. 批量关联标签
 * 4. 更新工作流进度
 * 5. 更新单个视频的标题、难度、描述、语种、UP主
 */

export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { checkAdminForAPI } from '@/lib/admin-auth'
import { completeStep } from '@/lib/workflow-helper'

// ============================================
// 类型定义
// ============================================

/** 视频基本信息 */
interface VideoInfo {
  id: string
  title: string
  status: string
}

/** 草稿视频信息 */
interface DraftVideo {
  id: string
  title: string
  description: string | null
  language: string
  difficulty: string
  duration: number
  status: string
  created_at: string
  package_ids: string[] | null
  creator_id: string | null
  video_url: string | null
  thumbnail_url: string | null
}

/** UP主信息 */
interface CreatorInfo {
  id: string
  name: string
  platform: string | null
}

/** 套餐信息 */
interface PackageInfo {
  id: string
  name: string
  description: string | null
  validity_days: number
  is_active: boolean
}

/** 标签信息 */
interface TagInfo {
  id: string
  name: string
  type: string
  color: string | null
}

/** 卡片统计 */
interface CardStats {
  words: number
  expressions: number
}

interface BatchPublishRequest {
  video_ids: string[]
  package_ids: string[]
  video_tags?: Record<string, string[]>  // video_id -> tag_ids[]
}

interface BatchPublishResult {
  video_id: string
  title: string
  success: boolean
  error?: string
}

interface BatchPublishResponse {
  success: boolean
  data: {
    published_count: number
    failed_count: number
    results: BatchPublishResult[]
  }
}

/** 视频更新请求 */
interface UpdateVideoRequest {
  video_id: string
  updates: {
    title?: string
    difficulty?: 'beginner' | 'intermediate' | 'advanced'
    description?: string
    language?: 'en' | 'fr' | 'de' | 'es' | 'ja' | 'it' | 'ru'
    creator_id?: string | null
    thumbnail_url?: string | null
  }
}

// 允许更新的字段
const ALLOWED_UPDATE_FIELDS = ['title', 'difficulty', 'description', 'language', 'creator_id', 'thumbnail_url', 'learning_date', 'status'] as const

// ============================================
// POST: 批量发布
// ============================================

export async function POST(request: Request) {
  try {
    // 1. 验证管理员权限
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error || '未授权', code: adminCheck.code },
        { status: adminCheck.status || 401 }
      )
    }

    // 2. 解析请求
    const body: BatchPublishRequest = await request.json().catch(() => ({}))
    const { video_ids, package_ids, video_tags } = body

    // 3. 验证参数
    if (!video_ids || !Array.isArray(video_ids) || video_ids.length === 0) {
      return NextResponse.json(
        { error: '请选择至少一个视频', code: 'NO_VIDEOS' },
        { status: 400 }
      )
    }

    if (!package_ids || !Array.isArray(package_ids) || package_ids.length === 0) {
      return NextResponse.json(
        { error: '请选择至少一个套餐', code: 'NO_PACKAGES' },
        { status: 400 }
      )
    }

    // 限制单次发布数量
    const MAX_BATCH_SIZE = 20
    if (video_ids.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `单次最多发布 ${MAX_BATCH_SIZE} 个视频`, code: 'BATCH_SIZE_EXCEEDED' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()
    const results: BatchPublishResult[] = []
    let publishedCount = 0
    let failedCount = 0

    // 4. 串行处理每个视频
    for (const videoId of video_ids) {
      try {
        // 4.1 获取视频信息
        const { data: video, error: videoError } = await supabase
          .from('videos')
          .select('id, title, status')
          .eq('id', videoId)
          .single() as { data: VideoInfo | null; error: any }

        if (videoError || !video) {
          results.push({
            video_id: videoId,
            title: '未知视频',
            success: false,
            error: '视频不存在',
          })
          failedCount++
          continue
        }

        // 4.2 更新视频：状态 + 套餐关联
        const { error: updateError } = await supabase
          .from('videos')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
            package_ids: package_ids,
            updated_at: new Date().toISOString(),
          } as unknown as never)
          .eq('id', videoId)

        if (updateError) {
          results.push({
            video_id: videoId,
            title: video.title,
            success: false,
            error: `更新失败: ${updateError.message}`,
          })
          failedCount++
          continue
        }

        // 4.3 处理标签关联
        if (video_tags && video_tags[videoId]) {
          const tagIds = video_tags[videoId]

          // 先删除旧关联
          await supabase
            .from('video_tag_relations')
            .delete()
            .eq('video_id', videoId)

          // 插入新关联
          if (tagIds.length > 0) {
            const tagRelations = tagIds.map(tagId => ({
              video_id: videoId,
              tag_id: tagId,
            }))

            const { error: tagError } = await supabase
              .from('video_tag_relations')
              .insert(tagRelations as unknown as never)

            if (tagError) {
              console.error(`[批量发布] 标签关联失败 videoId=${videoId}:`, tagError)
              // 标签关联失败不影响发布，只记录日志
            }
          }
        }

        // 4.4 更新工作流进度
        await completeStep(supabase, videoId, 'info')
        await completeStep(supabase, videoId, 'review')
        await completeStep(supabase, videoId, 'publish')

        results.push({
          video_id: videoId,
          title: video.title,
          success: true,
        })
        publishedCount++

        console.log(`[批量发布] 视频 "${video.title}" 发布成功`)

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        results.push({
          video_id: videoId,
          title: '处理失败',
          success: false,
          error: errorMsg,
        })
        failedCount++
        console.error(`[批量发布] 视频 ${videoId} 处理失败:`, errorMsg)
      }
    }

    // 5. 返回结果
    return NextResponse.json({
      success: publishedCount > 0,
      data: {
        published_count: publishedCount,
        failed_count: failedCount,
        results,
      },
    } as BatchPublishResponse)

  } catch (error) {
    console.error('[批量发布] 服务器错误:', error)
    return NextResponse.json(
      {
        error: '服务器错误',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

// ============================================
// PATCH: 更新单个视频信息
// ============================================

export async function PATCH(request: NextRequest) {
  try {
    // 1. 验证管理员权限
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error || '未授权', code: adminCheck.code },
        { status: adminCheck.status || 401 }
      )
    }

    // 2. 解析请求
    const body: UpdateVideoRequest = await request.json().catch(() => ({}))
    const { video_id, updates } = body

    // 3. 验证参数
    if (!video_id) {
      return NextResponse.json(
        { error: '缺少 video_id', code: 'MISSING_VIDEO_ID' },
        { status: 400 }
      )
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: '没有需要更新的字段', code: 'NO_UPDATES' },
        { status: 400 }
      )
    }

    // 过滤只允许更新的字段
    const filteredUpdates: Record<string, unknown> = {}
    for (const key of ALLOWED_UPDATE_FIELDS) {
      if (updates[key as keyof typeof updates] !== undefined) {
        filteredUpdates[key] = updates[key as keyof typeof updates]
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json(
        { error: '没有有效的更新字段', code: 'INVALID_FIELDS' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    // 4. 更新视频
    const { data, error } = await supabase
      .from('videos')
      .update({
        ...filteredUpdates,
        updated_at: new Date().toISOString(),
      } as unknown as never)
      .eq('id', video_id)
      .select('id, title, description, language, difficulty, creator_id')
      .single()

    if (error) {
      console.error('[批量发布] 更新视频失败:', error)
      return NextResponse.json(
        { error: `更新失败: ${error.message}`, code: 'UPDATE_FAILED' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: '视频不存在', code: 'VIDEO_NOT_FOUND' },
        { status: 404 }
      )
    }

    console.log(`[批量发布] 视频 ${video_id} 更新成功:`, filteredUpdates)

    return NextResponse.json({
      success: true,
      data: data,
    })

  } catch (error) {
    console.error('[批量发布] PATCH 服务器错误:', error)
    return NextResponse.json(
      {
        error: '服务器错误',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

// ============================================
// GET: 获取草稿视频列表 + 套餐列表 + 标签列表 + UP主列表
// ============================================

export async function GET() {
  try {
    // 验证管理员权限
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error || '未授权', code: adminCheck.code },
        { status: adminCheck.status || 401 }
      )
    }

    const supabase = await createAdminClient()

    // 并行获取：草稿视频、套餐、标签、UP主
    const [
      videosResult,
      packagesResult,
      tagsResult,
      creatorsResult,
    ] = await Promise.all([
      // 草稿视频列表（包含卡片统计）
      supabase
        .from('videos')
        .select(`
          id,
          title,
          description,
          language,
          difficulty,
          duration,
          status,
          created_at,
          package_ids,
          creator_id,
          video_url,
          thumbnail_url
        `)
        .eq('status', 'draft')
        .order('created_at', { ascending: false }) as unknown as Promise<{ data: DraftVideo[] | null; error: any }>,
      // 活跃套餐列表
      supabase
        .from('invitation_packages')
        .select('id, name, description, validity_days, is_active')
        .eq('is_active', true)
        .order('sort_order') as unknown as Promise<{ data: PackageInfo[] | null; error: any }>,
      // 所有标签
      supabase
        .from('video_tags')
        .select('id, name, type, color')
        .order('display_order') as unknown as Promise<{ data: TagInfo[] | null; error: any }>,
      // 所有UP主
      supabase
        .from('upstream_creators')
        .select('id, name, platform')
        .eq('is_active', true)
        .order('name') as unknown as Promise<{ data: CreatorInfo[] | null; error: any }>,
    ])

    const draftVideos = videosResult.data
    const packages = packagesResult.data
    const tags = tagsResult.data
    const creators = creatorsResult.data

    if (videosResult.error) {
      console.error('[批量发布] 获取视频失败:', videosResult.error)
    }
    if (packagesResult.error) {
      console.error('[批量发布] 获取套餐失败:', packagesResult.error)
    }
    if (tagsResult.error) {
      console.error('[批量发布] 获取标签失败:', tagsResult.error)
    }
    if (creatorsResult.error) {
      console.error('[批量发布] 获取UP主失败:', creatorsResult.error)
    }

    // 获取每个视频的卡片统计 + 已有关联标签
    const videoIds = draftVideos?.map(v => v.id) || []
    let cardStats: Record<string, CardStats> = {}
    let existingVideoTags: Record<string, string[]> = {}

    if (videoIds.length > 0) {
      const [wordsResult, expressionsResult, tagRelationsResult] = await Promise.all([
        supabase
          .from('video_word_cards')
          .select('video_id')
          .in('video_id', videoIds) as unknown as Promise<{ data: { video_id: string }[] | null; error: any }>,
        supabase
          .from('video_expression_cards')
          .select('video_id')
          .in('video_id', videoIds) as unknown as Promise<{ data: { video_id: string }[] | null; error: any }>,
        supabase
          .from('video_tag_relations')
          .select('video_id, tag_id')
          .in('video_id', videoIds) as unknown as Promise<{ data: { video_id: string; tag_id: string }[] | null; error: any }>,
      ])

      // 统计每个视频的卡片数
      const wordCounts: Record<string, number> = {}
      const exprCounts: Record<string, number> = {}

      wordsResult.data?.forEach(item => {
        wordCounts[item.video_id] = (wordCounts[item.video_id] || 0) + 1
      })
      expressionsResult.data?.forEach(item => {
        exprCounts[item.video_id] = (exprCounts[item.video_id] || 0) + 1
      })

      videoIds.forEach(id => {
        cardStats[id] = {
          words: wordCounts[id] || 0,
          expressions: exprCounts[id] || 0,
        }
      })

      // 构建已有的标签关联映射 video_id -> tag_id[]
      tagRelationsResult.data?.forEach(item => {
        if (!existingVideoTags[item.video_id]) {
          existingVideoTags[item.video_id] = []
        }
        existingVideoTags[item.video_id].push(item.tag_id)
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        videos: draftVideos?.map(v => ({
          ...v,
          card_stats: cardStats[v.id] || { words: 0, expressions: 0 },
          tag_ids: existingVideoTags[v.id] || [],
        })) || [],
        packages: packages || [],
        tags: tags || [],
        creators: creators || [],
      },
    })

  } catch (error) {
    console.error('[批量发布] GET 服务器错误:', error)
    return NextResponse.json(
      {
        error: '服务器错误',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
