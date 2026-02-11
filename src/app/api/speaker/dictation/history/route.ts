/**
 * 演说家模块 - 听写历史记录 API
 *
 * 路由：GET /api/speaker/dictation/history?articleId={articleId}&userId={userId}
 *
 * 功能：获取用户在某篇文章的所有听写记录（用于对比进步曲线）
 *
 * 严格按照三个文档实现：
 * - shangwenjie.md 第 2.4 节 F（训练结果页 - 历史切片入口）
 * - TECHNICAL_MODIFICATION_PLAN.md（技术方案）
 * - AI_DEVELOPMENT_GUIDE.md（开发指南）
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET 处理器：获取用户在某篇文章的所有听写记录
 *
 * 返回数据包括：
 * 1. 提交时间
 * 2. 正确率
 * 3. 正确数、错误数、放弃数
 * 4. 完整的答案 JSON（用于显示当时的填写内容）
 */
export async function GET(request: Request) {
  console.log('[Speaker Dictation History API] 获取听写历史记录')

  try {
    const { searchParams } = new URL(request.url)
    const articleId = searchParams.get('articleId')
    const userId = searchParams.get('userId')

    if (!articleId || !userId) {
      return NextResponse.json(
        { error: 'MISSING_PARAMS', message: '缺少文章 ID 或用户 ID' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 查询该用户在该文章的所有听写记录
    const { data, error } = await supabase
      .from('speaker_dictation_submissions')
      .select('*')
      .eq('user_id', userId)
      .eq('article_id', articleId)
      .order('created_at', { ascending: false })  // 最新记录在前

    if (error) {
      console.error('[Speaker Dictation History API] ❌ 查询失败:', error)
      throw error
    }

    console.log('[Speaker Dictation History API] ✅ 查询成功，记录数量:', data?.length || 0)

    return NextResponse.json({
      success: true,
      submissions: data || []
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Speaker Dictation History API] ❌ 获取历史记录失败:', { error: errorMessage })

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '服务器内部错误' },
      { status: 500 }
    )
  }
}
