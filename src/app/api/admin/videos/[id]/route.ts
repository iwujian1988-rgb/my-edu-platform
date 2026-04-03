/**
 * 管理后台 - 单个视频管理 API
 *
 * GET /api/admin/videos/[id] - 获取视频详情
 * PUT /api/admin/videos/[id] - 更新视频
 * DELETE /api/admin/videos/[id] - 删除视频
 *
 * 重构版本：复用现有 invitation_packages 套餐系统
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkAdminForAPI } from '@/lib/admin-auth'
import { createClient } from '@supabase/supabase-js'
import type { UpdateVideoBody } from '@/types/video'
import { completeStep } from '@/lib/workflow-helper'

// 创建 admin 客户端（直接使用 service_role key）
async function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ============================================
// GET - 获取视频详情
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params

    // 1. 检查管理员权限
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json(
        { success: false, error: adminCheck.error, code: adminCheck.code },
        { status: adminCheck.status }
      )
    }

    // 2. 查询视频详情（package_ids 直接在 videos 表）
    const supabase = await getAdminClient()
    const { data: video, error } = await supabase
      .from('videos')
      .select(`
        *,
        video_tag_relations(
          video_tags(id, name, color, type)
        )
      `)
      .eq('id', videoId)
      .single()

    if (error || !video) {
      return NextResponse.json(
        { success: false, error: '视频不存在', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // 3. 构建响应
    const response = {
      ...video,
      tags: video.video_tag_relations
        ?.map((r: { video_tags: { id: string; name: string; color: string; type: string } | null }) => r.video_tags)
        .filter(Boolean) || [],
      // package_ids 已经在 video 对象中
    }

    return NextResponse.json({
      success: true,
      data: response,
    })
  } catch (error) {
    console.error('[api/admin/videos/[id]] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// ============================================
// PUT - 更新视频
// ============================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params

    // 1. 检查管理员权限
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json(
        { success: false, error: adminCheck.error, code: adminCheck.code },
        { status: adminCheck.status }
      )
    }

    // 2. 解析请求体
    const body: UpdateVideoBody = await request.json()
    const {
      title,
      description,
      video_url,
      thumbnail_url,
      duration,
      language,
      difficulty,
      content_type,
      cover_url,
      creator_name,
      source_url,
      status,
      tags,
      package_ids,
    } = body

    // 3. 如果要发布，检查是否已关联套餐
    if (status === 'published') {
      // 检查 package_ids 是否有值
      if (!package_ids || package_ids.length === 0) {
        const supabase = await getAdminClient()
        const { data: video } = await supabase
          .from('videos')
          .select('package_ids')
          .eq('id', videoId)
          .single()

        const existingPackageIds = (video as any)?.package_ids as string[] | null
        if (!existingPackageIds || existingPackageIds.length === 0) {
          return NextResponse.json(
            {
              success: false,
              error: '发布前必须关联至少一个套餐',
              code: 'NO_PACKAGE_LINKED',
            },
            { status: 400 }
          )
        }
      }
    }

    // 4. 更新视频（package_ids 直接保存到 videos 表）
    const supabase = await getAdminClient()
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (video_url !== undefined) updateData.video_url = video_url
    if (thumbnail_url !== undefined) updateData.thumbnail_url = thumbnail_url
    if (duration !== undefined) updateData.duration = duration
    if (language !== undefined) updateData.language = language
    if (difficulty !== undefined) updateData.difficulty = difficulty
    if (content_type !== undefined) updateData.content_type = content_type
    if (cover_url !== undefined) updateData.cover_url = cover_url
    if (creator_name !== undefined) updateData.creator_name = creator_name
    if (source_url !== undefined) updateData.source_url = source_url
    if (package_ids !== undefined) updateData.package_ids = package_ids.length > 0 ? package_ids : null
    if (status !== undefined) {
      updateData.status = status
      if (status === 'published') {
        updateData.published_at = new Date().toISOString()
      }
    }

    const { data: video, error: updateError } = await supabase
      .from('videos')
      .update(updateData)
      .eq('id', videoId)
      .select()
      .single()

    if (updateError || !video) {
      console.error('[api/admin/videos/[id]] Update error:', updateError)
      return NextResponse.json(
        { success: false, error: '更新失败', code: 'UPDATE_ERROR' },
        { status: 500 }
      )
    }

    // 5. 更新工作流进度
    // 判断是哪个步骤的更新
    const isInfoUpdate = title !== undefined || description !== undefined ||
                         language !== undefined || difficulty !== undefined ||
                         creator_name !== undefined || source_url !== undefined || tags !== undefined
    const isVideoUpdate = video_url !== undefined
    const isPublish = status === 'published'

    if (isPublish) {
      // Step 6: 发布完成
      await completeStep(supabase, videoId, 'publish')
    } else if (isVideoUpdate) {
      // Step 5: 视频上传完成
      await completeStep(supabase, videoId, 'video')
    } else if (isInfoUpdate && !isVideoUpdate && !isPublish) {
      // Step 1: 基本信息保存完成（排除视频上传和发布的情况）
      await completeStep(supabase, videoId, 'info')
    }

    // 6. 更新标签关联
    if (tags !== undefined) {
      // 删除现有关联
      await supabase
        .from('video_tag_relations')
        .delete()
        .eq('video_id', videoId)

      // 添加新关联
      for (const tagName of tags) {
        let tagId: string

        const { data: existingTag } = await supabase
          .from('video_tags')
          .select('id')
          .eq('name', tagName)
          .single()

        if (existingTag) {
          tagId = existingTag.id
        } else {
          const { data: newTag } = await supabase
            .from('video_tags')
            .insert({ name: tagName })
            .select('id')
            .single()

          tagId = newTag?.id
        }

        if (tagId) {
          await supabase
            .from('video_tag_relations')
            .insert({ video_id: videoId, tag_id: tagId })
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: video,
    })
  } catch (error) {
    console.error('[api/admin/videos/[id]] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE - 删除视频
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params

    // 1. 检查管理员权限
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json(
        { success: false, error: adminCheck.error, code: adminCheck.code },
        { status: adminCheck.status }
      )
    }

    // 2. 删除视频（级联删除会处理关联数据）
    const supabase = await getAdminClient()
    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', videoId)

    if (error) {
      console.error('[api/admin/videos/[id]] Delete error:', error)
      return NextResponse.json(
        { success: false, error: '删除失败', code: 'DELETE_ERROR' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: null,
    })
  } catch (error) {
    console.error('[api/admin/videos/[id]] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
