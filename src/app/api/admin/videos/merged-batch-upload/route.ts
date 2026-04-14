/**
 * 合并格式批量上传 API
 *
 * 处理新格式的合并 JSON（单文件包含多 unit），
 * 每个 unit 创建一个独立的视频记录。
 *
 * @module api/admin/videos/merged-batch-upload
 */

export const maxDuration = 60

import { createAdminClient } from '@/lib/supabase/server'
import { checkAdminForAPI } from '@/lib/admin-auth'
import { NextResponse } from 'next/server'
import {
  validateMergedJson,
  getSortedUnitKeys,
  normalizeMergedUnit,
} from '@/lib/batch-upload/merged-format'
import { processSingleVideoWithExtras } from '@/lib/batch-upload/video-processor'
import type {
  MergedBatchUploadRequest,
  MergedBatchUploadResponse,
  BatchUploadResult,
} from '@/types/video'

export async function POST(request: Request) {
  try {
    // Step 1: 鉴权（支持apikey）
    const apiKey = request.headers.get('apikey')
    let isAdmin = false

    if (apiKey === process.env.SUPABASE_SERVICE_ROLE_KEY) {
      isAdmin = true
    } else {
      const adminCheck = await checkAdminForAPI()
      if (!adminCheck.success) {
        return NextResponse.json(
          { error: adminCheck.error || '未授权', code: adminCheck.code },
          { status: adminCheck.status || 401 }
        )
      }
    }

    // Step 2: 解析请求
    const body: MergedBatchUploadRequest = await request.json().catch(() => ({}))
    const { merged_json, video_url, video_urls } = body

    if (!merged_json) {
      return NextResponse.json(
        { error: '缺少 merged_json', code: 'INVALID_REQUEST' },
        { status: 400 }
      )
    }

    // Step 3: 校验结构
    const validationErrors = validateMergedJson(merged_json)
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: validationErrors.join('; '), code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()
    // 类型转换以匹配 processSingleVideo 的参数类型
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typedSupabase = supabase as any
    const unitKeys = getSortedUnitKeys(merged_json.materials)

    // 限制最多 10 个 unit
    const MAX_UNITS = 10
    if (unitKeys.length > MAX_UNITS) {
      return NextResponse.json(
        { error: `单次最多上传 ${MAX_UNITS} 个单元`, code: 'BATCH_SIZE_EXCEEDED' },
        { status: 400 }
      )
    }

    const results: BatchUploadResult[] = []
    const errors: Array<{ unit_key: string; index: number; error: string }> = []

    // Step 4: 并发处理（限 3 并发）
    const CONCURRENCY_LIMIT = 3

    for (let batchStart = 0; batchStart < unitKeys.length; batchStart += CONCURRENCY_LIMIT) {
      const batch = unitKeys.slice(batchStart, batchStart + CONCURRENCY_LIMIT)
      const batchPromises = batch.map((unitKey, j) => {
        const idx = batchStart + j
        const unit = merged_json.materials[unitKey]
        const unitVideoUrl = video_urls?.[unitKey] || video_url || ''

        return (async () => {
          try {
            const { subtitleJson, learningJson, extras, simpleExercises } = normalizeMergedUnit(
              unit,
              merged_json.channel,
              merged_json.video_name  // 传递顶层的 video_name
            )
            const result = await processSingleVideoWithExtras(
              typedSupabase,
              {
                subtitle_json: subtitleJson,
                learning_material_json: learningJson,
                video_url: unitVideoUrl,
                simple_exercises: simpleExercises,  // 传递其他类型的练习
              },
              idx,
              extras
            )
            results.push(result)
            console.log(`[merged-batch] Unit ${unitKey} (${idx + 1}/${unitKeys.length}) OK: ${result.title}`)
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error)
            errors.push({ unit_key: unitKey, index: idx, error: msg })
            console.error(`[merged-batch] Unit ${unitKey} (${idx + 1}/${unitKeys.length}) FAILED:`, msg)
          }
        })()
      })
      await Promise.all(batchPromises)
    }

    // Step 5: 返回结果
    return NextResponse.json({
      success: results.length > 0,
      data: {
        created_count: results.length,
        videos: results,
        errors: errors.length > 0 ? errors : undefined,
      },
    } as MergedBatchUploadResponse)

  } catch (error) {
    console.error('[merged-batch] 服务器错误:', error)
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
